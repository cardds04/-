-- 촬영일 하위: 원본폴더 id 보관 + 작가「원본파일업로드완료」문자 발송 일시 (중복 방지)
alter table public.shoot_delivery_drive_state
  add column if not exists photo_original_folder_id text;

alter table public.shoot_delivery_drive_state
  add column if not exists video_original_folder_id text;

alter table public.shoot_delivery_drive_state
  add column if not exists photographer_original_upload_notified_at timestamptz;

comment on column public.shoot_delivery_drive_state.photo_original_folder_id is 'Google Drive 「사진원본파일」폴더 id';
comment on column public.shoot_delivery_drive_state.video_original_folder_id is 'Google Drive 「영상원본파일」폴더 id';
comment on column public.shoot_delivery_drive_state.photographer_original_upload_notified_at is '작가 페이지「원본파일 업로드 완료」문자 고객 발송 시각';
