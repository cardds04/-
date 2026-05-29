-- ============================================================
-- AI 경영 멘토 — 기억(메모리) 테이블
-- ============================================================
-- 일반 챗봇과 달리 "나만의 멘토/상사/스승"이 되려면 대화가
-- 매번 백지에서 시작하면 안 된다. 아래 3개 테이블이 멘토의 기억이다.
--
--   mentor_profile      : 내 사업 정보 (멘토가 항상 알고 있어야 할 배경)
--   mentor_messages     : 지난 대화 기록 (무슨 얘기를 했는지)
--   mentor_assignments  : 멘토가 내준 과제 / 목표 (시키고 점검하기)
--
-- 단일 사용자(대표님 1인) 도구이므로 owner_id 는 기본 'me' 로 둔다.
-- 나중에 다중 사용자로 확장하면 owner_id 만 실제 user id 로 바꾸면 된다.
-- ============================================================

-- ------------------------------------------------------------
-- 1) 사업 프로필 — 멘토가 항상 참고하는 배경 (owner 당 1 row)
-- ------------------------------------------------------------
create table if not exists public.mentor_profile (
  owner_id     text primary key default 'me',
  -- 자유 서술형 핵심 정보 (멘토 시스템 프롬프트에 그대로 들어감)
  business     text not null default '',   -- 어떤 사업인가
  team         text not null default '',    -- 인력/팀 구성
  customers    text not null default '',    -- 고객은 누구인가
  goals        text not null default '',    -- 현재 목표
  challenges   text not null default '',    -- 지금의 고민/한계
  -- 구조화가 필요한 추가 데이터(매출 추이 등)는 여기에
  extra        jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) 대화 기록 — 멘토와 주고받은 모든 발언
-- ------------------------------------------------------------
create table if not exists public.mentor_messages (
  id          bigint generated always as identity primary key,
  owner_id    text not null default 'me',
  -- 'user' = 대표님, 'mentor' = AI 자문단의 종합 응답
  role        text not null check (role in ('user', 'mentor')),
  content     text not null,
  -- 멘토 응답일 때, 자문단 각 패널의 발언을 구조화해 보관 (선택)
  panel       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists mentor_messages_owner_time_idx
  on public.mentor_messages (owner_id, created_at desc);

-- ------------------------------------------------------------
-- 3) 과제/목표 — 멘토가 내주고 다음에 점검할 항목
-- ------------------------------------------------------------
create table if not exists public.mentor_assignments (
  id            bigint generated always as identity primary key,
  owner_id      text not null default 'me',
  title         text not null,
  detail        text not null default '',
  -- open(진행 전/중) · done(완료) · dropped(취소)
  status        text not null default 'open' check (status in ('open', 'done', 'dropped')),
  due_date      date,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists mentor_assignments_owner_status_idx
  on public.mentor_assignments (owner_id, status, created_at desc);

-- ------------------------------------------------------------
-- updated_at 자동 갱신 (profile 만 필요)
-- ------------------------------------------------------------
create or replace function public.mentor_profile_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_mentor_profile_updated_at on public.mentor_profile;
create trigger trg_mentor_profile_updated_at
  before update on public.mentor_profile
  for each row execute function public.mentor_profile_set_updated_at();

-- ------------------------------------------------------------
-- RLS: 다른 테이블과 동일하게 anon 전체 허용
-- (서버는 service role key 로 접근하므로 어차피 통과)
-- ------------------------------------------------------------
alter table public.mentor_profile     enable row level security;
alter table public.mentor_messages    enable row level security;
alter table public.mentor_assignments enable row level security;

drop policy if exists "mentor_profile anon all"     on public.mentor_profile;
drop policy if exists "mentor_messages anon all"    on public.mentor_messages;
drop policy if exists "mentor_assignments anon all" on public.mentor_assignments;

create policy "mentor_profile anon all"
  on public.mentor_profile for all using (true) with check (true);
create policy "mentor_messages anon all"
  on public.mentor_messages for all using (true) with check (true);
create policy "mentor_assignments anon all"
  on public.mentor_assignments for all using (true) with check (true);

-- ------------------------------------------------------------
-- 초기 프로필 한 줄 (대표님 사업 — 비어 있으면 사이트에서 채움)
-- ------------------------------------------------------------
insert into public.mentor_profile (owner_id, business, team, customers, goals, challenges)
values (
  'me',
  '인테리어 전문 촬영 스튜디오. 인테리어 현장의 사진·영상을 촬영·편집해 납품한다.',
  '촬영작가 3명(평일 2명·주말 1명, 대표가 짠 스케줄대로 촬영 후 클라우드 업로드). 편집은 대표 포함 3명이 클라우드에서 내려받아 진행 후 고객 납품.',
  '인테리어업 대표님들. 받은 사진·영상을 포트폴리오와 홍보용으로 사용한다.',
  '소상공인 규모를 넘어 더 큰 회사로 성장.',
  '혼자 모든 것을 결정·실행하는 한계, 시스템화 부족, 매출 성장 방법에 대한 막막함.'
)
on conflict (owner_id) do nothing;
