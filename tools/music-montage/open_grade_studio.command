#!/bin/bash
# grade_studio: 빈 상태로 서버 시작 → 브라우저 안에서 「폴더 열기」/「파일 고르기」로 영상 선택.
cd "$(dirname "$0")"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

exec .venv/bin/python3 -m grade_studio.server
