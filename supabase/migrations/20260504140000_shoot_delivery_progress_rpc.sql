-- 관리 화면(anon 키)에서 Drive 납품 진행 상태만 안전하게 읽기 위한 RPC
-- 이미 컬럼이 더 많은 시그니처(후속 마이그레이션)가 있으면 REPLACE 만으로는 OUT 타입 변경 불가 → 선행 DROP
drop function if exists public.shoot_delivery_progress_list();

create function public.shoot_delivery_progress_list()
returns table (
  schedule_id text,
  company_name text,
  company_code text,
  shoot_date_key text,
  composition text,
  photo_notified_at timestamptz,
  video_notified_at timestamptz
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
    s.video_notified_at
  from public.shoot_delivery_drive_state s;
$$;

revoke all on function public.shoot_delivery_progress_list() from public;
grant execute on function public.shoot_delivery_progress_list() to anon;
grant execute on function public.shoot_delivery_progress_list() to authenticated;

comment on function public.shoot_delivery_progress_list() is '납품(사진/영상) 완료 시각 요약 — 민감 컬럼 제외한 SELECT 전용 RPC';
