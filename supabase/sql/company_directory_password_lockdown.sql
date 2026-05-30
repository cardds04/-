-- ⚠️ 수동 실행 전용 — 자동 마이그레이션(migrations/)에 두지 않는다.
-- ⚠️ 반드시 "마지막"에 실행: ① 컬럼 추가 → ② 백필(--apply) → ③ 클라이언트 컷오버 배포 →
--    ④ (이 파일) 평문 차단. 컷오버 전에 실행하면 브라우저 로그인이 깨질 수 있다.
--
-- 목적: anon(브라우저 키)이 password / password_hash 두 컬럼을 읽지도·쓰지도 못하게 막는다.
--       나머지 컬럼은 기존처럼 anon 이 읽고/쓸 수 있다(점진적 잠금 — Phase B/C 에서 더 강화).
--
-- 원리: Postgres 에서 "특정 컬럼만 제외"하려면 테이블 전체 권한을 회수한 뒤
--       제외 대상을 뺀 컬럼 목록으로 다시 GRANT 해야 한다. 컬럼이 마이그레이션에
--       없고 DB 에만 있는 경우(contact_name 등)까지 안전하게 처리하려고
--       information_schema 로 컬럼 목록을 동적으로 만든다.
--
-- 롤백: 맨 아래 주석의 "되돌리기" 블록 참고(anon 에 전체 컬럼 권한 재부여).

do $$
declare
  cols_select text;
  cols_write  text;
  role_name   text;
begin
  -- password / password_hash 를 제외한 컬럼 목록(콤마 구분)
  select string_agg(format('%I', column_name), ', ')
    into cols_select
  from information_schema.columns
  where table_schema = 'public'
    and table_name   = 'company_directory'
    and column_name not in ('password', 'password_hash');

  -- INSERT/UPDATE 도 동일한 비밀번호 컬럼 제외(id 는 default 가 있으므로 제외해도 무방하지만,
  -- 기존 동작 유지를 위해 password 계열만 뺀다)
  cols_write := cols_select;

  foreach role_name in array array['anon', 'authenticated']
  loop
    -- 1) 테이블 전체 권한 회수(컬럼 단위 제어를 위해 필수)
    execute format('revoke select, insert, update on public.company_directory from %I', role_name);

    -- 2) 비밀번호 컬럼을 제외하고 재부여
    execute format('grant select (%s) on public.company_directory to %I', cols_select, role_name);
    execute format('grant insert (%s) on public.company_directory to %I', cols_write, role_name);
    execute format('grant update (%s) on public.company_directory to %I', cols_write, role_name);
  end loop;
end
$$;

-- service_role 은 RLS·컬럼권한을 우회하므로 서버(api/customer-auth)는 영향 없음.

-- 확인용(선택): anon 으로 password 를 select 하면 권한 오류가 나야 정상.
--   set role anon;
--   select password from public.company_directory limit 1;   -- ERROR: permission denied 기대
--   reset role;

-- ── 되돌리기(롤백) ───────────────────────────────────────────────
-- do $$
-- declare role_name text;
-- begin
--   foreach role_name in array array['anon','authenticated'] loop
--     execute format('grant select, insert, update on public.company_directory to %I', role_name);
--   end loop;
-- end $$;
