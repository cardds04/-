#!/usr/bin/env python3
"""
Lightroom 노출 슬라이더 자동 미세 조정 (히스토그램 산봉우리 → 목표 비율 지점).

목표: 산봉우리가 히스토그램 박스 전체 너비 기준 왼쪽에서 지정 비율(기본 33%)에 오도록 조정.

pick_coords.py 로 측정한 좌표를 사용합니다. GUI: python auto_exposure_gui.py
"""

from __future__ import annotations

import sys
import time
from typing import Any

import cv2
import numpy as np
import pyautogui
from PIL import Image

# --- pick_coords.py 로 수집한 값 ---
HISTOGRAM_REGION = (2256, 112, 261, 109)  # x, y, width, height
EXPOSURE_SLIDER_TRACK = (2343, 2456, 914)  # x0, x1, y (가로 트랙)

# 기본 목표: 너비의 약 33%
DEFAULT_TARGET_RATIO = 0.33

# 피크가 이 픽셀 이내면 수렴으로 간주
TOLERANCE_PX = 4

# 최대 조정 횟수, 루프 사이 대기(초) — pyautogui.PAUSE 와 별도
MAX_ITERATIONS = 3
LOOP_INTERVAL_SEC = 0.5

# 드래그 이동량에 곱하는 기본 강도 (GUI에서 덮어쓸 수 있음)
DEFAULT_ADJUSTMENT_STRENGTH = 1.0


def target_peak_x_from_ratio(hist_width: int, ratio: float) -> int:
    """히스토그램 상대 x 인덱스 (0..width-1 근사)."""
    ratio = float(np.clip(ratio, 0.02, 0.98))
    return int(round(hist_width * ratio))


TARGET_PEAK_X = target_peak_x_from_ratio(HISTOGRAM_REGION[2], DEFAULT_TARGET_RATIO)


def capture_histogram_bgr(region: tuple[int, int, int, int]) -> np.ndarray:
    """pyautogui.screenshot 으로 영역만 캡처 → OpenCV BGR ndarray."""
    left, top, w, h = region
    shot = pyautogui.screenshot(region=(left, top, w, h))
    # 맥·레티나 등에서 RGBA(4채널)·L(그레이) 로 오는 경우가 있어 RGB 로 통일
    if isinstance(shot, Image.Image):
        pil_rgb = shot.convert("RGB")
        rgb = np.asarray(pil_rgb)
    else:
        rgb = np.asarray(shot)
        if rgb.ndim == 2:
            rgb = cv2.cvtColor(rgb, cv2.COLOR_GRAY2RGB)
        elif rgb.ndim == 3 and rgb.shape[2] == 4:
            rgb = rgb[:, :, :3]
        elif rgb.ndim != 3 or rgb.shape[2] != 3:
            raise ValueError(
                f"스크린샷 채널을 RGB 로 맞출 수 없습니다 (shape={getattr(rgb, 'shape', None)})."
            )
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def peak_x_brightest_column(bgr: np.ndarray) -> int:
    """
    열마다 밝기 합을 구해 가장 밝게 쌓인(산봉우리) 열의 x 인덱스.
    그레이스케일 합 = 히스토그램 막대 '높이' 근사.
    """
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    col_sum = gray.sum(axis=0).astype(np.float64)
    peak = int(np.argmax(col_sum))
    return peak


def histogram_to_slider_x(peak_rel: int, hist_w: int, x0: int, x1: int) -> int:
    """히스토그램 상대 x → 슬라이더 트랙 위의 대응 x (선형 가정)."""
    if hist_w <= 1:
        return (x0 + x1) // 2
    t = peak_rel / (hist_w - 1)
    return int(round(x0 + t * (x1 - x0)))


def plan_from_bgr(
    bgr: np.ndarray,
    hist_region: tuple[int, int, int, int],
    track: tuple[int, int, int],
    target_peak_x: int,
    strength: float = 1.0,
) -> dict[str, Any]:
    """
    이미 캡처한 히스토그램 BGR 로 피크·슬라이더 이동량만 계산 (재캡처 없음).
    """
    _left, _top, w, h = hist_region
    x0, x1, ty = track
    if x0 > x1:
        x0, x1 = x1, x0

    hh, ww = bgr.shape[:2]
    if ww != w or hh != h:
        raise ValueError(
            f"캡처 크기 {ww}×{hh} 가 HISTOGRAM_REGION 너비·높이 {w}×{h} 와 맞지 않습니다."
        )

    peak_x = peak_x_brightest_column(bgr)

    delta_hist = target_peak_x - peak_x
    track_w = x1 - x0
    delta_slider = delta_hist * track_w / max(w - 1, 1)
    delta_slider_scaled = int(round(delta_slider * float(strength)))

    start_x = histogram_to_slider_x(peak_x, w, x0, x1)
    end_x = int(np.clip(start_x + delta_slider_scaled, x0, x1))

    return {
        "bgr": bgr,
        "peak_x": peak_x,
        "target_peak_x": target_peak_x,
        "delta_hist": delta_hist,
        "delta_slider_raw": int(round(delta_slider)),
        "delta_slider_applied": delta_slider_scaled,
        "start_x": start_x,
        "end_x": end_x,
        "track_y": ty,
        "hist_w": w,
        "hist_h": h,
        "track_x0": x0,
        "track_x1": x1,
    }


