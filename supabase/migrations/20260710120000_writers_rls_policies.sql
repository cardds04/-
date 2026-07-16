-- writers 테이블 RLS 정책: 관리자(anon 키) 작가 등록/수정/삭제 허용
-- 증상: 관리자 페이지 「+ 작가 등록」 시 401 42501
--   "new row violates row-level security policy for table \"writers\""
-- (SELECT 는 되고 INSERT/UPDATE/DELETE 정책이 없어 push 가 전부 실패 → 서버 writers 0건이던 원인)

alter table public.writers enable row level security;

drop policy if exists "public_read_writers" on public.writers;
create policy "public_read_writers"
on public.writers
for select
to anon, authenticated
using (true);

drop policy if exists "public_insert_writers" on public.writers;
create policy "public_insert_writers"
on public.writers
for insert
to anon, authenticated
with check (true);

drop policy if exists "public_update_writers" on public.writers;
create policy "public_update_writers"
on public.writers
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "public_delete_writers" on public.writers;
create policy "public_delete_writers"
on public.writers
for delete
to anon, authenticated
using (true);
