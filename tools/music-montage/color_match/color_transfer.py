"""Reinhard et al. 2001 — LAB 통계 기반 색 전이.

레퍼런스 이미지의 L/a/b 채널 평균·표준편차를 타겟 이미지에 맞춰 옮긴다.
- L 채널 = 노출/명도 매칭
- a/b 채널 = 화이트밸런스 매칭

OpenCV 의 BGR uint8 입력을 받아 BGR uint8 로 반환한다.
내부 연산은 float32 LAB(0..255 범위가 아닌 OpenCV LAB 범위)로 수행.
"""
from __future__ import annotations

import cv2
import numpy as np


def _lab_stats(lab_f32: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """LAB float32 이미지에서 채널별 평균/표준편차 (각각 shape=(3,))."""
    flat = lab_f32.reshape(-1, 3)
    mean = flat.mean(axis=0)
    std = flat.std(axis=0)
    std = np.where(std < 1e-6, 1.0, std)
    return mean.astype(np.float32), std.astype(np.float32)


def reinhard_transfer_bgr(
    target_bgr: np.ndarray,
    reference_bgr: np.ndarray,
    *,
    strength: float = 1.0,
) -> np.ndarray:
    """타겟 이미지를 레퍼런스 통계에 맞춰 변환한다.

    strength: 0.0 = 변환 없음(원본), 1.0 = 완전 매칭. 사이는 선형 블렌드.
    """
    s = float(np.clip(strength, 0.0, 1.0))
    if s <= 0.0:
        return target_bgr.copy()

    tgt_lab = cv2.cvtColor(target_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    ref_lab = cv2.cvtColor(reference_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)

    mu_t, sd_t = _lab_stats(tgt_lab)
    mu_r, sd_r = _lab_stats(ref_lab)

    out = (tgt_lab - mu_t) * (sd_r / sd_t) + mu_r

    if s < 1.0:
        out = tgt_lab + (out - tgt_lab) * s

    out = np.clip(out, 0.0, 255.0).astype(np.uint8)
    return cv2.cvtColor(out, cv2.COLOR_LAB2BGR)


def reinhard_lut_3d(
    reference_bgr: np.ndarray,
    target_bgr: np.ndarray,
    size: int = 33,
) -> np.ndarray:
    """타겟의 LAB 통계 → 레퍼런스의 LAB 통계로 옮기는 변환을
    33×33×33(또는 size³) 3D RGB LUT(float32 [0..1], shape=(s,s,s,3))로 굽는다.

    LUT[r,g,b] = 입력 RGB 좌표 (r/(s-1), g/(s-1), b/(s-1)) 에 대응하는 출력 RGB.
    """
    s = int(size)
    grid = np.linspace(0.0, 1.0, s, dtype=np.float32)
    rr, gg, bb = np.meshgrid(grid, grid, grid, indexing="ij")
    rgb = np.stack([rr, gg, bb], axis=-1)  # (s,s,s,3)
    bgr_u8 = (rgb[..., ::-1] * 255.0).astype(np.uint8).reshape(-1, 1, 3)

    tgt_lab = cv2.cvtColor(target_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    ref_lab = cv2.cvtColor(reference_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    mu_t, sd_t = _lab_stats(tgt_lab)
    mu_r, sd_r = _lab_stats(ref_lab)

    grid_lab = cv2.cvtColor(bgr_u8, cv2.COLOR_BGR2LAB).astype(np.float32).reshape(-1, 3)
    grid_lab = (grid_lab - mu_t) * (sd_r / sd_t) + mu_r
    grid_lab = np.clip(grid_lab, 0.0, 255.0).astype(np.uint8).reshape(-1, 1, 3)
    out_bgr = cv2.cvtColor(grid_lab, cv2.COLOR_LAB2BGR).reshape(s, s, s, 3).astype(np.float32) / 255.0
    out_rgb = out_bgr[..., ::-1]
    return np.ascontiguousarray(out_rgb, dtype=np.float32)
