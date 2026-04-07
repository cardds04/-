#!/usr/bin/env python3
"""
Lightroom 히스토그램 / 노출 슬라이더 좌표를 잡기 위한 보조 도구.

사용 전: 라이트룸을 띄워 두고, 이 터미널 창과 Lightroom 창을 나란히 두는 것이 좋습니다.

  pip install -r requirements.txt
  python pick_coords.py           # 대화형 마법사
  python pick_coords.py --live    # 실시간 (x, y) 출력 (Ctrl+C 종료)
"""

from __future__ import annotations

import argparse
import sys
import time


def main() -> None:
    try:
        import pyautogui
    except ImportError:
        print("pyautogui가 없습니다. 다음을 실행하세요: pip install -r requirements.txt", file=sys.stderr)
        sys.exit(1)

    pyautogui.FAILSAFE = True

    parser = argparse.ArgumentParser(description="화면 좌표 수집 (Lightroom 자동화용)")
    parser.add_argument(
        "--live",
        action="store_true",
        help="마우스 위치를 실시간으로 출력 (비상: 마우스를 화면 모서리로 밀면 중단)",
    )
    args = parser.parse_args()

    if args.live:
        run_live(pyautogui)
        return

    run_wizard(pyautogui)


def run_live(pg) -> None:
    print("실시간 좌표 (FAILSAFE: 모서리로 마우스 이동 시 중단). Ctrl+C 로 종료.\n")
    try:
        while True:
            x, y = pg.position()
            print(f"\r  x={x:5d}  y={y:5d}     ", end="", flush=True)
            time.sleep(0.05)
    except pg.FailSafeException:
        print("\n[FAILSAFE] 모서리 감지 — 중단했습니다.")
    except KeyboardInterrupt:
        print("\n종료.")


def wait_point(pg, title: str) -> tuple[int, int]:
    input(f"\n▶ {title}\n   마우스를 목표 지점으로 옮긴 뒤, 이 창을 클릭하고 Enter 를 누르세요… ")
    return pg.position()


def run_wizard(pg) -> None:
    print(
        """
╔══════════════════════════════════════════════════════════════╗
║  Lightroom 좌표 수집 마법사                                    ║
║  • 마우스를 목표로 옮긴 뒤, 터미널을 클릭하고 Enter           ║
║  • 비상 중단: 마우스를 화면 왼쪽 위 모서리로 급히 밀기        ║
╚══════════════════════════════════════════════════════════════╝
"""
    )

    print("히스토그램은 **직사각형 영역** (x, y, width, height) 이 필요합니다.")
    x1, y1 = wait_point(pg, "1/2 히스토그램 영역의 왼쪽 위 모서리")
    x2, y2 = wait_point(pg, "2/2 히스토그램 영역의 오른쪽 아래 모서리")

    left = min(x1, x2)
    top = min(y1, y2)
    right = max(x1, x2)
    bottom = max(y1, y2)
    w = right - left
    h = bottom - top

    if w < 4 or h < 4:
        print("\n경고: 가로·세로가 너무 작습니다. 다시 실행해 주세요.", file=sys.stderr)

    print("\n--- 노출 슬라이더 ---")
    print("슬라이더 **막대 전체**의 왼쪽 끝·오른쪽 끝을 찍으면 드래그 범위를 자동 계산합니다.")
    sx1, sy1 = wait_point(pg, "3/4 노출 슬라이더 막대의 왼쪽 끝 (트랙 시작)")
    sx2, sy2 = wait_point(pg, "4/4 노출 슬라이더 막대의 오른쪽 끝 (트랙 끝)")

    s_left = min(sx1, sx2)
    s_right = max(sx1, sx2)
    # 세로는 막대 중앙에 맞추기 위해 평균 y 사용 (약간의 오차 허용)
    s_y = int(round((sy1 + sy2) / 2))

    print("\n" + "=" * 60)
    print("아래를 복사해 메인 스크립트 상단에 붙여 넣으면 됩니다.")
    print("=" * 60)
    print()
    print("# --- Lightroom 영역 (pick_coords.py 로 측정) ---")
    print(f"HISTOGRAM_REGION = ({left}, {top}, {w}, {h})  # x, y, width, height")
    print(f"EXPOSURE_SLIDER_TRACK = ({s_left}, {s_right}, {s_y})  # x0, x1, y (가로 드래그)")
    print()
    print("# 피크 x는 HISTOGRAM_REGION 안의 상대 좌표(0..w-1)로 쓰거나,")
    print("# 절대 화면 x = HISTOGRAM_REGION[0] + peak_x_rel")
    print("=" * 60)


if __name__ == "__main__":
    main()
