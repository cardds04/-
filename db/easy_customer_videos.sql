-- 이지숏폼 — 고객이 만든(다운로드한) 영상 보관 (관리자가 봄)
-- Supabase → SQL Editor 에 붙여넣고 한 번 실행하세요.
-- 영상 파일은 기존 공개 버킷 easy-music 의 cust/ 폴더에 저장(새 버킷 불필요).
-- 서버 API(/api/easy-customer-video, service_role)만 읽고 씁니다.

create table if not exists public.easy_customer_videos (
  id          uuid primary key default gen_random_uuid(),
  login_id    text not null,                 -- 만든 고객(easy_users.login_id)
  user_name   text,                          -- 표시 이름
  name        text,                          -- 영상 이름(템플릿명 등)
  video_url   text not null,                 -- 공개 영상 URL
  dur         double precision default 0,    -- 길이(초)
  created_at  timestamptz not null default now()
);

create index if not exists easy_customer_videos_created_idx on public.easy_customer_videos (created_at desc);
create index if not exists easy_customer_videos_login_idx on public.easy_customer_videos (login_id);

-- RLS: 정책 없음 → service_role(서버 API)만 접근.
alter table public.easy_customer_videos enable row level security;
