"""런타임 API 키 저장(.runtime_credentials.json). .env 를 비워 두고 대시보드에서 나중에 입력할 때 사용."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

_DIR = Path(__file__).resolve().parent
_CREDENTIALS_FILE = _DIR / ".runtime_credentials.json"

# os.environ 에 반영할 키만 (값은 파일에 평문 저장 — 디렉터리 권한으로 보호)
_ALLOWED = frozenset(
    {
        "UPBIT_API_KEY",
        "UPBIT_SECRET",
        "BITHUMB_API_KEY",
        "BITHUMB_SECRET",
        "GEMINI_API_KEY",
        "GOOGLE_API_KEY",
    }
)


def credentials_file_path() -> Path:
    return _CREDENTIALS_FILE


def apply_runtime_credentials() -> None:
    """저장 파일이 있으면 내용을 os.environ 에 반영. 비어 있는 값은 해당 키를 env 에서 제거."""
    if not _CREDENTIALS_FILE.is_file():
        return
    try:
        raw = _CREDENTIALS_FILE.read_text(encoding="utf-8")
        data = json.loads(raw)
    except (json.JSONDecodeError, OSError):
        return
    if not isinstance(data, dict):
        return
    for k, v in data.items():
        if k not in _ALLOWED:
            continue
        if isinstance(v, str) and v.strip():
            os.environ[k] = v.strip()
        else:
            os.environ.pop(k, None)


def credentials_status() -> dict[str, Any]:
    """민감값 없이 설정 여부만."""
    apply_runtime_credentials()
    up = bool((os.getenv("UPBIT_API_KEY") or "").strip() and (os.getenv("UPBIT_SECRET") or "").strip())
    gem = bool((os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip())
    return {
        "ok": True,
        "upbit_configured": up,
        "gemini_configured": gem,
        "credentials_file_exists": _CREDENTIALS_FILE.is_file(),
    }


def save_runtime_credentials(updates: dict[str, Any]) -> None:
    """
    updates: 환경변수 이름 -> 값. None 또는 빈 문자열이면 파일에서 해당 키 제거.
    기존 파일과 병합 후 원자적 저장.
    """
    current: dict[str, Any] = {}
    if _CREDENTIALS_FILE.is_file():
        try:
            prev = json.loads(_CREDENTIALS_FILE.read_text(encoding="utf-8"))
            if isinstance(prev, dict):
                current = {str(k): v for k, v in prev.items() if k in _ALLOWED}
        except (json.JSONDecodeError, OSError):
            current = {}

    for k, v in updates.items():
        if k not in _ALLOWED:
            continue
        if v is None or (isinstance(v, str) and not v.strip()):
            current.pop(k, None)
        else:
            current[k] = str(v).strip()

    tmp = _CREDENTIALS_FILE.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(_CREDENTIALS_FILE)
    apply_runtime_credentials()
