-- 예전 마이그레이션에서 company_code 로만 추가된 경우 → code 로 통일 (company_directory 컬럼명과 동일)
-- 둘 다 있으면: code 가 비어 있으면 company_code 값으로 채운 뒤 company_code 컬럼 제거
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'company_code'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'code'
  ) then
    update public.schedules
    set code = coalesce(nullif(btrim(code), ''), company_code);
    alter table public.schedules drop column company_code;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'company_code'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'schedules' and column_name = 'code'
  ) then
    alter table public.schedules rename column company_code to code;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'company_code'
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'code'
  ) then
    update public.payments
    set code = coalesce(nullif(btrim(code), ''), company_code);
    alter table public.payments drop column company_code;
  elsif exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'company_code'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'payments' and column_name = 'code'
  ) then
    alter table public.payments rename column company_code to code;
  end if;
end $$;
