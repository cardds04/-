"""
SAM 2 기반 창문 영역 자동 마스킹 + Window Pull(HDR 합성) 모듈
- SAM 2 AutomaticMaskGenerator로 가장 밝은 '창문' 영역 추출
- cv2.createMergeMertens 또는 Alpha Blending으로 창밖 합성
- SAM 2 없을 시 밝기 임계값 기반 폴백 마스킹
"""

from __future__ import annotations

import cv2
import numpy as np
import torch
from pathlib import Path
from typing import Optional


WEIGHTS_DIR = Path(__file__).parent.parent / "weights"
SAM2_CHECKPOINT = WEIGHTS_DIR / "sam2_hiera_large.pt"
# SAM 2.1 config — 버전별로 시도 순서대로 폴백
SAM2_CONFIGS = [
    "sam2.1/sam2.1_hiera_l",
    "sam2.1_hiera_l",
    "configs/sam2.1/sam2.1_hiera_l",
    "sam2_hiera_l",
]


class SAM2WindowSegmenter:
    """SAM 2로 창문 마스크를 생성하고 HDR 합성을 수행합니다."""

    def __init__(self, device: Optional[str] = None):
        if device:
            self.device = device
        elif torch.cuda.is_available():
            self.device = "cuda"
        elif torch.backends.mps.is_available():
            self.device = "mps"
        else:
            self.device = "cpu"
        self._sam2 = None
        self._predictor = None  # SAM2ImagePredictor (AutomaticMaskGenerator 대체)
        self._use_sam2 = False
        self._try_load_sam2()

    def _try_load_sam2(self):
        if not SAM2_CHECKPOINT.exists():
            print(f"[SAM2] 가중치 없음 ({SAM2_CHECKPOINT}), 임계값 폴백 사용")
            return
        try:
            from sam2.build_sam import build_sam2
            from sam2.sam2_image_predictor import SAM2ImagePredictor

            sam2 = None
            last_err = None
            for cfg in SAM2_CONFIGS:
                try:
                    sam2 = build_sam2(cfg, str(SAM2_CHECKPOINT), device=self.device)
                    print(f"[SAM2] config 로드 성공: {cfg}")
                    break
                except Exception as e:
                    last_err = e
            if sam2 is None:
                raise last_err

            self._sam2 = sam2
            self._predictor = SAM2ImagePredictor(sam2)
            self._use_sam2 = True
            print(f"[SAM2] 모델 로드 완료 (device={self.device})")
        except Exception as e:
            print(f"[SAM2] 로드 실패, 폴백: {e}")

    @property
    def model_loaded(self) -> bool:
        return self._use_sam2

    def generate_window_mask(self, base_img: np.ndarray) -> np.ndarray:
        """
        Base 이미지에서 창문 영역 마스크를 생성합니다.

        Returns:
            mask: (H, W) uint8, 창문=255 / 배경=0
        """
        if self._use_sam2:
            return self._mask_sam2(base_img)
        return self._mask_threshold(base_img)

    def blend_window(
        self,
        base_img: np.ndarray,
        dark_img: np.ndarray,
        mask: np.ndarray,
        method: str = "mertens",
        feather: int = 25,
    ) -> np.ndarray:
        """
        창문 마스크 영역에 dark 이미지를 합성합니다.

        Args:
            base_img: 실내 노출 이미지
            dark_img: 창밖 언더 노출 이미지
            mask:     창문 마스크 (H,W) uint8
            method:   "mertens" | "alpha"
            feather:  마스크 경계 페더링 픽셀 수

        Returns:
            result: 합성 완료 이미지 (H,W,3) uint8
        """
        # 마스크 페더링 (경계를 부드럽게)
        soft_mask = cv2.GaussianBlur(mask.astype(np.float32) / 255.0,
                                      (feather * 2 + 1, feather * 2 + 1), 0)
        soft_mask = soft_mask[:, :, np.newaxis]  # (H,W,1)

        if method == "mertens":
            result = self._blend_mertens(base_img, dark_img, soft_mask)
        else:
            result = self._blend_alpha(base_img, dark_img, soft_mask)

        return result

    def visualize_mask(self, img: np.ndarray, mask: np.ndarray) -> np.ndarray:
        """마스크 영역을 반투명 파란색으로 시각화"""
        overlay = img.copy().astype(np.float32)
        m = mask > 127
        overlay[m] = overlay[m] * 0.5 + np.array([0, 100, 255], dtype=np.float32) * 0.5
        return overlay.astype(np.uint8)

    # ── 내부 구현 ──────────────────────────────────────────────────────────────

    def _mask_sam2(self, img: np.ndarray) -> np.ndarray:
        """
        2단계 전략:
          1) 밝기 분석으로 창문 후보 중심점 추출 (바닥 영역 제외)
          2) SAM 2 ImagePredictor로 해당 중심점 기반 정밀 세그멘테이션
        """
        rgb = img if img.shape[2] == 3 else cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        h, w = rgb.shape[:2]
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)

        # ── Step 1: 밝기 기반 창문 후보 중심점 ─────────────────────────
        thresh_val = float(np.percentile(gray, 82))
        _, binary = cv2.threshold(
            gray.astype(np.uint8), int(thresh_val), 255, cv2.THRESH_BINARY
        )
        kernel15 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        kernel5  = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel15)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN,  kernel5)

        n_comp, labels_comp, stats_comp, centroids_comp = \
            cv2.connectedComponentsWithStats(binary)

        prompt_points: list[tuple[int, int, int]] = []
        for i in range(1, n_comp):
            area = int(stats_comp[i, cv2.CC_STAT_AREA])
            area_ratio = area / (h * w)
            if area_ratio < 0.02 or area_ratio > 0.75:
                continue
            cx, cy = int(centroids_comp[i][0]), int(centroids_comp[i][1])
            # 바닥 영역(하단 30%) 중심점 제외
            if cy > h * 0.72:
                continue
            prompt_points.append((cx, cy, area))

        # 면적 내림차순 상위 4개만
        prompt_points.sort(key=lambda x: -x[2])
        prompt_points = prompt_points[:4]

        # 후보 없으면 이미지 중앙 상단을 기본 포인트로
        if not prompt_points:
            prompt_points = [(w // 2, h // 3, 0)]

        # ── Step 2: SAM 2 정밀 세그멘테이션 ───────────────────────────
        best_mask: Optional[np.ndarray] = None
        best_score = -1.0

        with torch.inference_mode():
            self._predictor.set_image(rgb)

            for cx, cy, _ in prompt_points:
                pt  = np.array([[cx, cy]], dtype=np.float32)
                lbl = np.array([1],       dtype=np.int32)
                try:
                    masks, scores, _ = self._predictor.predict(
                        point_coords=pt,
                        point_labels=lbl,
                        multimask_output=True,
                    )
                    for mask, score in zip(masks, scores):
                        area_ratio = float(mask.sum()) / (h * w)
                        if area_ratio < 0.01 or area_ratio > 0.75:
                            continue

                        brightness = float(gray[mask].mean())

                        # 마스크 하단 30% 비중 → 바닥 포함 시 강하게 페널티
                        bottom = mask[int(h * 0.70):]
                        bottom_ratio = float(bottom.sum()) / max(float(mask.sum()), 1)

                        combined = (
                            brightness   * 0.8
                            + float(score) * 20
                            - bottom_ratio * 120
                        )
                        if combined > best_score:
                            best_score = combined
                            best_mask = mask.copy()
                except Exception:
                    continue

        if best_mask is None:
            return self._mask_threshold(img)

        return (best_mask.astype(np.uint8) * 255)

    def _mask_threshold(self, img: np.ndarray) -> np.ndarray:
        """밝기 임계값 기반 폴백 마스킹"""
        gray = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
        # 상위 15% 밝기 영역을 창문으로 간주
        thresh_val = np.percentile(gray, 85)
        _, binary = cv2.threshold(gray, thresh_val, 255, cv2.THRESH_BINARY)

        # 노이즈 제거 + 팽창으로 창문 윤곽 정리
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN,  cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5,5)))

        # 연결 요소 중 가장 큰 것만 선택 (메인 창문)
        n, labels, stats, _ = cv2.connectedComponentsWithStats(binary)
        if n <= 1:
            return binary
        areas = stats[1:, cv2.CC_STAT_AREA]
        largest = np.argmax(areas) + 1
        mask = np.where(labels == largest, 255, 0).astype(np.uint8)
        return mask

    def _blend_mertens(
        self, base: np.ndarray, dark: np.ndarray, soft_mask: np.ndarray
    ) -> np.ndarray:
        """Mertens 익스포져 퓨전으로 자연스러운 HDR 합성"""
        merge_mertens = cv2.createMergeMertens(contrast_weight=1.0,
                                               saturation_weight=1.0,
                                               exposure_weight=0.0)
        fused = merge_mertens.process([base.astype(np.float32),
                                        dark.astype(np.float32)])
        fused_uint8 = np.clip(fused * 255, 0, 255).astype(np.uint8)

        # 창문 영역에만 fused 적용, 나머지는 base 유지
        result = (base.astype(np.float32) * (1 - soft_mask)
                  + fused_uint8.astype(np.float32) * soft_mask)
        return result.clip(0, 255).astype(np.uint8)

    def _blend_alpha(
        self, base: np.ndarray, dark: np.ndarray, soft_mask: np.ndarray
    ) -> np.ndarray:
        """알파 블렌딩 합성"""
        result = (base.astype(np.float32) * (1 - soft_mask)
                  + dark.astype(np.float32) * soft_mask)
        return result.clip(0, 255).astype(np.uint8)
