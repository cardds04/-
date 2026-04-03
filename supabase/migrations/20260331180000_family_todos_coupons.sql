-- 가족 투두 · 주간 배치 · 완료 · 쿠폰(스탬프)
-- RLS: anon/authenticated 전체 접근 (가족 공용 키 사용 전제)

create extension if not exists "pgcrypto";

-- 아이
create table if not exists public.family_kids (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 기본 투두(저장 풀)
create table if not exists public.family_todo_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text not null default '',
  emoji text not null default '⭐',
  kid_id uuid references public.family_kids (id) on delete set null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 주간 칸: 월0 … 일6
create table if not exists public.family_weekly_slots (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  template_id uuid not null references public.family_todo_templates (id) on delete cascade,
  weekday smallint not null check (weekday >= 0 and weekday <= 6),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_weekly_kid_wd on public.family_weekly_slots (kid_id, weekday);

-- 특정 날짜 완료 (슬롯 단위)
create table if not exists public.family_todo_completions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  slot_id uuid not null references public.family_weekly_slots (id) on delete cascade,
  for_date date not null,
  completed_at timestamptz not null default now(),
  unique (kid_id, slot_id, for_date)
);

-- 아이별 스탬프 지갑
create table if not exists public.family_kid_wallet (
  kid_id uuid primary key references public.family_kids (id) on delete cascade,
  stamps int not null default 0 check (stamps >= 0),
  updated_at timestamptz not null default now()
);

-- 쿠폰(보상) 정의
create table if not exists public.family_reward_coupons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  reward_text text not null default '',
  stamps_required int not null check (stamps_required > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 쿠폰 사용(교환) 기록
create table if not exists public.family_coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  coupon_id uuid not null references public.family_reward_coupons (id) on delete cascade,
  stamps_spent int not null check (stamps_spent > 0),
  redeemed_at timestamptz not null default now()
);

alter table public.family_kids enable row level security;
alter table public.family_todo_templates enable row level security;
alter table public.family_weekly_slots enable row level security;
alter table public.family_todo_completions enable row level security;
alter table public.family_kid_wallet enable row level security;
alter table public.family_reward_coupons enable row level security;
alter table public.family_coupon_redemptions enable row level security;

-- family_kids
drop policy if exists "family_kids_all" on public.family_kids;
create policy "family_kids_all" on public.family_kids for all to anon, authenticated using (true) with check (true);

-- family_todo_templates
drop policy if exists "family_todo_templates_all" on public.family_todo_templates;
create policy "family_todo_templates_all" on public.family_todo_templates for all to anon, authenticated using (true) with check (true);

-- family_weekly_slots
drop policy if exists "family_weekly_slots_all" on public.family_weekly_slots;
create policy "family_weekly_slots_all" on public.family_weekly_slots for all to anon, authenticated using (true) with check (true);

-- family_todo_completions
drop policy if exists "family_todo_completions_all" on public.family_todo_completions;
create policy "family_todo_completions_all" on public.family_todo_completions for all to anon, authenticated using (true) with check (true);

-- family_kid_wallet
drop policy if exists "family_kid_wallet_all" on public.family_kid_wallet;
create policy "family_kid_wallet_all" on public.family_kid_wallet for all to anon, authenticated using (true) with check (true);

-- family_reward_coupons
drop policy if exists "family_reward_coupons_all" on public.family_reward_coupons;
create policy "family_reward_coupons_all" on public.family_reward_coupons for all to anon, authenticated using (true) with check (true);

-- family_coupon_redemptions
drop policy if exists "family_coupon_redemptions_all" on public.family_coupon_redemptions;
create policy "family_coupon_redemptions_all" on public.family_coupon_redemptions for all to anon, authenticated using (true) with check (true);

-- 완료 1건당 아이 스탬프 +1
create or replace function public.family_bump_wallet_on_complete ()
  returns trigger
  language plpgsql
  as $$
begin
  insert into public.family_kid_wallet (kid_id, stamps, updated_at)
    values (new.kid_id, 1, now())
  on conflict (kid_id)
    do update set
      stamps = public.family_kid_wallet.stamps + 1,
      updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_family_wallet_on_complete on public.family_todo_completions;
create trigger trg_family_wallet_on_complete
  after insert on public.family_todo_completions
  for each row
  execute function public.family_bump_wallet_on_complete ();

-- 완료 취소 시 스탬프 -1
create or replace function public.family_drop_wallet_on_complete_delete ()
  returns trigger
  language plpgsql
  as $$
begin
  update public.family_kid_wallet
    set
      stamps = greatest(0, stamps - 1),
      updated_at = now()
    where kid_id = old.kid_id;
  return old;
end;
$$;

drop trigger if exists trg_family_wallet_on_complete_del on public.family_todo_completions;
create trigger trg_family_wallet_on_complete_del
  after delete on public.family_todo_completions
  for each row
  execute function public.family_drop_wallet_on_complete_delete ();
