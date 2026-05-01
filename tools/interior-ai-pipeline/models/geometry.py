"""
MLSD 기반 기하학적 수직/수평 보정 모듈 (소실점 안정화 버전)
────────────────────────────────────────────────────────────
핵심 알고리즘:
  1. 완화된 각도 필터링 (수직: 55~90°, 수평: 0~35°) + 길이 가중치
  2. 길이 가중 RANSAC으로 수직/수평 소실점(VP) 추정
  3. VP → 카메라 Pitch/Yaw 역산 → 순수 회전 행렬(H) 구성 (Shear 없음)
  4. 코너 변위 15% 초과 시 안전 클램핑
"""

from __future__ import annotations

import cv2
import numpy as np
from pathlib import Path
from typing import Optional


WEIGHTS_DIR = Path(__file__).parent.parent / "weights"


class MLSDGeometryCorrector:
    """MLSD로 선분을 추출하고 투시 보정을 적용합니다."""

    def __init__(self, device: Optional[str] = None):
        import torch
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._detector = None
        self._use_mlsd = False
        self._try_load_model()

    def _try_load_model(self):
        try:
            from controlnet_aux import MLSDdetector
            # 로컬 가중치 파일이 있으면 사용, 없으면 자동 다운로드
            local_pth = WEIGHTS_DIR / "mlsd_large_512_fp32.pth"
            if local_pth.exists():
                self._detector = MLSDdetector.from_pretrained(
                    "lllyasviel/Annotators",
                    cache_dir=str(WEIGHTS_DIR),
                )
            else:
                self._detector = MLSDdetector.from_pretrained("lllyasviel/Annotators")
            self._use_mlsd = True
            print("[MLSD] controlnet_aux MLSDdetector 로드 완료")
        except Exception as e:
            print(f"[MLSD] controlnet_aux 로드 실패, Hough 폴백: {e}")

    @property
    def model_loaded(self) -> bool:
        return self._use_mlsd

    def detect_lines(self, img_rgb: np.ndarray) -> np.ndarray:
        """
        이미지에서 선분을 검출합니다.

        Returns:
            lines: (N, 4) float32 배열, 각 행 = [x1, y1, x2, y2]
        """
        if self._use_mlsd and self._detector is not None:
            return self._detect_mlsd(img_rgb)
        return self._detect_hough(img_rgb)

    def correct(self, *images: np.ndarray) -> tuple[list[np.ndarray], np.ndarray, np.ndarray]:
        """기존 호환 메서드 (Express Mode 등): MLSD 선분 → VP 기반 보정."""
        base = images[0]
        h, w = base.shape[:2]
        lines = self.detect_lines(base)
        lines_vis = self._draw_lines(base.copy(), lines)
        H = self._compute_vp_homography(lines, w, h)
        if H is None:
            H = self._compute_homography(lines, w, h)  # VP 실패 시 구식 폴백
        warped = self._apply_warp(list(images), H, w, h)
        return warped, H, lines_vis

    # ── 후보 A / C ────────────────────────────────────────────────────────────

    def correct_mlsd(self, *images: np.ndarray) -> tuple[list[np.ndarray], Optional[np.ndarray], np.ndarray]:
        """
        후보 A — MLSD 선분 검출 → 소실점 기반 안정화 Pitch/Yaw 보정.
        Shear 없음. 코너 변위 15% 초과 시 자동 클램핑.
        """
        base = images[0]
        h, w = base.shape[:2]
        lines = self._detect_mlsd(base) if self._use_mlsd else self._detect_hough(base)
        tag = "MLSD" if self._use_mlsd else "Hough 폴백"
        lines_vis = self._draw_lines(base.copy(), lines)

        H = self._compute_vp_homography(lines, w, h)
        if H is None:
            print(f"[A-{tag}] VP 계산 불가 → 원본 유지")
        else:
            print(f"[A-{tag}] VP 기반 보정 행렬 계산 완료")
        warped = self._apply_warp(list(images), H, w, h)
        return warped, H, lines_vis

    def correct_manual(
        self, *images: np.ndarray,
        kv: int = 0, kh: int = 0, rotate_deg: float = 0.0,
    ) -> tuple[list[np.ndarray], np.ndarray]:
        """
        후보 C — 수동 슬라이더 투시 보정.

        Args:
            kv: 수직 원근 보정 (-50 ~ +50, 양수 = 위쪽이 좁은 배럴 보정)
            kh: 수평 원근 보정 (-50 ~ +50, 양수 = 왼쪽이 높은 경우 보정)
            rotate_deg: 회전 보정 (-10 ~ +10도)
        """
        base = images[0]
        h, w = base.shape[:2]
        H = self.compute_manual_H(w, h, kv=kv, kh=kh, rotate_deg=rotate_deg)
        warped = self._apply_warp(list(images), H, w, h)
        return warped, H

    def compute_manual_H(
        self, w: int, h: int,
        kv: int = 0, kh: int = 0, rotate_deg: float = 0.0,
    ) -> np.ndarray:
        """
        수동 파라미터로 3×3 호모그래피를 계산합니다 (미리보기용).

        kv > 0: 상단이 좁은 배럴형 원근 보정 (실내 촬영 시 벽이 안쪽으로 기우는 현상)
        kh > 0: 왼쪽이 높아 보이는 수평 원근 보정
        rotate_deg: 수평선 기울기 보정
        """
        H = np.eye(3, dtype=np.float64)

        # 수직 원근 (kv)
        if kv != 0:
            vk = abs(kv) / 100.0 * w * 0.30
            if kv > 0:
                # 위쪽이 좁음 → 위 양쪽 코너를 바깥으로 확장
                src_v = np.float32([[vk, 0], [w-vk, 0], [0, h], [w, h]])
            else:
                # 아래쪽이 좁음 → 아래 양쪽 코너를 바깥으로 확장
                src_v = np.float32([[0, 0], [w, 0], [vk, h], [w-vk, h]])
            dst_v = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
            H_v = cv2.getPerspectiveTransform(src_v, dst_v)
            H = H_v @ H

        # 수평 원근 (kh)
        if kh != 0:
            hk = abs(kh) / 100.0 * h * 0.30
            if kh > 0:
                # 왼쪽이 높아 보임 → 왼쪽 코너를 아래로 당기고, 오른쪽을 위로
                src_h = np.float32([[0, hk], [w, 0], [0, h-hk], [w, h]])
            else:
                # 오른쪽이 높아 보임
                src_h = np.float32([[0, 0], [w, hk], [0, h], [w, h-hk]])
            dst_h = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
            H_h = cv2.getPerspectiveTransform(src_h, dst_h)
            H = H_h @ H

        # 회전
        if abs(rotate_deg) > 0.01:
            cx, cy = w / 2.0, h / 2.0
            M = cv2.getRotationMatrix2D((cx, cy), rotate_deg, 1.0)
            H_r = np.eye(3, dtype=np.float64)
            H_r[:2] = M
            H = H_r @ H

        return H

    def _apply_warp(
        self,
        images: list[np.ndarray],
        H: Optional[np.ndarray],
        w: int,
        h: int,
    ) -> list[np.ndarray]:
        """호모그래피 H를 이미지 목록 전체에 동일하게 적용합니다."""
        warped = []
        for img in images:
            if H is not None:
                out = cv2.warpPerspective(
                    img, H, (w, h),
                    flags=cv2.INTER_LANCZOS4,
                    borderMode=cv2.BORDER_REPLICATE,
                )
            else:
                out = img.copy()
            warped.append(out.astype(np.uint8))
        return warped

    # ── ★ 소실점 기반 안정화 보정 ────────────────────────────────────────────────

    def _compute_vp_homography(
        self, lines: np.ndarray, w: int, h: int
    ) -> Optional[np.ndarray]:
        """
        소실점(VP) → 카메라 Pitch/Yaw 역산 → 순수 회전 H 구성.

        - 수직선들의 VP → pitch 각도
        - 수평선들의 VP → yaw 각도
        - Rx(pitch) @ Ry(-yaw) 회전만 → Shear 완전 제거
        - 최대 보정각: ±25°  |  코너 변위: 15% 초과 시 클램핑
        """
        verticals, horizontals = self._filter_lines(lines)

        cx, cy = w / 2.0, h / 2.0
        f = max(w, h) * 1.2   # 초점거리 추정 (EXIF 없이 합리적 값)
        K = np.array([[f, 0, cx], [0, f, cy], [0, 0, 1]], dtype=np.float64)

        theta_pitch = 0.0
        theta_yaw   = 0.0

        nv, nh = len(verticals), len(horizontals)
        print(f"[VP] 그룹 A(수직) {nv}개 | 그룹 B(수평) {nh}개 | 그룹 C(대각) → 무시됨")

        # ── 수직 소실점 → pitch ───────────────────────────────────────────────
        # 1차: 가장 긴 수직선 2개의 직접 교점 (결정론적)
        # 2차: 직접 교점 실패(평행) 시 상위 8개 가중 RANSAC 폴백
        if nv >= 2:
            vvp = self._intersect_top2(verticals)
            if vvp is None and nv >= 3:
                vvp = self._find_vp_ransac_weighted(verticals[:8], w, h)
            if vvp is not None:
                theta_pitch = float(np.arctan2(vvp[1] - cy, f))
                print(f"[VP_v] top2 교점 ({vvp[0]:.0f}, {vvp[1]:.0f}) "
                      f"→ pitch {np.degrees(theta_pitch):.1f}°")
            else:
                print(f"[VP_v] 수직선 {nv}개 → 교점 불가 (거의 수직)")

        # ── 수평 소실점 → yaw ─────────────────────────────────────────────────
        # 1차: 가장 긴 수평선 2개의 직접 교점
        # 2차: 폴백 RANSAC
        if nh >= 2:
            hvp = self._intersect_top2(horizontals)
            if hvp is None and nh >= 3:
                hvp = self._find_vp_ransac_weighted(horizontals[:8], w, h)
            if hvp is not None:
                theta_yaw = float(np.arctan2(hvp[0] - cx, f))
                print(f"[VP_h] top2 교점 ({hvp[0]:.0f}, {hvp[1]:.0f}) "
                      f"→ yaw {np.degrees(theta_yaw):.1f}°")

        # ── 최대 각도 클램핑 (극단적 변환 방지) ─────────────────────────────
        MAX_RAD = np.radians(25)
        theta_pitch = float(np.clip(theta_pitch, -MAX_RAD, MAX_RAD))
        theta_yaw   = float(np.clip(theta_yaw,   -MAX_RAD, MAX_RAD))

        if abs(theta_pitch) < np.radians(0.3) and abs(theta_yaw) < np.radians(0.3):
            print("[VP] 보정각 < 0.3° → 변환 불필요")
            return None

        # ── 순수 회전 행렬 구성 (Shear 항 = 0) ──────────────────────────────
        cp, sp = np.cos(theta_pitch), np.sin(theta_pitch)
        cy_r, sy = np.cos(theta_yaw),   np.sin(theta_yaw)

        # X축 회전 (pitch): Rx(theta_pitch)
        Rx = np.array([
            [1,   0,    0 ],
            [0,  cp,  -sp ],
            [0,  sp,   cp ],
        ], dtype=np.float64)

        # Y축 회전 (yaw): Ry(-theta_yaw) = Ry^T(theta_yaw)
        Ry_neg = np.array([
            [ cy_r, 0, -sy ],
            [    0, 1,   0 ],
            [   sy, 0, cy_r],
        ], dtype=np.float64)

        R = Rx @ Ry_neg
        H = K @ R @ np.linalg.inv(K)
        H = H / H[2, 2]   # 정규화

        # ── 안전장치: 코너 변위 15% 초과 시 스케일 다운 ─────────────────────
        H = self._clamp_homography(H, w, h, max_overflow=0.15)
        return H

    def _filter_lines(
        self, lines: np.ndarray,
        min_len: float = 20.0,
    ) -> tuple[list, list]:
        """
        각도 기반 3그룹 분류 — 그룹 C(대각선)는 완전 무시.

        그룹 A (수직): arctan2(|dy|, |dx|) ∈ [75°, 90°]  → 수직 VP / Pitch 보정
        그룹 B (수평): arctan2(|dy|, |dx|) ∈ [0°,  15°]  → 수평 VP / Yaw  보정
        그룹 C (대각): (15°, 75°) — 깊이 투시선, 강제 펴기 금지 → 무시
        """
        verticals:   list[tuple] = []
        horizontals: list[tuple] = []

        for x1, y1, x2, y2 in lines:
            dx, dy = float(x2 - x1), float(y2 - y1)
            length = np.hypot(dx, dy)
            if length < min_len:
                continue
            angle = np.degrees(np.arctan2(abs(dy), abs(dx) + 1e-9))  # 0°=수평, 90°=수직
            if angle >= 75:    # 그룹 A: 강한 수직선
                verticals.append((x1, y1, x2, y2))
            elif angle <= 15:  # 그룹 B: 강한 수평선
                horizontals.append((x1, y1, x2, y2))
            # else: 그룹 C (대각선) → 조용히 버림

        _l = lambda s: np.hypot(s[2]-s[0], s[3]-s[1])
        verticals.sort(key=_l, reverse=True)
        horizontals.sort(key=_l, reverse=True)
        return verticals, horizontals

    def _intersect_top2(
        self, lines: list
    ) -> Optional[tuple[float, float]]:
        """
        길이 상위 2개 선분의 소실점을 직접 교점 계산으로 구함.

        lines는 이미 길이 내림차순 정렬된 상태여야 함.
        교점이 이미지 밖 매우 먼 곳 (|VP| > 50×이미지크기)이면
        사실상 평행 → None 반환 (보정 불필요).
        """
        if len(lines) < 2:
            return None
        l1 = np.array(lines[0], dtype=np.float64)
        l2 = np.array(lines[1], dtype=np.float64)
        vp = self._line_intersect(l1, l2)
        if vp is None:
            return None   # 완전 평행 → VP at infinity → 보정 불필요
        # 극단적으로 먼 교점 (≈ 평행) → 무시
        if abs(vp[0]) > 1e5 or abs(vp[1]) > 1e5:
            return None
        return vp

    def _find_vp_ransac_weighted(
        self,
        lines: list,
        w: int,
        h: int,
        n_iter: int = 500,
        thresh: float = 25.0,
    ) -> Optional[tuple[float, float]]:
        """
        길이 × 중앙 근접도 가중 RANSAC 소실점 추정.

        가중치 = 선 길이 × exp(−중심거리 / σ)
          → 이미지 중앙부의 긴 선(창틀·기둥)이 VP 계산을 지배
          → 가장자리 노이즈 선이 자동 억제됨

        샘플링:  가중치 비례 확률 (긴 중앙 선이 더 자주 선택됨)
        점수:   인라이어 가중치 합산 (단순 카운트 대신)
        최소 기준: 인라이어 ≥ 2개
        """
        if len(lines) < 2:
            return None

        arr = np.array(lines, dtype=np.float64)
        cx, cy = w / 2.0, h / 2.0
        sigma  = max(w, h) * 0.40   # 중앙 가중치 감쇠 거리 (40% of max_dim)

        # 가중치 계산: 길이 × 가우시안 중앙 가중치
        weights = np.array([
            np.hypot(r[2]-r[0], r[3]-r[1]) *
            np.exp(-np.hypot((r[0]+r[2])/2.0 - cx,
                             (r[1]+r[3])/2.0 - cy) / sigma)
            for r in arr
        ], dtype=np.float64)

        total = weights.sum()
        if total < 1e-9:
            return None
        probs = weights / total

        rng = np.random.default_rng(42)
        best_vp:    Optional[tuple[float, float]] = None
        best_score: float = 0.0

        for _ in range(n_iter):
            i, j = rng.choice(len(arr), 2, replace=False, p=probs)
            vp = self._line_intersect(arr[i], arr[j])
            if vp is None:
                continue
            # 인라이어 가중치 합 (긴 중앙 선이 높은 점수 기여)
            score = float(sum(
                weights[k]
                for k, l in enumerate(arr)
                if self._pt_to_line_dist(vp, l) < thresh
            ))
            if score > best_score:
                best_score, best_vp = score, vp

        if best_vp is None:
            return None
        inlier_cnt = sum(1 for l in arr if self._pt_to_line_dist(best_vp, l) < thresh)
        return best_vp if inlier_cnt >= 2 else None

    def _line_intersect(
        self, l1: np.ndarray, l2: np.ndarray
    ) -> Optional[tuple[float, float]]:
        """두 직선의 교점 (호모그래피 좌표계, 평행 시 None)"""
        x1,y1,x2,y2 = l1;  x3,y3,x4,y4 = l2
        p1 = np.array([x1, y1, 1.0])
        p2 = np.array([x2, y2, 1.0])
        p3 = np.array([x3, y3, 1.0])
        p4 = np.array([x4, y4, 1.0])
        line_a = np.cross(p1, p2)
        line_b = np.cross(p3, p4)
        pt = np.cross(line_a, line_b)
        if abs(pt[2]) < 1e-6:
            return None
        return float(pt[0] / pt[2]), float(pt[1] / pt[2])

    def _pt_to_line_dist(
        self, pt: tuple[float, float], line: np.ndarray
    ) -> float:
        """점 → 직선(무한 연장) 수직 거리"""
        x1,y1,x2,y2 = line
        px, py = pt
        dx, dy = float(x2-x1), float(y2-y1)
        length = np.hypot(dx, dy)
        if length < 1e-6:
            return float("inf")
        return abs((py - y1) * dx - (px - x1) * dy) / length

    def _clamp_homography(
        self, H: np.ndarray, w: int, h: int, max_overflow: float = 0.15
    ) -> np.ndarray:
        """
        H 적용 후 이미지 코너가 max_overflow 비율 이상 벗어나면
        H를 단위행렬 방향으로 선형 스케일 다운 (보정량 축소).
        """
        corners = np.float32([[0,0],[w,0],[0,h],[w,h]]).reshape(-1,1,2)
        try:
            warped = cv2.perspectiveTransform(corners, H).reshape(-1, 2)
        except Exception:
            return np.eye(3, dtype=np.float64)

        overflow = 0.0
        for wx, wy in warped:
            ox = max(0.0, -wx / w, (wx - w) / w)
            oy = max(0.0, -wy / h, (wy - h) / h)
            overflow = max(overflow, ox, oy)

        if overflow > max_overflow:
            scale = max_overflow / overflow
            I = np.eye(3, dtype=np.float64)
            H_clamped = I + scale * (H - I)
            H_clamped = H_clamped / H_clamped[2, 2]
            print(f"[CLAMP] 변위 {overflow:.1%} → 스케일 {scale:.2f}로 축소")
            return H_clamped
        return H

    # ── 내부 구현 ──────────────────────────────────────────────────────────────

    def _detect_mlsd(self, img_rgb: np.ndarray) -> np.ndarray:
        """controlnet_aux MLSDdetector로 선분 검출"""
        from PIL import Image as PILImage
        h, w = img_rgb.shape[:2]
        pil_img = PILImage.fromarray(img_rgb)

        # MLSDdetector는 선이 그려진 PIL 이미지를 반환
        # output_type="np"로 numpy 배열 직접 수신
        try:
            result = self._detector(pil_img, thr_v=0.05, thr_d=5,
                                    detect_resolution=512, image_resolution=max(h, w),
                                    output_type="np")
        except TypeError:
            # 구버전 API (output_type 미지원)
            result = np.array(self._detector(pil_img, thr_v=0.05, thr_d=5,
                                             detect_resolution=512,
                                             image_resolution=max(h, w)))

        # 결과 이미지에서 흰색 선 픽셀 → HoughLinesP로 좌표 추출
        if result.ndim == 3:
            gray_result = cv2.cvtColor(result, cv2.COLOR_RGB2GRAY)
        else:
            gray_result = result
        gray_result = cv2.resize(gray_result, (w, h))
        raw = cv2.HoughLinesP(gray_result, 1, np.pi / 180, 30,
                               minLineLength=40, maxLineGap=8)
        if raw is None:
            return np.empty((0, 4), dtype=np.float32)
        return raw.reshape(-1, 4).astype(np.float32)

    def _detect_hough(self, img_rgb: np.ndarray) -> np.ndarray:
        """Hough 변환 폴백 선분 검출"""
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        edges = cv2.Canny(gray, 50, 150, apertureSize=3)
        raw = cv2.HoughLinesP(edges, 1, np.pi / 180, 80, minLineLength=60, maxLineGap=10)
        if raw is None:
            return np.empty((0, 4), dtype=np.float32)
        return raw.reshape(-1, 4).astype(np.float32)

    def _compute_homography(self, lines: np.ndarray, w: int, h: int) -> Optional[np.ndarray]:
        """추출된 선분에서 투시 변환 행렬을 계산합니다."""
        if len(lines) < 4:
            return None

        verticals, horizontals = [], []
        for x1, y1, x2, y2 in lines:
            dx, dy = x2 - x1, y2 - y1
            angle = abs(np.degrees(np.arctan2(dy, dx)))
            if angle < 20 or angle > 160:
                horizontals.append((x1, y1, x2, y2))
            elif 70 < angle < 110:
                verticals.append((x1, y1, x2, y2))

        if len(verticals) < 2 or len(horizontals) < 2:
            return None

        # 수직선 그룹: 가장 좌측 / 우측 선 선택
        verts = sorted(verticals, key=lambda l: (l[0] + l[2]) / 2)
        left_v = verts[0];  right_v = verts[-1]

        # 수평선 그룹: 가장 상단 / 하단 선 선택
        horizs = sorted(horizontals, key=lambda l: (l[1] + l[3]) / 2)
        top_h = horizs[0];  bot_h = horizs[-1]

        def intersect(l1, l2):
            x1,y1,x2,y2 = l1;  x3,y3,x4,y4 = l2
            denom = (x1-x2)*(y3-y4) - (y1-y2)*(x3-x4)
            if abs(denom) < 1e-6:
                return None
            t = ((x1-x3)*(y3-y4) - (y1-y3)*(x3-x4)) / denom
            return x1 + t*(x2-x1), y1 + t*(y2-y1)

        tl = intersect(left_v,  top_h)
        tr = intersect(right_v, top_h)
        bl = intersect(left_v,  bot_h)
        br = intersect(right_v, bot_h)

        if any(p is None for p in [tl, tr, bl, br]):
            return None

        src = np.float32([tl, tr, bl, br])
        pad = 0.05
        dst = np.float32([
            [w * pad,       h * pad],
            [w * (1-pad),   h * pad],
            [w * pad,       h * (1-pad)],
            [w * (1-pad),   h * (1-pad)],
        ])

        H, mask = cv2.findHomography(src, dst, cv2.RANSAC, 5.0)
        return H

    def _draw_lines(self, img: np.ndarray, lines: np.ndarray) -> np.ndarray:
        """
        검출된 선분 시각화 (그룹별 색상 구분).
        🟢 초록: 그룹 A (수직, VP 계산 사용)
        🔴 빨강: 그룹 B (수평, VP 계산 사용)
        🔵 파랑 (반투명): 그룹 C (대각선, 무시됨)
        """
        out = img.copy()
        if len(lines) == 0:
            return out
        for x1, y1, x2, y2 in lines:
            dx, dy = float(x2-x1), float(y2-y1)
            angle = np.degrees(np.arctan2(abs(dy), abs(dx) + 1e-9))  # 0~90
            p1, p2 = (int(x1), int(y1)), (int(x2), int(y2))
            if angle >= 75:           # 그룹 A: 수직 → 초록, 굵게
                cv2.line(out, p1, p2, (60, 220, 60), 3)
            elif angle <= 15:         # 그룹 B: 수평 → 빨강, 굵게
                cv2.line(out, p1, p2, (220, 60, 60), 3)
            else:                     # 그룹 C: 대각 → 파랑 가는 선 (무시됨 표시)
                overlay = out.copy()
                cv2.line(overlay, p1, p2, (80, 80, 200), 1)
                cv2.addWeighted(overlay, 0.4, out, 0.6, 0, out)
        return out
