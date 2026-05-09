"""레퍼런스 클립(또는 프레임) 자동 선택.

휘도 균형도 + RGB 분산 균일성 + 클리핑 비율 + 색온도 중성도 가중합.
"""
from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np


def score_frame(bgr: np.ndarray) -> dict:
    """0~1 정규화된 부분 점수와 가중합 total 을 반환."""
    f = bgr.astype(np.float32) / 255.0
    b, g, r = f[..., 0], f[..., 1], f[..., 2]
    luma = 0.114 * b + 0.587 * g + 0.299 * r

    # 휘도 균형도: 평균이 0.5에 가까울수록 1점
    mean_luma = float(luma.mean())
    luma_balance = max(0.0, 1.0 - abs(mean_luma - 0.5) * 2.0)

    # RGB 채널 표준편차의 균일성: 채널 std 의 std 가 작을수록 1점
    stds = np.array([b.std(), g.std(), r.std()], dtype=np.float32)
    std_uniformity = float(max(0.0, 1.0 - stds.std() * 4.0))

    # 클리핑 비율: 0/1 근처 픽셀 비율이 적을수록 1점
    clip_low = float((luma < 0.02).mean())
    clip_high = float((luma > 0.98).mean())
    clip_score = float(max(0.0, 1.0 - (clip_low + clip_high) * 4.0))

    # 색온도 중성도: B 평균 / R 평균 이 1에 가까울수록 1점
    eps = 1e-6
    br_ratio = float(b.mean() / max(eps, r.mean()))
    neutrality = float(max(0.0, 1.0 - abs(br_ratio - 1.0) * 1.2))

    total = (
        0.40 * luma_balance
        + 0.20 * std_uniformity
        + 0.20 * clip_score
        + 0.20 * neutrality
    )
    return {
        "luma_balance": luma_balance,
        "std_uniformity": std_uniformity,
        "clip_score": clip_score,
        "neutrality": neutrality,
        "total": total,
        "mean_luma": mean_luma,
        "br_ratio": br_ratio,
    }


def pick_reference(frames: list[tuple[Path, np.ndarray]]) -> tuple[int, list[dict]]:
    """가장 높은 점수의 인덱스와 모든 프레임의 점수 dict 리스트를 반환."""
    scores = [score_frame(bgr) for _, bgr in frames]
    best = max(range(len(scores)), key=lambda i: scores[i]["total"])
    return best, scores
