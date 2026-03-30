#!/usr/bin/env python3
"""
인테리어 사진: Canny + HoughLinesP로 직선 검출 → 기울기 각도 추정 → 회전 후 검은 여백 제거 크롭.
추가로 원근(키스톤) 보정: 검출된 수평·수직선 교차로 사각형을 추정해 투시 변환.

  pip install opencv-python numpy
  python3 tools/interior_opencv_auto_level.py input.jpg -o out.jpg
  python3 tools/interior_opencv_auto_level.py input.jpg -o out.jpg --perspective
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# 1) 직선 검출 (Canny + HoughLinesP)
# ---------------------------------------------------------------------------


def detect_lines_hough(
    gray: np.ndarray,
    *,
    canny_low: int = 50,
    canny_high: int = 150,
    hough_threshold: int = 70,
    min_line_length: int = 55,
    max_line_gap: int = 12,
) -> np.ndarray | None:
    """에지 검출 후 확률적 허프 직선. 반환 shape (N, 1, 4) 또는 None."""
    blur = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(blur, canny_low, canny_high)
    lines = cv2.HoughLinesP(
        edges,
        rho=1,
        theta=np.pi / 180,
        threshold=hough_threshold,
        minLineLength=min_line_length,
        maxLineGap=max_line_gap,
    )
    return lines


def _segment_length(x1: float, y1: float, x2: float, y2: float) -> float:
    return float(math.hypot(x2 - x1, y2 - y1))


def _angle_deg_from_horizontal(x1: float, y1: float, x2: float, y2: float) -> float:
    """수평선 기준 각도 [-90, 90]."""
    ang = math.degrees(math.atan2(y2 - y1, x2 - x1))
    while ang <= -90:
        ang += 180
    while ang > 90:
        ang -= 180
    return ang


# ---------------------------------------------------------------------------
# 2) 기울기 각도 (수평·수직선 기여를 동일 회전으로 통합)
# ---------------------------------------------------------------------------


def _weighted_median_1d(values: list[float], weights: list[float]) -> float | None:
    """가중 중앙값(정렬 누적 가중)."""
    if not values:
        return None
    v = np.asarray(values, dtype=np.float64)
    w = np.asarray(weights, dtype=np.float64)
    if len(v) == 1:
        return float(v[0])
    order = np.argsort(v)
    v = v[order]
    w = w[order]
    cum = np.cumsum(w)
    half = cum[-1] / 2.0
    idx = int(np.searchsorted(cum, half))
    idx = min(max(idx, 0), len(v) - 1)
    return float(v[idx])


def _median_trim(vals: list[float], *, band_deg: float = 7.0) -> float | None:
    """이상치 제거 후 중앙값."""
    if not vals:
        return None
    a = np.asarray(vals, dtype=np.float64)
    if len(a) == 1:
        return float(a[0])
    med = np.median(a)
    a = a[np.abs(a - med) <= band_deg]
    if len(a) == 0:
        return float(med)
    return float(np.median(a))


def estimate_skew_angle_deg(
    lines: np.ndarray | None,
    *,
    min_length: float = 45.0,
    _retry_looser: bool = True,
) -> float:
    """
    검출 선들로 카메라 롤(이미지 평면 내 회전) 추정.

    인테리어에서 타일 대각선·가구 경사 등 **약 30°~55° 대각선은 제외**하고,
    **벽·문·천장선에 가까운 수평·수직**만 사용합니다. 긴 선에 더 큰 가중.
    수평·수직 추정이 어긋나면 **수직(벽) 쪽을 우선**합니다.
    """
    if lines is None or len(lines) == 0:
        return 0.0

    h_vals: list[float] = []
    h_w: list[float] = []
    v_vals: list[float] = []
    v_w: list[float] = []

    for seg in lines[:, 0, :]:
        x1, y1, x2, y2 = (float(seg[0]), float(seg[1]), float(seg[2]), float(seg[3]))
        ln = _segment_length(x1, y1, x2, y2)
        if ln < min_length:
            continue
        ang = _angle_deg_from_horizontal(x1, y1, x2, y2)
        w = float(ln**1.15)

        # 대각선 구간 제외 (45° 부근 타일·사선 가구)
        if abs(ang) < 32:
            h_vals.append(ang)
            h_w.append(w)
        elif abs(ang) > 58:
            v_skew = (ang - 90.0) if ang > 0 else (ang + 90.0)
            v_vals.append(v_skew)
            v_w.append(w)

    def combine() -> float:
        mv = _weighted_median_1d(v_vals, v_w) if len(v_vals) >= 2 else None
        if mv is None and v_vals:
            mv = _median_trim(v_vals)
        mh = _weighted_median_1d(h_vals, h_w) if len(h_vals) >= 2 else None
        if mh is None and h_vals:
            mh = _median_trim(h_vals)

        if mv is not None and mh is not None:
            if abs(mv - mh) <= 3.5:
                return (mv + mh) / 2.0
            return mv
        if mv is not None:
            return mv
        if mh is not None:
            return mh
        return 0.0

    skew = combine()
    # 긴 선이 거의 없어 0°에 가깝게 나온 경우에만, 짧은 선까지 한 번 더 사용
    if _retry_looser and abs(skew) < 0.12 and min_length > 30:
        skew2 = estimate_skew_angle_deg(
            lines,
            min_length=max(30.0, min_length * 0.62),
            _retry_looser=False,
        )
        if abs(skew2) >= abs(skew):
            return float(skew2)
    return float(skew)


def _acute_angle_from_horizontal_0_180(dx: float, dy: float) -> float:
    """선 방향의 수평선 대비 각도 [0, 180). 수직은 90°."""
    a = math.degrees(math.atan2(dy, dx))
    a = a % 180.0
    if a < 0:
        a += 180.0
    return float(a)


def _is_strong_vertical_segment(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    *,
    min_length: float,
    angle_tol_deg: float = 10.0,
) -> tuple[bool, float]:
    """
    수평선 후보는 제외하고, 수평 기준 약 80°~100°(수직 ± angle_tol)인 **강한 수직선**만 통과.
    반환: (통과 여부, 선분 길이)
    """
    ln = _segment_length(x1, y1, x2, y2)
    if ln < min_length:
        return False, ln
    dx, dy = x2 - x1, y2 - y1
    a = _acute_angle_from_horizontal_0_180(dx, dy)
    if abs(a - 90.0) > angle_tol_deg:
        return False, ln
    return True, ln


def vertical_skew_candidates_list(
    lines: np.ndarray | None,
    *,
    min_length: float = 40.0,
) -> list[tuple[float, float]]:
    """
    수직(약 80°~100°)에 가까운 선분만: (왼쪽 끝 x, 롤 추정 각도) 왼쪽→오른쪽.
    원근 수직 보정과 동일한 필터로 '다른 수직' 후보 개수를 맞춤.
    """
    if lines is None or len(lines) == 0:
        return []
    out: list[tuple[float, float]] = []
    for seg in lines[:, 0, :]:
        x1, y1, x2, y2 = (float(seg[0]), float(seg[1]), float(seg[2]), float(seg[3]))
        ok, ln = _is_strong_vertical_segment(
            x1, y1, x2, y2,
            min_length=min_length,
        )
        if not ok:
            continue
        ang = _angle_deg_from_horizontal(x1, y1, x2, y2)
        v_skew = (ang - 90.0) if ang > 0 else (ang + 90.0)
        mx = min(x1, x2)
        out.append((mx, v_skew))
    out.sort(key=lambda t: t[0])
    return out


def estimate_skew_vertical_only_deg(
    lines: np.ndarray | None,
    *,
    candidate_index: int = 0,
    min_length: float = 40.0,
) -> tuple[float, int]:
    """사선 촬영 등: 수평은 쓰지 않고 수직 선만으로 롤 추정. (skew_deg, 후보 개수)."""
    cands = vertical_skew_candidates_list(lines, min_length=min_length)
    if not cands:
        return 0.0, 0
    i = candidate_index % len(cands)
    return float(cands[i][1]), len(cands)


# ---------------------------------------------------------------------------
# 3) 회전 + 검은 여백 제거 크롭
# ---------------------------------------------------------------------------


def rotate_image_full_canvas(
    img: np.ndarray,
    angle_deg: float,
    *,
    border_value: tuple[int, int, int] = (0, 0, 0),
) -> np.ndarray:
    """중심 기준 회전. 캔버스를 확장해 잘리지 않게 함."""
    h, w = img.shape[:2]
    center = (w / 2.0, h / 2.0)
    m = cv2.getRotationMatrix2D(center, angle_deg, 1.0)
    cos = abs(m[0, 0])
    sin = abs(m[0, 1])
    new_w = int(h * sin + w * cos)
    new_h = int(h * cos + w * sin)
    m[0, 2] += new_w / 2 - center[0]
    m[1, 2] += new_h / 2 - center[1]
    return cv2.warpAffine(
        img,
        m,
        (new_w, new_h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=border_value,
    )


def crop_non_black_bbox(
    img: np.ndarray,
    *,
    threshold: int = 1,
) -> np.ndarray:
    """거의 검은 영역을 제외한 최소 축정렬 바운딩 박스로 크롭. uint8 / uint16 모두 지원."""
    if img.dtype == np.uint16:
        if img.ndim == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img
        mask = (gray > 0).astype(np.uint8) * 255
        coords = cv2.findNonZero(mask)
        if coords is None:
            return img
        x, y, cw, ch = cv2.boundingRect(coords)
        return img[y : y + ch, x : x + cw]

    if img.ndim == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
    _, bw = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    coords = cv2.findNonZero(bw)
    if coords is None:
        return img
    x, y, cw, ch = cv2.boundingRect(coords)
    return img[y : y + ch, x : x + cw]


def auto_level_rotate_and_crop(
    img: np.ndarray,
    *,
    skew_deg: float | None = None,
    lines: np.ndarray | None = None,
    canny_low: int = 50,
    canny_high: int = 150,
    hough_threshold: int = 80,
    min_line_length: int = 55,
    max_line_gap: int = 12,
    min_seg_for_skew: float = 45.0,
) -> tuple[np.ndarray, float]:
    """
    skew_deg가 None이면 그레이스케일에서 직선 검출 후 각도 추정.
    반환: (보정 이미지, 적용한 회전각도). 회전은 -skew(롤 보정).
    """
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    if skew_deg is None:
        if gray.dtype == np.uint16:
            gray = (np.clip(gray.astype(np.float32) / 257.0, 0, 255)).astype(
                np.uint8,
            )
        ln = detect_lines_hough(
            gray,
            canny_low=canny_low,
            canny_high=canny_high,
            hough_threshold=hough_threshold,
            min_line_length=min_line_length,
            max_line_gap=max_line_gap,
        )
        if lines is not None:
            ln = lines
        skew_deg = estimate_skew_angle_deg(ln, min_length=min_seg_for_skew)

    rotation = -skew_deg
    rotated = rotate_image_full_canvas(img, rotation)
    cropped = crop_non_black_bbox(rotated)
    return cropped, rotation


# ---------------------------------------------------------------------------
# 4) 원근 보정: 선 교차로 사각형 추정 → 투시 변환
# ---------------------------------------------------------------------------


def _line_intersection_infinite(
    seg_a: tuple[float, float, float, float],
    seg_b: tuple[float, float, float, float],
) -> tuple[float, float] | None:
    """두 선분이 정의하는 무한 직선의 교점."""
    x1, y1, x2, y2 = seg_a
    x3, y3, x4, y4 = seg_b
    denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
    if abs(denom) < 1e-9:
        return None
    px = (
        (x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)
    ) / denom
    py = (
        (x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)
    ) / denom
    return (px, py)


def _classify_line(
    seg: np.ndarray,
) -> tuple[str, tuple[float, float, float, float], float]:
    x1, y1, x2, y2 = float(seg[0]), float(seg[1]), float(seg[2]), float(seg[3])
    ln = _segment_length(x1, y1, x2, y2)
    ang = _angle_deg_from_horizontal(x1, y1, x2, y2)
    s = (x1, y1, x2, y2)
    if abs(ang) < 40:
        return ("h", s, ln)
    if abs(ang) > 50:
        return ("v", s, ln)
    return ("x", s, ln)


def _classify_line_perspective(
    seg: np.ndarray,
) -> tuple[str, tuple[float, float, float, float], float]:
    """원근용: 수평·수직만 조금 더 엄격히 구분."""
    x1, y1, x2, y2 = float(seg[0]), float(seg[1]), float(seg[2]), float(seg[3])
    ln = _segment_length(x1, y1, x2, y2)
    ang = _angle_deg_from_horizontal(x1, y1, x2, y2)
    s = (x1, y1, x2, y2)
    if abs(ang) < 38:
        return ("h", s, ln)
    if abs(ang) > 52:
        return ("v", s, ln)
    return ("x", s, ln)


def _seg_min_x(s: tuple[float, float, float, float]) -> float:
    return min(s[0], s[2])


def _seg_max_x(s: tuple[float, float, float, float]) -> float:
    return max(s[0], s[2])


def _seg_min_y(s: tuple[float, float, float, float]) -> float:
    return min(s[1], s[3])


def _seg_max_y(s: tuple[float, float, float, float]) -> float:
    return max(s[1], s[3])


def _pick_extreme_line(
    lines: list[tuple[str, tuple[float, float, float, float], float]],
    kind: str,
    key: str,
) -> tuple[float, float, float, float] | None:
    """kind: 'h'|'v', key: 'top'|'bottom'|'left'|'right' — 중점 좌표로 극값 선택."""
    pool = [t for t in lines if t[0] == kind]
    if not pool:
        return None

    def mid_y(s: tuple[float, float, float, float]) -> float:
        return (s[1] + s[3]) / 2

    def mid_x(s: tuple[float, float, float, float]) -> float:
        return (s[0] + s[2]) / 2

    if kind == "h":
        pool.sort(key=lambda t: mid_y(t[1]))
        seg = pool[0][1] if key == "top" else pool[-1][1]
    else:
        pool.sort(key=lambda t: mid_x(t[1]))
        seg = pool[0][1] if key == "left" else pool[-1][1]
    return seg


def _pick_boundary_line(
    classified: list[tuple[str, tuple[float, float, float, float], float]],
    kind: str,
    side: str,
) -> tuple[float, float, float, float] | None:
    """
    프레임에 가장 가까운 바깥쪽 대표선.
    - 수직 왼쪽: x가 가장 작은 선(왼쪽 가장자리에 가까움), 길이가 긴 쪽 우선
    - 수직 오른쪽: x가 가장 큰 선
    - 수평 위: y가 가장 작은 선
    - 수평 아래: y가 가장 큰 선
    """
    pool = [t for t in classified if t[0] == kind]
    if not pool:
        return None
    mxl = max(t[2] for t in pool)
    min_keep = max(28.0, mxl * 0.2)
    pool_f = [t for t in pool if t[2] >= min_keep]
    if not pool_f:
        pool_f = pool

    if kind == "v":
        if side == "left":
            chosen = min(pool_f, key=lambda t: (_seg_min_x(t[1]), -t[2]))
        else:
            chosen = max(pool_f, key=lambda t: (_seg_max_x(t[1]), t[2]))
    else:
        if side == "top":
            chosen = min(pool_f, key=lambda t: (_seg_min_y(t[1]), -t[2]))
        else:
            chosen = max(pool_f, key=lambda t: (_seg_max_y(t[1]), t[2]))
    return chosen[1]


def _quad_from_four_lines(
    v_left: tuple[float, float, float, float],
    v_right: tuple[float, float, float, float],
    h_top: tuple[float, float, float, float],
    h_bot: tuple[float, float, float, float],
    img_w: int,
    img_h: int,
) -> np.ndarray | None:
    corners: list[tuple[float, float]] = []
    for va, hb in ((v_left, h_top), (v_right, h_top), (v_right, h_bot), (v_left, h_bot)):
        p = _line_intersection_infinite(va, hb)
        if p is None:
            return None
        corners.append(p)

    margin = max(img_w, img_h) * 0.55
    for px, py in corners:
        if not (-margin <= px <= img_w + margin and -margin <= py <= img_h + margin):
            return None

    quad = np.array(corners, dtype=np.float32)
    area = cv2.contourArea(quad.reshape(1, 4, 2))
    if area < (img_w * img_h) * 0.04:
        return None
    return quad


def estimate_perspective_quad_from_lines(
    lines: np.ndarray | None,
    img_w: int,
    img_h: int,
    *,
    min_length: float = 50.0,
) -> np.ndarray | None:
    """
    수평·수직 후보 중 **이미지 가장자리에 가장 가까운** 네 대표선을 고른 뒤
    네 교점(tl,tr,br,bl)으로 사각형을 만든다.
    실패 시 예전 방식(중점 극값)으로 한 번 더 시도한다.
    """
    if lines is None or len(lines) == 0:
        return None

    classified: list[tuple[str, tuple[float, float, float, float], float]] = []
    for seg in lines[:, 0, :]:
        k, s, ln = _classify_line_perspective(seg)
        if k == "x" or ln < min_length:
            continue
        classified.append((k, s, ln))

    if len(classified) < 4:
        return None

    h_top = _pick_boundary_line(classified, "h", "top")
    h_bot = _pick_boundary_line(classified, "h", "bottom")
    v_left = _pick_boundary_line(classified, "v", "left")
    v_right = _pick_boundary_line(classified, "v", "right")

    quad: np.ndarray | None = None
    if all((h_top, h_bot, v_left, v_right)):
        quad = _quad_from_four_lines(v_left, v_right, h_top, h_bot, img_w, img_h)

    if quad is None:
        classified2: list[tuple[str, tuple[float, float, float, float], float]] = []
        for seg in lines[:, 0, :]:
            k, s, ln = _classify_line(seg)
            if k == "x" or ln < min_length:
                continue
            classified2.append((k, s, ln))
        if len(classified2) < 4:
            return None
        h_top = _pick_extreme_line(classified2, "h", "top")
        h_bot = _pick_extreme_line(classified2, "h", "bottom")
        v_left = _pick_extreme_line(classified2, "v", "left")
        v_right = _pick_extreme_line(classified2, "v", "right")
        if not all((h_top, h_bot, v_left, v_right)):
            return None
        quad = _quad_from_four_lines(v_left, v_right, h_top, h_bot, img_w, img_h)

    return quad


def warp_quad_to_rectangle(
    img: np.ndarray,
    src_quad: np.ndarray,
    *,
    dst_width: int | None = None,
    dst_height: int | None = None,
) -> np.ndarray:
    """
    src_quad: (4,2) float32, 순서 tl, tr, br, bl.
    목적지는 축정렬 직사각형. 크기 미지정 시 원본 변 너비·높이 평균으로 설정.
    """
    tl, tr, br, bl = src_quad
    w1 = float(np.linalg.norm(tr - tl))
    w2 = float(np.linalg.norm(br - bl))
    h1 = float(np.linalg.norm(bl - tl))
    h2 = float(np.linalg.norm(br - tr))
    ow = int(round((w1 + w2) / 2))
    oh = int(round((h1 + h2) / 2))
    if dst_width is not None:
        ow = dst_width
    if dst_height is not None:
        oh = dst_height
    ow = max(ow, 1)
    oh = max(oh, 1)

    dst = np.array(
        [[0, 0], [ow - 1, 0], [ow - 1, oh - 1], [0, oh - 1]],
        dtype=np.float32,
    )
    m = cv2.getPerspectiveTransform(src_quad, dst)
    return cv2.warpPerspective(
        img,
        m,
        (ow, oh),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )


def perspective_correction_from_lines(
    img: np.ndarray,
    *,
    canny_low: int = 50,
    canny_high: int = 150,
    hough_threshold: int = 80,
    min_line_length: int = 50,
    max_line_gap: int = 14,
    min_seg: float = 50.0,
) -> tuple[np.ndarray, bool]:
    """
    직선 검출 → 사각형 추정 → 투시 보정. 실패 시 원본과 False 반환.
    """
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    if gray.dtype == np.uint16:
        gray = (np.clip(gray.astype(np.float32) / 257.0, 0, 255)).astype(np.uint8)
    lines = detect_lines_hough(
        gray,
        canny_low=canny_low,
        canny_high=canny_high,
        hough_threshold=hough_threshold,
        min_line_length=min_line_length,
        max_line_gap=max_line_gap,
    )
    quad = estimate_perspective_quad_from_lines(lines, w, h, min_length=min_seg)
    if quad is None:
        return img, False
    out = warp_quad_to_rectangle(img, quad)
    return out, True


# ---------------------------------------------------------------------------
# 5) 라이트룸식 Vertical: 수직선만 → 투시(warpPerspective) + 강도 + 중심 고정
# ---------------------------------------------------------------------------


def _collect_strong_vertical_segments(
    lines: np.ndarray | None,
    img_w: int,
    img_h: int,
    *,
    min_length: float,
    angle_tol_deg: float = 10.0,
) -> list[tuple[tuple[float, float, float, float], float, float]]:
    """
    수평 후보는 버리고 수직(80°~100°)만. 반환: (선분, 길이, 중점 x) 리스트, 중점 x 오름차순 정렬.
    """
    if lines is None or len(lines) == 0:
        return []
    out: list[tuple[tuple[float, float, float, float], float, float]] = []
    for seg in lines[:, 0, :]:
        x1, y1, x2, y2 = float(seg[0]), float(seg[1]), float(seg[2]), float(seg[3])
        ok, ln = _is_strong_vertical_segment(
            x1, y1, x2, y2,
            min_length=min_length,
            angle_tol_deg=angle_tol_deg,
        )
        if not ok:
            continue
        s = (x1, y1, x2, y2)
        mid_x = (x1 + x2) / 2.0
        out.append((s, ln, mid_x))
    out.sort(key=lambda t: t[2])
    return out


def _collect_horizontal_segments(
    lines: np.ndarray | None,
    img_w: int,
    img_h: int,
    *,
    min_length: float,
    angle_tol_deg: float = 15.0,
) -> list[tuple[tuple[float, float, float, float], float, float]]:
    """수평에 가까운 선만 (원근 full 모드용)."""
    if lines is None or len(lines) == 0:
        return []
    out: list[tuple[tuple[float, float, float, float], float, float]] = []
    for seg in lines[:, 0, :]:
        x1, y1, x2, y2 = float(seg[0]), float(seg[1]), float(seg[2]), float(seg[3])
        ln = _segment_length(x1, y1, x2, y2)
        if ln < min_length:
            continue
        ang = _angle_deg_from_horizontal(x1, y1, x2, y2)
        if abs(ang) > angle_tol_deg:
            continue
        s = (x1, y1, x2, y2)
        mid_y = (y1 + y2) / 2.0
        out.append((s, ln, mid_y))
    out.sort(key=lambda t: t[2])
    return out


def _pick_vertical_pair(
    verts: list[tuple[tuple[float, float, float, float], float, float]],
    vertical_index: int,
) -> tuple[tuple[float, float, float, float], tuple[float, float, float, float]] | None:
    """왼쪽·오른쪽 경계로 쓸 수직선 두 개."""
    n = len(verts)
    if n < 2:
        return None
    i = vertical_index % n
    j = (i + max(1, n // 2)) % n
    if j == i:
        j = (i + 1) % n
    return verts[i][0], verts[j][0]


def _horizontal_image_edge(y: float, img_w: int) -> tuple[float, float, float, float]:
    """y = const 인 무한 직선을 선분으로 표현."""
    return (0.0, y, float(img_w - 1), y)


def _anchor_quad_to_center(
    quad: np.ndarray,
    img_w: float,
    img_h: float,
) -> np.ndarray:
    """투시 보정의 기준을 이미지 중앙에 가깝게 두어 가장자리 과도한 잘림을 줄임."""
    cx, cy = img_w / 2.0, img_h / 2.0
    qc = quad.mean(axis=0)
    shift = np.array([cx - qc[0], cy - qc[1]], dtype=np.float32)
    lim = 0.12 * min(img_w, img_h)
    shift[0] = float(np.clip(shift[0], -lim, lim))
    shift[1] = float(np.clip(shift[1], -lim, lim))
    return (quad.astype(np.float32) + shift).astype(np.float32)


def _blend_src_quads(
    identity: np.ndarray,
    key: np.ndarray,
    strength: float,
) -> np.ndarray:
    """strength 0 = 항등(미보정), 100 = 완전 키스톤 보정."""
    a = float(np.clip(strength / 100.0, 0.0, 1.0))
    return ((1.0 - a) * identity + a * key).astype(np.float32)


def lightroom_style_perspective_warp(
    img: np.ndarray,
    *,
    mode: str,
    vertical_index: int = 0,
    strength: float = 55.0,
    lines: np.ndarray | None = None,
    canny_low: int = 50,
    canny_high: int = 150,
    hough_threshold: int = 70,
    min_line_length: int = 55,
    max_line_gap: int = 12,
    vertical_angle_tol_deg: float = 10.0,
    horizontal_angle_tol_deg: float = 15.0,
) -> tuple[np.ndarray, bool]:
    """
    수직선(약 80°~100°)만으로 좌·우 경계를 잡고, 수평은 full 모드에서만 검출선 사용(실패 시 프레임).
    getPerspectiveTransform + warpPerspective로 수직을 90°에 맞추는 투시 보정.
    """
    h, w = img.shape[:2]
    if w < 8 or h < 8:
        return img, False
    if strength <= 0:
        return img, True

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if img.ndim == 3 else img
    if gray.dtype == np.uint16:
        gray = (np.clip(gray.astype(np.float32) / 257.0, 0, 255)).astype(np.uint8)

    if lines is None:
        lines = detect_lines_hough(
            gray,
            canny_low=canny_low,
            canny_high=canny_high,
            hough_threshold=hough_threshold,
            min_line_length=min_line_length,
            max_line_gap=max_line_gap,
        )

    diag = math.hypot(w, h)
    min_v = max(40.0, min(w, h) * 0.06, diag * 0.04)
    min_h = max(35.0, min(w, h) * 0.05, diag * 0.035)

    verts = _collect_strong_vertical_segments(
        lines,
        w,
        h,
        min_length=min_v,
        angle_tol_deg=vertical_angle_tol_deg,
    )
    pair = _pick_vertical_pair(verts, vertical_index)
    if pair is None:
        return img, False

    v_left, v_right = pair
    tl_test = _line_intersection_infinite(
        v_left,
        _horizontal_image_edge(0.0, w),
    )
    tr_test = _line_intersection_infinite(
        v_right,
        _horizontal_image_edge(0.0, w),
    )
    if tl_test and tr_test and tl_test[0] > tr_test[0]:
        v_left, v_right = v_right, v_left

    if mode == "full":
        hors = _collect_horizontal_segments(
            lines,
            w,
            h,
            min_length=min_h,
            angle_tol_deg=horizontal_angle_tol_deg,
        )
        h_top_seg = _pick_boundary_line(
            [("h", t[0], t[1]) for t in hors],
            "h",
            "top",
        ) if hors else None
        h_bot_seg = _pick_boundary_line(
            [("h", t[0], t[1]) for t in hors],
            "h",
            "bottom",
        ) if hors else None
        if h_top_seg is None:
            h_top_seg = _horizontal_image_edge(0.0, w)
        if h_bot_seg is None:
            h_bot_seg = _horizontal_image_edge(float(h - 1), w)
    else:
        h_top_seg = _horizontal_image_edge(0.0, w)
        h_bot_seg = _horizontal_image_edge(float(h - 1), w)

    quad = _quad_from_four_lines(v_left, v_right, h_top_seg, h_bot_seg, w, h)
    if quad is None:
        return img, False

    quad = _anchor_quad_to_center(quad, float(w), float(h))

    identity = np.array(
        [[0.0, 0.0], [w - 1.0, 0.0], [w - 1.0, h - 1.0], [0.0, h - 1.0]],
        dtype=np.float32,
    )
    dst = identity.copy()
    src_blend = _blend_src_quads(identity, quad, strength)

    area = abs(cv2.contourArea(src_blend.reshape(1, 4, 2)))
    if area < (w * h) * 0.02 or not np.all(np.isfinite(src_blend)):
        return img, False

    m = cv2.getPerspectiveTransform(src_blend, dst)
    if m is None or not np.all(np.isfinite(m)):
        return img, False

    out = cv2.warpPerspective(
        img,
        m,
        (w, h),
        flags=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=(0, 0, 0),
    )
    return out, True


def lightroom_vertical_candidate_count(
    lines: np.ndarray | None,
    img_w: int,
    img_h: int,
) -> int:
    """lightroom_style_perspective_warp와 동일한 기준으로 수직 후보 개수."""
    diag = math.hypot(img_w, img_h)
    min_v = max(40.0, min(img_w, img_h) * 0.06, diag * 0.04)
    return len(
        _collect_strong_vertical_segments(
            lines,
            img_w,
            img_h,
            min_length=min_v,
        ),
    )


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def _draw_lines_debug(
    bgr: np.ndarray,
    lines: np.ndarray | None,
) -> np.ndarray:
    dbg = bgr.copy()
    if lines is None:
        return dbg
    for seg in lines[:, 0, :]:
        x1, y1, x2, y2 = [int(round(v)) for v in seg]
        cv2.line(dbg, (x1, y1), (x2, y2), (0, 255, 0), 1, cv2.LINE_AA)
    return dbg


def draw_lines_debug(bgr: np.ndarray, lines: np.ndarray | None) -> np.ndarray:
    """검출 직선을 원본 위에 녹색으로 그린 디버그 이미지."""
    return _draw_lines_debug(bgr, lines)


def main() -> None:
    ap = argparse.ArgumentParser(
        description="Canny+Hough 직선 → 기울기 보정(회전+크롭), 선택적 원근 보정",
    )
    ap.add_argument("input", type=Path, help="입력 이미지")
    ap.add_argument("-o", "--output", type=Path, required=True, help="출력 이미지")
    ap.add_argument(
        "--perspective",
        action="store_true",
        help="원근 보정(선 기반 사각형)을 회전 보정 후 추가 적용",
    )
    ap.add_argument(
        "--debug-lines",
        type=Path,
        default=None,
        help="검출 직선을 그린 디버그 이미지 저장 경로",
    )
    args = ap.parse_args()

    path = args.input
    if not path.is_file():
        raise SystemExit(f"파일 없음: {path}")

    img = cv2.imread(str(path))
    if img is None:
        raise SystemExit(f"이미지를 읽을 수 없음: {path}")

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    lines = detect_lines_hough(gray)
    if args.debug_lines:
        dbg = _draw_lines_debug(img, lines)
        args.debug_lines.parent.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(args.debug_lines), dbg)

    skew = estimate_skew_angle_deg(lines)
    leveled, rot_deg = auto_level_rotate_and_crop(img, skew_deg=skew)

    if args.perspective:
        leveled, ok = perspective_correction_from_lines(leveled)
        if not ok:
            print(
                "경고: 원근 사각형 추정 실패 — 회전·크롭만 적용했습니다.",
                file=__import__("sys").stderr,
            )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(args.output), leveled)
    print(
        f"저장: {args.output}  (추정 기울기 {skew:.2f}°, 적용 회전 {rot_deg:.2f}°)",
    )


if __name__ == "__main__":
    main()
