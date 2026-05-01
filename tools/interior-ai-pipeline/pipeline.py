"""
인테리어 사진 자동 보정 통합 파이프라인
Step 1 → Step 2 → Step 3 을 순차 실행합니다.
Express(Batch) 모드에서 사용합니다.
"""

from __future__ import annotations

import numpy as np
from dataclasses import dataclass, field
from typing import Callable, Optional

from models.exposure import ExposureWBProcessor
from models.geometry import MLSDGeometryCorrector
from models.segmentation import SAM2WindowSegmenter


@dataclass
class PipelineResult:
    filename: str
    base_raw: Optional[np.ndarray] = None       # Step1 base
    dark_raw: Optional[np.ndarray] = None       # Step1 dark
    base_warped: Optional[np.ndarray] = None    # Step2 보정 base
    dark_warped: Optional[np.ndarray] = None    # Step2 보정 dark
    window_mask: Optional[np.ndarray] = None    # Step3 마스크
    final: Optional[np.ndarray] = None          # Step3 최종 합성
    error: str = ""
    logs: list[str] = field(default_factory=list)


class InteriorPipeline:
    """
    단일 이미지 파이프라인.
    각 모델을 주입받아 Step 1~3을 순차 실행합니다.
    """

    def __init__(
        self,
        exposure: ExposureWBProcessor,
        geometry: MLSDGeometryCorrector,
        segmenter: SAM2WindowSegmenter,
        blend_method: str = "mertens",
    ):
        self.exposure = exposure
        self.geometry = geometry
        self.segmenter = segmenter
        self.blend_method = blend_method

    def run(
        self,
        raw_bytes: bytes,
        filename: str = "image",
        progress_cb: Optional[Callable[[float, str], None]] = None,
    ) -> PipelineResult:
        """
        Args:
            raw_bytes:   ARW 파일의 바이트
            filename:    결과에 기록할 파일명
            progress_cb: (ratio 0~1, message) 콜백

        Returns:
            PipelineResult
        """

        def tick(ratio: float, msg: str):
            result.logs.append(msg)
            if progress_cb:
                progress_cb(ratio, msg)

        result = PipelineResult(filename=filename)

        try:
            # ── Step 1: RAW 현상 ─────────────────────────────────────
            tick(0.05, "Step 1: RAW 현상 및 AI 노출 최적화...")
            base, dark = self.exposure.process_raw(raw_bytes)
            result.base_raw = base
            result.dark_raw = dark
            tick(0.35, "Step 1 완료 ✓")

            # ── Step 2: 기하 보정 ─────────────────────────────────────
            tick(0.40, "Step 2: MLSD 기하학적 보정 중...")
            warped_list, H, _ = self.geometry.correct(base, dark)
            result.base_warped = warped_list[0]
            result.dark_warped = warped_list[1]
            tick(0.65, "Step 2 완료 ✓")

            # ── Step 3: Window Pull ───────────────────────────────────
            tick(0.70, "Step 3: SAM2 창문 마스킹 및 합성 중...")
            mask = self.segmenter.generate_window_mask(result.base_warped)
            result.window_mask = mask
            result.final = self.segmenter.blend_window(
                result.base_warped,
                result.dark_warped,
                mask,
                method=self.blend_method,
            )
            tick(1.0, "Step 3 완료 ✓  파이프라인 완료!")

        except Exception as e:
            result.error = str(e)
            result.logs.append(f"[오류] {e}")

        return result
