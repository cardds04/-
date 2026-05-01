"""
렌즈 왜곡 보정 모듈 (업그레이드 버전)
────────────────────────────────────────
우선순위:
  1. lensfunpy + EXIF → 자동 렌즈 프로필 보정 (Lightroom 방식)
  2. 폴백: OpenCV k1 슬라이더 수동 보정

사용 패키지:
  pip install lensfunpy exifread
"""

from __future__ import annotations

import io as _io
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np


# ── EXIF 정보 컨테이너 ────────────────────────────────────────────────────────

@dataclass
class ExifInfo:
    make:         str   = "Unknown"
    model:        str   = "Unknown"
    lens_model:   str   = "Unknown"
    focal_length: float = 24.0
    aperture:     float = 8.0

    @property
    def display(self) -> str:
        return (
            f"📷 **{self.make} {self.model}** / "
            f"{self.lens_model} "
            f"({self.focal_length:.0f}mm · f/{self.aperture:.1f})"
        )


def read_exif(raw_bytes: bytes) -> ExifInfo:
    """
    exifread로 ARW EXIF 메타데이터를 파싱합니다.
    실패 시 기본값 ExifInfo 반환.
    """
    try:
        import exifread
        tags = exifread.process_file(_io.BytesIO(raw_bytes), details=False)

        def tag(key: str, default="Unknown"):
            t = tags.get(key)
            return str(t) if t is not None else default

        def ratio(key: str, default: float) -> float:
            t = tags.get(key)
            if t is None:
                return default
            try:
                v = t.values[0]
                return float(v.num) / float(v.den) if hasattr(v, "num") else float(str(v))
            except Exception:
                return default

        return ExifInfo(
            make         = tag("Image Make"),
            model        = tag("Image Model"),
            lens_model   = tag("EXIF LensModel", tag("MakerNote LensType", "Unknown")),
            focal_length = ratio("EXIF FocalLength", 24.0),
            aperture     = ratio("EXIF FNumber", 8.0),
        )
    except Exception as e:
        print(f"[EXIF] 읽기 실패: {e}")
        return ExifInfo()


# ── Lensfun 자동 보정 결과 ────────────────────────────────────────────────────

@dataclass
class LensfunResult:
    success:     bool       = False
    camera_name: str        = ""
    lens_name:   str        = ""
    error:       str        = ""


# ── 메인 클래스 ───────────────────────────────────────────────────────────────

class LensDistortionCorrector:
    """
    EXIF + lensfunpy 기반 자동 렌즈 보정.
    lensfunpy 없거나 DB 미스 시 OpenCV 수동 슬라이더로 폴백.
    """

    K1_SCALE = 200.0   # slider(-100~+100) / scale = k1 왜곡계수

    def __init__(self):
        self._lensfun_ok = self._check_lensfun()

    def _check_lensfun(self) -> bool:
        try:
            import lensfunpy  # noqa: F401
            return True
        except ImportError:
            print("[Lens] lensfunpy 없음 → 수동 슬라이더 폴백")
            return False

    @property
    def lensfun_available(self) -> bool:
        return self._lensfun_ok

    # ── 자동 보정 (lensfunpy) ─────────────────────────────────────────────────

    def auto_correct(
        self,
        img: np.ndarray,
        exif: ExifInfo,
    ) -> tuple[np.ndarray, LensfunResult]:
        """
        EXIF 정보로 lensfun DB를 조회해 자동 왜곡 보정.

        Returns:
            corrected: 보정된 이미지 (실패 시 원본 반환)
            result:    LensfunResult (성공 여부, 인식된 장비명 등)
        """
        if not self._lensfun_ok:
            return img, LensfunResult(error="lensfunpy 미설치")

        try:
            import lensfunpy

            db  = lensfunpy.Database()
            h, w = img.shape[:2]

            # 카메라 검색
            cameras = db.find_cameras(exif.make, exif.model, loose_search=True)
            if not cameras:
                return img, LensfunResult(error=f"카메라 DB 미스: {exif.make} {exif.model}")
            cam = cameras[0]

            # 렌즈 검색
            lenses = db.find_lenses(cam, exif.lens_model, loose_search=True)
            if not lenses:
                # 렌즈명 없을 때 카메라 기준으로만 재검색
                lenses = db.find_lenses(cam, loose_search=True)
            if not lenses:
                return img, LensfunResult(error=f"렌즈 DB 미스: {exif.lens_model}")
            lens = lenses[0]

            # Modifier 생성 및 왜곡 보정
            mod = lensfunpy.Modifier(lens, cam.crop_factor, w, h)
            mod.initialize(
                exif.focal_length,
                exif.aperture,
                distance=10.0,
                scale=1.0,
            )

            # 기하 왜곡 보정 좌표 맵
            und_coords = mod.apply_geometry_distortion()
            # lensfunpy 좌표를 OpenCV remap 형식으로 변환
            map_x = und_coords[..., 0].astype(np.float32)
            map_y = und_coords[..., 1].astype(np.float32)

            corrected = cv2.remap(
                img, map_x, map_y,
                interpolation=cv2.INTER_LANCZOS4,
                borderMode=cv2.BORDER_REPLICATE,
            )

            return corrected.astype(np.uint8), LensfunResult(
                success=True,
                camera_name=f"{cam.maker} {cam.model}",
                lens_name=lens.model,
            )

        except Exception as e:
            return img, LensfunResult(error=str(e))

    # ── 수동 보정 (OpenCV 슬라이더 폴백) ─────────────────────────────────────

    def correct(self, img: np.ndarray, slider_value: int) -> np.ndarray:
        """
        k1 슬라이더 기반 OpenCV undistort.
        slider_value: -100(배럴 최대) ~ 0(없음) ~ +100(핀쿠션)
        """
        if slider_value == 0:
            return img

        h, w = img.shape[:2]
        K, dist = self._build_cv_params(w, h, slider_value)
        new_K, roi = cv2.getOptimalNewCameraMatrix(K, dist, (w, h), alpha=0.5)
        out = cv2.undistort(img, K, dist, None, new_K)

        x, y, rw, rh = roi
        if rw > 0 and rh > 0:
            out = cv2.resize(out[y:y+rh, x:x+rw], (w, h),
                             interpolation=cv2.INTER_LANCZOS4)
        return out.astype(np.uint8)

    def preview(self, img: np.ndarray, slider_value: int, max_width: int = 1000) -> np.ndarray:
        """수동 보정 미리보기 (축소 후 처리 → 빠름)"""
        h, w = img.shape[:2]
        if w > max_width:
            s = max_width / w
            img = cv2.resize(img, (int(w*s), int(h*s)), interpolation=cv2.INTER_AREA)
        return self.correct(img, slider_value)

    def auto_preview(
        self, img: np.ndarray, exif: ExifInfo, max_width: int = 1000
    ) -> tuple[np.ndarray, LensfunResult]:
        """자동 보정 미리보기 (축소 후 처리 → 빠름)"""
        h, w = img.shape[:2]
        if w > max_width:
            s = max_width / w
            small = cv2.resize(img, (int(w*s), int(h*s)), interpolation=cv2.INTER_AREA)
        else:
            small = img
        return self.auto_correct(small, exif)

    # ── 내부 유틸 ─────────────────────────────────────────────────────────────

    def _build_cv_params(self, w, h, slider):
        diag = (w**2 + h**2) ** 0.5
        fx = fy = diag * 0.9
        K = np.array([[fx, 0, w/2], [0, fy, h/2], [0, 0, 1]], dtype=np.float64)
        dist = np.array([slider / self.K1_SCALE, 0, 0, 0, 0], dtype=np.float64)
        return K, dist
