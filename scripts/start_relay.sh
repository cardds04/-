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

# 릴레이 서버 백그라운드 실행
python3 scripts/nw_relay_server.py --port "$PORT" &
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
ngrok http "${PORT}" --domain="${NGROK_DOMAIN}" --log=stdout > /tmp/ngrok_relay.log 2>&1 &
NGROK_PID=$!
sleep 3
echo "✅ ngrok 터널: $RELAY_URL"

echo ""
echo "Mac mini 켜져 있는 동안 웹앱에서 폴더 생성 가능합니다."
echo "중지: Ctrl+C"
echo ""

trap "kill $RELAY_PID $NGROK_PID 2>/dev/null || true; echo '종료'" EXIT INT TERM
wait $RELAY_PID
