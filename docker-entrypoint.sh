#!/bin/sh
set -e
export PYTHONUNBUFFERED=1
cd /app/tools/darktable-gemini-batch
/opt/venv/bin/uvicorn style_transfer_server:app --host 127.0.0.1 --port 8790 &
UV_PID=$!
sleep 2
if ! kill -0 "$UV_PID" 2>/dev/null; then
  echo "ERROR: uvicorn did not stay up"
  exit 1
fi
cd /app
exec node server.js