def capture_looks_blank(bgr: np.ndarray) -> bool:
    """권한 부족·잘못된 좌표로 검은 캡처가 났는지 대략 판별."""
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    return float(gray.max()) < 6.0 and float(gray.mean()) < 2.5


def compute_adjustment_plan(
    hist_region: tuple[int, int, int, int],
    track: tuple[int, int, int],
    target_peak_x: int,
    strength: float = 1.0,
) -> dict[str, Any]:
    """
    캡처·피크·슬라이더 이동량 계산 (드래그는 하지 않음).
    strength: 1.0=전체 보정, 0.5=절반만 드래그 등.
    """
    bgr = capture_histogram_bgr(hist_region)
    return plan_from_bgr(bgr, hist_region, track, target_peak_x, strength=strength)


def draw_preview_overlay(
    bgr: np.ndarray,
    peak_x: int,
    target_x: int,
    *,
    draw_profile: bool = True,
) -> np.ndarray:
    """피크(빨강)·목표(녹색) 세로선 + 선택 시 하단 열 합 프로파일."""
    out = bgr.copy()
    hh, ww = out.shape[:2]
    px = int(np.clip(peak_x, 0, ww - 1))
    tx = int(np.clip(target_x, 0, ww - 1))

    cv2.line(out, (px, 0), (px, hh - 1), (0, 0, 255), 2)
    cv2.line(out, (tx, 0), (tx, hh - 1), (0, 220, 0), 2)
    cv2.putText(
        out,
        f"peak {px}",
        (max(4, px - 40), 18),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (0, 0, 255),
        1,
        cv2.LINE_AA,
    )
    cv2.putText(
        out,
        f"goal {tx}",
        (max(4, tx - 40), 36),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.45,
        (0, 220, 0),
        1,
        cv2.LINE_AA,
    )

    if draw_profile and ww > 1:
        gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
        col_sum = gray.sum(axis=0).astype(np.float64)
        mx = float(col_sum.max()) + 1e-6
        bar_h = max(8, int(hh * 0.22))
        y_base = hh - 2
        for x in range(ww):
            t = col_sum[x] / mx
            y1 = y_base - int(t * bar_h)
            cv2.line(out, (x, y_base), (x, y1), (180, 180, 255), 1)

    return out


def adjust_exposure_once(
    hist_region: tuple[int, int, int, int],
    track: tuple[int, int, int],
    target_peak_x: int,
    strength: float = 1.0,
) -> tuple[int, int]:
    """
    한 번: 스샷 → 피크 → 목표와의 차이만큼 트랙 위에서 dragTo.
    반환: (peak_x, |peak - target|)
    """
    x0, x1, ty = track
    if x0 > x1:
        x0, x1 = x1, x0

    plan = compute_adjustment_plan(hist_region, track, target_peak_x, strength=strength)
    peak_x = plan["peak_x"]
    start_x = plan["start_x"]
    end_x = plan["end_x"]

    pyautogui.moveTo(start_x, ty, duration=0.2)
    pyautogui.dragTo(end_x, ty, duration=0.35, button="left")

    return peak_x, abs(peak_x - target_peak_x)


def main() -> None:
    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.5

    target_x = target_peak_x_from_ratio(HISTOGRAM_REGION[2], DEFAULT_TARGET_RATIO)

    print("3초 후 시작 — Lightroom 창을 앞으로 두세요. 비상: 마우스를 왼쪽 위 모서리로.")
    time.sleep(3)

    try:
        for i in range(MAX_ITERATIONS):
            peak_x, err_before = adjust_exposure_once(
                HISTOGRAM_REGION,
                EXPOSURE_SLIDER_TRACK,
                target_x,
                strength=DEFAULT_ADJUSTMENT_STRENGTH,
            )
            print(f"[{i + 1}/{MAX_ITERATIONS}] 피크 x ≈ {peak_x} (목표 {target_x}, 오차 {err_before}px)")

            time.sleep(LOOP_INTERVAL_SEC)

            bgr = capture_histogram_bgr(HISTOGRAM_REGION)
            peak_after = peak_x_brightest_column(bgr)
            err_after = abs(peak_after - target_x)
            print(f"         재측정 피크 x ≈ {peak_after} (오차 {err_after}px)")

            if err_after <= TOLERANCE_PX:
                print("목표 범위 안에 들어왔습니다.")
                return

        print("최대 반복에 도달했습니다. 목표에 덜 맞을 수 있어 좌표·스케일을 조정해 보세요.")
    except pyautogui.FailSafeException:
        print("\n[FAILSAFE] 중단했습니다.", file=sys.stderr)
        sys.exit(130)


if __name__ == "__main__":
    main()
