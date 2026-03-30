#!/usr/bin/env python3
"""
인테리어 영상: 왼쪽 상단 ROI + 루마 키로 하이라이트만 억제(전역 노출 감소 없음),
OpenCV로 질감·인페인트 유사 복원, FFmpeg gradfun + unsharp + greyedge + colortemperature.

  pip install -r tools/requirements-interior-video.txt
  python3 tools/interior_highlight_recovery.py clip.mp4 -o out.mp4 --print-params
"""

from __future__ import annotations

import argparse
import subprocess
import sys
import tempfile
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import auto_exposure_wb as aew

try:
    import cv2
    import numpy as np
except ImportError as e:
    cv2 = None  # type: ignore
    np = None  # type: ignore
    _IMPORT_ERR = e
else:
    _IMPORT_ERR = None

VIDEO_EXTS = aew.VIDEO_EXTS
IMAGE_EXTS = aew.IMAGE_EXTS

WARM_K_MIN = 6500.0
WARM_K_MAX = 7200.0
DEFAULT_WARM_K = 6850.0


@dataclass(frozen=True)
class HighlightAnalysis:
    """샘플 프레임 기준 자동 분석 결과."""

    frame_w: int
    frame_h: int
    roi_xywh: tuple[int, int, int, int]
    luma_key_t: float
    key_softness: float
    compress_gain: float
    clipped_frac_roi: float
    texture_hf_gain: float
    inpaint_radius: int
    inpaint_blend: float
    gradfun_strength: float
    gradfun_radius: int
    unsharp_lx: int
    unsharp_ly: int
    unsharp_la: float
    colortemperature_k: float


def _require_cv() -> None:
    if cv2 is None or np is None:
        raise ImportError(
            "OpenCV·NumPy가 필요합니다. 예: pip install -r tools/requirements-interior-video.txt"
        ) from _IMPORT_ERR


def _ffprobe_video_size_fps(path: Path) -> tuple[int, int, float] | None:
    try:
        cp = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "v:0",
                "-show_entries",
                "stream=width,height,r_frame_rate",
                "-of",
                "csv=p=0",
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
    parts = line[0].strip().split(",")
    if len(parts) < 3:
        return None
    try:
        w, h = int(parts[0]), int(parts[1])
        fr = parts[2].strip()
        if "/" in fr:
            a, b = fr.split("/", 1)
            fps = float(a) / float(b) if float(b) else 25.0
        else:
            fps = float(fr)
        if fps < 1 or fps > 120:
            fps = 25.0
        return w, h, fps
    except ValueError:
        return None


def _read_bgr(path: Path, at_sec: float = 0.0) -> np.ndarray | None:
    _require_cv()
    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return None
    if at_sec > 0:
        cap.set(cv2.CAP_PROP_POS_MSEC, at_sec * 1000.0)
    ok, frame = cap.read()
    cap.release()
    return frame if ok else None


def _read_image_bgr(path: Path) -> np.ndarray | None:
    _require_cv()
    im = cv2.imread(str(path), cv2.IMREAD_COLOR)
    return im


def _default_left_top_roi(w: int, h: int) -> tuple[int, int, int, int]:
    rw = max(32, int(w * 0.48))
    rh = max(32, int(h * 0.42))
    return 0, 0, rw, rh


def _tighten_roi_to_clipping(
    L: np.ndarray,
    blown: np.ndarray,
    w: int,
    h: int,
    base_roi: tuple[int, int, int, int],
    margin_frac: float = 0.04,
) -> tuple[int, int, int, int]:
    x0, y0, rw, rh = base_roi
    sub = blown[y0 : y0 + rh, x0 : x0 + rw]
    if not np.any(sub):
        return base_roi
    ys, xs = np.where(sub)
    my = int(max(4, h * margin_frac))
    mx = int(max(4, w * margin_frac))
    xa = max(0, x0 + int(xs.min()) - mx)
    ya = max(0, y0 + int(ys.min()) - my)
    xb = min(w, x0 + int(xs.max()) + mx + 1)
    yb = min(h, y0 + int(ys.max()) + my + 1)
    return xa, ya, max(32, xb - xa), max(32, yb - ya)


