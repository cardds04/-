-- Grok Studio 참조 이미지: 브라우저에서 Supabase Storage로 직접 업로드 → 공개 URL만 API에 전달 (Vercel 본문 한도 회피)
-- 대시보드 Storage에서 버킷을 만들어도 되고, 이 파일만 적용해도 됩니다.

insert into storage.buckets (id, name, public, file_size_limit)
values ('grok-studio-refs', 'grok-studio-refs', true, 52428800)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "grok_studio_refs_objects_select" on storage.objects;
create policy "grok_studio_refs_objects_select"
on storage.objects for select
using (bucket_id = 'grok-studio-refs');

drop policy if exists "grok_studio_refs_objects_insert" on storage.objects;
create policy "grok_studio_refs_objects_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'grok-studio-refs');
