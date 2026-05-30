-- ================================================================
-- B-6: anon(브라우저 키) 차단 — writers · schedules 테이블
-- Supabase SQL Editor 에서 대표님이 직접 실행하세요.
-- ⚠️ 반드시 B-5 배포 후, 아래 [실행 전 스모크 체크리스트]를 모두 통과한 뒤 실행.
-- ================================================================
--
-- 무엇을 하나?
--   writers / schedules 테이블에서 anon(브라우저에 박힌 공개 키)의
--   SELECT/INSERT/UPDATE/DELETE 권한을 모두 제거합니다.
--   RLS 는 켠 채로 "허용 정책"만 지우면 anon 은 자동으로 전면 거부됩니다.
--   서버(api/*)는 service_role 키로 RLS 를 우회하므로
--   writer-auth / writer-db / customer-data / admin-db 엔드포인트는 그대로 동작합니다.
--
-- B-5 에서 무엇이 바뀌었나(=지금 잠가도 되는 이유)?
--   • photographer.html(작가 페이지):
--       - writers/schedules 읽기 → 작가 토큰 기반 /api/writer-db 프록시(service_role)로 컷오버.
--       - 작가 로그인/회원가입 → /api/writer-auth(service_role)로 컷오버.
--       - writers 쓰기 함수(syncWritersTableFromStorage)는 호출되지 않는 죽은 코드.
--       - 작가 일정 완료/상태 변경 → /api/photographer-shoot-*(service_role).
--   • customer.html / public-order.html: schedules 는 /api/customer-data(service_role) 경유
--     (anon 은 폴백일 뿐).
--   • 관리자(index.js): writers/schedules 는 /api/admin-db 프록시(service_role) 경유.
--   ⚠️ 단, dayoff_requests 는 작가 페이지가 아직 anon 으로 직접 읽고/씀 → 이번에 잠그지 않음.
--
-- ⚠️ 되돌리기: 각 섹션 아래 [롤백]의 주석을 풀어 실행하면 공개 정책이 복구됩니다.
--   권장 순서: writers 먼저(블래스트 반경 작음: 작가 페이지+관리자 명단) 잠그고
--   스모크 재확인 → 이상 없으면 schedules(모든 페이지가 봄) 잠그기.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- [실행 전] 스모크 체크리스트 — 아래가 모두 정상이어야 잠금 진행
-- ════════════════════════════════════════════════════════════════
--   1) 작가 페이지(photographer.html): 로그인 → 내 일정 보임 → 작가 목록 보임 →
--      촬영 완료/상태 변경 동작 → (가능하면) 신규 작가 회원가입 1건 성공.
--   2) 관리자(index.html): 작가 명단 보임 → 전체 일정 보임.
--   3) 고객(customer.html) · 더필링(public-order.html): 로그인 → 내 일정/예약 보임.
--   ※ 새로고침(캐시 무시) 후 확인. 하나라도 깨지면 잠금 중단하고 알려주세요.


-- ════════════════════════════════════════════════════════════════
-- (A) writers 잠금
-- ════════════════════════════════════════════════════════════════

-- [A-0] 실행 전: 현재 writers 정책 목록 확인 (무엇이 지워질지 미리 보기)
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'writers'
ORDER BY cmd;

-- [A-2] 잠금 실행 — writers 의 모든 정책 제거 (RLS 는 유지)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'writers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.writers;', pol.policyname);
    RAISE NOTICE 'dropped policy % on writers', pol.policyname;
  END LOOP;
END $$;

ALTER TABLE public.writers ENABLE ROW LEVEL SECURITY;

-- [A-3] 실행 후: writers 정책이 0개인지 확인 (anon 차단 완료 상태)
SELECT count(*) AS writers_policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'writers';
-- writers_policy_count 가 0 이면 정상.


-- ════════════════════════════════════════════════════════════════
-- (B) schedules 잠금  ── writers 잠금 후 스모크 재확인하고 실행 권장
-- ════════════════════════════════════════════════════════════════

-- [B-0] 실행 전: 현재 schedules 정책 목록 확인
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'schedules'
ORDER BY cmd;

-- [B-2] 잠금 실행 — schedules 의 모든 정책 제거 (RLS 는 유지)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'schedules'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.schedules;', pol.policyname);
    RAISE NOTICE 'dropped policy % on schedules', pol.policyname;
  END LOOP;
END $$;

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- [B-3] 실행 후: schedules 정책이 0개인지 확인
SELECT count(*) AS schedules_policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'schedules';
-- schedules_policy_count 가 0 이면 정상.


-- ================================================================
-- [롤백] 문제가 생겼을 때만 — 깨진 테이블의 공개(anon) 정책만 골라 복구
--   (잠금 직후 스모크가 깨지면 즉시 해당 블록 주석을 풀고 실행)
-- ================================================================
-- -- writers 롤백
-- CREATE POLICY "public_read_writers"   ON public.writers FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "public_insert_writers" ON public.writers FOR INSERT TO anon, authenticated WITH CHECK (true);
-- CREATE POLICY "public_update_writers" ON public.writers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "public_delete_writers" ON public.writers FOR DELETE TO anon, authenticated USING (true);
--
-- -- schedules 롤백
-- CREATE POLICY "public_read_schedules"   ON public.schedules FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "public_insert_schedules" ON public.schedules FOR INSERT TO anon, authenticated WITH CHECK (true);
-- CREATE POLICY "public_update_schedules" ON public.schedules FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "public_delete_schedules" ON public.schedules FOR DELETE TO anon, authenticated USING (true);
