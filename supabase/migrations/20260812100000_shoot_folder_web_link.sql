-- 작가 「열기」가 상위 폴더가 아니라 그 촬영일 폴더로 바로 가도록, 아침 자동생성 때
-- 계산한 마이박스 딥링크를 저장한다(2026-08-12).
-- 형식: https://mybox.naver.com/share/list?shareKey=<공유키>&resourceKey=<폴더키|D|공유번호>
-- ‼️딥링크는 로그인 없이 열린다(작가 환경). 다만 링크를 만들려면 소유자 세션이 필요해
--   생성은 사장님 맥의 아침 루틴이 전담하고, 결과만 여기에 저장한다.
ALTER TABLE public.shoot_delivery_drive_state
  ADD COLUMN IF NOT EXISTS shoot_folder_web_link text;
