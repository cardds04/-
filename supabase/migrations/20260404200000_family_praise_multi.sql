-- 칭찬 기능 전체(또는 구 DB 정리). 20260404130000 을 안 돌리고 이 파일만 실행해도 됩니다.
-- 주의: 테이블을 먼저 만든 뒤에만 DROP TRIGGER 가능 (없는 테이블에 DROP 하면 42P01)

create table if not exists public.family_praise_pending (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  for_date date not null,
  created_at timestamptz not null default now()
);

create table if not exists public.family_praise_claim (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  for_date date not null,
  claimed_at timestamptz not null default now()
);

drop trigger if exists trg_family_wallet_on_praise_claim on public.family_praise_claim;
drop trigger if exists trg_family_wallet_on_praise_claim_del on public.family_praise_claim;
drop trigger if exists trg_family_wallet_on_praise_pending_ins on public.family_praise_pending;
drop trigger if exists trg_family_wallet_on_praise_pending_del on public.family_praise_pending;

alter table public.family_praise_pending enable row level security;
alter table public.family_praise_claim enable row level security;

drop policy if exists "family_praise_pending_all" on public.family_praise_pending;
create policy "family_praise_pending_all" on public.family_praise_pending for all to anon, authenticated using (true) with check (true);

drop policy if exists "family_praise_claim_all" on public.family_praise_claim;
create policy "family_praise_claim_all" on public.family_praise_claim for all to anon, authenticated using (true) with check (true);

do $mig$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'family_praise_offer'
  ) then
    insert into public.family_praise_pending (kid_id, for_date, created_at)
    select kid_id, for_date, created_at from public.family_praise_offer;
    drop table public.family_praise_offer;
  end if;
end $mig$;

create trigger trg_family_wallet_on_praise_claim
  after insert on public.family_praise_claim
  for each row
  execute function public.family_bump_wallet_on_complete ();

create trigger trg_family_wallet_on_praise_claim_del
  after delete on public.family_praise_claim
  for each row
  execute function public.family_drop_wallet_on_complete_delete ();

create or replace function public.family_consume_praise_pending (p_pending_id uuid)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_kid uuid;
  v_date date;
begin
  delete from public.family_praise_pending
  where id = p_pending_id
  returning kid_id, for_date into v_kid, v_date;
  if v_kid is null then
    return false;
  end if;
  insert into public.family_praise_claim (kid_id, for_date)
  values (v_kid, v_date);
  return true;
end;
$$;

grant execute on function public.family_consume_praise_pending (uuid) to anon;
grant execute on function public.family_consume_praise_pending (uuid) to authenticated;
