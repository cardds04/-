#!/usr/bin/env python3
"""
인테리어 정적 이미지: 파일마다 **로컬** 통계만 사용해 선택적 WB·노출 보정 (글로벌 배치 평균 없음).

  python3 tools/interior_image_local_selective_grade.py ./photos -o ./out

원본 폴더는 건드리지 않고, 결과는 -o 폴더에만 씁니다.
보정이 필요한 파일만 *_corrected* 접미사로 FFmpeg 재인코딩하고, 그 외는 동일 파일명으로 복사합니다.
전 파일이 로컬 기준 정상이면 메시지만 출력하고 복사만 합니다(재인코딩 없음).
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import auto_exposure_wb as aew

# ---------------------------------------------------------------------------
# 로컬 WB: 한 채널이 **나머지 두 채널 평균** 대비 ±15% 이상이면 이상치
# ---------------------------------------------------------------------------
WB_CHANNEL_VS_OTHERS_FRAC: float = 0.15

# 로컬 노출: 휘도(8비트) P70이 [P70_LOW, P70_HIGH] 밖이면 이상치 → 목표 P70_TARGET
P70_LOW: int = 128
P70_HIGH: int = 180
P70_TARGET: int = 160

SCAN_MAX_SIDE: int = 960
EQ_PULL_GAIN: float = 1.08
EQ_AUTO_CAP: float = 0.30
EQ_TOTAL_CAP: float = 0.40
WB_CB_CAP: float = 0.18
WB_CB_GAIN: float = 1.4

WARM_K_MIN: float = 6500.0
WARM_K_MAX: float = 7000.0
DEFAULT_WARM_K: float = 6720.0

UNSHARP_LA: float = 0.62
UNSHARP_LX: int = 5
UNSHARP_LY: int = 5

IMAGE_EXTS = aew.IMAGE_EXTS


@dataclass
class ImageMetrics:
    path: Path
    p70_lum_8: float
    r_mean: float
    g_mean: float
    b_mean: float
    r_p5: float
    r_p95: float
    g_p5: float
    g_p95: float
    b_p5: float
    b_p95: float


def _iter_images(root: Path, *, recursive: bool) -> Iterable[Path]:
    it = root.rglob("*") if recursive else root.iterdir()
    for p in sorted(it):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            yield p


def _sample_ppm(path: Path) -> bytes | None:
    vf = f"scale='min({SCAN_MAX_SIDE},iw)':-2"
    try:
        cp = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(path),
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
            timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    if cp.returncode != 0 or not cp.stdout:
        return None
    return cp.stdout


def _analyze_image(path: Path) -> ImageMetrics | None:
    raw = _sample_ppm(path)
    if raw is None:
        return None
    parsed = aew._parse_ppm6_header_and_pixels(raw)
    if parsed is None:
        return None
    w, h, maxv, pix = parsed
    mv = float(maxv)
    if w <= 0 or h <= 0 or mv <= 0:
        return None
    n = w * h
    step = max(1, n // 250_000)
    rs: list[float] = []
    gs: list[float] = []
    bs: list[float] = []
    lum8: list[float] = []
    j = 0
    while j + 2 < len(pix):
        r8 = (pix[j] / mv) * 255.0
        g8 = (pix[j + 1] / mv) * 255.0
        b8 = (pix[j + 2] / mv) * 255.0
        rs.append(r8)
        gs.append(g8)
        bs.append(b8)
        y = 0.299 * r8 + 0.587 * g8 + 0.114 * b8
        lum8.append(y)
        j += 3 * step
    if len(lum8) < 64:
        return None
    rs.sort()
    gs.sort()
    bs.sort()
    lum8.sort()
    r_m = sum(rs) / len(rs)
    g_m = sum(gs) / len(gs)
    b_m = sum(bs) / len(bs)
    return ImageMetrics(
        path=path.resolve(),
        p70_lum_8=aew.percentile_linear(lum8, 70.0),
        r_mean=r_m / 255.0,
        g_mean=g_m / 255.0,
        b_mean=b_m / 255.0,
        r_p5=aew.percentile_linear(rs, 5.0) / 255.0,
        r_p95=aew.percentile_linear(rs, 95.0) / 255.0,
        g_p5=aew.percentile_linear(gs, 5.0) / 255.0,
        g_p95=aew.percentile_linear(gs, 95.0) / 255.0,
        b_p5=aew.percentile_linear(bs, 5.0) / 255.0,
        b_p95=aew.percentile_linear(bs, 95.0) / 255.0,
    )


def is_wb_outlier_local(fm: ImageMetrics, *, frac: float) -> bool:
    r = fm.r_mean * 255.0
    g = fm.g_mean * 255.0
    b = fm.b_mean * 255.0
    f = float(frac)
    for c, o1, o2 in ((r, g, b), (g, r, b), (b, r, g)):
        other = (o1 + o2) / 2.0
        if other < 1e-3:
            continue
        if abs(c - other) / other >= f:
            return True
    return False


def is_exposure_outlier_local(p70_8: float, *, low: float, high: float) -> bool:
    return p70_8 < low - 1e-6 or p70_8 > high + 1e-6


def colorlevels_guard_vf(fm: ImageMetrics, *, highlight_compress: float) -> str:
    hc = max(0.88, min(0.995, float(highlight_compress)))
    rr_lo, rr_hi = fm.r_p5, min(1.0, fm.r_p95 * hc)
    gr_lo, gr_hi = fm.g_p5, min(1.0, fm.g_p95 * hc)
    br_lo, br_hi = fm.b_p5, min(1.0, fm.b_p95 * hc)
    if rr_hi < rr_lo + 1e-4:
        rr_hi = min(1.0, rr_lo + 0.05)
    if gr_hi < gr_lo + 1e-4:
        gr_hi = min(1.0, gr_lo + 0.05)
    if br_hi < br_lo + 1e-4:
        br_hi = min(1.0, br_lo + 0.05)
    return (
        f"colorlevels=rimin={rr_lo:.5f}:gimin={gr_lo:.5f}:bimin={br_lo:.5f}"
        f":rimax={rr_hi:.5f}:gimax={gr_hi:.5f}:bimax={br_hi:.5f}"
        f":romin=0:gomin=0:bomin=0:romax=1:gomax=1:bomax=1:preserve=lum"
    )


def colorbalance_toward_neutral(fm: ImageMetrics) -> str | None:
    """로컬 RGB 평균을 동일 그레이(1:1:1)로 끌어당기는 colorbalance."""
    r, g, b = fm.r_mean, fm.g_mean, fm.b_mean
    t = (r + g + b) / 3.0
    if t < 1e-4:
        return None
    m = t
    tr = tg = tb = t
    tm = t
    dr = (tr / tm) * m - r
    dg = (tg / tm) * m - g
    db = (tb / tm) * m - b
    c = WB_CB_CAP
    gn = WB_CB_GAIN
    rm = max(-c, min(c, dr * gn))
    gm = max(-c, min(c, dg * gn))
    bm = max(-c, min(c, db * gn))
    if abs(rm) < 1e-5 and abs(gm) < 1e-5 and abs(bm) < 1e-5:
        return None
    return f"colorbalance=rm={rm:.5f}:gm={gm:.5f}:bm={bm:.5f}"


def build_local_selective_vf(
    fm: ImageMetrics,
    *,
    wb_outlier: bool,
    exposure_outlier: bool,
    p70_target_8: float,
    warm_k: float,
) -> tuple[str, list[str]]:
    reasons: list[str] = []
    brightening = False
    b_auto = 0.0
    p70_n = fm.p70_lum_8 / 255.0
    tgt_n = max(0.0, min(1.0, p70_target_8 / 255.0))
    if exposure_outlier and p70_n > 1e-6:
        b_auto = (tgt_n - p70_n) * EQ_PULL_GAIN
        b_auto = max(-EQ_AUTO_CAP, min(EQ_AUTO_CAP, b_auto))
        if fm.p70_lum_8 < p70_target_8:
            reasons.append(f"노출 낮음(휘도 P70={fm.p70_lum_8:.1f}, 목표≈{p70_target_8:.0f})")
            brightening = b_auto > 0.02
        else:
            reasons.append(f"노출 높음(휘도 P70={fm.p70_lum_8:.1f}, 목표≈{p70_target_8:.0f})")
    b_total = max(-EQ_TOTAL_CAP, min(EQ_TOTAL_CAP, b_auto))
    if abs(b_auto) > 1e-6:
        reasons.append(f"eq.brightness 적용(Δ≈{b_auto:+.3f})")

    hi_compress = 0.97 if brightening else 0.99
    parts: list[str] = [colorlevels_guard_vf(fm, highlight_compress=hi_compress)]
    parts.append(f"eq=brightness={b_total:.5f}:contrast=1.0")

    if wb_outlier:
        cb = colorbalance_toward_neutral(fm)
        if cb:
            parts.append(cb)
        reasons.append(
            "화이트밸런스 이상치(채널 간 편차≥"
            f"{int(WB_CHANNEL_VS_OTHERS_FRAC * 100)}%) → 무채색 중립 colorbalance"
        )

    wk = max(WARM_K_MIN, min(WARM_K_MAX, float(warm_k)))
    parts.append(f"colortemperature=temperature={wk:.1f}:mix=1:pl=0.08")
    parts.append(
        f"unsharp=lx={UNSHARP_LX}:ly={UNSHARP_LY}:la={UNSHARP_LA:.3f}:cx=5:cy=5:ca=0"
    )
    return ",".join(parts), reasons


def _output_corrected_path(out_dir: Path, src: Path) -> Path:
    return out_dir / f"{src.stem}_corrected{src.suffix.lower()}"


def _run_ffmpeg_image(in_path: Path, vf: str, out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    try:
        cp = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                str(in_path),
                "-vf",
                vf,
                "-frames:v",
                "1",
                str(out_path),
            ],
            capture_output=True,
            text=True,
            timeout=300,
        )
    except (OSError, subprocess.TimeoutExpired) as e:
        raise RuntimeError(f"ffmpeg 실행 실패: {in_path.name}: {e}") from e
    if cp.returncode != 0:
        err = (cp.stderr or cp.stdout or "").strip()
        raise RuntimeError(f"ffmpeg 오류 ({in_path.name}): {err or cp.returncode}")


def main() -> int:
    ap = argparse.ArgumentParser(
        description="개별 이미지 로컬 통계 기반 선택적 WB·노출 보정 (원본 유지, 결과는 -o 폴더)."
    )
    ap.add_argument(
        "input_dir",
        type=Path,
        help="이미지가 있는 폴더",
    )
    ap.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        required=True,
        help="결과 폴더 (생성됨)",
    )
    ap.add_argument(
        "-r",
        "--recursive",
        action="store_true",
        help="하위 폴더까지 스캔",
    )
    ap.add_argument(
        "--p70-low",
        type=int,
        default=P70_LOW,
        help=f"휘도 P70 하한 (기본 {P70_LOW})",
    )
    ap.add_argument(
        "--p70-high",
        type=int,
        default=P70_HIGH,
        help=f"휘도 P70 상한 (기본 {P70_HIGH})",
    )
    ap.add_argument(
        "--p70-target",
        type=int,
        default=P70_TARGET,
        help=f"노출 보정 시 P70 목표(8비트 휘도, 기본 {P70_TARGET})",
    )
    ap.add_argument(
        "--wb-frac",
        type=float,
        default=WB_CHANNEL_VS_OTHERS_FRAC,
        help="채널 vs 나머지 두 채널 평균 비율 이상치 임계 (기본 0.15)",
    )
    ap.add_argument(
        "--warm-k",
        type=float,
        default=DEFAULT_WARM_K,
        help=f"마무리 색온도 K ({WARM_K_MIN:.0f}~{WARM_K_MAX:.0f} 클램프)",
    )
    args = ap.parse_args()
    src_root = args.input_dir.resolve()
    out_root = args.output_dir.resolve()
    if not src_root.is_dir():
        print(f"오류: 입력 폴더가 없습니다: {src_root}", file=sys.stderr)
        return 1

    files = list(_iter_images(src_root, recursive=args.recursive))
    if not files:
        print(f"오류: 이미지 파일이 없습니다 ({', '.join(sorted(IMAGE_EXTS))}).", file=sys.stderr)
        return 1

    out_root.mkdir(parents=True, exist_ok=True)
    log_lines: list[str] = []
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    log_lines.append(f"# interior_image_local_selective_grade — {ts}")
    log_lines.append(f"# input: {src_root}")
    log_lines.append(
        f"# P70 범위 [{args.p70_low}, {args.p70_high}] 목표={args.p70_target} | WB 채널편차≥{args.wb_frac:.2f}"
    )

    metrics_list: list[tuple[Path, ImageMetrics | None]] = []
    for p in files:
        m = _analyze_image(p)
        metrics_list.append((p, m))
        if m is None:
            log_lines.append(f"[스캔 실패] {p.name} — FFmpeg/픽셀 분석 불가")

    decisions: list[
        tuple[Path, ImageMetrics | None, bool, bool, list[str]]
    ] = []  # path, fm, wb, exp, note_if_skip

    any_need_processing = False
    for p, m in metrics_list:
        if m is None:
            decisions.append((p, None, False, False, ["스캔 실패 → 출력은 원본 복사 시도"]))
            continue
        wb = is_wb_outlier_local(m, frac=args.wb_frac)
        ex = is_exposure_outlier_local(m.p70_lum_8, low=args.p70_low, high=args.p70_high)
        if wb or ex:
            any_need_processing = True
        decisions.append((p, m, wb, ex, []))

    if not any_need_processing and all(m is not None for _, m in metrics_list):
        print("모든 이미지가 보정이 필요 없는 완벽한 상태입니다.")
        log_lines.append("")
        log_lines.append("== 요약: 전 파일 로컬 기준 정상 → 재인코딩 없이 복사만 ==")
        for p, m in metrics_list:
            if m is None:
                continue
            log_lines.append(
                f"[원본 유지] {p.name} — P70≈{m.p70_lum_8:.1f} "
                f"RGB평균({m.r_mean*255:.0f},{m.g_mean*255:.0f},{m.b_mean*255:.0f})"
            )
        for p, m in metrics_list:
            dest = out_root / p.name
            try:
                if m is None:
                    continue
                shutil.copy2(p, dest)
                log_lines.append(f"복사: {p.name} → {dest.name}")
            except OSError as e:
                print(f"복사 실패 {p.name}: {e}", file=sys.stderr)
                log_lines.append(f"[오류] 복사 실패 {p.name}: {e}")
        log_path = out_root / "local_grade_log.txt"
        log_path.write_text("\n".join(log_lines) + "\n", encoding="utf-8")
        print(f"로그: {log_path}")
        return 0

    log_lines.append("")
    log_lines.append("== 파일별 처리 ==")

    for p, m, wb, ex, extra in decisions:
        if m is None:
            dest = out_root / p.name
            try:
                shutil.copy2(p, dest)
                log_lines.append(f"[원본 복사] {p.name} (스캔 실패)")
            except OSError as e:
                log_lines.append(f"[오류] {p.name} 복사 실패: {e}")
            continue

        if not wb and not ex:
            dest = out_root / p.name
            try:
                shutil.copy2(p, dest)
                log_lines.append(
                    f"[원본 유지·복사] {p.name} — P70≈{m.p70_lum_8:.1f}, "
                    "로컬 WB·노출 정상"
                )
            except OSError as e:
                log_lines.append(f"[오류] {p.name} 복사 실패: {e}")
            continue

        vf, reasons = build_local_selective_vf(
            m,
            wb_outlier=wb,
            exposure_outlier=ex,
            p70_target_8=float(args.p70_target),
            warm_k=args.warm_k,
        )
        outp = _output_corrected_path(out_root, p)
        try:
            _run_ffmpeg_image(p, vf, outp)
            why = "; ".join(reasons)
            log_lines.append(f"[보정 저장] {p.name} → {outp.name}")
            log_lines.append(f"    사유: {why}")
            print(f"보정: {p.name} → {outp.name}")
        except RuntimeError as e:
            log_lines.append(f"[오류] {p.name} 보정 실패: {e}")
            print(str(e), file=sys.stderr)

    # 혼합 배치: 정상 파일은 위 루프에서 처리됨. (재검사 불필요)

    log_path = out_root / "local_grade_log.txt"
    log_path.write_text("\n".join(log_lines) + "\n", encoding="utf-8")
    print(f"로그: {log_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
