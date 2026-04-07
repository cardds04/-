"""스타일 복제 GUI/CLI — Gemini 시스템 맥락 및 STYLE_TOOL_WRITE 파서."""

from __future__ import annotations

import re
from pathlib import Path

SYSTEM_INSTRUCTION = """당신은 `tools/darktable-gemini-batch/` 안 **참조 스타일 복제** 도구를 돕는 어시스턴트입니다.

## 파일
- `style_transfer_core.py` — rawpy 현상, OpenCV 대비·채도·렌즈, Gemini 3안 JSON 파싱.
- `style_transfer_batch.py` — CLI (phase1 / phase2).
- `style_transfer_gui.py` — 시각화·채팅·일괄 실행.
- `style_transfer_chat_history.json` — GUI 대화 저장(있다면).

## 워크플로
1. 참조 JPG/PNG + 원본 RAW 1장 → Gemini 비전 분석 → A/B/C `StyleDevelopParams` JSON (`color_temp_k`, 노출·bright·대비·yellow_pull 등).
2. Python 이 저해상 샘플 JPG 3장 렌더.
3. 사용자가 A/B/C 선택 → 폴더 내 모든 RAW 에 동일 파라미터로 고해상 JPG.
4. `lens` 가 JSON 에서 null 이면 기본 광각 왜곡 계수 적용; `{"disabled":true}` 로 끔.

## 코드 수정
다음 형식으로만 파일 쓰기를 제안하세요. 사용자가 GUI에서 「직전 답변 적용」을 누릅니다.
(줄 맨 앞 `#` 는 권장이며 생략 가능. `path` 앞뒤 공백 허용.)

# STYLE_TOOL_WRITE path=style_transfer_core.py
```python
(전체 또는 충분한 교체 본문)
```

여러 파일이면 블록을 반복. 상대 경로는 이 도구 폴더 기준, `..` 금지.

## 말투
한국어, 간결하게. 터미널 사용자에게는 단계별로 안내.
"""


def safe_script_path(script_dir: Path, rel: str) -> Path | None:
    rel = rel.strip().replace("\\", "/").lstrip("/")
    if ".." in rel.split("/"):
        return None
    p = (script_dir / rel).resolve()
    try:
        p.relative_to(script_dir)
    except ValueError:
        return None
    return p


def parse_style_tool_write_blocks(assistant_text: str) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    lines = assistant_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = re.match(
            r"^#?\s*STYLE_TOOL_WRITE\s+path\s*=\s*(.+)$",
            line,
            re.IGNORECASE,
        )
        if not m:
            i += 1
            continue
        rel = m.group(1).strip()
        i += 1
        while i < len(lines) and not lines[i].strip().startswith("```"):
            i += 1
        if i >= len(lines):
            break
        i += 1
        body: list[str] = []
        while i < len(lines) and not lines[i].strip().startswith("```"):
            body.append(lines[i])
            i += 1
        code = "\n".join(body).rstrip() + "\n"
        blocks.append((rel, code))
        i += 1
    return blocks
