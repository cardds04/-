-- 작가 현장 완료(촬영 장소 사진 + Drive 폴더 트리거)
alter table public.shoot_delivery_drive_state
  add column if not exists photographer_site_done_at timestamptz,
  add column if not exists photographer_site_file_id text;

comment on column public.shoot_delivery_drive_state.photographer_site_done_at is '작가 페이지에서 현장 사진 업로드+촬영완료 처리 시각';
comment on column public.shoot_delivery_drive_state.photographer_site_file_id is 'Drive 업로드된 현장 사진 파일 id';
