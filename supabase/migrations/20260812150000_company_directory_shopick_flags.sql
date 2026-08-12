-- 쇼픽 촬영구성(사진/영상/블로그) 플래그의 서버 정본화 (2026-08-12)
-- 배경: 플래그가 client_kv 스냅샷으로만 오가서, 옛 데이터를 든 다른 탭/기기가
--       push 하면 "사진만"으로 바꿔둔 업체가 "사진영상"으로 되돌아가는 사고(골든 사례).
--       확립된 패턴대로 전용 컬럼을 정본으로 두고 pull 이 항상 서버값으로 교정한다.
ALTER TABLE public.company_directory
  ADD COLUMN IF NOT EXISTS shopick_photo boolean,
  ADD COLUMN IF NOT EXISTS shopick_video boolean,
  ADD COLUMN IF NOT EXISTS shopick_blog boolean;
