-- 20261013200000 트리거를 「같은 업체로 확인된 코드」만 적용하도록 좁힘 (2026-10-13 사장님 「지엘 빼고는 다 아니야」)
-- 매종/메모리매종·유앤아이/디자인수안·다비드핸즈/다엘디자인·메모리메종/메종트렌드 는 고유번호만 겹친 **다른 업체** →
-- 코드 기준 강제 개명을 하면 남의 이름으로 바뀐다. 확인된 개명(봄해디자인·지엘)만 잠근다.
create or replace function public.schedules_canonical_company_name() returns trigger
language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if new.code in ('AUTO-DVEPXC', 'AUTO-11LQG6S') then
    select name into v from public.company_directory
     where code = new.code and coalesce(btrim(name), '') <> ''
     order by updated_at desc nulls last limit 1;
    if v is not null and v <> coalesce(new.company_name, '') then
      new.company_name := v;
    end if;
  end if;
  return new;
end $$;
