-- 작가 페이지 현장 서명/확인 이미지: Google Drive 대신 Storage (개인 계정 Drive quota 회피)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shoot-site-signatures',
  'shoot-site-signatures',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shoot_site_signatures_objects_select" on storage.objects;
create policy "shoot_site_signatures_objects_select"
on storage.objects for select
using (bucket_id = 'shoot-site-signatures');

drop policy if exists "shoot_site_signatures_objects_insert" on storage.objects;
create policy "shoot_site_signatures_objects_insert"
on storage.objects for insert
to service_role
with check (bucket_id = 'shoot-site-signatures');
alter table public.shoot_delivery_drive_state
  add column if not exists photographer_site_signature_url text;

comment on column public.shoot_delivery_drive_state.photographer_site_signature_url is
  '현장 서명/확인 이미지 공개 URL (Supabase Storage, Drive 미사용 시)';
