"""각 영상에서 중간 시점 1프레임을 BGR ndarray 로 뽑는다."""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def read_mid_frame_bgr(video_path: Path) -> np.ndarray:
    """영상의 중간 위치 프레임 1장을 BGR uint8 ndarray로 반환."""
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"열 수 없음: {video_path}")
    try:
        total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        target = max(0, total // 2) if total > 0 else 0
        if total > 0:
            cap.set(cv2.CAP_PROP_POS_FRAMES, target)
        ok, frame = cap.read()
        if not ok or frame is None:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ok, frame = cap.read()
        if not ok or frame is None:
            raise RuntimeError(f"프레임 읽기 실패: {video_path}")
        return frame
    finally:
        cap.release()


def extract_mid_frames(video_paths: list[Path]) -> list[tuple[Path, np.ndarray]]:
    out: list[tuple[Path, np.ndarray]] = []
    for p in video_paths:
        out.append((p, read_mid_frame_bgr(p)))
    return out
