-- 이지숏폼 — 서버 렌더(Phase 2) 작업 큐
-- Supabase → SQL Editor 에 붙여넣고 한 번 실행하세요.
-- 앱이 '렌더 설계도(spec)'를 등록 → Railway 워커가 집어서 헤드리스 렌더 → 결과 URL 기록.
-- 서버 API(/api/easy-render, service_role)만 읽고 씁니다. 결과 MP4 는 easy-music 버킷 out/ 폴더.

create table if not exists public.easy_render_jobs (
  id          uuid primary key default gen_random_uuid(),
  login_id    text,                            -- 만든 고객(easy_users.login_id)
  user_name   text,                            -- 표시 이름
  name        text,                            -- 영상 이름(템플릿명 등)
  status      text not null default 'queued',  -- queued | rendering | done | error
  spec        jsonb not null,                  -- 렌더 설계도(템플릿·자막·음악·나레이션·fills URL·타이밍)
  progress    double precision default 0,      -- 0..1
  result_url  text,                            -- 완성 MP4 공개 URL
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  claimed_at  timestamptz
);

create index if not exists easy_render_jobs_status_idx on public.easy_render_jobs (status, created_at);
create index if not exists easy_render_jobs_login_idx  on public.easy_render_jobs (login_id, created_at desc);

-- RLS: 정책 없음 → service_role(서버 API)만 접근.
alter table public.easy_render_jobs enable row level security;
