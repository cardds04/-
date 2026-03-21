# 대시보드 2·3번 칸 동기화: `schedule_dashboard_state`

**1번 칸(스케줄 목록)** 은 기존처럼 `schedules` 등 기존 Supabase 경로를 씁니다.  
**2번(완료)·3번(작가 처리 로그)** 만 이 테이블 **한 줄(`id = global`)** 에 저장·불러와서, 모든 브라우저가 같은 값을 보게 합니다.

`schedule_site_client_kv` 는 Safari 복구용 **다른 키들**만 두고, 대시보드 JSON은 **여기로 분리**했습니다.

## 1. Supabase에 테이블 만들기

1. Supabase → **SQL Editor**
2. 저장소 `supabase-schema.sql` 맨 아래 **`schedule_dashboard_state`** 블록을 복사해 실행  
   (또는 해당 파일 전체를 다시 실행해도 됩니다.)

## 2. 구조

| 컬럼 | 설명 |
|------|------|
| `id` | 고정 `global` (PK) |
| `completed` | 2번 칸 — 완료 항목 배열 (jsonb) |
| `process_log` | 3번 칸 — 작가 처리 로그 배열 (jsonb) |
| `updated_at` | 자동 갱신 |

로컬 키 이름(참고): `scheduleSiteAdminDashboardCompletedV1`, `scheduleSiteAdminWriterProcessLogV1`

## 3. 동작 요약

- 페이지 로드 시 **먼저** 이 테이블에서 읽어 `localStorage`에 반영한 뒤 나머지 초기화가 이어집니다.
- 2·3번 데이터가 바뀌면 **디바운스 후** 같은 행에 upsert 합니다.
- 창 포커스·탭이 다시 보일 때도 한 번 다시 가져옵니다.
- 콘솔 로그 접두사: `[DASHBOARD_STATE]`

## 4. 문제가 있을 때

- **403 / RLS**: `schedule_dashboard_state` 에 anon용 `SELECT` / `INSERT` / `UPDATE` 정책이 있는지 확인하세요. (스키마에 포함됨)
- **테이블 없음**: SQL 블록을 아직 실행하지 않은 경우입니다.
