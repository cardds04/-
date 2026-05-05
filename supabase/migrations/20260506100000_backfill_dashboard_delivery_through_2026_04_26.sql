-- 대시보드「15일간 스케줄」남은 납품: 촬영일 2026-04-26 이까지는 모두 완료로 간주(일회성 백필)
-- - 사진/영상 대기: JS 와 동일 조건 (composition ~ 사진|블로그, 영상)에 맞춰 notified 시각 세팅
-- - 현장 촬영 완료 시각도 동일 구간에서 비어 있으면 채움
--
-- 적용 순서: photographer_site 컬럼 마이그레이션(20260505120000) 이후 실행.

begin;

-- 기존 state 행
update public.shoot_delivery_drive_state s
set
  photo_notified_at = case
    when s.composition ~ '사진|블로그' and s.photo_notified_at is null then now()
    else s.photo_notified_at
  end,
  video_notified_at = case
    when s.composition ~ '영상' and s.video_notified_at is null then now()
    else s.video_notified_at
  end,
  photographer_site_done_at = coalesce(s.photographer_site_done_at, now())
where s.shoot_date_key <= '2026-04-26'
  and s.shoot_date_key >= '2000-01-01';

-- schedules 에만 있고 state 가 없어서 대시보드에서 계속 대기로 보이던 건
insert into public.shoot_delivery_drive_state (
  schedule_id,
  company_name,
  company_code,
  shoot_date_key,
  composition,
  place_segment,
  customer_phone,
  photo_notified_at,
  video_notified_at,
  photographer_site_done_at
)
select
  sch.id::text,
  coalesce(sch.company_name, ''),
  coalesce(sch.code, ''),
  coalesce(sch.date_key::text, ''),
  coalesce(sch.composition, ''),
  '',
  '',
  case when sch.composition ~ '사진|블로그' then now() else null end,
  case when sch.composition ~ '영상' then now() else null end,
  now()
from public.schedules sch
where sch.date_key is not null
  and coalesce(sch.date_key::text, '') <= '2026-04-26'
  and coalesce(sch.date_key::text, '') >= '2000-01-01'
  and lower(trim(coalesce(sch.source, ''))) not in ('hold', 'refund', 'deleted')
  and (sch.composition ~ '사진|블로그' or sch.composition ~ '영상')
  and not exists (
    select 1 from public.shoot_delivery_drive_state d where d.schedule_id = sch.id::text
  );

commit;
