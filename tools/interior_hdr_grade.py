#!/usr/bin/env python3
"""
인테리어 사진·영상: Pseudo-HDR(섀도우 리프트 + 하이라이트 롤오프 S-curve),
로컬 대비(unsharp), greyedge 자동 WB + colortemperature(6500~7000K).

단순 전역 밝기만 올리는 방식은 쓰지 않고, curves 마스터 커브로 톤을 나눈다.

  python3 tools/interior_hdr_grade.py room.jpg -o out.jpg
  python3 tools/interior_hdr_grade.py --dir ./photos -o ./graded/
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

# auto_exposure_wb와 동일한 미디어 집합·프레임 추출 재사용
import auto_exposure_wb as aew

IMAGE_EXTS = aew.IMAGE_EXTS
VIDEO_EXTS = aew.VIDEO_EXTS

WARM_K_MIN = 6500.0
WARM_K_MAX = 7000.0
DEFAULT_WARM_K = 6720.0

# unsharp 기본(홀수만). 강도는 분석으로 가변, CLI로 덮어쓰기 가능
DEFAULT_UNSHARP_LX = 5
DEFAULT_UNSHARP_LY = 5
DEFAULT_UNSHARP_LA = None  # None → 자동
DEFAULT_UNSHARP_CX = 5
DEFAULT_UNSHARP_CY = 5
DEFAULT_UNSHARP_CA = 0.0


@dataclass(frozen=True)
class InteriorLumaStats:
    """샘플 이미지에서 뽑은 휘도( (R+G+B)/3 ) 통계."""

    p05: float
    p50: float
    p95: float
    p99: float
    trimmed_mean: float  # 상·하위 10% 제외 평균
    span_90: float  # p95 - p05, 장면 대비 감


@dataclass(frozen=True)
class InteriorGradeParams:
    """FFmpeg 필터에 넣을 파생 값."""

    curves_master: str
    unsharp_lx: int
    unsharp_ly: int
    unsharp_la: float
    unsharp_cx: int
    unsharp_cy: int
    unsharp_ca: float
    colortemperature_k: float
    shadow_strength: float
    highlight_strength: float


def _odd_clamp(n: int, lo: int = 3, hi: int = 23) -> int:
    n = int(n)
    if n % 2 == 0:
        n += 1
    return max(lo, min(hi, n))


def analyze_interior_luma(
    media: Path,
    *,
    at_sec: float | None = None,
    trim_frac: float = 0.10,
    max_side: int = 960,
) -> InteriorLumaStats | None:
    """
    ffmpeg로 다운스케일 PPM 한 장을 뽑아 휘도 분포를 분석한다.
    """
    media = Path(media).resolve()
    ss = float(at_sec) if at_sec is not None else aew.pick_sample_sec(media)
    vf = f"scale='min({max_side},iw)':-2"
    try:
        cp = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{max(0.0, ss):.4f}",
                "-i",
                str(media),
                "-frames:v",
                "1",
                "-vf",
                vf,
                "-f",
                "image2pipe",
                "-vcodec",
                "ppm",
                "pipe:1",
            ],
            capture_output=True,
            timeout=90,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    if cp.returncode != 0 or not cp.stdout:
        return None
    parsed = aew._parse_ppm6_header_and_pixels(cp.stdout)
    if parsed is None:
        return None
    w, h, maxv, pix = parsed
    mv = float(maxv)
    if w <= 0 or h <= 0 or mv <= 0:
        return None
    n = w * h
    step = max(1, n // 200_000)
    lum: list[float] = []
    j = 0
    while j + 2 < len(pix):
        r = pix[j] / mv
        g = pix[j + 1] / mv
        b = pix[j + 2] / mv
        lum.append((r + g + b) / 3.0)
        j += 3 * step
    if len(lum) < 64:
        return None
    lum.sort()
    p05 = aew.percentile_linear(lum, 5.0)
    p50 = aew.percentile_linear(lum, 50.0)
    p95 = aew.percentile_linear(lum, 95.0)
    p99 = aew.percentile_linear(lum, 99.0)
    tm = aew.trimmed_mean_sorted(lum, trim_frac)
    if tm is None:
        tm = p50
    span = max(0.0, p95 - p05)
    return InteriorLumaStats(
        p05=p05,
        p50=p50,
        p95=p95,
        p99=p99,
        trimmed_mean=float(tm),
        span_90=span,
    )


def _apply_curve_linear(x: float, xs: list[float], ys: list[float]) -> float:
    """분석 시 FFmpeg spline 대신 선형 보간으로 근사."""
    if x <= xs[0]:
        t = x / xs[0] if xs[0] > 1e-9 else 0.0
        return max(0.0, min(1.0, ys[0] * t))
    if x >= xs[-1]:
        return max(0.0, min(1.0, ys[-1]))
    for i in range(len(xs) - 1):
        if xs[i] <= x <= xs[i + 1]:
            lo, hi = xs[i], xs[i + 1]
            u = (x - lo) / (hi - lo) if hi > lo + 1e-9 else 0.0
            return max(0.0, min(1.0, ys[i] * (1.0 - u) + ys[i + 1] * u))
    return max(0.0, min(1.0, ys[-1]))


def _curve_control_points(shadow_s: float, highlight_s: float) -> tuple[list[float], list[float]]:
    """S자: 암부 상승, 고휘도 억제. shadow_s, highlight_s ∈ [0,1]."""
    shadow_s = max(0.0, min(1.0, shadow_s))
    highlight_s = max(0.0, min(1.0, highlight_s))
    y0 = 0.02 + 0.11 * shadow_s
    y25 = 0.21 + 0.16 * shadow_s
    y50 = 0.50
    y75 = 0.79 - 0.11 * highlight_s
    y1 = 0.97 - 0.10 * highlight_s
    y25 = max(y25, y0 + 0.03)
    y50 = max(y50, y25 + 0.04)
    y75 = min(max(y75, y50 + 0.04), y1 - 0.03)
    y1 = max(y1, y75 + 0.03)
    xs = [0.0, 0.25, 0.5, 0.75, 1.0]
    ys = [y0, y25, y50, y75, y1]
    for i in range(1, len(ys)):
        if ys[i] < ys[i - 1] + 0.002:
            ys[i] = ys[i - 1] + 0.002
    ys[-1] = min(1.0, ys[-1])
    return xs, ys


def _curves_master_string(xs: list[float], ys: list[float]) -> str:
    parts = [f"{xs[i]:.4f}/{ys[i]:.4f}" for i in range(len(xs))]
    return " ".join(parts)


def _mean(vals: list[float]) -> float:
    return sum(vals) / len(vals) if vals else 0.0


def derive_grade_params_from_stats(
    s: InteriorLumaStats,
    *,
    unsharp_lx: int = DEFAULT_UNSHARP_LX,
    unsharp_ly: int = DEFAULT_UNSHARP_LY,
    unsharp_la_override: float | None = DEFAULT_UNSHARP_LA,
    unsharp_cx: int = DEFAULT_UNSHARP_CX,
    unsharp_cy: int = DEFAULT_UNSHARP_CY,
    unsharp_ca: float = DEFAULT_UNSHARP_CA,
    warm_k_override: float | None = None,
    target_trimmed_mid: float = 0.50,
) -> InteriorGradeParams:
    """
    어두운 실내(p50 낮음) → 섀도우 쪽 커브 강화.
    창·조명으로 p95 높음 → 하이라이트 롤오프 강화.
    대비가 낮은 장면(span 작음) → unsharp 약간 상향.
    """
    # 섀도우: 중간 휘도가 낮을수록 강하게 (상한으로 포화)
    shadow_s = 0.25 + (0.42 - min(0.42, s.p50)) * 1.35
    shadow_s += max(0.0, 0.12 - s.p05) * 2.0
    shadow_s = max(0.0, min(1.0, shadow_s))

    # 하이라이트: 상위 휘도가 밀려 있을수록 억제 강화
    highlight_s = 0.22 + max(0.0, s.p95 - 0.78) * 1.25
    highlight_s += max(0.0, s.p99 - 0.92) * 0.9
    highlight_s = max(0.0, min(1.0, highlight_s))

    xs, ys = _curve_control_points(shadow_s, highlight_s)

    # 목표 중간 80% 평균에 가깝게 shadow_s 미세 보정 (단순 전역 노출이 아니라 커브 기준만)
    def sim_trimmed_mean(sh: float, hi: float) -> float:
        tx, ty = _curve_control_points(sh, hi)
        out: list[float] = []
        # 근사: 원본 휘도 분포를 p05~p95 선형 스캔으로 샘플 (실제 픽셀 없을 때)
        for _ in range(24):
            t = _ / 23.0
            x = s.p05 * (1 - t) + s.p95 * t
            out.append(_apply_curve_linear(x, tx, ty))
        out.sort()
        m = aew.trimmed_mean_sorted(out, 0.10)
        return m if m is not None else _mean(out)

    tm_sim = sim_trimmed_mean(shadow_s, highlight_s)
    tgt = max(0.38, min(0.58, target_trimmed_mid))
    if tm_sim < tgt - 0.02 and shadow_s < 0.98:
        for _ in range(10):
            shadow_s = min(1.0, shadow_s + 0.06)
            tm_sim = sim_trimmed_mean(shadow_s, highlight_s)
            if tm_sim >= tgt - 0.015:
                break
    elif tm_sim > tgt + 0.03 and shadow_s > 0.12:
        for _ in range(8):
            shadow_s = max(0.0, shadow_s - 0.05)
            tm_sim = sim_trimmed_mean(shadow_s, highlight_s)
            if tm_sim <= tgt + 0.02:
                break

    xs, ys = _curve_control_points(shadow_s, highlight_s)
    master = _curves_master_string(xs, ys)

    lx = _odd_clamp(unsharp_lx)
    ly = _odd_clamp(unsharp_ly)
    cx = _odd_clamp(unsharp_cx)
    cy = _odd_clamp(unsharp_cy)

    if unsharp_la_override is not None:
        la = max(0.2, min(2.5, float(unsharp_la_override)))
    else:
        la = 0.62 + (0.42 - min(0.42, s.p50)) * 0.55
        if s.span_90 < 0.38:
            la += 0.12
        if s.p05 < 0.035:
            la *= 0.88
        la = max(0.45, min(1.35, la))

    if warm_k_override is not None:
        wk = float(warm_k_override)
    else:
        wk = DEFAULT_WARM_K + (0.40 - min(0.40, s.p50)) * 180.0
        wk -= max(0.0, s.p95 - 0.85) * 120.0
    wk = max(WARM_K_MIN, min(WARM_K_MAX, wk))

    return InteriorGradeParams(
        curves_master=master,
        unsharp_lx=lx,
        unsharp_ly=ly,
        unsharp_la=la,
        unsharp_cx=cx,
        unsharp_cy=cy,
        unsharp_ca=float(unsharp_ca),
        colortemperature_k=wk,
        shadow_strength=shadow_s,
        highlight_strength=highlight_s,
    )


def build_interior_grade_vf(
    params: InteriorGradeParams,
    *,
    curves_interp: str = "pchip",
    enable_greyedge: bool = True,
    enable_colortemperature: bool = True,
) -> str:
    """
    필터 순서: curves(S-curve) → unsharp(로컬 대비) → greyedge → colortemperature
    """
    m = params.curves_master
    parts: list[str] = [
        f"curves=m='{m}':interp={curves_interp}",
        f"unsharp=lx={params.unsharp_lx}:ly={params.unsharp_ly}:la={params.unsharp_la:.4f}"
        f":cx={params.unsharp_cx}:cy={params.unsharp_cy}:ca={params.unsharp_ca:.4f}",
    ]
    if enable_greyedge:
        parts.append("greyedge=difford=1:minknorm=1:sigma=1")
    if enable_colortemperature:
        k = params.colortemperature_k
        parts.append(f"colortemperature=temperature={k:.1f}:mix=1:pl=0.08")
    return ",".join(parts)


def apply_interior_hdr_grade(
    src: Path,
    dst: Path | None = None,
    *,
    at_sec: float | None = None,
    unsharp_lx: int = DEFAULT_UNSHARP_LX,
    unsharp_ly: int = DEFAULT_UNSHARP_LY,
    unsharp_la: float | None = DEFAULT_UNSHARP_LA,
    unsharp_cx: int = DEFAULT_UNSHARP_CX,
    unsharp_cy: int = DEFAULT_UNSHARP_CY,
    unsharp_ca: float = DEFAULT_UNSHARP_CA,
    warm_k: float | None = None,
    target_trimmed_mid: float = 0.50,
    curves_interp: str = "pchip",
    enable_greyedge: bool = True,
    enable_colortemperature: bool = True,
    video_crf: int = 20,
    video_preset: str = "medium",
    overwrite: bool = True,
    return_params: bool = False,
) -> Path | tuple[Path, InteriorGradeParams, InteriorLumaStats | None]:
    """
    인테리어 1장(또는 영상 1본)에 Pseudo-HDR 곡선 + unsharp + WB 적용.

    return_params=True이면 (출력 경로, 적용 파라미터, 분석 통계) 반환.
    """
    src = Path(src).resolve()
    if not src.is_file():
        raise FileNotFoundError(f"없는 파일: {src}")

    stats = analyze_interior_luma(src, at_sec=at_sec)
    if stats is None:
        params = derive_grade_params_from_stats(
            InteriorLumaStats(
                p05=0.08,
                p50=0.35,
                p95=0.88,
                p99=0.94,
                trimmed_mean=0.40,
                span_90=0.55,
            ),
            unsharp_lx=unsharp_lx,
            unsharp_ly=unsharp_ly,
            unsharp_la_override=unsharp_la,
            unsharp_cx=unsharp_cx,
            unsharp_cy=unsharp_cy,
            unsharp_ca=unsharp_ca,
            warm_k_override=warm_k,
            target_trimmed_mid=target_trimmed_mid,
        )
    else:
        params = derive_grade_params_from_stats(
            stats,
            unsharp_lx=unsharp_lx,
            unsharp_ly=unsharp_ly,
            unsharp_la_override=unsharp_la,
            unsharp_cx=unsharp_cx,
            unsharp_cy=unsharp_cy,
            unsharp_ca=unsharp_ca,
            warm_k_override=warm_k,
            target_trimmed_mid=target_trimmed_mid,
        )

    vf = build_interior_grade_vf(
        params,
        curves_interp=curves_interp,
        enable_greyedge=enable_greyedge,
        enable_colortemperature=enable_colortemperature,
    )

    if dst is None:
        dst = src.parent / f"{src.stem}_interior_hdr{src.suffix}"
    else:
        dst = Path(dst).resolve()
    dst.parent.mkdir(parents=True, exist_ok=True)

    suf = src.suffix.lower()
    is_video = suf in VIDEO_EXTS
    is_image = suf in IMAGE_EXTS
    if not is_video and not is_image:
        raise ValueError(f"지원하지 않는 형식: {src.suffix}")

    cmd: list[str | Path] = ["ffmpeg", "-hide_banner", "-loglevel", "warning"]
    if overwrite:
        cmd.append("-y")
    if is_video:
        cmd.extend(["-i", str(src), "-vf", vf, "-map", "0:v:0"])
        cmd.extend(["-c:v", "libx264", "-crf", str(int(video_crf)), "-preset", video_preset])
        if aew._ffprobe_has_audio(src):
            cmd.extend(["-map", "0:a:0", "-c:a", "copy"])
        cmd.extend(["-movflags", "+faststart", str(dst)])
    else:
        cmd.extend(["-i", str(src), "-vf", vf, "-frames:v", "1"])
        ext = dst.suffix.lower()
        if ext in (".jpg", ".jpeg"):
            cmd.extend(["-q:v", "2"])
        elif ext == ".png":
            pass
        else:
            cmd.extend(["-q:v", "2"])
        cmd.append(str(dst))

    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip()
        raise RuntimeError(f"ffmpeg 실패 ({src.name}): {err[:900]}")

    if return_params:
        return dst, params, stats
    return dst


def _iter_media(d: Path, recursive: bool) -> Iterable[Path]:
    it = d.rglob("*") if recursive else d.iterdir()
    for p in it:
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS | VIDEO_EXTS:
            yield p


def main() -> None:
    parser = argparse.ArgumentParser(
        description="인테리어 Pseudo-HDR(curves S) + unsharp + greyedge + colortemperature(6500~7000K)"
    )
    parser.add_argument("inputs", nargs="*", type=Path, help="입력 이미지/영상")
    parser.add_argument("-o", "--output", type=Path, default=None, help="출력 파일 또는 디렉터리")
    parser.add_argument("--dir", type=Path, default=None)
    parser.add_argument("-r", "--recursive", action="store_true")
    parser.add_argument("--target-mid", type=float, default=0.50, help="톤 보정 목표(내부 시뮬 기준, 0.38~0.58 권장)")
    parser.add_argument("--warm-k", type=float, default=None, help=f"색온도 K (기본: 분석값, 범위 {WARM_K_MIN:.0f}~{WARM_K_MAX:.0f})")
    parser.add_argument("--unsharp-lx", type=int, default=DEFAULT_UNSHARP_LX)
    parser.add_argument("--unsharp-ly", type=int, default=DEFAULT_UNSHARP_LY)
    parser.add_argument("--unsharp-la", type=float, default=None, help="luma_amount 고정(미지정 시 자동)")
    parser.add_argument("--unsharp-cx", type=int, default=DEFAULT_UNSHARP_CX)
    parser.add_argument("--unsharp-cy", type=int, default=DEFAULT_UNSHARP_CY)
    parser.add_argument("--unsharp-ca", type=float, default=DEFAULT_UNSHARP_CA)
    parser.add_argument("--curves-interp", choices=("pchip", "natural"), default="pchip")
    parser.add_argument("--no-greyedge", action="store_true")
    parser.add_argument("--no-warm-ct", action="store_true", help="colortemperature 생략")
    parser.add_argument("--print-params", action="store_true", help="파일별 파생 파라미터 출력")
    parser.add_argument("--crf", type=int, default=20)
    args = parser.parse_args()

    paths: list[Path] = list(args.inputs)
    if args.dir:
        d = args.dir.resolve()
        if not d.is_dir():
            print(f"폴더가 아닙니다: {d}", file=sys.stderr)
            sys.exit(1)
        paths.extend(sorted(_iter_media(d, args.recursive)))
    if not paths:
        parser.print_help()
        sys.exit(1)

    single_out = args.output
    for p in paths:
        p = p.resolve()
        if not p.is_file():
            continue
        if single_out is not None and single_out.is_dir():
            dst = single_out / f"{p.stem}_interior_hdr{p.suffix}"
        elif single_out is not None and len(paths) == 1:
            dst = single_out
        elif single_out is not None:
            dst = single_out / f"{p.stem}_interior_hdr{p.suffix}"
        else:
            dst = None

        la = args.unsharp_la if args.unsharp_la is not None else None
        try:
            res = apply_interior_hdr_grade(
                p,
                dst,
                unsharp_lx=args.unsharp_lx,
                unsharp_ly=args.unsharp_ly,
                unsharp_la=la,
                unsharp_cx=args.unsharp_cx,
                unsharp_cy=args.unsharp_cy,
                unsharp_ca=args.unsharp_ca,
                warm_k=args.warm_k,
                target_trimmed_mid=args.target_mid,
                curves_interp=args.curves_interp,
                enable_greyedge=not args.no_greyedge,
                enable_colortemperature=not args.no_warm_ct,
                video_crf=args.crf,
                return_params=args.print_params,
            )
            if args.print_params:
                out_path, pr, st = res
                print(out_path)
                print(
                    f"  stats: p05={st.p05:.3f} p50={st.p50:.3f} p95={st.p95:.3f} trim_mean={st.trimmed_mean:.3f}"
                    if st
                    else "  stats: (fallback)"
                )
                print(
                    f"  curves shadow={pr.shadow_strength:.2f} highlight={pr.highlight_strength:.2f} "
                    f"unsharp_la={pr.unsharp_la:.3f} warm_K={pr.colortemperature_k:.0f}"
                )
            else:
                print(res)
        except (RuntimeError, FileNotFoundError, ValueError) as e:
            print(f"{p}: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
