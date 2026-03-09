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
