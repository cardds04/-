-- 휴무 요청: 작가 페이지(요청) · 관리자(지정) 공통
-- anon 키로 읽기/삽입/삭제 가능하도록 RLS 정책 (기존 앱과 동일 패턴)

create table if not exists public.dayoff_requests (
  id uuid primary key default gen_random_uuid(),
  writer_id text,
  writer_name text not null,
  dayoff_date date not null,
  reason text,
  status text default 'pending',
  created_at timestamptz not null default now()
);

alter table public.dayoff_requests enable row level security;

drop policy if exists "public_read_dayoff_requests" on public.dayoff_requests;
create policy "public_read_dayoff_requests"
on public.dayoff_requests
for select
to anon, authenticated
using (true);

drop policy if exists "public_insert_dayoff_requests" on public.dayoff_requests;
create policy "public_insert_dayoff_requests"
on public.dayoff_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "public_delete_dayoff_requests" on public.dayoff_requests;
create policy "public_delete_dayoff_requests"
on public.dayoff_requests
for delete
to anon, authenticated
using (true);

create index if not exists idx_dayoff_requests_dayoff_date
  on public.dayoff_requests (dayoff_date desc);

create index if not exists idx_dayoff_requests_created_at
  on public.dayoff_requests (created_at desc);

-- 구버전에서 writer_id 가 NOT NULL 이었으면 작가 요청(writer_id=null)이 실패함
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dayoff_requests'
      and column_name = 'writer_id'
  ) then
    execute 'alter table public.dayoff_requests alter column writer_id drop not null';
  end if;
exception
  when undefined_table then null;
  when undefined_column then null;
end;
$$;
