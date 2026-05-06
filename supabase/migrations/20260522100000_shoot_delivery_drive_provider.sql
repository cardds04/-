-- 납품 폴더 제공자 구분 (google 레거시 / naver 신규)
alter table public.shoot_delivery_drive_state
  add column if not exists delivery_drive_provider text not null default '';

comment on column public.shoot_delivery_drive_state.delivery_drive_provider is '납품 트리: google(레거시) 또는 naver. 비어 있으면 기존과 동일하게 google 로 간주.';
