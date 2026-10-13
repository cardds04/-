-- 스케줄 업체명 = 업체정보(company_directory) 이름으로 서버에서 고정 (2026-10-13)
-- 배경: 아란디자인→봄해디자인 개명 뒤, 옛 이름을 든 열린 화면(고객·관리자)이 schedules.company_name 을
--       「아란디자인」으로 되돌렸다(10-13 17:33·18:28 두 번). 이름이 업체정보와 다르면 납품 폴더 루틴·밤 배치가
--       업체 폴더를 못 찾아 그 업체를 건너뛴다(10/8 봄해디자인 사진 미수령).
-- 규칙: code 가 있고 업체정보에 같은 code 가 있으면, 저장되는 company_name 을 업체정보 이름(가장 최근 수정 행)으로 바꾼다.
create or replace function public.schedules_canonical_company_name() returns trigger
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if coalesce(btrim(new.code), '') <> '' then
    select name into v from public.company_directory
     where code = new.code and coalesce(btrim(name), '') <> ''
     order by updated_at desc nulls last limit 1;
    if v is not null and v <> coalesce(new.company_name, '') then
      new.company_name := v;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_schedules_canonical_company_name on public.schedules;
create trigger trg_schedules_canonical_company_name
  before insert or update of company_name, code on public.schedules
  for each row execute function public.schedules_canonical_company_name();