def analyze_highlight_clipping(
    bgr: np.ndarray,
    *,
    manual_roi_xywh: tuple[int, int, int, int] | None = None,
    manual_roi_norm: tuple[float, float, float, float] | None = None,
) -> HighlightAnalysis:
    """
    날림 정도에 따라 ROI·루마 키·압축·질감·gradfun·unsharp·색온도를 자동 산출.
    manual_roi_norm: (x, y, w, h) 각 0~1 비율(왼쪽 위 기준).
    """
    _require_cv()
    h, w = bgr.shape[:2]
    if manual_roi_xywh is not None:
        x, y, rw, rh = manual_roi_xywh
        roi = (max(0, x), max(0, y), max(32, min(rw, w - x)), max(32, min(rh, h - y)))
    elif manual_roi_norm is not None:
        nx, ny, nw, nh = manual_roi_norm
        roi = (
            int(nx * w),
            int(ny * h),
            max(32, int(nw * w)),
            max(32, int(nh * h)),
        )
        roi = (
            max(0, min(roi[0], w - 32)),
            max(0, min(roi[1], h - 32)),
            min(roi[2], w - roi[0]),
            min(roi[3], h - roi[1]),
        )
    else:
        roi = _default_left_top_roi(w, h)

    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    L = lab[:, :, 0].astype(np.float32)
    x0, y0, rw, rh = roi
    x0 = max(0, min(x0, w - 1))
    y0 = max(0, min(y0, h - 1))
    rw = max(32, min(rw, w - x0))
    rh = max(32, min(rh, h - y0))
    roi = (x0, y0, rw, rh)

    Lroi = L[y0 : y0 + rh, x0 : x0 + rw]
    maxc = np.max(bgr[y0 : y0 + rh, x0 : x0 + rw], axis=2).astype(np.float32)
    blown = (Lroi > 248.0) | (maxc > 250.0)
    clipped_frac = float(np.mean(blown)) if blown.size else 0.0

    roi = _tighten_roi_to_clipping(L, blown, w, h, roi)
    x0, y0, rw, rh = roi
    Lroi = L[y0 : y0 + rh, x0 : x0 + rw]
    maxc = np.max(bgr[y0 : y0 + rh, x0 : x0 + rw], axis=2).astype(np.float32)
    blown = (Lroi > 247.5) | (maxc > 249.0)
    clipped_frac = max(clipped_frac, float(np.mean(blown)) if blown.size else 0.0)

    flat = Lroi.ravel()
    if flat.size < 64:
        t_key = 230.0
    else:
        pct = 90.0 - min(18.0, clipped_frac * 80.0)
        t_key = float(np.percentile(flat, pct))
        t_key = max(200.0, min(252.0, t_key))

    key_softness = 10.0 + (1.0 - min(1.0, clipped_frac * 4.0)) * 14.0
    compress_gain = 0.42 + min(0.48, clipped_frac * 2.2 + (float(np.percentile(flat, 99)) - 235.0) * 0.04)
    compress_gain = max(0.28, min(0.92, compress_gain))

    texture_hf_gain = 0.28 + min(0.55, clipped_frac * 1.8)
    inpaint_radius = int(3 + min(6, round(clipped_frac * 25)))
    inpaint_blend = 0.12 + min(0.28, clipped_frac * 1.5)

    gf = 2.2 + min(14.0, clipped_frac * 55.0 + (252.0 - t_key) * 0.15)
    gf = max(1.8, min(18.0, gf))
    gr = int(10 + min(14, round(clipped_frac * 40)))

    us_la = 0.55 + min(0.85, clipped_frac * 1.1)
    if clipped_frac < 0.02:
        us_la = max(0.45, us_la * 0.85)

    wk = DEFAULT_WARM_K - min(350.0, clipped_frac * 600.0)
    wk = max(WARM_K_MIN, min(WARM_K_MAX, wk))

    return HighlightAnalysis(
        frame_w=w,
        frame_h=h,
        roi_xywh=roi,
        luma_key_t=t_key,
        key_softness=key_softness,
        compress_gain=compress_gain,
        clipped_frac_roi=clipped_frac,
        texture_hf_gain=texture_hf_gain,
        inpaint_radius=inpaint_radius,
        inpaint_blend=inpaint_blend,
        gradfun_strength=gf,
        gradfun_radius=gr,
        unsharp_lx=5,
        unsharp_ly=5,
        unsharp_la=us_la,
        colortemperature_k=wk,
    )


