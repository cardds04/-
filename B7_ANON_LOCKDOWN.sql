-- ================================================================
-- B-7: anon(브라우저 키) 차단 — dayoff_requests (휴무요청) 테이블
-- Supabase SQL Editor 에서 대표님이 직접 실행하세요.
-- ⚠️ 반드시 FU-1 배포 후, 아래 [실행 전 스모크 체크리스트]를 통과한 뒤 실행.
-- ================================================================
--
-- 무엇을 하나?
--   dayoff_requests 에서 anon(브라우저 공개 키)의 SELECT/INSERT/UPDATE/DELETE 를
--   모두 제거합니다. RLS 는 켠 채로 정책만 지우면 anon 은 전면 거부됩니다.
--   서버(api/*)는 service_role 로 우회하므로 작가/관리자 경로는 그대로 동작합니다.
--
-- FU-1 에서 무엇이 바뀌었나(=지금 잠가도 되는 이유)?
--   • photographer.html(작가): 휴무요청 읽기는 /api/writer-db GET 프록시,
--     생성/취소(POST/DELETE)는 /api/writer-db 쓰기 프록시(dayoff_requests 한정)로 컷오버.
--   • index.js(관리자): /rest/v1/dayoff_requests 호출이 전역 fetch 인터셉터로
--     /api/admin-db 프록시(service_role)를 자동 경유(읽기·생성·삭제 모두).
--   ⇒ 양쪽 모두 anon 폴백일 뿐, service_role 경로가 1차다.
--
-- ⚠️ 되돌리기: 맨 아래 [롤백] 주석을 풀어 실행하면 공개 정책이 복구됩니다.
-- ================================================================


-- ════════════════════════════════════════════════════════════════
-- [실행 전] 스모크 체크리스트 — 모두 정상이어야 잠금 진행
-- ════════════════════════════════════════════════════════════════
--   1) 작가 페이지: 휴무요청 등록 1건 → 목록에 보임 → 취소 → 사라짐.
--   2) 관리자: 달력/알림에 작가 휴무요청이 보임. (관리자에서 삭제도 가능하면 확인)
--   ※ 새로고침(캐시 무시) 후 확인. 깨지면 잠금 중단하고 알려주세요.


-- ────────────────────────────────────────────────────────────────
-- [0] 실행 전: 현재 dayoff_requests 정책 목록 확인
-- ────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'dayoff_requests'
ORDER BY cmd;


-- ────────────────────────────────────────────────────────────────
-- [2] 잠금 실행 — dayoff_requests 의 모든 정책 제거 (RLS 는 유지)
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'dayoff_requests'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.dayoff_requests;', pol.policyname);
    RAISE NOTICE 'dropped policy % on dayoff_requests', pol.policyname;
  END LOOP;
END $$;

ALTER TABLE public.dayoff_requests ENABLE ROW LEVEL SECURITY;


-- ────────────────────────────────────────────────────────────────
-- [3] 실행 후: 정책이 0개인지 확인 (anon 차단 완료)
-- ────────────────────────────────────────────────────────────────
SELECT count(*) AS dayoff_requests_policy_count
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'dayoff_requests';
-- dayoff_requests_policy_count 가 0 이면 정상.


-- ================================================================
-- [롤백] 문제가 생겼을 때만 — 공개(anon) 정책 복구
-- ================================================================
-- CREATE POLICY "public_read_dayoff"   ON public.dayoff_requests FOR SELECT TO anon, authenticated USING (true);
-- CREATE POLICY "public_insert_dayoff" ON public.dayoff_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
-- CREATE POLICY "public_update_dayoff" ON public.dayoff_requests FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
-- CREATE POLICY "public_delete_dayoff" ON public.dayoff_requests FOR DELETE TO anon, authenticated USING (true);
