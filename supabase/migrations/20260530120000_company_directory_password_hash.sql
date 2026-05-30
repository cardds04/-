-- 고객 비밀번호 해시 저장용 컬럼.
-- 평문 password 컬럼은 점진 폐기(서버가 로그인 성공 시 password_hash 로 업그레이드하고 password=''로 비움).
-- 이 마이그레이션은 "추가"만 하므로 기존 동작을 깨지 않는다(하위호환).

alter table public.company_directory
  add column if not exists password_hash text;

comment on column public.company_directory.password_hash is 'scrypt$N$salt(hex)$hash(hex) 형식. 서버(service_role)만 기록/검증. 평문 password 컬럼 대체.';
