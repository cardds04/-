-- 업체(company_directory)당 Google Drive 루트 폴더 1개 — 작가 현장 확인은 이 아래에만 촬영일 폴더 생성

alter table public.company_directory
  add column if not exists google_drive_company_folder_id text;

alter table public.company_directory
  add column if not exists google_drive_company_share_link text;

comment on column public.company_directory.google_drive_company_folder_id is '업체명 기준 Drive 폴더 파일 id (부모 GOOGLE_DRIVE_PARENT_FOLDER_ID 직속)';
comment on column public.company_directory.google_drive_company_share_link is '업체 폴더 공유 웹 링크(캐시용, id 로부터 재계산 가능)';
