-- ============================================================
-- public-order.html 자체 회원가입을 위한 Supabase 테이블
-- Supabase SQL Editor 에서 한 번만 실행하면 됩니다.
-- ============================================================

-- 테이블 생성
CREATE TABLE IF NOT EXISTS public.public_customers (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  phone        TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE public.public_customers ENABLE ROW LEVEL SECURITY;

-- 정책: anon / authenticated 모두 허용 (조회, 등록, 수정)
DROP POLICY IF EXISTS "public_customers_select" ON public.public_customers;
CREATE POLICY "public_customers_select"
  ON public.public_customers FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public_customers_insert" ON public.public_customers;
CREATE POLICY "public_customers_insert"
  ON public.public_customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "public_customers_update" ON public.public_customers;
CREATE POLICY "public_customers_update"
  ON public.public_customers FOR UPDATE
  TO anon, authenticated
  USING (true) WITH CHECK (true);
