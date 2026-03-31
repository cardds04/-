-- =============================================================================
-- 단일 테이블 company_directory 로 업체(companies) + 고객 계정(customers) 통합
-- 실행 전: python3 tools/supabase_backup_tables.py
--
-- [중요] 이 파일은 "테이블이 계속 추가되는" 게 아니라, 적용 시 딱 한 번 실행되는
-- 일회성 스크립트입니다. Supabase 대시보드/SQL 또는 supabase db push 로 실행하기
-- 전까지는 DB에 company_directory 가 생기지 않습니다.
--
-- 적용 후에는 업체·고객 도메인이 companies + customers 두 개가 아니라
-- company_directory 한 테이블로 정리되고, 옛 테이블은 _deprecated_ 로만 남습니다.
--
-- companies / customers 가 이미 _deprecated_* 로 바뀐 DB 에서도 데이터 이전이
-- 동작하도록 소스 테이블 이름을 자동 선택합니다.
-- =============================================================================

-- 예전 마이그레이션에서 VIEW 였을 수도, 이미 TABLE 로 만들었을 수도 있어서 둘 다 처리
DO $$
DECLARE
  rk "char";
BEGIN
  SELECT c.relkind
  INTO rk
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'company_directory';

  IF rk = 'v' THEN
    EXECUTE 'DROP VIEW public.company_directory CASCADE';
  ELSIF rk = 'm' THEN
    EXECUTE 'DROP MATERIALIZED VIEW public.company_directory CASCADE';
  ELSIF rk = 'r' THEN
    EXECUTE 'DROP TABLE public.company_directory CASCADE';
  END IF;
END $$;

-- company_id FK 제거 (원본 또는 이미 rename 된 테이블)
DO $$
BEGIN
  IF to_regclass('public.customers') IS NOT NULL THEN
    ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_company_id_fkey;
  END IF;
  IF to_regclass('public._deprecated_customers') IS NOT NULL THEN
    ALTER TABLE public._deprecated_customers DROP CONSTRAINT IF EXISTS customers_company_id_fkey;
  END IF;
END $$;

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
-- 데이터 이전: public.companies 또는 public._deprecated_companies 중 존재하는 쪽 사용
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  comp_src text;
  cust_src text;
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    comp_src := 'public.companies';
  ELSIF to_regclass('public._deprecated_companies') IS NOT NULL THEN
    comp_src := 'public._deprecated_companies';
  ELSE
    comp_src := NULL;
  END IF;

  IF to_regclass('public.customers') IS NOT NULL THEN
    cust_src := 'public.customers';
  ELSIF to_regclass('public._deprecated_customers') IS NOT NULL THEN
    cust_src := 'public._deprecated_customers';
  ELSE
    cust_src := NULL;
  END IF;

  -- 1) 업체 행 복사
  IF comp_src IS NOT NULL THEN
    EXECUTE format(
      $q$
      insert into public.company_directory (id, name, phone, code, created_at, updated_at)
      select
        c.id,
        c.name,
        coalesce(c.phone, ''),
        coalesce(c.code, ''),
        coalesce(c.updated_at, now()),
        coalesce(c.updated_at, now())
      from %s c
      where not exists (select 1 from public.company_directory d where d.id = c.id)
      on conflict (id) do nothing
      $q$,
      comp_src
    );
  END IF;

  -- 2) companies + customers 조인으로 login_id 등 백필 (둘 다 있을 때만)
  IF comp_src IS NOT NULL AND cust_src IS NOT NULL THEN
    EXECUTE format(
      $q$
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
        from %s co
        inner join %s cu
          on (cu.company_id = co.id)
          or (cu.company_id is null and lower(trim(cu.company_name)) = lower(trim(co.name)))
        order by co.id, cu.created_at asc nulls last
      ) s
      where d.id = s.dir_id
        and d.login_id is null
      $q$,
      comp_src,
      cust_src
    );
  END IF;

  -- 3) customers 만 있던 계정 행 추가
  IF cust_src IS NOT NULL THEN
    EXECUTE format(
      $q$
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
      from %s cu
      where not exists (
        select 1 from public.company_directory d where d.login_id is not null and d.login_id = cu.login_id
      )
      $q$,
      cust_src
    );
  END IF;
END $$;

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

-- 원래 이름으로 남아 있을 때만 deprecated 로 이름 변경
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    ALTER TABLE public.companies RENAME TO _deprecated_companies;
  END IF;
  IF to_regclass('public.customers') IS NOT NULL THEN
    ALTER TABLE public.customers RENAME TO _deprecated_customers;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public._deprecated_companies') IS NOT NULL THEN
    EXECUTE 'revoke all on table public._deprecated_companies from public, anon, authenticated';
  END IF;
  IF to_regclass('public._deprecated_customers') IS NOT NULL THEN
    EXECUTE 'revoke all on table public._deprecated_customers from public, anon, authenticated';
  END IF;
END $$;
