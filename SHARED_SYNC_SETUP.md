# 공용 데이터 동기화 설정

현재 `index.html`, `customer.html`, `photographer.html` 는 로컬스토리지 변경 시 자동으로 공용 상태 API에 동기화하도록 연결되어 있습니다.

## 1) 서버 실행

```bash
npm install
npm start
```

기본 주소:

- API: `http://localhost:8787/api/state`
- Health: `http://localhost:8787/health`

## 2) 프론트 페이지 실행

기존처럼 정적 서버로 페이지를 띄우면 됩니다.

```bash
python3 -m http.server 5500
```

## 3) 같은 데이터 쓰기

여러 브라우저/기기에서 같은 서버를 쓰려면, 각 브라우저 콘솔에서 아래 1회 실행 후 새로고침하세요.

```js
localStorage.setItem("scheduleSiteRemoteSyncEndpoint", "http://<서버IP>:8787/api/state");
```

예시:

```js
localStorage.setItem("scheduleSiteRemoteSyncEndpoint", "http://192.168.0.20:8787/api/state");
```

## 주의사항

- 현재 방식은 **키 단위 전체 상태 스냅샷 저장(Last Write Wins)** 입니다.
- 동시에 여러 명이 아주 짧은 간격으로 수정하면 마지막 저장이 우선됩니다.
- 인증/권한(RBAC), 충돌 해결, 변경 이력까지 필요하면 다음 단계로 Supabase/Postgres 정식 마이그레이션을 권장합니다.