def _roi_weight_map(
    h: int,
    w: int,
    roi: tuple[int, int, int, int],
    feather_px: float,
) -> np.ndarray:
    x0, y0, rw, rh = roi
    m = np.zeros((h, w), dtype=np.float32)
    m[y0 : y0 + rh, x0 : x0 + rw] = 1.0
    k = max(3, int(feather_px * 2) | 1)
    m = cv2.GaussianBlur(m, (k, k), feather_px * 0.35)
    return np.clip(m, 0.0, 1.0)


def _luma_key_blend(L: np.ndarray, T: float, softness: float, roi_w: np.ndarray) -> np.ndarray:
    t = (L.astype(np.float32) - T) / max(softness, 1e-3)
    t = np.clip(t, 0.0, 1.0)
    t = t * t * (3.0 - 2.0 * t)
    return np.clip(t * roi_w, 0.0, 1.0)


def _compress_luma_masked(L: np.ndarray, blend: np.ndarray, T: float, gain: float) -> np.ndarray:
    """T 위 초과분만 gain 비율로 유지(나머지는 낮춤). 전역 스케일 아님."""
    Lf = L.astype(np.float32)
    excess = np.maximum(0.0, Lf - T)
    reduced = T + excess * gain
    return np.clip(Lf * (1.0 - blend) + reduced * blend, 0.0, 255.0)


