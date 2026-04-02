-- 로그인 ID(예: "1882")는 UUID 가 아님. writer_id 가 uuid 면 INSERT 시 22P02 발생.
-- writers.id(uuid) 를 가리키는 FK 가 있으면 text 로 바꿀 수 없으므로 먼저 FK 제거 후 컬럼을 text 로 변경.
-- (휴무 요청은 작가명·날짜로 식별하고, writer_id 는 로그인 ID 문자열 보관용)

do $$
declare
  r record;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'dayoff_requests'
  ) then
    return;
  end if;

  -- writer_id 관련 외래키 전부 제거 (이름이 환경마다 다를 수 있음)
  for r in
    select c.conname, c.conrelid, c.conkey
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'dayoff_requests'
      and c.contype = 'f'
  loop
    if exists (
      select 1
      from unnest(r.conkey) as fk_attnums(attnum)
      join pg_attribute a
        on a.attrelid = r.conrelid
       and a.attnum = fk_attnums.attnum
      where a.attname = 'writer_id'
    ) then
      execute format('alter table public.dayoff_requests drop constraint %I', r.conname);
    end if;
  end loop;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'dayoff_requests'
      and column_name = 'writer_id'
      and udt_name = 'uuid'
  ) then
    alter table public.dayoff_requests
      alter column writer_id type text
      using (case when writer_id is null then null else writer_id::text end);
  end if;
exception
  when undefined_table then null;
end;
$$;
