#!/bin/bash
# 더블클릭으로 Interior AI Pipeline 실행

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# 가상환경 활성화
source .venv/bin/activate 2>/dev/null || {
  echo "⚠ 가상환경(.venv)이 없습니다. SETUP.md를 참고해 설치해주세요."
  read -p "엔터를 눌러 종료..."
  exit 1
}

# 포트 정리 (이전 실행 잔여)
lsof -ti:8501 | xargs kill -9 2>/dev/null

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   🏠 Interior AI Pipeline 시작 중...     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "브라우저가 자동으로 열립니다."
echo "종료하려면 이 창을 닫으세요."
echo ""

# 1초 후 브라우저 자동 열기
(sleep 2 && open "http://localhost:8501") &

# Streamlit 실행
streamlit run app.py \
  --server.port 8501 \
  --server.headless false \
  --browser.gatherUsageStats false
