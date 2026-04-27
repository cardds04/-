-- =============================================================
-- Study Guide Game (study-game.html) 전용 클라우드 동기화 테이블
--
-- 목적
--   PC ↔ 스마트폰 사이에서 단원/뱃지/기본단원 수정사항을 자동으로 sync.
--   촬영 스케줄용 schedule_site_client_kv 와 완전히 분리된 별도 테이블.
--
-- 사용법
--   1. Supabase 대시보드 → SQL Editor
--   2. 아래 전체를 붙여넣고 Run
--   3. study-game.html 페이지를 다시 로드하면 자동 동기화 시작
--
-- 행 구조
--   id          : "kid:<kidId>" 형태 (아이 미선택 시 "kid:default")
--   kv          : { "study_game_units_v2": "[...]", "study_game_active_unit_v2": "...", ... }
--                 study-game 로컬스토리지 키들의 raw 문자열 묶음 + __savedAt
--   updated_at  : 마지막 수정 timestamp
-- =============================================================

create table if not exists public.study_game_state_kv (
  id text primary key,
  kv jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- updated_at 자동 갱신 트리거
create or replace function public.set_study_game_state_kv_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_study_game_state_kv_updated on public.study_game_state_kv;
create trigger trg_study_game_state_kv_updated
before insert or update on public.study_game_state_kv
for each row
execute function public.set_study_game_state_kv_updated_at();

-- RLS 활성화 (anon 키로도 읽기/쓰기 허용 — schedule_site_client_kv 와 동일 정책)
alter table public.study_game_state_kv enable row level security;

drop policy if exists "public_read_study_game_state_kv" on public.study_game_state_kv;
create policy "public_read_study_game_state_kv"
on public.study_game_state_kv
for select
to anon, authenticated
using (true);

drop policy if exists "public_insert_study_game_state_kv" on public.study_game_state_kv;
create policy "public_insert_study_game_state_kv"
on public.study_game_state_kv
for insert
to anon, authenticated
with check (true);

drop policy if exists "public_update_study_game_state_kv" on public.study_game_state_kv;
create policy "public_update_study_game_state_kv"
on public.study_game_state_kv
for update
to anon, authenticated
using (true)
with check (true);
