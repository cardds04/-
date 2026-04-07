#!/usr/bin/env python3
"""
라이트룸 사진 작업 영역을 캡처 → Gemini Vision에 노출 질문 →
응답 숫자를 슬라이더 트랙 x로 매핑해 드래그.

  pip install google-generativeai pyautogui Pillow

설정 파일(권장):
  cp gemini_exposure_config.example.json gemini_exposure_config.json
  # JSON에 좌표·프롬프트·모델명 등 수정
  python gemini_exposure_suggest.py
  python gemini_exposure_suggest.py --config ~/my_lr_gemini.json

스크립트와 같은 폴더에 gemini_exposure_config.json 이 있으면 자동으로 읽습니다.
API 키는 JSON의 gemini_api_key 또는 환경 변수 GEMINI_API_KEY.

실행 전 Lightroom을 앞에 두고 photo_work_region 이 작업 영역을 덮도록 맞추세요.
GUI: python gemini_exposure_gui.py
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any

import pyautogui
from PIL import Image

# ---------------------------------------------------------------------------
# 기본값(설정 파일 없을 때). 설정 JSON이 있으면 그쪽이 우선입니다.
# ---------------------------------------------------------------------------
GEMINI_API_KEY = ""  # 비우면 환경 변수 GEMINI_API_KEY
PHOTO_WORK_REGION = (400, 120, 1400, 900)
EXPOSURE_SLIDER_TRACK = (2343, 2456, 914)
EXPOSURE_MIN = -5.0
EXPOSURE_MAX = 5.0
COUNTDOWN_SEC = 3
MODEL = "gemini-3.1-pro-preview"
PROMPT = (
    "이건 인테리어 사진이야. 화이트톤을 살리면서 암부가 뭉치지 않게 하려면 "
    "노출(Exposure)을 -5.0에서 +5.0 사이 값 중 얼마로 조정하면 좋을까? 숫자만 답해줘."
)

CONFIG_FILENAME = "gemini_exposure_config.json"


def _script_dir() -> Path:
    return Path(__file__).resolve().parent


def default_config_dict() -> dict[str, Any]:
    return {
        "model": MODEL,
        "gemini_api_key": GEMINI_API_KEY,
        "photo_work_region": list(PHOTO_WORK_REGION),
        "exposure_slider_track": list(EXPOSURE_SLIDER_TRACK),
        "exposure_min": EXPOSURE_MIN,
        "exposure_max": EXPOSURE_MAX,
        "countdown_sec": COUNTDOWN_SEC,
        "prompt": PROMPT,
    }


def load_config_file(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"설정 파일은 JSON 객체여야 합니다: {path}")
    return raw


def resolve_config_path(explicit: Path | None) -> Path | None:
    if explicit is not None:
        return explicit
    candidate = _script_dir() / CONFIG_FILENAME
    return candidate if candidate.is_file() else None


def merge_config(user: dict[str, Any]) -> dict[str, Any]:
    base = default_config_dict()
    for k, v in user.items():
        if v is None:
            continue
        if k in base:
            base[k] = v
    return base


def validate_config(cfg: dict[str, Any]) -> dict[str, Any]:
    pr = cfg["photo_work_region"]
    tr = cfg["exposure_slider_track"]
    if not (isinstance(pr, list) and len(pr) == 4):
        raise ValueError("photo_work_region 은 [left, top, width, height] 네 정수여야 합니다.")
    if not (isinstance(tr, list) and len(tr) == 3):
        raise ValueError("exposure_slider_track 은 [x0, x1, y] 세 정수여야 합니다.")
    cfg["photo_work_region"] = tuple(int(x) for x in pr)
    cfg["exposure_slider_track"] = tuple(int(x) for x in tr)
    cfg["exposure_min"] = float(cfg["exposure_min"])
    cfg["exposure_max"] = float(cfg["exposure_max"])
    cfg["countdown_sec"] = float(cfg["countdown_sec"])
    cfg["model"] = str(cfg["model"]).strip()
    cfg["prompt"] = str(cfg["prompt"])
    if cfg["exposure_min"] >= cfg["exposure_max"]:
        raise ValueError("exposure_min 은 exposure_max 보다 작아야 합니다.")
    return cfg


def get_api_key(from_config: str | None = None) -> str:
    k = (str(from_config or "").strip() or GEMINI_API_KEY or "").strip()
    if k:
        return k
    return (os.environ.get("GEMINI_API_KEY") or "").strip()


def capture_work_region(region: tuple[int, int, int, int]) -> Image.Image:
    left, top, w, h = region
    shot = pyautogui.screenshot(region=(left, top, w, h))
    if isinstance(shot, Image.Image):
        return shot.convert("RGB")
    import numpy as np

    return Image.fromarray(np.asarray(shot)).convert("RGB")


def ask_gemini_exposure(
    pil_image: Image.Image,
    api_key: str,
    *,
    model_name: str,
    prompt: str,
) -> str:
    try:
        import google.generativeai as genai
    except ImportError as e:
        raise SystemExit(
            "google-generativeai 가 필요합니다: pip install google-generativeai"
        ) from e

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content([prompt, pil_image])
    try:
        text = (response.text or "").strip()
    except ValueError as e:
        cand = response.candidates[0] if response.candidates else None
        reason = getattr(getattr(cand, "finish_reason", None), "name", None) or cand
        raise RuntimeError(f"Gemini 텍스트를 읽을 수 없습니다 (finish: {reason}).") from e
    if not text:
        raise RuntimeError("Gemini 응답이 비었습니다. safety 또는 입력 이미지를 확인하세요.")
    return text


def parse_exposure_number(text: str) -> float:
    """응답에서 첫 실수 추출."""
    t = text.replace("−", "-").replace("—", "-")
    m = re.search(r"[-+]?\d+(?:\.\d+)?", t)
    if not m:
        raise ValueError(f"숫자를 찾을 수 없습니다: {text!r}")
    return float(m.group())


def exposure_to_slider_x(
    value: float,
    x0: int,
    x1: int,
    *,
    ev_min: float,
    ev_max: float,
) -> int:
    """[ev_min, ev_max] 선형 매핑 → 트랙 x."""
    if x0 > x1:
        x0, x1 = x1, x0
    v = max(ev_min, min(ev_max, value))
    t = (v - ev_min) / (ev_max - ev_min)
    return int(round(x0 + t * (x1 - x0)))


def move_exposure_slider(target_x: int, track_y: int, x0: int, x1: int) -> None:
    """트랙 위에서 목표 x로 드래그 (시작점은 트랙 중앙 근처)."""
    if x0 > x1:
        x0, x1 = x1, x0
    mid = (x0 + x1) // 2
    tx = max(x0, min(x1, target_x))
    pyautogui.moveTo(mid, track_y, duration=0.2)
    pyautogui.dragTo(tx, track_y, duration=0.35, button="left")


def main() -> None:
    parser = argparse.ArgumentParser(description="Gemini 노출 제안 → 라이트룸 슬라이더")
    parser.add_argument(
        "--config",
        type=Path,
        metavar="PATH",
        help=f"설정 JSON 경로 (기본: 스크립트 옆 {CONFIG_FILENAME} 가 있으면 자동)",
    )
    parser.add_argument("--dry-run", action="store_true", help="API/마우스 없이 좌표만 출력")
    args = parser.parse_args()

    cfg_path = resolve_config_path(args.config)
    cfg = default_config_dict()
    if args.config is not None:
        if not args.config.is_file():
            print(f"설정 파일을 찾을 수 없습니다: {args.config}", file=sys.stderr)
            sys.exit(1)
        merged = merge_config(load_config_file(args.config))
        cfg = validate_config(merged)
        print(f"설정 로드: {args.config.resolve()}", file=sys.stderr)
    elif cfg_path is not None:
        merged = merge_config(load_config_file(cfg_path))
        cfg = validate_config(merged)
        print(f"설정 로드: {cfg_path}", file=sys.stderr)
    else:
        cfg = validate_config(cfg)

    pyautogui.FAILSAFE = True
    pyautogui.PAUSE = 0.25

    api_key = get_api_key(cfg.get("gemini_api_key"))
    if not api_key and not args.dry_run:
        print(
            "API 키가 없습니다. 설정 JSON의 gemini_api_key, 환경 변수 GEMINI_API_KEY, "
            "또는 스크립트 상단 GEMINI_API_KEY 를 설정하세요.",
            file=sys.stderr,
        )
        sys.exit(1)

    countdown = int(cfg["countdown_sec"])
    print(f"{countdown}초 후 캡처합니다. Lightroom 사진 작업 영역이 보이게 두세요.")
    time.sleep(countdown)

    region = cfg["photo_work_region"]
    img = capture_work_region(region)
    print(f"캡처 완료: {region} → {img.size[0]}×{img.size[1]} px")

    if args.dry_run:
        print("--dry-run: API 호출 생략")
        sys.exit(0)

    ev_min = cfg["exposure_min"]
    ev_max = cfg["exposure_max"]
    raw = ask_gemini_exposure(
        img,
        api_key,
        model_name=cfg["model"],
        prompt=cfg["prompt"],
    )
    print(f"Gemini 원문: {raw!r}")
    value = parse_exposure_number(raw)
    value = max(ev_min, min(ev_max, value))
    print(f"파싱 노출 값: {value:+.2f} (범위 {ev_min}~{ev_max})")

    x0, x1, ty = cfg["exposure_slider_track"]
    target_x = exposure_to_slider_x(value, x0, x1, ev_min=ev_min, ev_max=ev_max)
    print(f"슬라이더 목표: x={target_x}, y={ty} (트랙 {x0}~{x1})")

    time.sleep(0.5)
    move_exposure_slider(target_x, ty, x0, x1)
    print("dragTo 적용 완료.")


if __name__ == "__main__":
    main()
