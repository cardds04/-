"""
사진 1장 → 1920x1080, 5초, 60fps MP4. MoviePy + Pillow.

- 좌우(lr/rl): 1.2배 확대 캔버스 위에서 수평 이동.
- 앞으로(forward): 같은 확대 캔버스에서 전체 화면 → 중앙 크롭으로 줌 인(앞으로 나아가는 느낌).

좌↔우 전 구간 이동·줌에 PAN_DURATION 초를 쓰므로 값이 클수록 같은 5초 클립 안에서 변화가 더 느림.
(15초에 전 구간; 출력은 앞 5초만.)
"""

from __future__ import annotations

import random
from pathlib import Path

import numpy as np
from PIL import Image

try:
    from moviepy.editor import VideoClip
except ImportError:
    from moviepy import VideoClip  # type: ignore

OUT_W, OUT_H = 1920, 1080
ZOOM = 1.2
# 출력 MP4 길이(초)
OUTPUT_DURATION = 5.0
# 좌↔우 전 구간 이동에 걸리는 시간(초). OUTPUT_DURATION보다 크면 같은 5초 안에서 이동이 더 느림.
PAN_DURATION = 15.0
FPS = 60


def crop_center_16_9(im: Image.Image) -> Image.Image:
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


def prepare_pan_canvas(im: Image.Image, mode: str = "lr") -> tuple[np.ndarray, str]:
    """mode: lr | rl | forward | random (좌우는 수평 팬, forward는 중앙 줌 인)."""
    im = im.convert("RGB")
    im = crop_center_16_9(im)
    zw = int(round(OUT_W * ZOOM))
    zh = int(round(OUT_H * ZOOM))
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:
        resample = Image.LANCZOS
    im = im.resize((zw, zh), resample)
    arr = np.asarray(im, dtype=np.uint8)
    m = (mode or "lr").strip().lower()
    if m in ("forward", "zoom", "zoom_in", "in"):
        return arr, "forward"
    if m == "random":
        direction = random.choice(("lr", "rl"))
    elif m == "rl":
        direction = "rl"
    elif m == "lr":
        direction = "lr"
    else:
        direction = random.choice(("lr", "rl"))
    return arr, direction


def make_frame_fn(canvas: np.ndarray, direction: str):
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


def make_zoom_frame_fn(canvas: np.ndarray):
    """전체 프레임(줌 아웃)에서 중앙 크롭(줌 인)으로 — 앞으로 들어가는 느낌."""
    zh, zw, _ = canvas.shape
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:
        resample = Image.LANCZOS

    def frame(t: float) -> np.ndarray:
        t = float(np.clip(t, 0.0, OUTPUT_DURATION))
        p = min(t / PAN_DURATION, 1.0)
        w_crop = int(round(zw - p * (zw - OUT_W)))
        h_crop = int(round(zh - p * (zh - OUT_H)))
        w_crop = max(w_crop, OUT_W)
        h_crop = max(h_crop, OUT_H)
        x0 = (zw - w_crop) // 2
        y0 = (zh - h_crop) // 2
        sl = canvas[y0 : y0 + h_crop, x0 : x0 + w_crop, :]
        pil = Image.fromarray(sl)
        pil = pil.resize((OUT_W, OUT_H), resample)
        return np.ascontiguousarray(np.asarray(pil))

    return frame


def image_path_to_clip(path: Path, mode: str = "lr") -> VideoClip:
    im = Image.open(path)
    canvas, direction = prepare_pan_canvas(im, mode)
    if direction == "forward":
        frame_fn = make_zoom_frame_fn(canvas)
    else:
        frame_fn = make_frame_fn(canvas, direction)
    clip = VideoClip(frame_fn, duration=OUTPUT_DURATION)
    return clip.set_fps(FPS)


def render_pan_mp4_from_path(src: Path, dst: Path, mode: str = "lr") -> None:
    """원본 이미지 경로 → MP4 한 개 생성. mode: lr | rl | forward | random"""
    dst.parent.mkdir(parents=True, exist_ok=True)
    clip = image_path_to_clip(src, mode)
    write_kw = dict(
        fps=FPS,
        codec="libx264",
        audio=False,
        preset="medium",
        ffmpeg_params=["-crf", "18", "-pix_fmt", "yuv420p"],
    )
    try:
        clip.write_videofile(str(dst), logger="bar", **write_kw)
    except TypeError:
        clip.write_videofile(str(dst), verbose=True, **write_kw)
    finally:
        clip.close()
