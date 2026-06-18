# 크롬이 포함된 공식 Puppeteer 이미지 (버전은 package.json puppeteer 와 일치)
FROM ghcr.io/puppeteer/puppeteer:23.6.0

# 번들된 크롬을 쓰므로 설치 중 크로미움 재다운로드 안 함
ENV PUPPETEER_SKIP_DOWNLOAD=true

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY index.js ./

CMD ["node", "index.js"]
