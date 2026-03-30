#!/usr/bin/env python3
"""
FFmpeg로 영상/사진에 자동 노출·대비 + 따뜻한 자동 WB.

노출: 샘플에서 R/G/B 각각 10~90퍼센타일로 colorlevels(극단 하이라이트·섀도 제외) 후,
      상·하위 10% 밝기 픽셀을 뺀 중간 80% 평균이 목표 밝기가 되도록 eq=brightness.
      (전체 min/max·단순 평균에 끌려 가던 문제 완화)

WB: greyedge → colortemperature (6500~7000K)

  python3 tools/auto_exposure_wb.py file1.jpg file2.mp4 -o out/
  python3 tools/auto_exposure_wb.py --dir ./clips --legacy-normalize 0.35
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Iterable, Sequence

WARM_K_MIN = 6500.0
WARM_K_MAX = 7000.0
DEFAULT_WARM_TEMPERATURE_K = 6750.0

# 중간 80% 평균이 맞출 목표 밝기 (0~1)
DEFAULT_TONAL_TARGET_MID = 0.52
DEFAULT_TRIM_FRAC = 0.10
DEFAULT_EQ_GAIN = 1.0
DEFAULT_CONTRAST_AFTER = 1.06

# 영상 normalize(레거시) — 기본 끔. 조명 편차 큰 장면만 약하게 추가 가능
DEFAULT_LEGACY_NORMALIZE_STRENGTH = 0.0
DEFAULT_VIDEO_NORMALIZE_SMOOTHING = 18

VIDEO_EXTS = {".mp4", ".mov", ".mkv", ".webm", ".m4v", ".avi", ".mpg", ".mpeg"}
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


def trimmed_mean_sorted(sorted_vals: list[float], exclude_frac: float) -> float | None:
    """정렬된 값에서 앞·뒤 exclude_frac 만큼 잘라 평균."""
    if not sorted_vals:
        return None
    f = max(0.0, min(0.45, float(exclude_frac)))
    n = len(sorted_vals)
    k = int(n * f)
    if n <= 2 * k + 1:
        mid = sorted_vals
    else:
        mid = sorted_vals[k : n - k]
    return sum(mid) / len(mid) if mid else None


def percentile_linear(sorted_vals: list[float], p_percent: float) -> float:
    """p_percent in [0,100], 선형 보간."""
    if not sorted_vals:
        return 0.0
    if p_percent <= 0:
        return sorted_vals[0]
    if p_percent >= 100:
        return sorted_vals[-1]
    x = (len(sorted_vals) - 1) * (p_percent / 100.0)
    lo = int(x)
    hi = min(lo + 1, len(sorted_vals) - 1)
    t = x - lo
    return sorted_vals[lo] * (1.0 - t) + sorted_vals[hi] * t


def _stretch(x: float, lo: float, hi: float) -> float:
    if hi < lo + 1e-6:
        return max(0.0, min(1.0, x))
    y = (x - lo) / (hi - lo)
    return max(0.0, min(1.0, y))


def _parse_ppm6_header_and_pixels(data: bytes) -> tuple[int, int, int, memoryview] | None:
    if len(data) < 32 or not data.startswith(b"P6"):
        return None
    i = 2

    def _skip_space() -> None:
        nonlocal i
        while i < len(data) and data[i] in (9, 10, 13, 32):
            i += 1

    nums: list[int] = []
    cur = bytearray()
    while len(nums) < 3 and i < len(data):
        _skip_space()
        if i >= len(data):
            break
        if data[i] == 35:
            while i < len(data) and data[i] != 10:
                i += 1
            continue
        if 48 <= data[i] <= 57:
            cur.clear()
            while i < len(data) and 48 <= data[i] <= 57:
                cur.append(data[i])
                i += 1
            if cur:
                nums.append(int(cur.decode()))
        else:
            i += 1
    if len(nums) != 3:
        return None
    w, h, maxv = nums[0], nums[1], nums[2]
    if w <= 0 or h <= 0 or maxv <= 0:
        return None
    _skip_space()
    need = w * h * 3
    if i + need > len(data):
        return None
    return w, h, maxv, memoryview(data)[i : i + need]


def _ffmpeg_ppm_frame(media: Path, at_sec: float, *, timeout: float = 90.0) -> bytes | None:
    try:
        cp = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{max(0.0, at_sec):.4f}",
                "-i",
                str(media),
                "-frames:v",
                "1",
                "-vf",
                "scale='min(960,iw)':-2",
                "-f",
                "image2pipe",
                "-vcodec",
                "ppm",
                "pipe:1",
            ],
            capture_output=True,
            timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    if cp.returncode != 0 or not cp.stdout:
        return None
    return cp.stdout


def _ffprobe_duration(path: Path) -> float | None:
    try:
        cp = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    if cp.returncode != 0:
        return None
    t = (cp.stdout or "").strip().splitlines()
    if not t:
        return None
    try:
        return float(t[0])
    except ValueError:
        return None


def pick_sample_sec(media: Path) -> float:
    if media.suffix.lower() in VIDEO_EXTS:
        d = _ffprobe_duration(media)
        if d is not None and d > 0.4:
            return min(max(0.15, d * 0.22), d - 0.05)
        return 0.5
    return 0.0


def build_trimmed_tonal_vf_from_media(
    media: Path,
    *,
    at_sec: float | None = None,
    target_mid: float = DEFAULT_TONAL_TARGET_MID,
    trim_frac: float = DEFAULT_TRIM_FRAC,
    eq_gain: float = DEFAULT_EQ_GAIN,
    contrast: float = DEFAULT_CONTRAST_AFTER,
    enable_colorlevels: bool = True,
    level_low_pct: float = 10.0,
    level_high_pct: float = 90.0,
    eq_cap: float = 0.42,
    eq_eps: float = 0.008,
) -> str | None:
    """
    colorlevels(각 채널 p10~p90 → 0~1) + 시뮬레이션한 뒤 중간 80% 밝기 평균으로 eq.
    실패 시 None.
    """
    ss = float(at_sec) if at_sec is not None else pick_sample_sec(media)
    raw = _ffmpeg_ppm_frame(media, ss)
    if raw is None:
        return None
    parsed = _parse_ppm6_header_and_pixels(raw)
    if parsed is None:
        return None
    w, h, maxv, pix = parsed
    mv = float(maxv)
    n = w * h
    if n <= 0 or mv <= 0:
        return None
    step = max(1, n // 200_000)
    rs: list[float] = []
    gs: list[float] = []
    bs: list[float] = []
    j = 0
    while j + 2 < len(pix):
        rs.append(pix[j] / mv)
        gs.append(pix[j + 1] / mv)
        bs.append(pix[j + 2] / mv)
        j += 3 * step
    if len(rs) < 64:
        return None

    sr, sg, sb = sorted(rs), sorted(gs), sorted(bs)
    rp_lo = percentile_linear(sr, level_low_pct)
    rp_hi = percentile_linear(sr, level_high_pct)
    gp_lo = percentile_linear(sg, level_low_pct)
    gp_hi = percentile_linear(sg, level_high_pct)
    bp_lo = percentile_linear(sb, level_low_pct)
    bp_hi = percentile_linear(sb, level_high_pct)

    if enable_colorlevels:
        sim_bright: list[float] = []
        for r, g, b in zip(rs, gs, bs, strict=True):
            rr = _stretch(r, rp_lo, rp_hi)
            gg = _stretch(g, gp_lo, gp_hi)
            bb = _stretch(b, bp_lo, bp_hi)
            sim_bright.append((rr + gg + bb) / 3.0)
    else:
        sim_bright = [(r + g + b) / 3.0 for r, g, b in zip(rs, gs, bs, strict=True)]

    sim_bright.sort()
    m80 = trimmed_mean_sorted(sim_bright, trim_frac)
    if m80 is None:
        return None
    tgt = max(0.0, min(1.0, float(target_mid)))
    gn = max(0.2, min(1.8, float(eq_gain)))
    b_off = (tgt - m80) * gn
    b_off = max(-eq_cap, min(eq_cap, b_off))
    if abs(b_off) < eq_eps:
        b_off = 0.0

    parts: list[str] = []
    if enable_colorlevels:
        parts.append(
            f"colorlevels=rimin={rp_lo:.5f}:gimin={gp_lo:.5f}:bimin={bp_lo:.5f}"
            f":rimax={rp_hi:.5f}:gimax={gp_hi:.5f}:bimax={bp_hi:.5f}"
            f":romin=0:gomin=0:bomin=0:romax=1:gomax=1:bomax=1:preserve=lum"
        )
    ct = max(0.85, min(1.2, float(contrast)))
    parts.append(f"eq=brightness={b_off:.5f}:contrast={ct:.5f}")
    return ",".join(parts)


def build_wb_tail_vf(
    *,
    warm_temperature_k: float = DEFAULT_WARM_TEMPERATURE_K,
    enable_neutral_wb: bool = True,
    enable_warm_ct: bool = True,
) -> str:
    wk = max(WARM_K_MIN, min(WARM_K_MAX, float(warm_temperature_k)))
    parts: list[str] = []
    if enable_neutral_wb:
        parts.append("greyedge=difford=1:minknorm=1")
    if enable_warm_ct:
        parts.append(f"colortemperature=temperature={wk:.1f}")
    if not parts:
        raise ValueError("greyedge·colortemperature 둘 다 끄면 안 됩니다.")
    return ",".join(parts)


def _ffprobe_has_audio(path: Path) -> bool:
    try:
        cp = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "a:0",
                "-show_entries",
                "stream=index",
                "-of",
                "csv=p=0",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return False
    return bool((cp.stdout or "").strip()) and cp.returncode == 0


def _ffprobe_avg_fps(path: Path) -> float | None:
    try:
        cp = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=avg_frame_rate",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            capture_output=True,
            text=True,
            timeout=60,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    if cp.returncode != 0:
        return None
    line = (cp.stdout or "").strip().splitlines()
    if not line:
        return None
    s = line[0].strip()
    if s in ("0/0", "N/A", ""):
        return None
    if "/" in s:
        a, b = s.split("/", 1)
        try:
            num, den = float(a), float(b)
            if den == 0:
                return None
            return num / den
        except ValueError:
            return None
    try:
        return float(s)
    except ValueError:
        return None


def _is_video(p: Path) -> bool:
    return p.suffix.lower() in VIDEO_EXTS


def _is_image(p: Path) -> bool:
    return p.suffix.lower() in IMAGE_EXTS


def apply_auto_exposure_wb_to_file(
    src: Path,
    dst: Path | None = None,
    *,
    tonal_target_mid: float = DEFAULT_TONAL_TARGET_MID,
    trim_frac: float = DEFAULT_TRIM_FRAC,
    eq_gain: float = DEFAULT_EQ_GAIN,
    enable_colorlevels: bool = True,
    legacy_normalize_strength: float = DEFAULT_LEGACY_NORMALIZE_STRENGTH,
    normalize_smoothing_frames: int | None = None,
    normalize_independence: float = 0.0,
    warm_temperature_k: float = DEFAULT_WARM_TEMPERATURE_K,
    video_crf: int = 20,
    video_preset: str = "medium",
    overwrite: bool = True,
    enable_tonal: bool = True,
    enable_neutral_wb: bool = True,
    enable_warm_ct: bool = True,
) -> Path:
    src = Path(src).resolve()
    if not src.is_file():
        raise FileNotFoundError(f"없는 파일: {src}")

    if dst is None:
        dst = src.parent / f"{src.stem}_graded{src.suffix}"
    else:
        dst = Path(dst).resolve()
    dst.parent.mkdir(parents=True, exist_ok=True)

    vf_parts: list[str] = []
    if enable_tonal:
        tonal = build_trimmed_tonal_vf_from_media(
            src,
            target_mid=tonal_target_mid,
            trim_frac=trim_frac,
            eq_gain=eq_gain,
            enable_colorlevels=enable_colorlevels,
        )
        if tonal:
            vf_parts.append(tonal)
    leg = max(0.0, min(1.0, float(legacy_normalize_strength)))
    if leg > 1e-6:
        sm = normalize_smoothing_frames
        if sm is None and _is_video(src):
            fps = _ffprobe_avg_fps(src)
            if fps and fps > 1:
                sm = int(min(60, max(8, round(fps * 1.2))))
            else:
                sm = DEFAULT_VIDEO_NORMALIZE_SMOOTHING
        else:
            sm = int(sm or 0)
        ind = max(0.0, min(1.0, float(normalize_independence)))
        vf_parts.append(
            f"normalize=blackpt=black:whitept=white:strength={leg:.4f}"
            f":independence={ind:.4f}:smoothing={sm}"
        )
    vf_parts.append(
        build_wb_tail_vf(
            warm_temperature_k=warm_temperature_k,
            enable_neutral_wb=enable_neutral_wb,
            enable_warm_ct=enable_warm_ct,
        )
    )
    vf = ",".join(vf_parts)

    if _is_video(src):
        cmd: list[str | Path] = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "warning",
        ]
        if overwrite:
            cmd.append("-y")
        cmd.extend(["-i", str(src), "-vf", vf, "-map", "0:v:0"])
        cmd.extend(["-c:v", "libx264", "-crf", str(int(video_crf)), "-preset", video_preset])
        if _ffprobe_has_audio(src):
            cmd.extend(["-map", "0:a:0", "-c:a", "copy"])
        cmd.extend(["-movflags", "+faststart", str(dst)])
    elif _is_image(src):
        cmd = [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "warning",
        ]
        if overwrite:
            cmd.append("-y")
        ext = dst.suffix.lower()
        if ext in (".jpg", ".jpeg"):
            enc = ["-q:v", "2"]
        elif ext == ".png":
            enc = []
        else:
            enc = ["-q:v", "2"]
        cmd.extend(["-i", str(src), "-vf", vf, "-frames:v", "1", *enc, str(dst)])
    else:
        raise ValueError(f"지원하지 않는 형식: {src.suffix} ({src.name})")

    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip()
        raise RuntimeError(f"ffmpeg 실패 ({src.name}): {err[:800]}")
    return dst


def batch_apply_auto_exposure_wb(
    paths: Sequence[Path | str],
    output_dir: Path | str | None = None,
    *,
    suffix: str = "_graded",
    tonal_target_mid: float = DEFAULT_TONAL_TARGET_MID,
    trim_frac: float = DEFAULT_TRIM_FRAC,
    eq_gain: float = DEFAULT_EQ_GAIN,
    enable_colorlevels: bool = True,
    legacy_normalize_strength: float = DEFAULT_LEGACY_NORMALIZE_STRENGTH,
    normalize_smoothing_frames: int | None = None,
    normalize_independence: float = 0.0,
    warm_temperature_k: float = DEFAULT_WARM_TEMPERATURE_K,
    video_crf: int = 20,
    video_preset: str = "medium",
    overwrite: bool = True,
    enable_tonal: bool = True,
    enable_neutral_wb: bool = True,
    enable_warm_ct: bool = True,
) -> list[Path]:
    out: list[Path] = []
    for p in paths:
        sp = Path(p).resolve()
        if not sp.is_file():
            continue
        if output_dir is not None:
            od = Path(output_dir).resolve()
            od.mkdir(parents=True, exist_ok=True)
            dst = od / f"{sp.stem}{suffix}{sp.suffix}"
        else:
            dst = sp.parent / f"{sp.stem}{suffix}{sp.suffix}"
        out.append(
            apply_auto_exposure_wb_to_file(
                sp,
                dst,
                tonal_target_mid=tonal_target_mid,
                trim_frac=trim_frac,
                eq_gain=eq_gain,
                enable_colorlevels=enable_colorlevels,
                legacy_normalize_strength=legacy_normalize_strength,
                normalize_smoothing_frames=normalize_smoothing_frames,
                normalize_independence=normalize_independence,
                warm_temperature_k=warm_temperature_k,
                video_crf=video_crf,
                video_preset=video_preset,
                overwrite=overwrite,
                enable_tonal=enable_tonal,
                enable_neutral_wb=enable_neutral_wb,
                enable_warm_ct=enable_warm_ct,
            )
        )
    return out


def _iter_media_in_dir(d: Path, recursive: bool) -> Iterable[Path]:
    it = d.rglob("*") if recursive else d.iterdir()
    for p in it:
        if not p.is_file():
            continue
        if p.suffix.lower() in VIDEO_EXTS | IMAGE_EXTS:
            yield p


def main() -> None:
    parser = argparse.ArgumentParser(
        description="중간80% 밝기 평균 + colorlevels(p10~p90) 노출, greyedge+웜 colortemperature"
    )
    parser.add_argument("inputs", nargs="*", type=Path, help="입력 파일들")
    parser.add_argument("-o", "--output-dir", type=Path, default=None)
    parser.add_argument("--suffix", default="_graded")
    parser.add_argument("--dir", type=Path, default=None)
    parser.add_argument("-r", "--recursive", action="store_true")
    parser.add_argument(
        "--target-mid",
        type=float,
        default=DEFAULT_TONAL_TARGET_MID,
        help="중간80%% 평균이 맞출 목표 밝기 0~1 (기본 0.52)",
    )
    parser.add_argument(
        "--trim-frac",
        type=float,
        default=DEFAULT_TRIM_FRAC,
        help="밝기 정렬 후 앞·뒤에서 잘라낼 비율(기본 0.1 = 각 10%%)",
    )
    parser.add_argument("--eq-gain", type=float, default=DEFAULT_EQ_GAIN, help="eq brightness 게인")
    parser.add_argument("--no-colorlevels", action="store_true", help="colorlevels 생략(eq만)")
    parser.add_argument(
        "--legacy-normalize",
        type=float,
        default=0.0,
        metavar="STRENGTH",
        help="추가로 normalize 필터(0~1). 기본 0",
    )
    parser.add_argument("--smoothing", type=int, default=-1, help="legacy normalize 스무딩. -1=자동")
    parser.add_argument("--warm-k", type=float, default=DEFAULT_WARM_TEMPERATURE_K)
    parser.add_argument("--crf", type=int, default=20)
    parser.add_argument("--no-tonal", action="store_true")
    parser.add_argument("--no-greyedge", action="store_true")
    parser.add_argument("--no-warm", action="store_true")
    args = parser.parse_args()

    paths: list[Path] = list(args.inputs)
    if args.dir:
        d = args.dir.resolve()
        if not d.is_dir():
            print(f"폴더가 아닙니다: {d}", file=sys.stderr)
            sys.exit(1)
        paths.extend(sorted(_iter_media_in_dir(d, args.recursive)))
    if not paths:
        parser.print_help()
        sys.exit(1)

    sm = None if args.smoothing < 0 else args.smoothing
    done = batch_apply_auto_exposure_wb(
        paths,
        args.output_dir,
        suffix=args.suffix,
        tonal_target_mid=args.target_mid,
        trim_frac=args.trim_frac,
        eq_gain=args.eq_gain,
        enable_colorlevels=not args.no_colorlevels,
        legacy_normalize_strength=args.legacy_normalize,
        normalize_smoothing_frames=sm,
        warm_temperature_k=args.warm_k,
        video_crf=args.crf,
        enable_tonal=not args.no_tonal,
        enable_neutral_wb=not args.no_greyedge,
        enable_warm_ct=not args.no_warm,
    )
    for p in done:
        print(p)


if __name__ == "__main__":
    main()