def _texture_restore_inpaint_like(
    bgr_orig: np.ndarray,
    L_compressed: np.ndarray,
    lab_orig: np.ndarray,
    key_blend: np.ndarray,
    severe_mask: np.ndarray,
    analysis: HighlightAnalysis,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """고주파 재주입 + 심한 날림 구역만 가벼운 인페인트 블렌드."""
    L0 = lab_orig[:, :, 0].astype(np.float32)
    blur = cv2.GaussianBlur(L0, (0, 0), 1.6)
    hf = L0 - blur
    g = (key_blend * analysis.texture_hf_gain).astype(np.float32)
    L1 = L_compressed.astype(np.float32) + hf * g
    L1 = np.clip(L1, 0.0, 255.0)

    if np.any(severe_mask) and analysis.inpaint_blend > 0.02:
        sm = (severe_mask.astype(np.uint8) * 255)
        rad = max(1, analysis.inpaint_radius)
        telea = cv2.inpaint(bgr_orig, sm, rad, cv2.INPAINT_TELEA)
        tlab = cv2.cvtColor(telea, cv2.COLOR_BGR2LAB)
        b = (cv2.GaussianBlur(key_blend, (0, 0), 2.0) * analysis.inpaint_blend).astype(np.float32)
        L1 = L1 * (1.0 - b) + tlab[:, :, 0].astype(np.float32) * b
        L1 = np.clip(L1, 0.0, 255.0)

    lab2 = lab_orig.copy()
    lab2[:, :, 0] = L1.astype(np.uint8)
    return lab2[:, :, 0], lab2[:, :, 1], lab2[:, :, 2]


def _process_frame_bgr(bgr: np.ndarray, analysis: HighlightAnalysis) -> np.ndarray:
    _require_cv()
    h, w = bgr.shape[:2]
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    L = lab[:, :, 0].astype(np.float32)

    roi_w = _roi_weight_map(h, w, analysis.roi_xywh, feather_px=12.0)
    kb = _luma_key_blend(L, analysis.luma_key_t, analysis.key_softness, roi_w)
    Lc = _compress_luma_masked(L, kb, analysis.luma_key_t, analysis.compress_gain)

    x0, y0, rw, rh = analysis.roi_xywh
    Lroi = L[y0 : y0 + rh, x0 : x0 + rw]
    severe = np.zeros((h, w), dtype=bool)
    severe[y0 : y0 + rh, x0 : x0 + rw] = Lroi > 252.0

    Lf, a, bch = _texture_restore_inpaint_like(bgr, Lc, lab, kb, severe, analysis)
    lab_out = cv2.merge(
        [
            Lf.astype(np.uint8),
            np.clip(a, 0, 255).astype(np.uint8),
            np.clip(bch, 0, 255).astype(np.uint8),
        ]
    )
    return cv2.cvtColor(lab_out, cv2.COLOR_LAB2BGR)


def _build_ffmpeg_vf_tail(analysis: HighlightAnalysis) -> str:
    return ",".join(
        [
            f"gradfun=strength={analysis.gradfun_strength:.3f}:radius={analysis.gradfun_radius}",
            f"unsharp=lx={analysis.unsharp_lx}:ly={analysis.unsharp_ly}:la={analysis.unsharp_la:.4f}"
            f":cx=5:cy=5:ca=0",
            "greyedge=difford=1:minknorm=1:sigma=1",
            f"colortemperature=temperature={analysis.colortemperature_k:.1f}:mix=1:pl=0.1",
        ]
    )


def apply_interior_highlight_recovery(
    src: Path,
    dst: Path | None = None,
    *,
    sample_sec: float | None = None,
    manual_roi_xywh: tuple[int, int, int, int] | None = None,
    manual_roi_norm: tuple[float, float, float, float] | None = None,
    video_crf: int = 19,
    video_preset: str = "medium",
    overwrite: bool = True,
    return_analysis: bool = False,
) -> Path | tuple[Path, HighlightAnalysis]:
    """
    단일 함수: 분석 → 프레임별 마스크 루마 키 하이라이트 복원 → 파이프로 FFmpeg
    (gradfun, unsharp, greyedge, colortemperature).

    전역 노출(brightness) 감소는 사용하지 않음.
    """
    _require_cv()
    src = Path(src).resolve()
    if not src.is_file():
        raise FileNotFoundError(f"없는 파일: {src}")

    suf = src.suffix.lower()
    is_video = suf in VIDEO_EXTS
    is_image = suf in IMAGE_EXTS
    if not is_video and not is_image:
        raise ValueError(f"지원하지 않는 형식: {src.suffix}")

    if dst is None:
        dst = src.parent / f"{src.stem}_hl_recover{src.suffix}"
    else:
        dst = Path(dst).resolve()
    dst.parent.mkdir(parents=True, exist_ok=True)

    if is_image:
        bgr = _read_image_bgr(src)
        if bgr is None:
            raise RuntimeError(f"이미지 로드 실패: {src}")
        analysis = analyze_highlight_clipping(
            bgr,
            manual_roi_xywh=manual_roi_xywh,
            manual_roi_norm=manual_roi_norm,
        )
        out_bgr = _process_frame_bgr(bgr, analysis)
        vf = _build_ffmpeg_vf_tail(analysis)
        h, w = out_bgr.shape[:2]
        with tempfile.NamedTemporaryFile(suffix=".bgr", delete=False) as tf:
            raw_path = Path(tf.name)
            tf.write(out_bgr.tobytes())
        try:
            cmd = [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "warning",
            ]
            if overwrite:
                cmd.append("-y")
            cmd.extend(
                [
                    "-f",
                    "rawvideo",
                    "-pix_fmt",
                    "bgr24",
                    "-s",
                    f"{w}x{h}",
                    "-i",
                    str(raw_path),
                    "-vf",
                    vf,
                    "-frames:v",
                    "1",
                ]
            )
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
                raise RuntimeError((r.stderr or r.stdout or "")[:900])
        finally:
            raw_path.unlink(missing_ok=True)
        if return_analysis:
            return dst, analysis
        return dst

    ss = float(sample_sec) if sample_sec is not None else aew.pick_sample_sec(src)
    probe = _ffprobe_video_size_fps(src)
    sample_bgr = _read_bgr(src, at_sec=ss)
    if sample_bgr is None:
        raise RuntimeError("샘플 프레임을 읽을 수 없습니다.")
    analysis = analyze_highlight_clipping(
        sample_bgr,
        manual_roi_xywh=manual_roi_xywh,
        manual_roi_norm=manual_roi_norm,
    )

    cap = cv2.VideoCapture(str(src))
    if not cap.isOpened():
        raise RuntimeError("OpenCV로 영상을 열 수 없습니다.")
    w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps is None or fps < 1 or fps > 120:
        fps = float(probe[2]) if probe else 25.0
    fps = float(fps)

    if probe and (w != probe[0] or h != probe[1]):
        w, h = probe[0], probe[1]

    vf = _build_ffmpeg_vf_tail(analysis)
    cmd: list[str | Path] = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "warning",
    ]
    if overwrite:
        cmd.append("-y")
    cmd.extend(
        [
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "-s",
            f"{w}x{h}",
            "-r",
            f"{fps:.4f}",
            "-i",
            "pipe:0",
        ]
    )
    has_audio = aew._ffprobe_has_audio(src)
    if has_audio:
        cmd.extend(["-i", str(src), "-map", "0:v:0", "-map", "1:a:0"])
        cmd.extend(["-c:a", "copy", "-shortest"])
    else:
        cmd.extend(["-map", "0:v:0"])
    cmd.extend(
        [
            "-vf",
            vf,
            "-c:v",
            "libx264",
            "-crf",
            str(int(video_crf)),
            "-preset",
            video_preset,
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(dst),
        ]
    )

    proc = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=w * h * 3 * 2,
    )
    assert proc.stdin is not None
    err_buf = bytearray()

    def _drain_stderr() -> None:
        if proc.stderr:
            while True:
                chunk = proc.stderr.read(65536)
                if not chunk:
                    break
                err_buf.extend(chunk)

    drain_t = threading.Thread(target=_drain_stderr, daemon=True)
    drain_t.start()
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame.shape[1] != w or frame.shape[0] != h:
                frame = cv2.resize(frame, (w, h), interpolation=cv2.INTER_AREA)
            out = _process_frame_bgr(frame, analysis)
            proc.stdin.write(out.tobytes())
    finally:
        cap.release()
        proc.stdin.close()
    code = proc.wait()
    drain_t.join(timeout=30.0)
    err = err_buf.decode("utf-8", errors="replace")
    if code != 0:
        raise RuntimeError(f"ffmpeg 실패: {err[:900]}")

    if return_analysis:
        return dst, analysis
    return dst


