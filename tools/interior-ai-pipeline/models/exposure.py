"""
AI 기반 노출/화이트밸런스 보정 모듈
- rawpy로 ARW 파일을 로드
- 소니 카메라 WB + 톤커브 원본 적용 (Base)
- exp_shift로 하이라이트 보존 언더 현상 (Dark)
"""

from __future__ import annotations

import io as _io

import numpy as np
import rawpy


class ExposureWBProcessor:
    """RAW 파일에서 Base / Dark 이미지 쌍을 생성합니다."""

    # Dark 이미지용 exp_shift: 음수일수록 어두워짐 (단위: EV)
    # rawpy exp_shift 범위: -2.0 ~ +3.0 (내부적으로 2^n 승수)
    DARK_EXP_SHIFT: float = 0.25   # 창밖 하이라이트가 살아있는 언더 노출

    def process_raw(self, raw_bytes: bytes) -> tuple[np.ndarray, np.ndarray]:
        """
        ARW(RAW) 바이트를 받아 (base_img, dark_img) uint8 RGB 배열을 반환합니다.

        Returns:
            base_img: 소니 카메라 원본 WB/톤커브 적용 이미지  (H,W,3) uint8
            dark_img: 창밖 하이라이트 보존 언더 노출 이미지   (H,W,3) uint8
        """
        raw = rawpy.imread(_io.BytesIO(raw_bytes))

        # ── Base 이미지 ──────────────────────────────────────────────────────
        # use_camera_wb      : 소니 원본 화이트밸런스 계수 적용
        # use_camera_matrix  : 소니 색공간 변환 행렬 적용 → 화사한 원본색
        # no_auto_bright=False: rawpy 자동 밝기 허용 (물 빠짐 방지)
        # output_bps=8       : 바로 uint8로 받아 변환 불필요
        base_rgb = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=False,
            output_bps=8,
            half_size=False,
        )  # (H, W, 3) uint8, RGB

        # ── Dark 이미지 (Window Pull용) ──────────────────────────────────────
        # exp_shift           : EV 단위 노출 이동 (수학적 나눗셈 아닌 RAW 레벨 처리)
        # exp_preserve_highlights=1.0: 하이라이트 롤오프 최대 보존
        # no_auto_bright=True : 자동 밝기 보정 끔 → 노출값을 그대로 유지
        dark_rgb = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=True,
            exp_shift=self.DARK_EXP_SHIFT,
            exp_preserve_highlights=1.0,
            output_bps=8,
            half_size=False,
        )  # (H, W, 3) uint8, RGB

        # uint8 보장 (방어적 변환)
        base_uint8 = np.asarray(base_rgb, dtype=np.uint8)
        dark_uint8 = np.asarray(dark_rgb, dtype=np.uint8)

        return base_uint8, dark_uint8
