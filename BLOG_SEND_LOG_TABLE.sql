-- ============================================================
-- 블로그 발송 완료 로그 — 전용 테이블 (각 스케줄별 독립 row)
-- ============================================================
-- 기존엔 client_kv 테이블의 scheduleSiteBlogSendLog 키 안에
-- JSON 문자열로 통째 저장돼서, 다중 브라우저가 동시에 수정하면
-- 외곽 키 단위 머지로 한쪽 변경이 통째 손실되는 race 가 있었음.
-- 각 스케줄을 독립 row 로 분리하면 UPSERT/DELETE 가 atomic 해져
-- 머지 충돌 자체가 사라짐.
-- ============================================================

create table if not exists public.blog_send_log (
  schedule_key text primary key,
  sent_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists blog_send_log_sent_at_idx
  on public.blog_send_log (sent_at desc);

-- 변경 시 updated_at 자동 갱신
create or replace function public.blog_send_log_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_blog_send_log_updated_at on public.blog_send_log;
create trigger trg_blog_send_log_updated_at
  before update on public.blog_send_log
  for each row execute function public.blog_send_log_set_updated_at();

-- RLS: 사이트는 관리자 anon 만 접근 (다른 테이블과 동일 정책).
alter table public.blog_send_log enable row level security;

drop policy if exists "blog_send_log anon read"  on public.blog_send_log;
drop policy if exists "blog_send_log anon write" on public.blog_send_log;

create policy "blog_send_log anon read"
  on public.blog_send_log
  for select using (true);

create policy "blog_send_log anon write"
  on public.blog_send_log
  for all using (true) with check (true);

-- ============================================================
-- (선택) 기존 client_kv 의 scheduleSiteBlogSendLog 키에 들어 있던
-- 데이터를 새 테이블로 백필. 클라이언트가 첫 로드 시 자동
-- 마이그레이션도 하지만, 안전하게 미리 옮겨놓고 싶으면 이거 실행.
-- ============================================================
-- with src as (
--   select kv -> 'scheduleSiteBlogSendLog' as raw
--   from public.schedule_site_client_kv
--   where id = 'scoped_local_v1'
-- ),
-- parsed as (
--   select case
--     when jsonb_typeof(raw) = 'string' then (raw #>> '{}')::jsonb
--     when jsonb_typeof(raw) = 'object' then raw
--     else '{}'::jsonb
--   end as obj
--   from src
-- )
-- insert into public.blog_send_log (schedule_key, sent_at)
-- select key,
--        coalesce((value->>'sentAt')::timestamptz, now())
-- from parsed, jsonb_each(parsed.obj)
-- on conflict (schedule_key) do update set sent_at = excluded.sent_at;
