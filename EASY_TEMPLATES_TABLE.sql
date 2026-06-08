-- ===================================================================
-- 이지숏폼 — 온라인 공유 템플릿 저장소
-- Supabase SQL Editor 에 통째로 붙여넣고 한 번 실행하세요. (1회)
-- ===================================================================

-- 1) 템플릿 테이블 (구조/자막은 JSON, 음악은 storage 경로만)
create table if not exists public.easy_templates (
  id          text primary key,
  name        text,
  aspect      text default '9:16',
  slots       jsonb not null default '[]'::jsonb,
  texts       jsonb not null default '[]'::jsonb,
  music_path  text,                      -- easy-music 버킷 내 경로 (없으면 null)
  sort        int  default 0,            -- 카탈로그 정렬용 (작을수록 앞)
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 2) 누구나 '읽기'만 가능 (고객 사이트가 목록을 받아감). 쓰기는 service_role 만(서버 API).
alter table public.easy_templates enable row level security;

drop policy if exists "easy_templates public read" on public.easy_templates;
create policy "easy_templates public read"
  on public.easy_templates for select
  using (true);

-- (insert/update/delete 정책 없음 → anon 키로는 못 씀. 서버의 service_role 만 RLS 우회)

-- 3) 음악 파일용 공개 버킷
insert into storage.buckets (id, name, public)
values ('easy-music', 'easy-music', true)
on conflict (id) do update set public = true;

-- 4) 버킷 내 파일은 누구나 읽기 가능 (공개 URL 재생용)
drop policy if exists "easy-music public read" on storage.objects;
create policy "easy-music public read"
  on storage.objects for select
  using (bucket_id = 'easy-music');

-- 4-b) 미리보기 썸네일 컬럼 (내 영상 게시 시 대표 이미지)
alter table public.easy_templates add column if not exists thumb text;

-- 4-b2) 미리보기 슬라이드쇼 (사진 URL 목록 — 카드에서 영상처럼 재생)
alter table public.easy_templates add column if not exists preview jsonb default '[]'::jsonb;

-- 4-c) 서버 설정 저장소 (Kling 키 등 — Vercel env 우회용). service_role 만 접근.
create table if not exists public.easy_config (
  k text primary key,
  v text
);
alter table public.easy_config enable row level security;

-- 5) 고객 AI 영상 생성 하루 한도 카운터 (비용 폭주 방지)
--    서버(service_role)만 접근. 정책 없음 → anon 불가.
create table if not exists public.easy_ai_usage (
  day        text primary key,        -- 'YYYY-MM-DD'
  count      int not null default 0,
  updated_at timestamptz default now()
);
alter table public.easy_ai_usage enable row level security;

-- 끝. 이제 관리자 도구에서 '☁️ 온라인 게시' 하면 여기에 쌓이고,
--     고객 사이트(/easy/)가 GET /api/easy-templates 로 실시간으로 받아갑니다.
--     고객 AI 영상은 서버 Kling 키로 처리되고 하루 한도(EASY_AI_DAILY_LIMIT, 기본 30) 내에서 동작합니다.
