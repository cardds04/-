# 디지털튜터 수업지원요청

담임 선생님이 주간 시간표에서 교시를 골라 디지털 수업지원을 신청하고,
디지털 튜터 한 명이 그것을 보고 수락해 확정하는 페이지.

- 화면: `/tutor-support.html`
- API: `POST /api/tutor-support` → `lib/tutor-support-logic.cjs`

## 역할

| | 로그인 | 할 수 있는 일 |
|---|---|---|
| 선생님 | 불필요 | 신청, 본인이 신청한 대기 건 취소, 전체 시간표 조회 |
| 디지털 튜터 | 비밀번호 | 수락 · 반려 · 확정 해제 |

선생님은 계정이 없다. 링크만 알면 신청할 수 있다.
취소는 신청할 때 발급한 `cancelKey` 를 가진 기기에서만 된다(브라우저에 저장).
다른 기기에서 신청한 건은 취소 버튼이 나타나지 않는다.

## 환경 변수

| 변수 | 필수 | 설명 |
|---|---|---|
| `SUPABASE_URL` | ✅ | 기존 값 그대로 |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 기존 값 그대로 |
| `TUTOR_ADMIN_PASSWORD` | ✅ | 튜터 로그인 비밀번호 |
| `TUTOR_SESSION_SECRET` | | 토큰 서명 키. 비우면 비밀번호로 서명 |

`TUTOR_ADMIN_PASSWORD` 가 없으면 신청과 조회는 정상 동작하고 수락 기능만 꺼진다
(로그인 시 503, 목록 응답의 `tutorConfigured: false`). 약한 기본 비밀번호로
대체하지 않는다 — 저장소가 공개라 기본값을 두면 누구나 수락할 수 있게 된다.

## 저장

새 테이블을 만들지 않는다. 기존 `app_state` 테이블에 **요청 1건 = 행 1개**로 넣는다.

```
id      = tutorsup_r_<YYYY-MM-DD>_<rand>
payload = { date, period, grade, classNo, room, topic, teacher,
            status, createdAt, decidedAt?, cancelHash }
```

주 단위로 한 행에 몰아넣지 않은 이유: 여러 선생님이 동시에 신청하면
read-modify-write 가 서로를 덮어쓴다. 건당 INSERT 면 경합 자체가 없다.

`id` 앞부분이 고정폭 ISO 날짜라서 주간 조회가 사전순 범위질의로 끝난다.

```
app_state?id=gte.tutorsup_r_2026-08-24&id=lt.tutorsup_r_2026-08-29
```

`supabase-schema.sql` 의 `guard_app_state_payload` 트리거는 `scheduleSite*` 키만
보호하므로 이 payload 에는 영향이 없다.

`cancelKey` 는 평문으로 저장하지 않는다(SHA-256 해시만). 목록 응답에도 나가지 않는다.

## 중복 방지

**같은 날 · 같은 교시 · 같은 특별실**에 이미 `confirmed` 인 건이 있으면 막는다.
신청할 때와 수락할 때 **양쪽 모두** 서버가 검사한다 — 클라이언트 검사는 편의용이라
그것만 믿으면 우회된다.

대기끼리는 막지 않는다. 아직 확정된 게 아니라서 튜터가 그중 하나를 고르면 된다.

## 시간표

1교시 09:00 · 2교시 09:50 · 3교시 10:40 · 4교시 11:30 · 점심 12:10 · 5교시 13:00
(40분 수업 / 10분 쉬는 시간, 월~금)

교시를 늘리려면 `lib/tutor-support-logic.cjs` 의 `PERIODS` 와
`tutor-support.html` 의 `PERIODS` 를 함께 고친다. 특별실 목록(`ROOMS`)도 마찬가지로
서버·클라이언트 양쪽에 있고, 서버 값이 허용목록이라 서버를 안 고치면 400 이 난다.

## 테스트

```bash
node tools/tutor-support.test.cjs     # 서버 로직 41개 (Supabase 인메모리 대체)
```
