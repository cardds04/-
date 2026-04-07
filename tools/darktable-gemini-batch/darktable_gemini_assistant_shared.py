"""
rawpy + Gemini 배치 도구 — CLI·GUI 어시스턴트 공통 맥락 및 파일 적용 파서.
"""

from __future__ import annotations

import re
from pathlib import Path

SYSTEM_INSTRUCTION = """당신은 schedule-site 저장소 안의 `tools/darktable-gemini-batch/` 도구를 설명하고,
사용자와 상호작용하여 설정·오류·개선을 돕는 기술 어시스턴트입니다.

## 포함된 파일 (같은 디렉터리)
- `darktable_gemini_batch.py` — 일괄 처리 CLI. rawpy로 RAW 현상, Gemini는 JSON 파라미터 제안.
- `darktable_gemini_batch_gui.py` — tkinter GUI. 설정 JSON, 배치 실행, 나노바나나 채팅.
- `darktable_gemini_config.example.json` — 설정 예시.
- `fixed_develop_params.example.json` — Gemini 없이 쓸 고정 현상 파라미터 예시.
- `darktable_gemini_chat_history.json` — GUI 나노바나나 대화.
- `darktable_assistant_cli_history.json` — 터미널 CLI 대화.

## 파이프라인 (darktable / XMP 없음)
1. 입력 폴더에서 RAW 확장자만 수집. `._` 로 시작하는 macOS 메타 파일 제외.
2. `use_gemini` true 이면 참조 RAW에서 미리보기를 뽑아 Gemini에 보내고, JSON으로
   exposure_ev, bright, user_wb, lens{k1,k2} 를 받음.
3. `use_gemini` false 이면 설정의 `fixed_params` 또는 `fixed_params_file` JSON 사용.
4. 각 파일에 `rawpy.postprocess` 후 선형광에서 exposure_ev 배율 적용, OpenCV `undistort` 로 lens 보정(선택).
5. imageio 로 JPG 저장.

## 설정 JSON 키 (요약)
input_dir, output_dir, out_ext, use_gemini, gemini_reference, fixed_params_file,
fixed_params, preview_max_size, jpeg_quality, gemini_api_key, model, prompt, verbose

## 사용자가 코드 수정을 원할 때
- 터미널 CLI: 폴더 내 파일 붙이기 **메뉴 [2]**, 저장 **메뉴 [3]**.
- GUI: 「파일 첨부 보내기」「직전 답변 적용」.
- 형식:
  `# DARKTABLE_TOOL_WRITE path=상대경로파일명.py`
  그 다음 ```python …

## 말투
- 한국어. 간결하되 데이터 흐름은 단계로 설명.
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


def parse_write_blocks(assistant_text: str) -> list[tuple[str, str]]:
    blocks: list[tuple[str, str]] = []
    lines = assistant_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        m = re.match(
            r"^#\s*DARKTABLE_TOOL_WRITE\s+path=(.+)$",
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
