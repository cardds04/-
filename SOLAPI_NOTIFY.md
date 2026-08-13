# 솔라피 SMS 알림 시스템

촬영 스케줄(인로그 / 쇼픽 / 더필링)이 접수되면 솔라피(SOLAPI)를 통해
고객에게 SMS 확인 문자가 자동 발송됩니다.

## 구성 파일

```
api/solapi-send.js          # Vercel Serverless Function
lib/solapi-logic.cjs        # 솔라피 v4 HMAC 인증 + fetch 호출 (Express/Vercel 공유)
solapi-notify.js            # 클라이언트(브라우저)용 헬퍼 — 모달/토스트/번호 영속화
server.js                   # 로컬 개발용 라우트 추가 (POST /api/solapi-send)
.env.example                # 환경변수 예시
```

연결 지점:
- `customer.html` (인로그/쇼픽) — 접수 확인 모달 OK 직후
- `public-order.html` (더필링/쇼픽) — 접수 확인 모달 OK 직후

## 환경변수 설정

### 1) 로컬 개발 (`server.js`)
프로젝트 루트에 `.env` 파일을 만들고 아래 3개 키를 채웁니다.

```
SOLAPI_API_KEY=...
SOLAPI_API_SECRET=...
SOLAPI_SENDER_NUMBER=01028692443
```

> Node 자체는 `.env`를 자동으로 읽지 않으므로, 다음과 같이 실행하세요.
>
> ```bash
> # 한 줄 실행 예시 (zsh/bash)
> export $(grep -v '^#' .env | xargs) && node server.js
> ```
>
> 또는 `dotenv` 같은 패키지를 추가하셔도 됩니다.

### 2) Vercel 배포
Vercel 프로젝트(**sc · sc-pink 모두**) → **Settings → Environment Variables** 에서
`SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER` 3개를 모두 등록한 뒤
**Production / Preview** 양쪽에 적용 → 재배포.
접근 인증용 `SOLAPI_SEND_TOKEN` / `SOLAPI_SEND_ENFORCE` 는 아래 4) 참고.

### 3) ⚠️ 보안 주의
- API Key/Secret 은 **절대 HTML/클라이언트 코드에 넣지 마세요.**
  본 시스템은 이미 모든 인증을 서버(`/api/solapi-send`)에서 처리합니다.
- 채팅 등 외부에 노출된 적이 있는 키는 **솔라피 콘솔에서 즉시 재발급**하시는 걸 권장드립니다.

### 4) 접근 인증 — 공유 시크릿 토큰 (2026-08-13 도입)
URL만 알면 누구나 문자를 쏠 수 있던 문제를 막기 위해 `/api/solapi-send` 에 접근 인증이 있습니다.

| 호출자 | 통과 방법 |
|---|---|
| 자동화 (curl·서버·루틴) | `x-solapi-token` 헤더 == `SOLAPI_SEND_TOKEN` 환경변수 |
| 사이트 자체 페이지 (contract.html · customer.html · public-order.html · 관리자 index) | 브라우저가 보내는 Origin/Referer 가 자사 오리진(sc-pink/sc.vercel.app · localhost:8787)이면 통과 — 정적 페이지에 토큰을 심으면 공개되므로 코드 수정 불필요 |

- **토큰 정본**: 이 맥(Mac)의 `~/.config/solapi/send-token` (자동화 루틴이 여기서 읽음).
  같은 값을 Vercel 환경변수 `SOLAPI_SEND_TOKEN` 으로 **sc·sc-pink 두 프로젝트에** 등록.
- **소프트 모드(기본)**: `SOLAPI_SEND_ENFORCE` 미설정이면 미인증 호출도 일단 허용하고
  Vercel 함수 로그에 `[solapi-send] 미인증 호출 허용(소프트 모드)` 경고만 남깁니다.
  → 남은 호출처가 없는지 로그로 확인한 뒤, **사장님 확인 후** `SOLAPI_SEND_ENFORCE=1` 등록 + 재배포로 강제 전환(401 차단).
- 허용 오리진 추가가 필요하면 `SOLAPI_SEND_ALLOWED_ORIGINS` (쉼표 구분, 기본 목록 대체).
- `server.js` 로컬 라우트는 localhost 전용이라 토큰 검사를 하지 않습니다.
- 한계: Origin 헤더는 curl 로 위조 가능 — 고객 페이지 경로까지 완전히 잠그려면
  접수 SMS 발송을 서버(스케줄 저장 시점)로 옮기는 후속 작업이 필요합니다.

## 발송 본문 형식

```
[인로그] 촬영 접수 완료
업체: ○○인테리어
날짜: 4/30(목) 14:00
장소: 잠실주공아파트 102동 305호
구성: 사진영상
결제예정: 250,000원

접수된 날짜는 확정되었습니다만 시간은 변동될 수 있는 임시시간이며 변동시 추후 연락드리겠습니다.
```

- 상단 대괄호 사이트명만 사이트별로 다름 (`인로그` / `쇼픽` / `더필링`)
- `장소`는 미입금 요약과 동일한 규칙으로 단지명·동호수만 추출 (도로명/지번이면 도로 + 번지)
- `구성`/`결제예정`은 값이 있을 때만 노출

## 수신번호 동작

1. `user.phone` (= 고객 가입 시 등록한 번호) 가 있으면 그 번호로 발송.
2. 비어있으면 즉석 모달이 떠서 `010-1234-5678` 형식으로 입력 받음.
3. 입력된 번호는 다음 위치에 모두 저장:
   - 로컬 `localStorage` 의 `scheduleSiteCustomers` 배열 (현재 사용자 행)
   - 업체 목록(`ensureCompanyStored`) — 같은 업체 다음 접수 시 자동 사용
   - Supabase `customers` 테이블 (`syncCustomersTableFromStorage`)
4. 알림 발송 실패 시에도 **스케줄 등록은 정상 처리** 됨 (작은 토스트로만 안내).

## 직접 호출(테스트)

로컬 (`server.js` — 토큰 불필요):

```bash
curl -X POST http://localhost:8787/api/solapi-send \
  -H 'Content-Type: application/json' \
  -d '{"to":"01012345678","text":"[테스트] 솔라피 연동 확인"}'
```

배포 서버 (자동화와 동일한 형태 — `x-solapi-token` 헤더 필요):

```bash
curl -X POST https://sc-pink.vercel.app/api/solapi-send \
  -H 'Content-Type: application/json' \
  -H "x-solapi-token: $(cat ~/.config/solapi/send-token)" \
  -d '{"to":"01012345678","text":"[테스트] 솔라피 연동 확인"}'
```

성공 응답:
```json
{ "ok": true, "messageId": "M..." }
```
