-- 이지숏폼 고객 계정 테이블 (B2B 업체 명단 company_directory 와 분리)
-- Supabase → SQL Editor 에 붙여넣고 한 번 실행하세요.
-- 서버 API(/api/easy-auth, service_role)만 읽고 씁니다. 브라우저(anon)는 접근 불가.

create extension if not exists pgcrypto;

create table if not exists public.easy_users (
  id            uuid primary key default gen_random_uuid(),
  login_id      text unique not null,          -- 아이디 또는 이메일(소문자 정규화 저장)
  email         text,
  name          text,                          -- 표시 이름(이름/상호)
  phone         text,
  password_hash text not null,                 -- scrypt 해시(평문 저장 안 함)
  created_at    timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists easy_users_login_id_idx on public.easy_users (login_id);

-- RLS 켜고 정책을 만들지 않음 → anon/authenticated 는 접근 불가,
-- service_role(서버 API)만 RLS 를 우회해 접근. (비밀번호 해시 보호)
alter table public.easy_users enable row level security;
