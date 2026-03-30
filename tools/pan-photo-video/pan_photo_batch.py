#!/usr/bin/env python3
"""
한 장의 사진 → 1920x1080, 5초, 30fps MP4 (좌↔우 부드러운 팬, 이동은 2배 느리게).
16:9 크롭 후 1.2배 확대해 이동 여유를 두고, 매 파일마다 팬 방향은 랜덤(좌→우 또는 우→좌).

사용 예:
  pip install -r requirements.txt
  python pan_photo_batch.py photo1.jpg photo2.png -o ./out
  python pan_photo_batch.py -d ~/Pictures/jpg -o ./videos
"""

from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

import numpy as np
from PIL import Image

try:
    from moviepy.editor import VideoClip
except ImportError:
    from moviepy import VideoClip  # type: ignore

OUT_W, OUT_H = 1920, 1080
ZOOM = 1.2
OUTPUT_DURATION = 5.0
PAN_DURATION = 10.0
FPS = 30
IMG_EXTS = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")


def crop_center_16_9(im: Image.Image) -> Image.Image:
    """어떤 비율이든 중앙 기준 16:9로 잘라냄."""
    w, h = im.size
    target = 16 / 9
    ar = w / h
    if ar > target:
        new_w = int(round(h * target))
        x0 = (w - new_w) // 2
        return im.crop((x0, 0, x0 + new_w, h))
    new_h = int(round(w / target))
    y0 = (h - new_h) // 2
    return im.crop((0, y0, w, y0 + new_h))


def prepare_pan_canvas(im: Image.Image) -> tuple[np.ndarray, str]:
    """
    16:9 크롭 → 1.2배 해상도로 리사이즈 → (H,W,3) uint8, 방향 'lr' 또는 'rl'.
    """
    im = im.convert("RGB")
    im = crop_center_16_9(im)
    zw = int(round(OUT_W * ZOOM))
    zh = int(round(OUT_H * ZOOM))
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:
        resample = Image.LANCZOS  # Pillow < 9.1
    im = im.resize((zw, zh), resample)
    arr = np.asarray(im, dtype=np.uint8)
    direction = random.choice(("lr", "rl"))
    return arr, direction


def make_frame_fn(canvas: np.ndarray, direction: str):
    """canvas: shape (zh, zw, 3), zw >= OUT_W, zh >= OUT_H (16:9 유지 리사이즈 후)."""

    zh, zw, _ = canvas.shape
    max_x = zw - OUT_W
    if max_x < 0:
        raise ValueError(f"확대 후 가로가 출력보다 작습니다: {zw} < {OUT_W}")
    if zh < OUT_H:
        raise ValueError(f"확대 후 세로가 출력보다 작습니다: {zh} < {OUT_H}")
    y0 = (zh - OUT_H) // 2

    def frame(t: float) -> np.ndarray:
        t = float(np.clip(t, 0.0, OUTPUT_DURATION))
        p = min(t / PAN_DURATION, 1.0)
        if direction == "lr":
            x0 = int(round(p * max_x))
        else:
            x0 = int(round((1.0 - p) * max_x))
        x0 = min(max(x0, 0), max_x)
        sl = canvas[y0 : y0 + OUT_H, x0 : x0 + OUT_W, :]
        return np.ascontiguousarray(sl)

    return frame


def image_to_clip(path: Path) -> VideoClip:
    im = Image.open(path)
    canvas, direction = prepare_pan_canvas(im)
    frame_fn = make_frame_fn(canvas, direction)
    clip = VideoClip(frame_fn, duration=OUTPUT_DURATION)
    clip = clip.set_fps(FPS)
    return clip


def collect_inputs(args: argparse.Namespace) -> list[Path]:
    paths: list[Path] = []
    for p in args.images:
        paths.append(Path(p).expanduser().resolve())
    if args.input_dir:
        d = Path(args.input_dir).expanduser().resolve()
        if not d.is_dir():
            raise SystemExit(f"폴더가 아닙니다: {d}")
        for f in sorted(d.iterdir()):
            if f.is_file() and f.suffix.lower() in IMG_EXTS:
                paths.append(f)
    seen: set[Path] = set()
    out: list[Path] = []
    for p in paths:
        if not p.is_file():
            print(f"건너뜀 (파일 없음): {p}", file=sys.stderr)
            continue
        if p.suffix.lower() not in IMG_EXTS:
            print(f"건너뜀 (지원 형식 아님): {p}", file=sys.stderr)
            continue
        if p not in seen:
            seen.add(p)
            out.append(p)
    return out


def main() -> int:
    p = argparse.ArgumentParser(
        description="사진 여러 장 → 1920x1080 팬 영상(MP4) 일괄 생성 (MoviePy)",
    )
    p.add_argument(
        "images",
        nargs="*",
        help="입력 이미지 파일 경로 (여러 개 가능)",
    )
    p.add_argument(
        "-d",
        "--input-dir",
        type=Path,
        help=f"이미지가 있는 폴더 ({', '.join(IMG_EXTS)})",
    )
    p.add_argument(
        "-o",
        "--output-dir",
        type=Path,
        default=Path("."),
        help="출력 MP4 폴더 (기본: 현재 폴더)",
    )
    p.add_argument(
        "--seed",
        type=int,
        default=None,
        help="랜덤 팬 방향 재현용 시드 (미지정 시 매번 다름)",
    )
    args = p.parse_args()
    if args.seed is not None:
        random.seed(args.seed)

    inputs = collect_inputs(args)
    if not inputs:
        p.print_help()
        print("\n오류: 처리할 이미지가 없습니다. 파일을 넣거나 -d 로 폴더를 지정하세요.", file=sys.stderr)
        return 1

    out_dir = Path(args.output_dir).expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    for i, src in enumerate(inputs):
        out_path = out_dir / f"{src.stem}_pan.mp4"
        print(f"[{i + 1}/{len(inputs)}] {src.name} → {out_path.name}", flush=True)
        clip = image_to_clip(src)
        write_kw = dict(
            fps=FPS,
            codec="libx264",
            audio=False,
            preset="medium",
            ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p"],
        )
        try:
            clip.write_videofile(str(out_path), logger="bar", **write_kw)
        except TypeError:
            clip.write_videofile(str(out_path), verbose=True, **write_kw)
        clip.close()

    print("완료.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
