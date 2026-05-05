-- customers ↔ companies 단일 기준 연결: FK 추가
-- 적용 전: tools/supabase_backup_tables.py 로 백업 권장
--
-- 일부 원격 프로젝트에는 public.customers 가 없음(처음부터 company_directory 만 사용).
-- 해당 환경에서는 이 마이그레이션 전체를 건너뜁니다.

DO $$
BEGIN
  IF to_regclass('public.customers') IS NULL OR to_regclass('public.companies') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.customers
    ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers (company_id);

  COMMENT ON COLUMN public.customers.company_id IS 'public.companies.id — 업체 표시명/연락처의 단일 출처';

  UPDATE public.customers c
  SET company_id = co.id
  FROM public.companies co
  WHERE c.company_id IS NULL
    AND lower(trim(c.company_name)) = lower(trim(co.name));

  UPDATE public.customers c
  SET company_id = co.id
  FROM public.companies co
  WHERE c.company_id IS NULL
    AND nullif(trim(c.company_code), '') IS NOT NULL
    AND lower(trim(c.company_code)) = lower(trim(co.code));

  CREATE OR REPLACE VIEW public.company_directory AS
  SELECT
    co.id AS company_row_id,
    co.name AS company_name,
    co.phone AS company_phone,
    co.code AS company_code,
    co.updated_at AS company_updated_at,
    cu.login_id,
    cu.phone AS customer_phone,
    cu.site_type
  FROM public.companies co
  LEFT JOIN public.customers cu ON cu.company_id = co.id;

  COMMENT ON VIEW public.company_directory IS 'companies 기준 + 연결된 고객 계정(있으면)';
END $$;
