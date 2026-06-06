-- 🏆 스터디게임 명예의 전당 (모든 친구 통합 게시판)
-- 그날그날 적립금 신기록을 세웠을 때 닉네임을 등록.
-- TOP 5 만 보여주지만 기록은 전부 보관해서 신기록 갱신 여부 판정에 활용.

create table if not exists public.study_game_hall_of_fame (
  id uuid primary key default gen_random_uuid(),
  nickname text not null check (char_length(trim(nickname)) > 0),
  savings_won integer not null check (savings_won >= 0),
  for_date date not null default (now() at time zone 'Asia/Seoul')::date,
  created_at timestamptz not null default now()
);

create index if not exists study_game_hof_savings_desc_idx
  on public.study_game_hall_of_fame (savings_won desc, created_at asc);

alter table public.study_game_hall_of_fame enable row level security;

drop policy if exists "study_game_hof_all" on public.study_game_hall_of_fame;
create policy "study_game_hof_all"
  on public.study_game_hall_of_fame
  for all
  to anon, authenticated
  using (true)
  with check (true);
