-- 작가 「원본 업로드 완료」안내 문자 발송 시각을 대시보드 RPC에 포함
drop function if exists public.shoot_delivery_progress_list();

create function public.shoot_delivery_progress_list()
returns table (
  schedule_id text,
  company_name text,
  company_code text,
  shoot_date_key text,
  composition text,
  photo_notified_at timestamptz,
  video_notified_at timestamptz,
  photographer_site_done_at timestamptz,
  photographer_original_upload_notified_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.schedule_id,
    s.company_name,
    s.company_code,
    s.shoot_date_key,
    s.composition,
    s.photo_notified_at,
    s.video_notified_at,
    s.photographer_site_done_at,
    s.photographer_original_upload_notified_at
  from public.shoot_delivery_drive_state s;
$$;

revoke all on function public.shoot_delivery_progress_list() from public;
grant execute on function public.shoot_delivery_progress_list() to anon;
grant execute on function public.shoot_delivery_progress_list() to authenticated;

comment on function public.shoot_delivery_progress_list() is '납품·현장 촬영·원본 업로드 안내 시각 요약 — 민감 Drive id 제외';