def _iter_videos(d: Path, recursive: bool) -> Iterable[Path]:
    it = d.rglob("*") if recursive else d.iterdir()
    for p in it:
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS | IMAGE_EXTS:
            yield p


def main() -> None:
    parser = argparse.ArgumentParser(
        description="ROI+루마 키 하이라이트 복원(OpenCV) + gradfun·unsharp·WB(FFmpeg)"
    )
    parser.add_argument("inputs", nargs="*", type=Path)
    parser.add_argument("-o", "--output", type=Path, default=None)
    parser.add_argument("--dir", type=Path, default=None)
    parser.add_argument("-r", "--recursive", action="store_true")
    parser.add_argument("--sample-sec", type=float, default=None)
    parser.add_argument(
        "--roi-norm",
        type=float,
        nargs=4,
        metavar=("X", "Y", "W", "H"),
        default=None,
        help="정규화 ROI 0~1: 왼쪽 위 (x,y,w,h)",
    )
    parser.add_argument(
        "--roi-pixels",
        type=int,
        nargs=4,
        metavar=("X", "Y", "W", "H"),
        default=None,
        help="픽셀 ROI (x,y,w,h). --roi-norm 보다 우선",
    )
    parser.add_argument("--print-params", action="store_true")
    parser.add_argument("--crf", type=int, default=19)
    args = parser.parse_args()

    paths: list[Path] = list(args.inputs)
    if args.dir:
        d = args.dir.resolve()
        if not d.is_dir():
            print(f"폴더가 아닙니다: {d}", file=sys.stderr)
            sys.exit(1)
        paths.extend(sorted(_iter_videos(d, args.recursive)))
    if not paths:
        parser.print_help()
        sys.exit(1)

    roi_n = tuple(args.roi_norm) if args.roi_norm is not None else None
    roi_px = tuple(args.roi_pixels) if args.roi_pixels is not None else None
    out_arg = args.output

    for p in paths:
        p = p.resolve()
        if not p.is_file():
            continue
        if out_arg is not None and out_arg.is_dir():
            od = out_arg / f"{p.stem}_hl_recover{p.suffix}"
        elif out_arg is not None and len(paths) == 1:
            od = out_arg
        else:
            od = None
        try:
            res = apply_interior_highlight_recovery(
                p,
                od,
                sample_sec=args.sample_sec,
                manual_roi_xywh=roi_px,
                manual_roi_norm=roi_n if roi_px is None else None,
                video_crf=args.crf,
                return_analysis=args.print_params,
            )
            if args.print_params:
                path, an = res
                print(path)
                print(
                    f"  roi={an.roi_xywh} key_T={an.luma_key_t:.1f} gain={an.compress_gain:.2f} "
                    f"clip_frac={an.clipped_frac_roi:.3f} gradfun={an.gradfun_strength:.2f} "
                    f"unsharp_la={an.unsharp_la:.2f} K={an.colortemperature_k:.0f}"
                )
            else:
                print(res)
        except (RuntimeError, FileNotFoundError, ImportError, ValueError) as e:
            print(f"{p}: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
