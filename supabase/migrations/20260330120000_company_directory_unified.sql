-- =============================================================================
-- 단일 테이블 company_directory 로 업체(companies) + 고객 계정(customers) 통합
-- 실행 전: python3 tools/supabase_backup_tables.py
-- =============================================================================

drop view if exists public.company_directory cascade;

alter table if exists public.customers drop constraint if exists customers_company_id_fkey;

create table if not exists public.company_directory (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  code text not null default '',
  login_id text,
  password text,
  site_type text not null default 'inlog',
  customer_phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- login_id 가 같은 행은 1개(고객 계정). NULL 은 업체만 등록 행 — PG 에서 UNIQUE 는 NULL 중복 허용
create unique index if not exists company_directory_login_id_unique on public.company_directory (login_id);

comment on table public.company_directory is '업체 정보 + (선택) 고객 로그인 — companies/customers 통합';

create or replace function public.touch_company_directory_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_company_directory_updated on public.company_directory;
create trigger trg_company_directory_updated
before update on public.company_directory
for each row
execute function public.touch_company_directory_updated_at();

-- ---------------------------------------------------------------------------
-- 데이터 이전 (테이블이 비어 있을 때만 채움)
-- ---------------------------------------------------------------------------
insert into public.company_directory (id, name, phone, code, created_at, updated_at)
select
  c.id,
  c.name,
  coalesce(c.phone, ''),
  coalesce(c.code, ''),
  coalesce(c.updated_at, now()),
  coalesce(c.updated_at, now())
from public.companies c
where not exists (select 1 from public.company_directory d where d.id = c.id)
on conflict (id) do nothing;

update public.company_directory d
set
  login_id = s.login_id,
  password = s.password,
  site_type = coalesce(nullif(trim(s.site_type), ''), 'inlog'),
  customer_phone = coalesce(s.phone, '')
from (
  select distinct on (co.id)
    co.id as dir_id,
    cu.login_id,
    cu.password,
    cu.site_type,
    cu.phone
  from public.companies co
  inner join public.customers cu
    on (cu.company_id = co.id)
    or (cu.company_id is null and lower(trim(cu.company_name)) = lower(trim(co.name)))
  order by co.id, cu.created_at asc nulls last
) s
where d.id = s.dir_id
  and d.login_id is null;

insert into public.company_directory (id, name, phone, code, login_id, password, site_type, customer_phone, created_at, updated_at)
select
  gen_random_uuid(),
  cu.company_name,
  '',
  coalesce(cu.company_code, ''),
  cu.login_id,
  cu.password,
  coalesce(nullif(trim(cu.site_type), ''), 'inlog'),
  coalesce(cu.phone, ''),
  cu.created_at,
  now()
from public.customers cu
where not exists (
  select 1 from public.company_directory d where d.login_id is not null and d.login_id = cu.login_id
);

alter table public.company_directory enable row level security;

drop policy if exists "public_read_company_directory" on public.company_directory;
create policy "public_read_company_directory"
on public.company_directory for select to anon, authenticated using (true);

drop policy if exists "public_insert_company_directory" on public.company_directory;
create policy "public_insert_company_directory"
on public.company_directory for insert to anon, authenticated with check (true);

drop policy if exists "public_update_company_directory" on public.company_directory;
create policy "public_update_company_directory"
on public.company_directory for update to anon, authenticated using (true) with check (true);

drop policy if exists "public_delete_company_directory" on public.company_directory;
create policy "public_delete_company_directory"
on public.company_directory for delete to anon, authenticated using (true);

do $$
begin
  alter publication supabase_realtime add table public.company_directory;
exception
  when duplicate_object then null;
end $$;

alter table if exists public.companies rename to _deprecated_companies;
alter table if exists public.customers rename to _deprecated_customers;

revoke all on table public._deprecated_companies from public, anon, authenticated;
revoke all on table public._deprecated_customers from public, anon, authenticated;
