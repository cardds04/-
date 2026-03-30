#!/bin/bash
# Finder에서 더블클릭: 5055 포트 서버 종료 후 다시 실행 (수동 lsof/kill 불필요)
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR" || exit 1

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
  .venv/bin/pip install -r requirements.txt
fi

echo "5055 포트 점검 중…"
if pids=$(lsof -ti :5055 2>/dev/null); then
  echo "기존 서버 종료: $pids"
  kill -9 $pids 2>/dev/null
  sleep 0.4
else
  echo "(5055에서 실행 중인 프로세스 없음)"
fi

echo ""
echo "서버 시작 → http://127.0.0.1:5055"
echo "끄려면 이 터미널에서 Ctrl+C"
echo ""
exec .venv/bin/python3 web_app.py
