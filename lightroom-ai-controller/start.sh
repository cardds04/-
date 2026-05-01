#!/bin/bash
# Gemini Computer Use 웹 서버 실행 스크립트

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# .env 파일 확인
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    echo "⚠  .env 파일이 없습니다. .env.example을 복사합니다..."
    cp .env.example .env
    echo "📝 .env 파일에 GEMINI_API_KEY를 입력한 뒤 다시 실행하세요."
    open .env
    exit 1
  fi
fi

# 패키지 확인 및 설치
python3 -c "import fastapi, uvicorn, google.genai, pyautogui" 2>/dev/null || {
  echo "📦 필요 패키지 설치 중..."
  pip3 install -r requirements.txt --break-system-packages -q
}

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   Gemini Computer Use 웹 UI 시작     ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "🌐 브라우저에서 열기: http://localhost:7777"
echo "⛔ 종료: Ctrl+C"
echo ""

# 브라우저 자동 열기 (1초 후)
(sleep 1 && open "http://localhost:7777") &

# 서버 실행
python3 server.py
