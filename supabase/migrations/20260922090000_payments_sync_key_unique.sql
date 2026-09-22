-- payments 중복 폭발 봉합 (2026-09-22)
-- 배경: 클라이언트 payments 조회가 1000행 캡(1,370건)에 걸려 뒤쪽 행을 "없는 행"으로 오판 →
--       동기화마다 통째 재INSERT → 533,733행·494MB → anon 3초 statement timeout(57014).
-- 조치: memo JSON 의 syncKey 를 생성 컬럼으로 뽑아 부분 유니크 인덱스(중복 INSERT 원천 차단).
--       (데이터 정리는 Management API 로 수행: syncKey 별 최신 1행=1,370건만 남기고 TRUNCATE+재삽입,
--        백업 public.payments_backup_0922 / keep 목록 public.payments_keep_0922)
create or replace function public.payments_sync_key(memo text) returns text language plpgsql immutable as $$
begin
  if memo is null or left(btrim(memo),1) <> '{' then return null; end if;
  return nullif(btrim((memo::jsonb)->>'syncKey'),'');
exception when others then return null; end $$;
alter table public.payments add column if not exists sync_key text generated always as (public.payments_sync_key(memo)) stored;
create unique index if not exists payments_sync_key_uniq on public.payments (sync_key) where sync_key is not null;
