"""
스크린샷 캡처 및 이미지 처리 모듈
"""

import io
import pyautogui
import PIL.Image


def take_screenshot() -> PIL.Image.Image:
    """현재 화면 전체를 스크린샷으로 캡처합니다."""
    screenshot = pyautogui.screenshot()
    return screenshot


def screenshot_to_bytes(image: PIL.Image.Image) -> bytes:
    """PIL 이미지를 PNG 바이트로 변환합니다."""
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def get_screen_size() -> tuple[int, int]:
    """현재 화면 해상도를 반환합니다."""
    return pyautogui.size()


def crop_region(image: PIL.Image.Image, x: int, y: int, width: int, height: int) -> PIL.Image.Image:
    """이미지의 특정 영역을 잘라냅니다."""
    return image.crop((x, y, x + width, y + height))


def save_screenshot(image: PIL.Image.Image, path: str) -> None:
    """스크린샷을 파일로 저장합니다."""
    image.save(path)
