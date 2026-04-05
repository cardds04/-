-- 칭찬: 부모 insert → 오늘 할 일(pending)에만 스티커, 스탬프 변동 없음.
-- 아이가 완료(consume) → claim insert 시 스탬프 +1. claim 삭제 시 스탬프 -1.

create extension if not exists "pgcrypto";

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

alter table public.family_praise_pending enable row level security;
alter table public.family_praise_claim enable row level security;

drop policy if exists "family_praise_pending_all" on public.family_praise_pending;
create policy "family_praise_pending_all" on public.family_praise_pending for all to anon, authenticated using (true) with check (true);

drop policy if exists "family_praise_claim_all" on public.family_praise_claim;
create policy "family_praise_claim_all" on public.family_praise_claim for all to anon, authenticated using (true) with check (true);

drop trigger if exists trg_family_wallet_on_praise_pending_ins on public.family_praise_pending;
drop trigger if exists trg_family_wallet_on_praise_pending_del on public.family_praise_pending;

drop trigger if exists trg_family_wallet_on_praise_claim on public.family_praise_claim;
create trigger trg_family_wallet_on_praise_claim
  after insert on public.family_praise_claim
  for each row
  execute function public.family_bump_wallet_on_complete ();

drop trigger if exists trg_family_wallet_on_praise_claim_del on public.family_praise_claim;
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
