-- company_directory.name 과 동일한 업체명이면 code 를 schedules / payments 에 반영
-- 동일 이름이 여러 행이면 updated_at 최신 행의 code 사용
do $$
begin
  if to_regclass('public.company_directory') is null then
    raise notice 'backfill code: company_directory 없음 — 스킵';
    return;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'code'
  ) then
    raise notice 'backfill code: schedules.code 없음 — 스킵';
    return;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'code'
  ) then
    raise notice 'backfill code: payments.code 없음 — 스킵';
    return;
  end if;
end $$;

with dir as (
  select distinct on (lower(trim(name)))
    lower(trim(name)) as name_key,
    trim(code) as code
  from public.company_directory
  where nullif(trim(code), '') is not null
  order by lower(trim(name)), updated_at desc nulls last
)
update public.schedules s
set code = dir.code
from dir
where lower(trim(s.company_name)) = dir.name_key;

with dir as (
  select distinct on (lower(trim(name)))
    lower(trim(name)) as name_key,
    trim(code) as code
  from public.company_directory
  where nullif(trim(code), '') is not null
  order by lower(trim(name)), updated_at desc nulls last
)
update public.payments p
set code = dir.code
from dir
where lower(trim(p.company_name)) = dir.name_key;
