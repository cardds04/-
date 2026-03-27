# 블로그 도우미 · 이 사이트를 웹(인터넷)에서 쓰기

이 저장소의 `server.js`는 정적 HTML(`blog-writing-assistant.html` 등)과 API(`/api/blog-generate`)를 함께 제공합니다. **같은 주소로 페이지를 열고** 글 생성 요청을내면 CORS 문제 없이 동작합니다.

## 1. 서버에 넣을 환경변수

| 변수 | 설명 |
|------|------|
| `GEMINI_API_KEY` | Google AI Studio에서 발급한 Gemini API 키. **서버에만** 설정하면 브라우저에 키를 입력하지 않아도 됩니다. |
| `PORT` | 대부분의 호스팅(Render, Railway 등)이 자동 지정합니다. |

선택: `GEMINI_VISION_MODEL`(모델 ID), `HOST`(기본 `0.0.0.0`).

## 2. 배포 후 접속 URL

배포가 끝나면 브라우저에서 다음 주소로 엽니다.

```text
https://(당신-도메인)/blog-writing-assistant.html
```

예: `https://my-app.onrender.com/blog-writing-assistant.html`

## 3. 호스팅 예시

### Render (Web Service)

1. New → Web Service → 이 Git 저장소 연결  
2. **Build Command**: (비우거나 `npm install`)  
3. **Start Command**: `npm start`  
4. Environment → `GEMINI_API_KEY` 추가  
5. 배포 후 위 URL로 접속  

무료 플랜은 슬립이 있어 첫 요청이 느릴 수 있습니다.

### Railway / Fly.io

- 루트에 `package.json`의 `npm start`가 `node server.js`를 실행하면 됩니다.  
- `GEMINI_API_KEY`를 프로젝트 환경변수에 등록합니다.  
- 공개 URL + `/blog-writing-assistant.html`

### 자신의 PC / VPS

```bash
export GEMINI_API_KEY="여기에_키"
npm install
npm start
```

방화벽에서 `PORT`(기본 8787)를 열고, `http://서버IP:8787/blog-writing-assistant.html` 로 접속합니다.

## 4. 보안 참고

- **저장소에 API 키를 커밋하지 마세요.**  
- 공개 사이트는 **서버 환경변수**만 사용하고, 페이지의 Gemini 키 입력란은 비워 두는 것을 권장합니다.  
- 로컬에서만 쓸 때는 입력란에 키를 넣으면 `localStorage`에 저장할 수 있습니다(브라우저 전용).

## 5. 용량 한도

`server.js`는 JSON 본문 한도를 **50MB**로 두었습니다. 사진 여러 장을 보낼 때 필요하면 호스팅 업체의 요청 크기 제한도 확인하세요.
