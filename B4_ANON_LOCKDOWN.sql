-- ================================================================
-- B-4: anon(브라우저 키) 차단 — payments 테이블 (이번 단계는 payments 만)
-- Supabase SQL Editor 에서 대표님이 직접 실행하세요.
-- ================================================================
--
-- 무엇을 하나?
--   payments 테이블에서 anon(익명, 브라우저에 박혀 있는 공개 키)의
--   SELECT/INSERT/UPDATE/DELETE 권한을 모두 제거합니다.
--   RLS 는 켠 채로 두고 "허용 정책"만 지우면 anon 은 자동으로 전면 거부됩니다.
--   서버(api/*)는 service_role 키를 쓰고, service_role 은 RLS 를 통째로
--   우회하므로 customer-data / customer-write / admin-db 엔드포인트는 그대로
--   정상 동작합니다.
--
-- 왜 payments 만?
--   • payments : 고객/더필링 페이지는 서버(customer-data·customer-write)로
--     완전히 컷오버됨(anon 은 폴백일 뿐), 관리자(index.js)는 admin-db 프록시
--     경유, photographer.html 은 payments 를 아예 안 건드림 → 지금 잠가도 안전.
--   • schedules : photographer.html(작가 페이지)이 아직 anon 으로 직접 읽음(1차 경로).
--   • writers   : photographer.html 이 anon 으로 직접 읽고/쓰며(password 컬럼까지!)
--     작가 로그인 자체가 writers 로컬 캐시에 의존.
--   → schedules·writers 는 photographer.html 서버 컷오버(B-5)를 끝낸 뒤 잠가야
--     작가 로그인/일정이 깨지지 않습니다. 이번 SQL 에는 포함하지 않았습니다.
--
-- ⚠️ 되돌리기: 맨 아래 [롤백] 섹션을 실행하면 기존 공개 정책이 복구됩니다.
--   순서: [0] 현재 정책 확인 → 실행 전 스모크 테스트 통과 확인 →
--   [2] 잠금 실행 → [3] 0개 확인 → 문제 시 [롤백].
-- ================================================================


-- ────────────────────────────────────────────────────────────────
-- [0] 실행 전: 현재 payments 정책 목록 확인 (무엇이 지워질지 미리 보기)
-- ────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'payments'
ORDER BY cmd;


-- ────────────────────────────────────────────────────────────────
-- [2] 잠금 실행 — payments 의 모든 정책 제거 (RLS 는 유지)
--     정책 이름이 환경마다 다를 수 있어, 이름에 의존하지 않고
--     테이블의 모든 정책을 동적으로 DROP 합니다.
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'payments'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.payments;', pol.policyname);
    RAISE NOTICE 'dropped policy % on payments', pol.policyname;
  END LOOP;
END $$;

-- RLS 가 반드시 켜져 있어야 "정책 없음 = 전면 거부"가 됩니다.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- [3] 실행 후: payments 정책이 0개인지 확인 (anon 차단 완료 상태)
-- ────────────────────────────────────────────────────────────────
SELECT count(*) AS payments_policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'payments';
-- payments_policy_count 가 0 이면 정상.


-- ================================================================
-- [롤백] 문제가 생겼을 때만 실행 — 기존 공개(anon) 정책을 복구
--   (잠금 직후 스모크 테스트가 깨지면 즉시 이 블록의 주석을 풀고 실행)
-- ================================================================
-- CREATE POLICY "public_read_payments"   ON public.payments FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "public_insert_payments" ON public.payments FOR INSERT TO anon, authenticated WITH CHECK (true);
-- CREATE POLICY "public_update_payments" ON public.payments FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "public_delete_payments" ON public.payments FOR DELETE TO anon, authenticated USING (true);
