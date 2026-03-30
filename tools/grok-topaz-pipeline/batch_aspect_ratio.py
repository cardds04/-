"""
여러 장 이미지를 동일한 화면비(가로·세로)로 중앙 크롭.
Pillow만 사용 (API 키 불필요).
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

from PIL import Image, ImageOps

# 지원 입력 확장자 (소문자, 점 포함)
INPUT_EXT = frozenset(
    {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"},
)


def target_w_over_h(aspect: str, orientation: str) -> float:
    """출력 가로÷세로 비율 (가로가 더 긴 경우 > 1)."""
    a = (aspect or "3:2").strip()
    o = (orientation or "landscape").strip().lower()
    if o not in ("landscape", "portrait"):
        o = "landscape"
    landscape = {
        "16:9": 16.0 / 9.0,
        "4:3": 4.0 / 3.0,
        "3:2": 3.0 / 2.0,
    }
    portrait = {
        "16:9": 9.0 / 16.0,
        "4:3": 3.0 / 4.0,
        "3:2": 2.0 / 3.0,
    }
    m = landscape if o == "landscape" else portrait
    return float(m.get(a, 3.0 / 2.0))


def crop_center_to_aspect(img: Image.Image, target_w_over_h: float) -> Image.Image:
    """중앙 기준으로 목표 화면비가 되도록 잘라냄."""
    w, h = img.size
    if w <= 0 or h <= 0:
        return img
    cur = w / h
    t = target_w_over_h
    if abs(cur - t) < 1e-5:
        return img
    if cur > t:
        new_w = max(1, int(round(h * t)))
        x0 = (w - new_w) // 2
        return img.crop((x0, 0, x0 + new_w, h))
    new_h = max(1, int(round(w / t)))
    y0 = (h - new_h) // 2
    return img.crop((0, y0, w, y0 + new_h))


def _open_image(path: Path) -> Image.Image:
    img = Image.open(path)
    return ImageOps.exif_transpose(img)


def _to_rgb_for_jpeg(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "RGBA":
            bg.paste(img, mask=img.split()[3])
        else:
            bg.paste(img)
        return bg
    if img.mode == "P":
        return img.convert("RGB")
    if img.mode != "RGB":
        return img.convert("RGB")
    return img


def build_zip_bytes(
    paths: list[Path],
    aspect: str,
    orientation: str,
    *,
    jpeg_quality: int = 92,
) -> bytes:
    """
    paths 순서대로 처리해 ZIP 바이너리 생성.
    파일명: 001_원본stem_16x9_L.jpg 형태.
    """
    t = target_w_over_h(aspect, orientation)
    a_tag = (aspect or "3:2").replace(":", "x")
    o_tag = "L" if (orientation or "").lower() == "landscape" else "P"

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for idx, p in enumerate(paths):
            if not p.is_file():
                continue
            img = _open_image(p)
            try:
                out = crop_center_to_aspect(img, t)
                out = _to_rgb_for_jpeg(out)
            finally:
                img.close()
            stem = p.stem or f"img{idx}"
            safe_stem = "".join(c if c.isalnum() or c in "-_" else "_" for c in stem)[:80]
            name = f"{idx + 1:03d}_{safe_stem}_{a_tag}_{o_tag}.jpg"
            bio = io.BytesIO()
            out.save(bio, format="JPEG", quality=jpeg_quality, optimize=True)
            zf.writestr(name, bio.getvalue())
    return buf.getvalue()
