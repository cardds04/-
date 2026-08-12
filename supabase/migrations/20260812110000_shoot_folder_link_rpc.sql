-- 작가 페이지가 「그 촬영건 폴더」 딥링크만 읽도록 하는 전용 함수(2026-08-12).
-- shoot_delivery_drive_state 는 고객 연락처 등이 있어 클라이언트에 통째로 열지 않는다
-- (정책 no_direct_client_shoot_delivery). 이 함수는 링크 한 건만 돌려준다.
CREATE OR REPLACE FUNCTION public.shoot_folder_link(p_schedule_id text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(shoot_folder_web_link, '')
  FROM public.shoot_delivery_drive_state
  WHERE schedule_id = p_schedule_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.shoot_folder_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.shoot_folder_link(text) TO anon, authenticated;
