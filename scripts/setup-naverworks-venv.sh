#!/usr/bin/env bash
# 로컬에서 네이버웍스 create_folder.py용 가상환경 (scripts/.venv)
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$(dirname "$0")"
PY="${PY_BIN:-python3}"
if ! command -v "$PY" >/dev/null 2>&1; then
  echo "실행 가능한 python3 이 없습니다. Homebrew 등으로 설치한 뒤 다시 실행하세요." >&2
  exit 1
fi
"$PY" -m venv .venv
# shellcheck disable=SC1091
. .venv/bin/activate
pip install --upgrade pip
pip install --no-cache-dir -r "${ROOT}/requirements-naverworks.txt"
ABS_PY="$(pwd)/.venv/bin/python"
echo "" >&2
echo "설치 완료. 프로젝트 루트 .env 에 다음 줄을 추가하세요:" >&2
echo "NAVER_WORKS_PYTHON_BIN=${ABS_PY}" >&2
