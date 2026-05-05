-- company_directory: customer_phone 에만 번호가 있고 phone 이 비어 있는 행 → phone 에 복사
-- (이미 phone 이 있는 행은 유지)

begin;

update public.company_directory d
set phone = trim(d.customer_phone)
where nullif(trim(d.customer_phone), '') is not null
  and nullif(trim(d.phone), '') is null;

commit;
