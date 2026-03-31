-- =============================================================================
-- 수동 병합 예시 (구 companies / customers 시절)
--
-- company_directory 통합 이후에는 아래 대신 다음을 사용하세요:
--   supabase/sql/merge_company_aliases_to_canonical.sql
--
-- ⚠️ 실행 전 반드시 백업: python3 tools/supabase_backup_tables.py
-- ⚠️ 아래 UUID·문자열을 본인 DB 값으로 바꿔서 사용하세요.
-- =============================================================================

begin;

-- 1) Supabase Table Editor → companies 에서 유지할 행(정식 이름) id 를 복사 → :keep_id
--    삭제할 행 id → :drop_id
-- 예시 (실행 금지 — 플레이스홀더):
-- keep_id  := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';  -- 꿈의공간(무료) 로 남길 행
-- drop_id  := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';  -- 삭제할 옛 행

-- 2) customers: 삭제 예정 company 행을 가리키던 경우 → 유지 행으로 연결 + 표시명 통일
-- update public.customers
-- set company_id = 'KEEP_UUID'::uuid,
--     company_name = '꿈의공간(무료)'
-- where company_id = 'DROP_UUID'::uuid
--    or lower(trim(company_name)) in ('꿈의공간', '꿈의공간(무료)');

-- 3) schedules: 업체명 문자열이 옛 이름이면 일괄 치환 (필요 시)
-- update public.schedules
-- set company_name = '꿈의공간(무료)'
-- where lower(trim(company_name)) = '꿈의공간';

-- 4) coupon_passes: PK 가 company_name 이면 행 합치기 (잔여 횟수 합산 후 옛 키 삭제)
-- insert into public.coupon_passes (company_name, remaining_count, updated_at)
-- select '꿈의공간(무료)', coalesce(a.remaining_count,0) + coalesce(b.remaining_count,0), now()
-- from public.coupon_passes a
-- cross join public.coupon_passes b
-- where a.company_name = '꿈의공간(무료)' and b.company_name = '꿈의공간';
-- → 실제로는 두 행 존재 여부에 따라 merge 로직 조정 필요. 수동으로 한 행만 남기고 삭제 권장.

-- 5) 중복 company 행 삭제 (FK 가 company_id 로 묶인 뒤에만 안전)
-- delete from public.companies where id = 'DROP_UUID'::uuid;

rollback;
-- 위 검토 후 실제 적용 시에는 rollback 을 commit 으로 바꾸세요.
