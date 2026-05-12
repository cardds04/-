-- ============================================================
-- 테스트 업체 데이터 정리 스크립트 (정규식 기반 — 새로 생긴 것도 자동 매칭)
-- ============================================================
-- 한 번에 모든 테스트 패턴 삭제. 매번 이름 추가할 필요 없음.
-- 추후 다시 생기면 이 스크립트만 다시 돌리면 됨.

-- ───────────────────────────────────────────────
-- ★ PREVIEW (정규식) ★ : 어떤 행이 지워질지 미리 확인
-- ───────────────────────────────────────────────

-- 1) schedules 에서 삭제 대상 미리보기
select id, company_name, code, writer_name, date_key
from public.schedules
where
  company_name ~ '^(QA업체\d*|E2E_COMPANY_\d+|테스트업체\d*|테스트\d*|test\d*|1234)$'
order by company_name, date_key;

-- 2) company_directory 에서 삭제 대상 미리보기
select id, name, login_id, code, phone, customer_phone
from public.company_directory
where
  name ~ '^(QA업체\d*|E2E_COMPANY_\d+|테스트업체\d*|테스트\d*|test\d*|1234)$'
order by name;

-- ───────────────────────────────────────────────
-- ★ DELETE (정규식) ★ : PREVIEW 통과 후 주석 풀고 실행
-- ───────────────────────────────────────────────

-- begin;
-- delete from public.schedules
-- where company_name ~ '^(QA업체\d*|E2E_COMPANY_\d+|테스트업체\d*|테스트\d*|test\d*|1234)$';
-- delete from public.company_directory
-- where name ~ '^(QA업체\d*|E2E_COMPANY_\d+|테스트업체\d*|테스트\d*|test\d*|1234)$';
-- commit;


-- ============================================================
-- 이전 명시 리스트 방식 (참고용 — 위 정규식이 더 편리)
-- ============================================================
-- 사용법:
--   1) Supabase SQL Editor 에서 먼저 ★PREVIEW★ 섹션만 실행해서 지울 행이 맞는지 확인
--   2) 맞으면 ★DELETE★ 섹션의 주석을 풀고 실행
--
-- 주의:
--   - schedules 를 먼저 지운 뒤 company_directory 를 지웁니다.
--     (앱 가드가 추가되어도, schedules 가 남아있으면 작가 UI 등에서 계속 보임)
--   - 백업이 필요하면 먼저 Supabase Project Settings → Backups 에서 확인하세요.
-- ============================================================

-- 삭제 대상 업체명 목록 (PT UPPERSIDE, 9051, 808 제외)
-- - 자동생성 패턴: QA업체*, E2E_COMPANY_*, 테스트업체*
-- - 수동 테스트: 테스트, 테스트2, 테스트71, 1234

-- ───────────────────────────────────────────────
-- ★ PREVIEW ★ : 먼저 이걸 돌려서 지울 행 확인
-- ───────────────────────────────────────────────

-- 1) schedules 에서 지울 행 미리보기
select id, company_name, code, writer_name, date_key
from public.schedules
where company_name in (
  'QA업체1773157303241',
  'QA업체1773157331503',
  'QA업체1773157375880',
  'E2E_COMPANY_501856',
  'E2E_COMPANY_572426',
  '테스트업체56293587',
  '테스트',
  '테스트2',
  '테스트71',
  '1234'
)
order by company_name, date_key;

-- 2) company_directory 에서 지울 행 미리보기
select id, name, login_id, code, phone, customer_phone
from public.company_directory
where name in (
  'QA업체1773157303241',
  'QA업체1773157331503',
  'QA업체1773157375880',
  'E2E_COMPANY_501856',
  'E2E_COMPANY_572426',
  '테스트업체56293587',
  '테스트',
  '테스트2',
  '테스트71',
  '1234'
)
order by name;


-- ───────────────────────────────────────────────
-- ★ DELETE ★ : PREVIEW 결과가 맞으면 아래 주석 풀고 실행
-- ───────────────────────────────────────────────

-- begin;

-- delete from public.schedules
-- where company_name in (
--   'QA업체1773157303241',
--   'QA업체1773157331503',
--   'QA업체1773157375880',
--   'E2E_COMPANY_501856',
--   'E2E_COMPANY_572426',
--   '테스트업체56293587',
--   '테스트',
--   '테스트2',
--   '테스트71',
--   '1234'
-- );

-- delete from public.company_directory
-- where name in (
--   'QA업체1773157303241',
--   'QA업체1773157331503',
--   'QA업체1773157375880',
--   'E2E_COMPANY_501856',
--   'E2E_COMPANY_572426',
--   '테스트업체56293587',
--   '테스트',
--   '테스트2',
--   '테스트71',
--   '1234'
-- );

-- commit;


-- ───────────────────────────────────────────────
-- 참고: 향후 자동 생성 차단(앱 코드 가드)
-- ───────────────────────────────────────────────
-- lib/photographer-shoot-logic.cjs 의 provisionPhotographerCompanyDeliveryFolder
-- 함수에 QA업체*, E2E_COMPANY_*, 테스트업체* 패턴 가드 추가됨 (배포 후 효력).
-- 따라서 패턴 매칭 이름은 자동으로 company_directory 에 INSERT 되지 않습니다.
