-- customers ↔ companies 단일 기준 연결: FK 추가
-- 적용 전: tools/supabase_backup_tables.py 로 백업 권장
--
-- Supabase SQL Editor 에서 한 번에 실행

alter table public.customers
  add column if not exists company_id uuid references public.companies (id) on delete set null;

create index if not exists idx_customers_company_id on public.customers (company_id);

comment on column public.customers.company_id is 'public.companies.id — 업체 표시명/연락처의 단일 출처';

-- 기존 행 백필: company_name + company_code 로 companies 와 매칭 (이름 우선, 코드 보조)
update public.customers c
set company_id = co.id
from public.companies co
where c.company_id is null
  and lower(trim(c.company_name)) = lower(trim(co.name));

update public.customers c
set company_id = co.id
from public.companies co
where c.company_id is null
  and nullif(trim(c.company_code), '') is not null
  and lower(trim(c.company_code)) = lower(trim(co.code));

-- 선택: 읽기용 뷰 (관리자 대시보드에서 조인 조회 시)
create or replace view public.company_directory as
select
  co.id as company_row_id,
  co.name as company_name,
  co.phone as company_phone,
  co.code as company_code,
  co.updated_at as company_updated_at,
  cu.login_id,
  cu.phone as customer_phone,
  cu.site_type
from public.companies co
left join public.customers cu on cu.company_id = co.id;

comment on view public.company_directory is 'companies 기준 + 연결된 고객 계정(있으면)';
