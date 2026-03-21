-- 고객 등록 후 관리자에서만 지웠는데 고객/입금에 남는 경우:
-- 원인은 보통 Supabase `schedules` 행이 id 없이 삭제되어 서버에 남은 채 pull 되살리는 경우입니다.
-- (코드는 index.html 에서 복합키로 서버 삭제를 보강했습니다.)
--
-- 아래는 스크린샷 건(2026-03-31, 장소 ㅌ테스ㅡ트) 예시입니다.
-- 반드시 SELECT 로 행 확인 후 DELETE 하세요.

-- 1) 대상 확인 (company_name 은 본인 업체명으로 바꾸는 것을 권장)
select id, company_name, date_key, time_key, place, payment_status, source
from public.schedules
where date_key = '2026-03-31'
  and place = 'ㅌ테스ㅡ트'
  and time_key in ('09:00', '9:00');

-- 2) 연결된 입금 행: memo JSON 안의 snapshot.customerScheduleId 또는 date/time/place 로 식별됩니다.
--    payments 테이블 구조에 따라 아래는 프로젝트에 맞게 조정하세요.
select id, company_name, payer_name, amount, status, memo
from public.payments
order by updated_at desc
limit 200;

-- 3) schedules 삭제 (위 SELECT 에서 확인한 id 로 단건 삭제가 가장 안전)
-- delete from public.schedules where id = '여기-uuid';

-- 또는 조건 삭제 (한 건만 매칭될 때만 사용)
-- delete from public.schedules
-- where date_key = '2026-03-31'
--   and place = 'ㅌ테스ㅡ트'
--   and time_key in ('09:00', '9:00');
