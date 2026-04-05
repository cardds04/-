-- 칭찬 스탬프: 부모가 '칭찬합니다'로 오퍼 후 아이가 받으면 스탬프 +1 (투두와 동일 트리거 패턴)

create table if not exists public.family_praise_offer (
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  for_date date not null,
  created_at timestamptz not null default now(),
  primary key (kid_id, for_date)
);

create table if not exists public.family_praise_claim (
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  for_date date not null,
  claimed_at timestamptz not null default now(),
  primary key (kid_id, for_date)
);

alter table public.family_praise_offer enable row level security;
alter table public.family_praise_claim enable row level security;

drop policy if exists "family_praise_offer_all" on public.family_praise_offer;
create policy "family_praise_offer_all" on public.family_praise_offer for all to anon, authenticated using (true) with check (true);

drop policy if exists "family_praise_claim_all" on public.family_praise_claim;
create policy "family_praise_claim_all" on public.family_praise_claim for all to anon, authenticated using (true) with check (true);

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
