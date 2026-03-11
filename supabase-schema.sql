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
    'scheduleSitePhotographerProfiles'
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
