-- 특정 날짜만의 스케줄(주간 슬롯과 별개). Supabase에 저장되어 기기 간 동기화.
create table if not exists public.family_day_schedules (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  for_date date not null,
  title text not null,
  detail text not null default '',
  emoji text not null default '⭐',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_day_sched_kid_date on public.family_day_schedules (kid_id, for_date);

create table if not exists public.family_day_schedule_completions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.family_kids (id) on delete cascade,
  schedule_id uuid not null references public.family_day_schedules (id) on delete cascade,
  for_date date not null,
  completed_at timestamptz not null default now(),
  unique (kid_id, schedule_id, for_date)
);

alter table public.family_day_schedules enable row level security;
alter table public.family_day_schedule_completions enable row level security;

drop policy if exists "family_day_schedules_all" on public.family_day_schedules;
create policy "family_day_schedules_all" on public.family_day_schedules for all to anon, authenticated using (true) with check (true);

drop policy if exists "family_day_schedule_completions_all" on public.family_day_schedule_completions;
create policy "family_day_schedule_completions_all" on public.family_day_schedule_completions for all to anon, authenticated using (true) with check (true);

-- 기존 스탬프 트리거 함수 재사용 (new.kid_id / old.kid_id 동일)
drop trigger if exists trg_family_wallet_on_day_schedule_complete on public.family_day_schedule_completions;
create trigger trg_family_wallet_on_day_schedule_complete
  after insert on public.family_day_schedule_completions
  for each row
  execute function public.family_bump_wallet_on_complete ();

drop trigger if exists trg_family_wallet_on_day_schedule_del on public.family_day_schedule_completions;
create trigger trg_family_wallet_on_day_schedule_del
  after delete on public.family_day_schedule_completions
  for each row
  execute function public.family_drop_wallet_on_complete_delete ();
