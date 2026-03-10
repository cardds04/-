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
