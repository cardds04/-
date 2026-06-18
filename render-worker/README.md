# 이지숏폼 서버 렌더 워커 (Railway 배포)

헤드리스 크롬으로 `easy/render.html` 을 띄워 렌더 작업을 처리하는 상시 워커.

## 동작
```
loop: /api/easy-render claim → 작업 있으면 헤드리스 크롬에 spec 주입 →
      render.html 이 renderSpec 으로 영상 만들고 결과 업로드 + complete →
      워커는 #renderDone 신호 읽고 다음 작업.
```

## Railway 배포 (한 번만)
1. https://railway.app → **New Project** → **Deploy from GitHub repo** → `schedule-site` 선택
2. 서비스 **Settings → Root Directory** 를 `render-worker` 로 지정 (Dockerfile 자동 인식)
3. **Variables(환경변수)** 추가:
   - `RENDER_WORKER_SECRET` = (아무 긴 랜덤 문자열 — 아래 Vercel 값과 **반드시 동일**)
   - (선택) `RENDER_API`, `RENDER_PAGE` 는 기본값이 sc-pink 라 안 넣어도 됨
4. **Deploy**. 로그에 `🖥 렌더 워커 시작` + `✓ 헤드리스 크롬 준비됨` 나오면 성공.

## Vercel(프로젝트 sc) 에도 같은 시크릿
- Vercel → 프로젝트 → Settings → Environment Variables → `RENDER_WORKER_SECRET` = (Railway 와 동일 값) → **Redeploy**.
- `/api/easy-render` 가 이 값으로 워커를 인증함.

## 확인
- 앱이 렌더 작업을 등록하면(`easy_render_jobs` 에 queued 행) 워커가 집어서 처리.
- 테스트: Supabase 에 queued 작업을 하나 넣거나, 앱의 '서버로 내보내기'(연동 후)를 누르면 Railway 로그에 진행이 찍힘.

## 메모
- 헤드리스 크롬에서 H.264(mp4) 인코딩이 안 되면 webm 으로 나옴(재생은 됨). mp4 변환(ffmpeg)은 다음 단계 옵션.
- 메모리: 1GB 이상 권장. Railway 인스턴스 사양은 작업 영상 크기에 맞춰 조정.
