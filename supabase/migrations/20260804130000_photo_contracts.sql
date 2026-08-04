-- 전자 촬영계약서(쑈픽 인테리어촬영) — 링크 발송 → 고객 체크·서명 → 보관
-- 고객은 토큰이 담긴 URL 로만 접근한다(토큰=난수 24자). 앱 전체가 anon 접근 모델이라 RLS 는 동일 관례를 따른다.
create table if not exists public.photo_contracts (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  -- 관리자 생성 시 프리필(비워도 고객이 직접 입력)
  company_name text default '',
  ceo_name text default '',
  phone text default '',
  email text default '',
  -- 계약 내용
  period_type text default '',          -- 'end_date'(촬영종료일 명시) | 'until_used'(다회권 소진시까지)
  period_note text default '',          -- 촬영종료일 명시 시 날짜 등 자유 입력
  plan_photo text default '',           -- '' | '5' | '10' | '20'  (사진만촬영)
  plan_photo_video text default '',     -- '' | '5' | '10' | '20'  (사진영상촬영)
  memo text default '',
  payment_method text default '',       -- 'cash' | 'card' | 'account'
  total_amount text default '',
  -- 서명
  signer_name text default '',
  signature_data_url text default '',   -- 손글씨 서명 PNG(dataURL)
  agreed boolean not null default false,
  status text not null default 'pending',  -- 'pending' | 'signed'
  signed_at timestamptz,
  signed_user_agent text default '',
  admin_memo text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists photo_contracts_token_idx on public.photo_contracts (token);
create index if not exists photo_contracts_created_idx on public.photo_contracts (created_at desc);

alter table public.photo_contracts enable row level security;

drop policy if exists "public_select_photo_contracts" on public.photo_contracts;
create policy "public_select_photo_contracts" on public.photo_contracts
  for select to anon, authenticated using (true);

drop policy if exists "public_insert_photo_contracts" on public.photo_contracts;
create policy "public_insert_photo_contracts" on public.photo_contracts
  for insert to anon, authenticated with check (true);

drop policy if exists "public_update_photo_contracts" on public.photo_contracts;
create policy "public_update_photo_contracts" on public.photo_contracts
  for update to anon, authenticated using (true) with check (true);

drop policy if exists "public_delete_photo_contracts" on public.photo_contracts;
create policy "public_delete_photo_contracts" on public.photo_contracts
  for delete to anon, authenticated using (true);
