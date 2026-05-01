"""
Step 3/4 색보정 연산 모듈
- Exposure / Contrast / Highlights / Shadows
- White Balance (Temperature / Tint)
모든 함수: uint8 입력 → uint8 출력, 연산은 float32 내부 처리
"""

from __future__ import annotations
import numpy as np
import cv2


# ── Step 3: 노출 보정 ──────────────────────────────────────────────────────────

def apply_exposure(img: np.ndarray, ev: float) -> np.ndarray:
    """노출 EV 조정 (±3 EV)"""
    f = img.astype(np.float32) / 255.0
    f = np.clip(f * (2.0 ** ev), 0, 1)
    return (f * 255).astype(np.uint8)


def apply_contrast(img: np.ndarray, contrast: float) -> np.ndarray:
    """대비 조정 (-100 ~ +100 → 계수 변환)
    contrast=0이면 변화 없음
    """
    f = img.astype(np.float32) / 255.0
    # S-커브 강도 조절
    factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    f = np.clip(factor * (f - 0.5) + 0.5, 0, 1)
    return (f * 255).astype(np.uint8)


def apply_highlights(img: np.ndarray, amount: float) -> np.ndarray:
    """하이라이트 억제/복구 (-100 ~ +100)
    음수 = 밝은 영역 어둡게, 양수 = 밝은 영역 더 밝게
    """
    f = img.astype(np.float32) / 255.0
    # 밝은 픽셀(> 0.5)에만 가중치 적용
    weight = np.clip((f - 0.5) * 2.0, 0, 1)  # 0~1 마스크
    delta = (amount / 100.0) * 0.4
    f = np.clip(f + weight * delta, 0, 1)
    return (f * 255).astype(np.uint8)


def apply_shadows(img: np.ndarray, amount: float) -> np.ndarray:
    """섀도우 조정 (-100 ~ +100)
    양수 = 어두운 영역 밝게, 음수 = 더 어둡게
    """
    f = img.astype(np.float32) / 255.0
    # 어두운 픽셀(< 0.5)에만 가중치 적용
    weight = np.clip((0.5 - f) * 2.0, 0, 1)
    delta = (amount / 100.0) * 0.4
    f = np.clip(f + weight * delta, 0, 1)
    return (f * 255).astype(np.uint8)


def apply_exposure_full(
    img: np.ndarray,
    ev: float = 0.0,
    contrast: float = 0.0,
    highlights: float = 0.0,
    shadows: float = 0.0,
) -> np.ndarray:
    """Step 3 슬라이더 4종을 한 번에 적용 (순서: EV → 하이라이트 → 섀도우 → 대비)"""
    out = apply_exposure(img, ev)
    out = apply_highlights(out, highlights)
    out = apply_shadows(out, shadows)
    if contrast != 0:
        out = apply_contrast(out, contrast)
    return out


# ── Step 4: 화이트밸런스 보정 ──────────────────────────────────────────────────

def apply_white_balance(
    img: np.ndarray,
    temperature: float = 0.0,
    tint: float = 0.0,
) -> np.ndarray:
    """
    색온도(Temperature)와 틴트(Tint) 슬라이더로 WB 조정
    temperature: -100(파랑) ~ +100(노랑/주황)
    tint:        -100(초록) ~ +100(마젠타)
    """
    f = img.astype(np.float32) / 255.0

    # Temperature: R↑ B↓ (따뜻) / R↓ B↑ (차가움)
    temp_scale = temperature / 100.0 * 0.25
    f[:, :, 0] = np.clip(f[:, :, 0] + temp_scale, 0, 1)   # R
    f[:, :, 2] = np.clip(f[:, :, 2] - temp_scale, 0, 1)   # B

    # Tint: G↓ (마젠타) / G↑ (초록)
    tint_scale = tint / 100.0 * 0.15
    f[:, :, 1] = np.clip(f[:, :, 1] - tint_scale, 0, 1)   # G

    return (f * 255).astype(np.uint8)
