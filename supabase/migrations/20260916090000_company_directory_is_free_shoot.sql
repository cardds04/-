-- 무료촬영 업체 구분 (2026-09-16)
-- 배경: 무료촬영은 별도 등록폼으로만 받아 사장님이 스케줄 업체명에 "/무"를 붙여 구분 →
--       업체정보관리 이름과 달라져 납품 폴더 자동생성이 「업체 없음」으로 실패(모온디자인/무).
-- 해법: company_directory.is_free_shoot 로 유료/무료를 업체정보에서 구분. 업체명은 그대로 둔다.
ALTER TABLE public.company_directory ADD COLUMN IF NOT EXISTS is_free_shoot boolean NOT NULL DEFAULT false;
