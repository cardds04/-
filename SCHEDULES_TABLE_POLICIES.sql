-- ================================================================
-- schedules 테이블 RLS 정책 추가 스크립트
-- Supabase SQL Editor에서 실행하세요.
-- ================================================================

-- 1) schedules 테이블에 RLS가 활성화되어 있는지 확인 후 활성화
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- 2) SELECT 정책 (이미 있을 수 있으므로 DROP 후 재생성)
DROP POLICY IF EXISTS "public_read_schedules" ON public.schedules;
CREATE POLICY "public_read_schedules"
ON public.schedules
FOR SELECT
TO anon, authenticated
USING (true);

-- 3) INSERT 정책
DROP POLICY IF EXISTS "public_insert_schedules" ON public.schedules;
CREATE POLICY "public_insert_schedules"
ON public.schedules
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 4) UPDATE 정책 ← 이게 없으면 source="deleted" PATCH가 조용히 실패함
DROP POLICY IF EXISTS "public_update_schedules" ON public.schedules;
CREATE POLICY "public_update_schedules"
ON public.schedules
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5) DELETE 정책 ← 이게 없으면 삭제 요청이 조용히 실패함
DROP POLICY IF EXISTS "public_delete_schedules" ON public.schedules;
CREATE POLICY "public_delete_schedules"
ON public.schedules
FOR DELETE
TO anon, authenticated
USING (true);

-- ================================================================
-- 완료 후 확인 쿼리
-- ================================================================
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'schedules';
