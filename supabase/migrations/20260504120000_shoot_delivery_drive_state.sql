-- 촬영 납품용 Google Drive 폴더·문자 자동화 상태 (Vercel Cron + 서비스 롤 전용)
create table if not exists public.shoot_delivery_drive_state (
  schedule_id text primary key,
  company_name text not null default '',
  company_code text not null default '',
  shoot_date_key text not null default '',
  composition text not null default '',
  place_segment text not null default '',
  customer_phone text not null default '',
  company_folder_id text,
  shoot_folder_id text,
  photo_folder_id text,
  video_folder_id text,
  company_share_link text,
  photo_seen_file_ids jsonb not null default '[]'::jsonb,
  video_seen_file_ids jsonb not null default '[]'::jsonb,
  photo_notified_at timestamptz,
  video_notified_at timestamptz,
  folders_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_shoot_delivery_drive_state_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_shoot_delivery_drive_state_updated on public.shoot_delivery_drive_state;
create trigger trg_shoot_delivery_drive_state_updated
before insert or update on public.shoot_delivery_drive_state
for each row
execute function public.set_shoot_delivery_drive_state_updated_at();

alter table public.shoot_delivery_drive_state enable row level security;

-- anon 은 접근 불가 — Vercel 서버리스에서 service_role 키로만 읽기/쓰기
drop policy if exists "no_direct_client_shoot_delivery" on public.shoot_delivery_drive_state;
create policy "no_direct_client_shoot_delivery"
on public.shoot_delivery_drive_state
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.shoot_delivery_drive_state is '납품 Drive 폴더·완료 문자 자동화 (서비스 롤 전용, 브라우저 anon 차단)';
