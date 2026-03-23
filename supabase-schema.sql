create table if not exists public.app_state (
  id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_state (id, payload)
values ('global', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.app_state enable row level security;

drop policy if exists "public_read_app_state" on public.app_state;
create policy "public_read_app_state"
on public.app_state
for select
to anon, authenticated
using (true);

drop policy if exists "public_write_app_state" on public.app_state;
create policy "public_write_app_state"
on public.app_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "public_update_app_state" on public.app_state;
create policy "public_update_app_state"
on public.app_state
for update
to anon, authenticated
using (true)
with check (true);

-- ------------------------------------------------------------
-- 빈 payload로 핵심 키가 초기화되는 현상 방지용 서버 가드
-- ------------------------------------------------------------
create or replace function public.guard_app_state_payload()
returns trigger
language plpgsql
as $$
declare
  protected_keys text[] := array[
    'scheduleSiteAdminCompanies',
    'scheduleSiteCustomerCompanies',
    'scheduleSiteAdminSchedules',
    'scheduleSiteCustomerSchedules',
    'scheduleSiteWriters',
    'scheduleSiteWriterSchedules',
    'scheduleSitePhotographerProfiles',
    'shared_master_account_map_v1'
  ];
  key_name text;
  old_text text;
  new_text text;
begin
  if new.payload is null then
    new.payload := '{}'::jsonb;
  end if;

  if tg_op = 'UPDATE' then
    foreach key_name in array protected_keys loop
      old_text := old.payload ->> key_name;
      new_text := new.payload ->> key_name;

      -- 기존 값이 유효(비어있지 않음)인데, 새 값이 비거나 null이면 기존 값 유지
      if old_text is not null
         and old_text <> ''
         and old_text <> '[]'
         and old_text <> '{}'
         and (new_text is null or new_text = '' or new_text = '[]' or new_text = '{}')
      then
        new.payload := jsonb_set(new.payload, array[key_name], old.payload -> key_name, true);
      end if;
    end loop;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_guard_app_state_payload on public.app_state;
create trigger trg_guard_app_state_payload
before insert or update
on public.app_state
for each row
execute function public.guard_app_state_payload();

-- ------------------------------------------------------------
-- companies.code는 빈값 허용 (구버전 클라이언트 null 전송 대비)
-- ------------------------------------------------------------
alter table if exists public.companies
  alter column code drop not null;

-- 업체 고유번호(code)는 중복 허용
do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'companies_code_unique_idx'
      and conrelid = 'public.companies'::regclass
  ) then
    alter table public.companies drop constraint companies_code_unique_idx;
  end if;
exception when undefined_table then
  null;
end;
$$;

drop index if exists public.companies_code_unique_idx;

-- ------------------------------------------------------------
-- 쿠폰 잔여 횟수 / 사용 이력 저장 테이블
-- ------------------------------------------------------------
create table if not exists public.coupon_passes (
  company_name text primary key,
  remaining_count integer not null default 0 check (remaining_count >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.coupon_usage_history (
  id bigserial primary key,
  company_name text not null,
  schedule_id text,
  action text not null,
  delta integer not null default 0,
  before_count integer,
  after_count integer,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists idx_coupon_usage_history_company_name_created_at
  on public.coupon_usage_history (company_name, created_at desc);

create or replace function public.touch_coupon_passes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_coupon_passes_updated_at on public.coupon_passes;
create trigger trg_touch_coupon_passes_updated_at
before update on public.coupon_passes
for each row
execute function public.touch_coupon_passes_updated_at();

alter table public.coupon_passes enable row level security;
alter table public.coupon_usage_history enable row level security;

drop policy if exists "public_read_coupon_passes" on public.coupon_passes;
create policy "public_read_coupon_passes"
on public.coupon_passes
for select
to anon, authenticated
using (true);

drop policy if exists "public_write_coupon_passes" on public.coupon_passes;
create policy "public_write_coupon_passes"
on public.coupon_passes
for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public_read_coupon_usage_history" on public.coupon_usage_history;
create policy "public_read_coupon_usage_history"
on public.coupon_usage_history
for select
to anon, authenticated
using (true);

drop policy if exists "public_write_coupon_usage_history" on public.coupon_usage_history;
create policy "public_write_coupon_usage_history"
on public.coupon_usage_history
for insert
to anon, authenticated
with check (true);

-- ------------------------------------------------------------
-- writers.login_id 보호: NOT NULL + UNIQUE 강제
-- ------------------------------------------------------------
do $$
declare
  blank_count integer := 0;
  dup_count integer := 0;
begin
  if to_regclass('public.writers') is null then
    return;
  end if;

  select count(*)
    into blank_count
  from public.writers
  where login_id is null or btrim(login_id) = '';

  if blank_count > 0 then
    raise exception 'writers.login_id 가 비어있는 데이터 %건이 있어 NOT NULL 적용이 중단되었습니다. 먼저 정리해주세요.', blank_count;
  end if;

  select count(*)
    into dup_count
  from (
    select login_id
    from public.writers
    group by login_id
    having count(*) > 1
  ) d;

  if dup_count > 0 then
    raise exception 'writers.login_id 중복 데이터 그룹 %개가 있어 UNIQUE 적용이 중단되었습니다. 먼저 정리해주세요.', dup_count;
  end if;

  update public.writers
  set login_id = btrim(login_id)
  where login_id <> btrim(login_id);

  alter table public.writers
    alter column login_id set not null;
end;
$$;

create unique index if not exists writers_login_id_unique
  on public.writers (login_id);

-- ------------------------------------------------------------
-- 고객 사이트 구분(inlog/shopick) 컬럼
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'customers'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'site_type'
  ) then
    alter table public.customers add column site_type text not null default 'inlog';
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'customers'
      and column_name = 'site_type'
  ) then
    update public.customers
    set site_type = 'inlog'
    where site_type is null or btrim(site_type) = '';
  end if;
end
$$;

-- ------------------------------------------------------------
-- 고객 접수 이력(append-only) 보존 테이블
-- ------------------------------------------------------------
create table if not exists public.customer_submission_receipts (
  receipt_id text primary key,
  schedule_id text,
  customer_id text,
  company_name text,
  schedule_date text,
  schedule_time text,
  place text,
  source text not null default 'customer',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_submission_receipts_created_at
  on public.customer_submission_receipts (created_at desc);

create index if not exists idx_customer_submission_receipts_schedule_id
  on public.customer_submission_receipts (schedule_id);

alter table public.customer_submission_receipts enable row level security;

drop policy if exists "public_read_customer_submission_receipts" on public.customer_submission_receipts;
create policy "public_read_customer_submission_receipts"
on public.customer_submission_receipts
for select
to anon, authenticated
using (true);

drop policy if exists "public_write_customer_submission_receipts" on public.customer_submission_receipts;
create policy "public_write_customer_submission_receipts"
on public.customer_submission_receipts
for insert
to anon, authenticated
with check (true);

-- append-only 강제: 기존 기록 수정/삭제 금지
drop policy if exists "public_update_customer_submission_receipts" on public.customer_submission_receipts;
create policy "public_update_customer_submission_receipts"
on public.customer_submission_receipts
for update
to anon, authenticated
using (false)
with check (false);

drop policy if exists "public_delete_customer_submission_receipts" on public.customer_submission_receipts;
create policy "public_delete_customer_submission_receipts"
on public.customer_submission_receipts
for delete
to anon, authenticated
using (false);

-- ------------------------------------------------------------
-- Safari 등 localStorage 스냅샷이 비어 있을 때 복구용: scheduleSite* 키 묶음
-- ------------------------------------------------------------
create table if not exists public.schedule_site_client_kv (
  id text primary key,
  kv jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.set_schedule_site_client_kv_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_schedule_site_client_kv_updated on public.schedule_site_client_kv;
create trigger trg_schedule_site_client_kv_updated
before insert or update on public.schedule_site_client_kv
for each row
execute function public.set_schedule_site_client_kv_updated_at();

alter table public.schedule_site_client_kv enable row level security;

drop policy if exists "public_read_schedule_site_client_kv" on public.schedule_site_client_kv;
create policy "public_read_schedule_site_client_kv"
on public.schedule_site_client_kv
for select
to anon, authenticated
using (true);

drop policy if exists "public_write_schedule_site_client_kv" on public.schedule_site_client_kv;
create policy "public_write_schedule_site_client_kv"
on public.schedule_site_client_kv
for insert
to anon, authenticated
with check (true);

drop policy if exists "public_update_schedule_site_client_kv" on public.schedule_site_client_kv;
create policy "public_update_schedule_site_client_kv"
on public.schedule_site_client_kv
for update
to anon, authenticated
using (true)
with check (true);

-- ------------------------------------------------------------
-- 관리 대시보드 2·3번 칸 전용: 완료 목록 + 작가 처리 로그 (단일 행)
-- (1번 스케줄은 schedules 등 기존 경로 — 2·3번만 이 테이블로 동기화)
-- ------------------------------------------------------------
create table if not exists public.schedule_dashboard_state (
  id text primary key,
  completed jsonb not null default '[]'::jsonb,
  process_log jsonb not null default '[]'::jsonb,
  completed_history jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.schedule_dashboard_state (id)
values ('global')
on conflict (id) do nothing;

create or replace function public.set_schedule_dashboard_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_schedule_dashboard_state_updated on public.schedule_dashboard_state;
create trigger trg_schedule_dashboard_state_updated
before insert or update on public.schedule_dashboard_state
for each row
execute function public.set_schedule_dashboard_state_updated_at();

alter table public.schedule_dashboard_state enable row level security;

drop policy if exists "public_read_schedule_dashboard_state" on public.schedule_dashboard_state;
create policy "public_read_schedule_dashboard_state"
on public.schedule_dashboard_state
for select
to anon, authenticated
using (true);

drop policy if exists "public_write_schedule_dashboard_state" on public.schedule_dashboard_state;
create policy "public_write_schedule_dashboard_state"
on public.schedule_dashboard_state
for insert
to anon, authenticated
with check (true);

drop policy if exists "public_update_schedule_dashboard_state" on public.schedule_dashboard_state;
create policy "public_update_schedule_dashboard_state"
on public.schedule_dashboard_state
for update
to anon, authenticated
using (true)
with check (true);

-- 확인 처리로 목록에서 제거된 완료 건 (기록보기)
alter table public.schedule_dashboard_state
  add column if not exists completed_history jsonb not null default '[]'::jsonb;

-- ------------------------------------------------------------
-- schedule_site_client_kv: 인로그 Photo·Cinema 키 savedAt 기반 보호 트리거
--
-- 저장 버튼은 payload 안에 savedAt(ISO 타임스탬프)를 함께 기록한다.
-- UPDATE 시 새 payload의 savedAt이 현재 저장된 savedAt보다 오래됐거나
-- 없으면 덮어쓰기를 차단해 오래된 데이터로의 역행을 DB 레벨에서 막는다.
-- 키 자체가 새 kv에 없는 경우도 기존 값 보존.
-- ------------------------------------------------------------
create or replace function public.guard_inlog_kv_keys()
returns trigger
language plpgsql
as $$
declare
  inlog_keys   text[] := array[
    'scheduleSiteInlogPhotoAlbumsV1',
    'scheduleSiteInlogCinemaItemsV1'
  ];
  key_name     text;
  old_saved_at text;
  new_saved_at text;
begin
  if new.kv is null then
    new.kv := '{}'::jsonb;
  end if;

  if tg_op = 'UPDATE' then
    foreach key_name in array inlog_keys loop

      -- 키 자체가 새 kv에 없으면 기존 값 복원
      if (old.kv -> key_name) is not null
         and (new.kv -> key_name) is null
      then
        new.kv := jsonb_set(new.kv, array[key_name], old.kv -> key_name, true);
        continue;
      end if;

      -- savedAt 비교: 새 데이터가 더 오래됐거나 타임스탬프가 없으면 기존 값 복원
      old_saved_at := old.kv -> key_name ->> 'savedAt';
      new_saved_at := new.kv -> key_name ->> 'savedAt';

      if old_saved_at is not null
         and old_saved_at <> ''
         and (new_saved_at is null or new_saved_at = '' or new_saved_at < old_saved_at)
      then
        new.kv := jsonb_set(new.kv, array[key_name], old.kv -> key_name, true);
      end if;

    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_inlog_kv_keys on public.schedule_site_client_kv;
create trigger trg_guard_inlog_kv_keys
before insert or update on public.schedule_site_client_kv
for each row
execute function public.guard_inlog_kv_keys();

-- ------------------------------------------------------------
-- 인로그 메인 이미지 (관리자 업로드 → 공개 URL)
-- Storage → 버킷을 UI로 만들어도 되고, 아래만 실행해도 됩니다.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('inlog_home', 'inlog_home', true, 8388608)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "inlog_home_objects_select" on storage.objects;
create policy "inlog_home_objects_select"
on storage.objects for select
using (bucket_id = 'inlog_home');

drop policy if exists "inlog_home_objects_insert" on storage.objects;
create policy "inlog_home_objects_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'inlog_home');
