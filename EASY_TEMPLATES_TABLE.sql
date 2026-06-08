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

-- 끝. 이제 관리자 도구에서 '☁️ 온라인 게시' 하면 여기에 쌓이고,
--     고객 사이트(/easy/)가 GET /api/easy-templates 로 실시간으로 받아갑니다.
