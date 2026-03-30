"""
브라우저 업로드 바이트 → OpenCV BGR (uint8 또는 rawpy 시 uint16).
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import cv2
import numpy as np

RAW_SUFFIXES = frozenset(
    {
        ".arw",
        ".srf",
        ".sr2",
        ".cr2",
        ".cr3",
        ".crw",
        ".dng",
        ".nef",
        ".nrw",
        ".orf",
        ".raf",
        ".rw2",
        ".pef",
        ".ptx",
        ".x3f",
    },
)


def decode_upload_to_bgr(data: bytes, filename: str) -> tuple[np.ndarray | None, str | None]:
    """
    JPEG/PNG 등은 uint8 BGR, RAW는 rawpy 16-bit BGR.
    실패 시 (None, 에러 메시지).
    """
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is not None:
        return img, None

    ext = Path(filename or "").suffix.lower()
    if ext not in RAW_SUFFIXES:
        return None, "지원하는 이미지 형식이 아닙니다. (JPEG/PNG 등 또는 RAW)"

    try:
        import rawpy  # noqa: PLC0415
    except ImportError:
        return (
            None,
            "RAW 처리에 rawpy가 필요합니다. pip install rawpy (및 LibRaw)",
        )

    tmp_path: str | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tf:
            tf.write(data)
            tmp_path = tf.name
        with rawpy.imread(tmp_path) as raw:
            rgb = raw.postprocess(
                use_camera_wb=True,
                no_auto_bright=True,
                output_bps=16,
            )
        bgr = cv2.cvtColor(np.asarray(rgb, dtype=np.uint16), cv2.COLOR_RGB2BGR)
        return bgr, None
    except Exception as e:  # noqa: BLE001
        return None, f"RAW 디코딩 실패: {e}"
    finally:
        if tmp_path:
            Path(tmp_path).unlink(missing_ok=True)


def bgr_to_u8_for_display(bgr: np.ndarray) -> np.ndarray:
    """uint16 BGR → uint8 (미리보기·JPEG용)."""
    if bgr.dtype != np.uint16:
        return bgr
    return (np.clip(bgr.astype(np.float32) / 257.0, 0, 255)).astype(np.uint8)
