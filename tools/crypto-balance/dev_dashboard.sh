#!/usr/bin/env bash
# 개발용: 포트 점유 프로세스를 종료한 뒤 대시보드를 띄웁니다.
# DASHBOARD_RELOAD=1 이면 .py / .html 변경 시 uvicorn 이 다시 띄웁니다.
# (.json 은 제외 — status.json 이 봇에 의해 계속 바뀌면 재시작 루프가 납니다.)
set -euo pipefail
cd "$(dirname "$0")"
PORT="${DASHBOARD_PORT:-8765}"
if command -v lsof >/dev/null 2>&1; then
  lsof -ti:"$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
fi
export DASHBOARD_RELOAD=1
exec python3 dashboard.py
