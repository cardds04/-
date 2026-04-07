#!/usr/bin/env python3
"""
rawpy + Gemini RAW 배치 도구 전용 — 터미널 대화형 CLI 어시스턴트.

  화면에 번호 메뉴가 나오므로 /read 같은 슬래시 명령을 외울 필요가 없습니다.

  export GEMINI_API_KEY=...
  python3 darktable_interactive_cli.py

메뉴:
  1 — AI에게 질문·메시지
  2 — 이 폴더 안 파일 내용을 질문에 붙여 보내기
  3 — 직전 AI 답변을 파일에 적용 (DARKTABLE_TOOL_WRITE 블록이 있을 때)
  4 — 도움말
  5 — 대화 맥락 비우기
  6 — 저장 대화 파일 삭제 후 새로 시작
  0 — 종료

수정 제안을 파일로 쓰게 하려면 모델이 아래 형식으로 답한 뒤 메뉴 [3]을 고르세요.

# DARKTABLE_TOOL_WRITE path=darktable_gemini_batch.py
```python
(파일 전체 또는 교체할 충분한 내용)
```
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from darktable_gemini_assistant_shared import (
    SYSTEM_INSTRUCTION,
    parse_write_blocks,
    safe_script_path,
)

SCRIPT_DIR = Path(__file__).resolve().parent
HISTORY_PATH = SCRIPT_DIR / "darktable_assistant_cli_history.json"


def _safe_script_path(rel: str) -> Path | None:
    return safe_script_path(SCRIPT_DIR, rel)


def _load_history() -> list[dict[str, str]]:
    if not HISTORY_PATH.is_file():
        return []
    try:
        data = json.loads(HISTORY_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    msgs = data.get("messages")
    if not isinstance(msgs, list):
        return []
    out: list[dict[str, str]] = []
    for m in msgs:
        if isinstance(m, dict) and m.get("role") in ("user", "model"):
            t = m.get("text")
            if isinstance(t, str):
                out.append({"role": m["role"], "text": t})
    return out


def _save_history(messages: list[dict[str, str]]) -> None:
    try:
        HISTORY_PATH.write_text(
            json.dumps({"version": 1, "messages": messages}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    except OSError:
        pass


def _apply_last_assistant(messages: list[dict[str, str]]) -> None:
    last = ""
    for m in reversed(messages):
        if m["role"] == "model":
            last = m["text"]
            break
    if not last:
        print("(적용할 직전 모델 답변이 없습니다.)", file=sys.stderr)
        return
    blocks = parse_write_blocks(last)
    if not blocks:
        print(
            "(직전 답변에 # DARKTABLE_TOOL_WRITE path=... 와 ```python 블록이 없습니다.)",
            file=sys.stderr,
        )
        return
    for rel, code in blocks:
        target = _safe_script_path(rel)
        if target is None:
            print(f"거부: 안전하지 않은 경로 — {rel!r}", file=sys.stderr)
            continue
        print(f"\n→ 쓰기 대상: {target.relative_to(SCRIPT_DIR)} ({len(code)} bytes)")
        preview = code[:400] + ("…" if len(code) > 400 else "")
        print("— 미리보기 —\n", preview, "\n— 끝 —", sep="")
        yn = input("이 내용으로 파일을 덮어쓸까요? [y/N]: ").strip().lower()
        if yn != "y":
            print("건너뜀.")
            continue
        try:
            target.write_text(code, encoding="utf-8")
            print(f"저장 완료: {target}")
        except OSError as e:
            print(f"저장 실패: {e}", file=sys.stderr)


def _build_chat_history_for_api(messages: list[dict[str, str]]) -> list[dict]:
    return [{"role": m["role"], "parts": [m["text"]]} for m in messages]


def _rebuild_chat(model, messages: list[dict[str, str]]):
    return model.start_chat(history=_build_chat_history_for_api(messages))


def _print_main_menu() -> None:
    print(
        """
────────────────────────────────────
  [1] AI에게 질문·메시지 보내기
  [2] 이 폴더 파일 내용을 질문에 붙여 보내기
  [3] 직전 AI 답변을 파일에 적용 (수정 제안 반영)
  [4] 도움말
  [5] 이번 대화 맥락 비우기
  [6] 저장된 대화 파일 삭제 후 처음부터
  [0] 종료
