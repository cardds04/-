# 참조 스타일 복제 웹 + Express (온라인 배포용)
# 빌드: docker build -t schedule-style-web .
# 실행: docker run -p 8787:8787 -e GEMINI_API_KEY=... schedule-style-web
#
# Fly.io: fly launch --copy-config && fly deploy
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# 의존성만 먼저 설치 → 코드만 바뀐 배포에서는 이 레이어가 캐시되어 pip 가 다시 안 돕니다.
COPY tools/darktable-gemini-batch/requirements.txt ./tools/darktable-gemini-batch/requirements.txt
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r tools/darktable-gemini-batch/requirements.txt

COPY . .

RUN chmod +x /app/docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8787
ENV HOST=0.0.0.0
ENV STYLE_TRANSFER_HOST=127.0.0.1
ENV STYLE_TRANSFER_PORT=8790

EXPOSE 8787

ENTRYPOINT ["/app/docker-entrypoint.sh"]
