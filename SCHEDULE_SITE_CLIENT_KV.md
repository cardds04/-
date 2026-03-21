# Safari / localStorage 대비: `schedule_site_client_kv` (Supabase)

크롬에서는 `localStorage` 스냅샷(`__scheduleSiteSnapshotV1`)이 잘 쌓이지만, 사파리(비공개 창·용량 제한 등)에서는 비어 있어 화면이 안 뜨는 경우가 있습니다.

이 프로젝트는 **`schedule_site_client_kv`** 테이블에 `scheduleSite`로 시작하는 키 묶음을 저장해, 페이지 로드 시 **Supabase에서 먼저 복원**합니다.

## 1. Supabase에서 테이블 만들기

1. Supabase 대시보드 → **SQL Editor**
2. 저장소의 `supabase-schema.sql` 맨 아래에 추가된 **`schedule_site_client_kv`** 구문을 실행  
   (전체 파일을 다시 실행해도 되고, 해당 블록만 복사해 실행해도 됩니다.)

## 2. 동작 요약

- **행 ID**: `scoped_local_v1` (고정 1행)
- **열 `kv`**: `{ "scheduleSiteAdminSchedules": "[...]", ... }` 형태의 JSON
- 로컬에 스코프 데이터가 **없고** 서버에 데이터가 있으면 → 서버 내용으로 메모리 복원
- 로컬에 이미 있고, 서버 `updated_at`이 **로컬 마지막 수정보다 최신**이면 → 서버로 덮어씀 (다른 기기에서 저장한 경우)
- 데이터가 바뀔 때마다(디바운스) Supabase에 **업서트**

## 3. 확인

- 관리자 페이지에서 스케줄을 한 번 저장·수정한 뒤, Supabase **Table Editor**에서 `schedule_site_client_kv` 행이 생겼는지 확인합니다.
- 사파리에서 같은 사이트를 열었을 때 목록이 보이면 정상입니다.

**주의:** anon 키로 읽기/쓰기가 가능하므로, 운영 환경에서는 RLS·정책을 프로젝트 보안 요구에 맞게 조정하세요.

## 4. 전체스케줄 대시보드 2·3번 칸

- **2번** 완료된 작업: `scheduleSiteAdminDashboardCompletedV1`
- **3번** 오늘 처리(7일 그리드): `scheduleSiteAdminWriterProcessLogV1`

완료 처리·되돌리기 시 위 두 값이 바뀔 때마다 **`schedule_site_client_kv`에 업서트**되도록 별도 동기화가 붙어 있습니다.  
브라우저 개발자 도구 콘솔에 `[DASHBOARD_KV]` 로그가 나오면 저장 시도 결과를 확인할 수 있습니다.

## 왜 같은 Supabase인데도 기기마다 다르게 보일까?

같은 **프로젝트(베이스)** 를 써도 아래면 연동이 깨질 수 있습니다.

1. **테이블이 둘**  
   일정 본문은 주로 **`schedules`** 테이블, 브라우저 캐시·대시보드 묶음은 **`schedule_site_client_kv`** 입니다. 한쪽만 쓰거나 한쪽 저장이 실패하면 화면이 엇갈립니다.

2. **RLS(행 보안)**  
   `schedules` 는 되는데 `schedule_site_client_kv` 만 **403 / new row violates** 가 나면, anon 에 대한 INSERT/UPDATE 정책이 없거나 다른 것입니다.

3. **브라우저마다 로컬이 다름**  
   크롬·사파리는 **각자 메모리·스냅샷**이 있습니다. `client_kv` 로 올리/내려받기가 실패하면 “같은 DB인데 다름”처럼 보입니다.

4. **이전 버그(대시보드 저장 시 kv 덮어쓰기)**  
   메모리에 다른 키가 비어 있을 때 대시보드만 저장하면, 서버 `kv` 안의 **다른 scheduleSite 키가 통째로 지워질 수 있었습니다.** (코드에서 서버 기준 병합으로 수정함)

5. **접속 방식**  
   `file://` 로 HTML 을 열면 브라우저가 API 를 막을 수 있습니다. **http(s) 로 서빙**하는지 확인하세요.

6. **URL·anon 키 불일치**  
   한 기기의 `sync-config.js` 가 옛 프로젝트를 가리키면 “같은 베이스”가 아닙니다.

---

## 5. 테이블이 계속 비어 있을 때

1. 콘솔에 `[DASHBOARD_KV] schedule_site_client_kv 저장 실패` 또는 `401` / `403` / `42501` 이 있는지 확인합니다.
2. **Authentication → Policies** 에서 `schedule_site_client_kv`에 **anon**용 `SELECT` / `INSERT` / `UPDATE` 가 모두 허용되는지 확인합니다. (스키마에 넣은 `public_read_*` / `public_write_*` / `public_update_*` 정책)
3. **Settings → API** 의 Project URL·anon key가 `sync-config.js`와 일치하는지 확인합니다.