────────────────────────────────────"""
    )


def _read_file_and_build_prompt(rel: str) -> str | None:
    p = _safe_script_path(rel)
    if p is None or not p.is_file():
        print(f"파일을 찾을 수 없거나 경로가 안전하지 않습니다: {rel!r}")
        return None
    try:
        body = p.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        print(f"읽기 실패: {e}")
        return None
    return f"[첨부: {p.relative_to(SCRIPT_DIR)} 전체]\n```\n{body}\n```"


def _send_user_turn(
    chat,
    model,
    messages: list[dict[str, str]],
    user_msg: str,
    persist_fn,
) -> object:
    messages.append({"role": "user", "text": user_msg})
    try:
        resp = chat.send_message(user_msg)
        try:
            reply = (resp.text or "").strip()
        except ValueError:
            reply = "(응답 텍스트를 읽을 수 없습니다.)"
        if not reply:
            reply = "(빈 응답)"
    except Exception as e:
        reply = f"(API 오류: {e})"
        if messages and messages[-1]["role"] == "user":
            messages.pop()
        print(reply)
        persist_fn()
        return _rebuild_chat(model, messages)

    messages.append({"role": "model", "text": reply})
    print("\n─── 답변 ───\n", reply, "\n─── 끝 ───\n", sep="")
    persist_fn()
    return chat


def main() -> None:
    import argparse

    ap = argparse.ArgumentParser(description="다크테이블 도구 대화형 CLI 어시스턴트")
    ap.add_argument(
        "--model",
        default=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        help="GenerativeModel 이름 (기본: gemini-2.5-flash 또는 환경변수 GEMINI_MODEL)",
    )
    ap.add_argument("--no-history-file", action="store_true", help="대화를 디스크에 저장하지 않음")
    args = ap.parse_args()

    key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not key:
        print("GEMINI_API_KEY 가 필요합니다.", file=sys.stderr)
        sys.exit(1)

    try:
        import google.generativeai as genai
    except ImportError:
        print("pip install google-generativeai", file=sys.stderr)
        sys.exit(1)

    genai.configure(api_key=key)
    try:
        model = genai.GenerativeModel(args.model, system_instruction=SYSTEM_INSTRUCTION)
    except TypeError:
        model = genai.GenerativeModel(args.model)

    messages: list[dict[str, str]] = [] if args.no_history_file else _load_history()
    while messages and messages[-1]["role"] == "user":
        messages.pop()
    pending_read: str | None = None

    print(
        "다크테이블 배치 도구 CLI 어시스턴트입니다. 아래 번호 메뉴로 조작합니다.\n"
        f"모델: {args.model}  |  작업 폴더: {SCRIPT_DIR}\n"
        + ("" if args.no_history_file else f"대화 저장: {HISTORY_PATH.name}\n"),
        end="",
    )

    chat = _rebuild_chat(model, messages)

    def persist() -> None:
        if not args.no_history_file:
            _save_history(messages)

    while True:
        _print_main_menu()
        try:
            choice = input("선택 (Enter = 1): ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n종료합니다.")
            persist()
            break

        if not choice:
            choice = "1"

        if choice == "0":
            persist()
            print("종료합니다.")
            break

        if choice == "4":
            print(__doc__)
            continue

        if choice == "5":
            messages.clear()
            chat = _rebuild_chat(model, messages)
            print("이번 세션 대화 맥락을 비웠습니다.")
            persist()
            continue

        if choice == "6":
            if HISTORY_PATH.is_file():
                HISTORY_PATH.unlink(missing_ok=True)
            messages.clear()
            chat = _rebuild_chat(model, messages)
            print("저장 파일을 지우고 대화를 비웠습니다.")
            continue

        if choice == "3":
            _apply_last_assistant(messages)
            continue

        if choice == "2":
            try:
                rel = input("파일명 (이 폴더 기준, 예: darktable_gemini_batch.py): ").strip()
            except (EOFError, KeyboardInterrupt):
                print("(취소)")
                continue
            if not rel:
                print("(파일명이 비었습니다.)")
                continue
            prefix = _read_file_and_build_prompt(rel)
            if prefix is None:
                continue
            try:
                question = input("그 파일에 대해 물을 내용을 입력하세요: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("(취소)")
                continue
            if not question:
                print("(질문이 비었습니다. 전송하지 않습니다.)")
                continue
            user_msg = prefix + "\n\n" + question
            chat = _send_user_turn(chat, model, messages, user_msg, persist)
            continue

        if choice == "1":
            try:
                line = input("메시지: ").strip()
            except (EOFError, KeyboardInterrupt):
                print("(취소)")
                continue
            if not line:
                continue
            low = line.lower()
            if low in ("exit", "quit", "q"):
                persist()
                print("종료합니다.")
                break
            # 숨은 호환: 예전 슬래시 명령
            if low == "/help":
                print(__doc__)
                continue
            if low == "/clear":
                messages.clear()
                chat = _rebuild_chat(model, messages)
                print("이번 세션 대화 맥락을 비웠습니다.")
                persist()
                continue
            if low == "/history-clear":
                if HISTORY_PATH.is_file():
                    HISTORY_PATH.unlink(missing_ok=True)
                messages.clear()
                chat = _rebuild_chat(model, messages)
                print("저장 파일을 지우고 대화를 비웠습니다.")
                continue
            if low == "/apply":
                _apply_last_assistant(messages)
                continue
            if line.startswith("/read "):
                rel = line[6:].strip()
                pre = _read_file_and_build_prompt(rel)
                if pre is None:
                    continue
                try:
                    q2 = input("질문: ").strip()
                except (EOFError, KeyboardInterrupt):
                    print("(취소)")
                    continue
                if not q2:
                    continue
                line = pre + "\n\n" + q2
            chat = _send_user_turn(chat, model, messages, line, persist)
            continue

        print(f"알 수 없는 선택입니다: {choice!r}  (0~6 또는 Enter)")


if __name__ == "__main__":
    main()
