-- ================================================================
-- B-4: anon(브라우저 키) 차단 — schedules · payments 테이블
-- Supabase SQL Editor 에서 대표님이 직접 실행하세요.
-- ================================================================
--
-- 무엇을 하나?
--   schedules / payments 테이블에서 anon(익명, 브라우저에 박혀 있는 공개 키)
--   의 SELECT/INSERT/UPDATE/DELETE 권한을 모두 제거합니다.
--   RLS 는 켠 채로 두고 "허용 정책"만 지우면, anon 은 자동으로 전면 거부됩니다.
--   서버(api/*)는 service_role 키를 쓰고, service_role 은 RLS 를 통째로
--   우회하므로 customer-data / customer-write / admin-db / public-occupancy
--   엔드포인트는 그대로 정상 동작합니다.
--
-- ⚠️ writers 테이블은 이번에 포함하지 않습니다.
--   photographer.html(작가 로그인 페이지)이 아직 anon 키로 writers 를
--   직접 읽고/쓰고 있어(심지어 password 컬럼까지 SELECT) 지금 잠그면
--   작가 로그인이 깨집니다. writers 는 photographer.html 서버 컷오버(B-5)
--   를 먼저 끝낸 뒤에 별도로 잠가야 합니다.
--
-- ⚠️ 되돌리기: 맨 아래 [롤백] 섹션을 실행하면 기존 공개 정책이 복구됩니다.
--   먼저 [0] 으로 현재 정책을 확인 → [1] 실행 전 스모크 테스트 통과 확인 →
--   [2] 잠금 실행 → 문제가 생기면 [롤백] 실행.
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- [0] 실행 전: 현재 정책 목록 확인 (먼저 돌려서 무엇이 지워질지 보세요)
-- ────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('schedules', 'payments')
ORDER BY tablename, cmd;


-- ────────────────────────────────────────────────────────────────
-- [2] 잠금 실행 — schedules · payments 의 모든 정책 제거 (RLS 는 유지)
--     정책 이름이 환경마다 다를 수 있어, 이름에 의존하지 않고
--     테이블의 모든 정책을 동적으로 DROP 합니다.
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('schedules', 'payments')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', pol.policyname, pol.tablename);
    RAISE NOTICE 'dropped policy % on %', pol.policyname, pol.tablename;
  END LOOP;
END $$;

-- RLS 가 반드시 켜져 있어야 "정책 없음 = 전면 거부"가 됩니다.
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments  ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- [3] 실행 후: 정책이 0개인지 확인 (anon 차단 완료 상태)
-- ────────────────────────────────────────────────────────────────
SELECT tablename, count(*) AS policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('schedules', 'payments')
GROUP BY tablename;
-- 두 테이블 모두 결과에 안 나오거나 policy_count 가 0 이면 정상.


-- ================================================================
-- [롤백] 문제가 생겼을 때만 실행 — 기존 공개(anon) 정책을 복구
--   (잠금 직후 스모크 테스트가 깨지면 즉시 이 블록을 실행하세요)
-- ================================================================
-- schedules
-- CREATE POLICY "public_read_schedules"   ON public.schedules FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "public_insert_schedules" ON public.schedules FOR INSERT TO anon, authenticated WITH CHECK (true);
-- CREATE POLICY "public_update_schedules" ON public.schedules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "public_delete_schedules" ON public.schedules FOR DELETE TO anon, authenticated USING (true);
-- payments
-- CREATE POLICY "public_read_payments"    ON public.payments  FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "public_insert_payments"  ON public.payments  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- CREATE POLICY "public_update_payments"  ON public.payments  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "public_delete_payments"  ON public.payments  FOR DELETE TO anon, authenticated USING (true);
