#!/usr/bin/env python3
"""CLI — GUI는 macro_app.py 를 실행하세요."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from macro_core import run_play, run_record


def main() -> None:
    parser = argparse.ArgumentParser(description="마우스/키보드 매크로 (CLI)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_rec = sub.add_parser("record", help="Esc 로 녹화 종료")
    p_rec.add_argument("-o", "--output", type=Path, default=Path("macro_session.json"))
    p_rec.add_argument("--moves", action="store_true", help="마우스 이동까지 기록")

    p_play = sub.add_parser("play", help="파일 재생")
    p_play.add_argument("-i", "--input", type=Path, required=True)
    p_play.add_argument("--speed", type=float, default=1.0)
    p_play.add_argument("--dry-run", action="store_true")
    p_play.add_argument("--no-wait", action="store_true", help="대기 시간 없이 바로 재생")
    p_play.add_argument(
        "--repeat",
        type=int,
        default=1,
        metavar="N",
        help="동일 매크로를 N번 연속 재생 (기본 1)",
    )

    args = parser.parse_args()
    if args.cmd == "record":
        print("[macro] 녹화 시작 — Esc 두 번 또는 Ctrl+C 로 종료 후 저장", flush=True)
        try:
            n = run_record(args.output, args.moves)
            print(f"[macro] 저장 완료: {n}개 이벤트 → {args.output}", flush=True)
        except KeyboardInterrupt:
            print("\n[macro] 중단", flush=True)
            sys.exit(130)
        return

    if not args.input.is_file():
        print(f"파일 없음: {args.input}", file=sys.stderr)
        sys.exit(1)
    cd = 0 if args.no_wait else 5
    reps = max(1, min(100000, int(args.repeat or 1)))
    run_play(
        args.input,
        args.speed,
        dry_run=args.dry_run,
        countdown_secs=cd,
        repeat_count=reps,
        on_log=print,
    )


if __name__ == "__main__":
    main()
