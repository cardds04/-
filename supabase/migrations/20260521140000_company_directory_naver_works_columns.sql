-- 업체(company_directory)당 네이버웍스(공용·포토영상 등) Drive 루트 폴더 1개 — Google 과 병행 저장

alter table public.company_directory
  add column if not exists naver_works_company_folder_id text;

alter table public.company_directory
  add column if not exists naver_works_company_share_link text;

comment on column public.company_directory.naver_works_company_folder_id is 'NAVER_WORKS_DRIVE_PARENT_FILE_ID(포토영상 상위) 직속 업체 루트 폴더 fileId';
comment on column public.company_directory.naver_works_company_share_link is '업체 네이버웍스 폴더 공유 링크(캐시, 없을 수 있음)';
