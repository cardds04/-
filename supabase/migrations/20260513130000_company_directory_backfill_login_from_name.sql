-- company_directory: login_id·password 가 모두 비어 있는 행만
-- name 에서 (…) 제거 → "인테리어"·"디자인" 제거 → trim 한 값을 login_id, password 는 1234
-- login_id UNIQUE 충돌(동일 이름 규칙 결과·기존 행과 겹침) 시 `_` + id 앞 12자(하이픈 제거) 접미사

begin;

with raw as (
  select
    id,
    nullif(
      trim(
        replace(
          replace(
            regexp_replace(coalesce(name, ''), '\([^)]*\)', '', 'g'),
            '인테리어',
            ''
          ),
          '디자인',
          ''
        )
      ),
      ''
    ) as base
  from public.company_directory
  where nullif(trim(coalesce(login_id, '')), '') is null
    and nullif(trim(coalesce(password, '')), '') is null
),
numbered as (
  select
    id,
    base,
    row_number() over (partition by base order by id) as rn
  from raw
  where base is not null
),
assigned as (
  select
    n.id,
    case
      when n.rn > 1 then
        n.base || '_' || substr(replace(n.id::text, '-', ''), 1, 12)
      when exists (
        select 1
        from public.company_directory x
        where x.id <> n.id
          and nullif(trim(coalesce(x.login_id, '')), '') is not null
          and x.login_id = n.base
      ) then
        n.base || '_' || substr(replace(n.id::text, '-', ''), 1, 12)
      else n.base
    end as new_login
  from numbered n
)
update public.company_directory d
set
  login_id = a.new_login,
  password = '1234'
from assigned a
where d.id = a.id;

commit;
