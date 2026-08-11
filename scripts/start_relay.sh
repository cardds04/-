#!/bin/bash
# 네이버웍스 Drive 릴레이 서버 + ngrok 고정 도메인 자동 시작
# 사용: bash scripts/start_relay.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"
PORT=9337
NGROK_DOMAIN="starving-track-wiry.ngrok-free.dev"
RELAY_URL="https://${NGROK_DOMAIN}"

cd "$ROOT"

echo "=== 네이버웍스 릴레이 서버 시작 ==="

# 릴레이 서버 백그라운드 실행 — launchd 의 python3 에는 pycookiecheat 가 없어
# 모듈이 설치된 파이썬을 우선 사용(2026-08-11: 마이박스 쿠키 기반으로 개조).
PYBIN="/Library/Frameworks/Python.framework/Versions/3.14/bin/python3"
if ! "$PYBIN" -c "import pycookiecheat, requests" 2>/dev/null; then
  PYBIN="$(command -v python3)"
fi
"$PYBIN" scripts/nw_relay_server.py --port "$PORT" &
RELAY_PID=$!
sleep 2

# 기동 확인
if ! curl -sf "http://localhost:${PORT}/health" >/dev/null; then
  echo "❌ 릴레이 서버 기동 실패"
  kill $RELAY_PID 2>/dev/null || true
  exit 1
fi
echo "✅ 릴레이 서버 실행 중 (포트 $PORT)"

# ngrok 고정 도메인으로 터널 시작
NGROK_BIN="$(command -v ngrok || echo /opt/homebrew/bin/ngrok)"
"$NGROK_BIN" http "${PORT}" --domain="${NGROK_DOMAIN}" --log=stdout > /tmp/ngrok_relay.log 2>&1 &
NGROK_PID=$!
sleep 3
echo "✅ ngrok 터널: $RELAY_URL"

echo ""
echo "Mac mini 켜져 있는 동안 웹앱에서 폴더 생성 가능합니다."
echo "중지: Ctrl+C"
echo ""

trap "kill $RELAY_PID $NGROK_PID 2>/dev/null || true; echo '종료'" EXIT INT TERM
wait $RELAY_PID
