-- 고객(anon)용: 본인 업체 스케줄의 현장 촬영 완료·사진 링크만 노출 (민감 Drive 내부 id 제외는 아니지만 file id 는 UUID 수준)
drop function if exists public.customer_site_shoot_completion(text, text, text[]);

create function public.customer_site_shoot_completion(
  p_company_name text,
  p_company_code text,
  p_schedule_ids text[]
)
returns table (
  schedule_id text,
  photographer_site_done_at timestamptz,
  site_photo_thumbnail_url text,
  site_photo_view_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id::text,
    st.photographer_site_done_at,
    case
      when st.photographer_site_file_id is not null and length(trim(st.photographer_site_file_id)) > 0
      then 'https://drive.google.com/thumbnail?id=' || trim(st.photographer_site_file_id) || '&sz=w800'
      else null
    end,
    case
      when st.photographer_site_file_id is not null and length(trim(st.photographer_site_file_id)) > 0
      then 'https://drive.google.com/file/d/' || trim(st.photographer_site_file_id) || '/view?usp=sharing'
      else null
    end
  from public.schedules s
  left join public.shoot_delivery_drive_state st on st.schedule_id = s.id::text
  where p_schedule_ids is not null
    and cardinality(p_schedule_ids) > 0
    and s.id::text = any (p_schedule_ids)
    and lower(trim(s.company_name)) = lower(trim(coalesce(p_company_name, '')))
    and coalesce(trim(s.code), '') = coalesce(trim(coalesce(p_company_code, '')), '');
$$;

revoke all on function public.customer_site_shoot_completion(text, text, text[]) from public;
grant execute on function public.customer_site_shoot_completion(text, text, text[]) to anon;
grant execute on function public.customer_site_shoot_completion(text, text, text[]) to authenticated;

comment on function public.customer_site_shoot_completion(text, text, text[]) is '고객 본인 업체 스케줄 UUID 에 대해 현장 촬영 완료·Drive 사진 링크만 반환';
