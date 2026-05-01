"""
컴퓨터 제어 액션 실행 모듈
pyautogui를 사용하여 마우스/키보드를 제어합니다.
"""

import time
import pyautogui
from rich.console import Console

console = Console()

# pyautogui 안전 설정
pyautogui.FAILSAFE = True   # 마우스를 화면 모서리로 이동하면 즉시 중단
pyautogui.PAUSE = 0.3       # 각 액션 사이 기본 대기 시간 (초)


def execute_action(action: dict) -> str:
    """
    Gemini가 반환한 액션 딕셔너리를 실행합니다.

    지원 액션 타입:
      - click: 마우스 클릭
      - double_click: 더블 클릭
      - right_click: 우클릭
      - move: 마우스 이동
      - drag: 드래그
      - type: 텍스트 입력
      - key: 키보드 단축키
      - scroll: 스크롤
      - wait: 대기
      - done: 작업 완료
    """
    action_type = action.get("type", "").lower()

    try:
        if action_type == "click":
            x, y = int(action["x"]), int(action["y"])
            pyautogui.click(x, y)
            return f"클릭: ({x}, {y})"

        elif action_type == "double_click":
            x, y = int(action["x"]), int(action["y"])
            pyautogui.doubleClick(x, y)
            return f"더블 클릭: ({x}, {y})"

        elif action_type == "right_click":
            x, y = int(action["x"]), int(action["y"])
            pyautogui.rightClick(x, y)
            return f"우클릭: ({x}, {y})"

        elif action_type == "move":
            x, y = int(action["x"]), int(action["y"])
            duration = float(action.get("duration", 0.3))
            pyautogui.moveTo(x, y, duration=duration)
            return f"마우스 이동: ({x}, {y})"

        elif action_type == "drag":
            x1, y1 = int(action["x1"]), int(action["y1"])
            x2, y2 = int(action["x2"]), int(action["y2"])
            duration = float(action.get("duration", 0.5))
            pyautogui.moveTo(x1, y1, duration=0.2)
            pyautogui.dragTo(x2, y2, duration=duration, button="left")
            return f"드래그: ({x1},{y1}) → ({x2},{y2})"

        elif action_type == "type":
            text = action.get("text", "")
            interval = float(action.get("interval", 0.05))
            pyautogui.typewrite(text, interval=interval)
            return f"텍스트 입력: '{text}'"

        elif action_type == "key":
            keys = action.get("keys", action.get("text", ""))
            if isinstance(keys, list):
                pyautogui.hotkey(*keys)
                return f"키 입력: {'+'.join(keys)}"
            else:
                pyautogui.press(keys)
                return f"키 입력: {keys}"

        elif action_type == "scroll":
            x = int(action.get("x", pyautogui.position().x))
            y = int(action.get("y", pyautogui.position().y))
            amount = int(action.get("amount", 3))
            direction = action.get("direction", "down")
            clicks = amount if direction == "up" else -amount
            pyautogui.scroll(clicks, x=x, y=y)
            return f"스크롤 {direction}: ({x},{y}), 양={amount}"

        elif action_type == "wait":
            seconds = float(action.get("seconds", 1.0))
            time.sleep(seconds)
            return f"대기: {seconds}초"

        elif action_type == "screenshot":
            return "스크린샷 요청"

        elif action_type == "done":
            message = action.get("message", "작업이 완료되었습니다.")
            return f"완료: {message}"

        else:
            return f"알 수 없는 액션 타입: {action_type}"

    except pyautogui.FailSafeException:
        raise RuntimeError("FailSafe 발동: 마우스가 화면 모서리에 닿았습니다. 프로그램을 종료합니다.")
    except Exception as e:
        return f"액션 실행 오류 ({action_type}): {e}"
