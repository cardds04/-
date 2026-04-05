-- 같은 아이·같은 날 칭찬 스티커를 여러 개 완료할 수 있도록 claim 테이블 PK를 id 단일 키로 고정합니다.
-- 구버전/수동 스키마에서 (kid_id, for_date) 복합 PK·UNIQUE가 남아 있으면 duplicate key (family_praise_claim_pkey)가 납니다.

drop trigger if exists trg_family_wallet_on_praise_claim on public.family_praise_claim;
drop trigger if exists trg_family_wallet_on_praise_claim_del on public.family_praise_claim;

alter table public.family_praise_claim add column if not exists id uuid;

update public.family_praise_claim
set id = gen_random_uuid()
where id is null;

alter table public.family_praise_claim alter column id set default gen_random_uuid();

do $fix$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on c.conrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    where n.nspname = 'public'
      and t.relname = 'family_praise_claim'
      and c.contype in ('p', 'u')
  loop
    execute format('alter table public.family_praise_claim drop constraint if exists %I', r.conname);
  end loop;
end $fix$;

-- CONSTRAINT 가 아닌 CREATE UNIQUE INDEX 만 있는 경우
do $ix$
declare
  r record;
begin
  for r in
    select quote_ident(n.nspname) || '.' || quote_ident(ic.relname) as idx_name
    from pg_index i
    join pg_class t on i.indrelid = t.oid
    join pg_namespace n on t.relnamespace = n.oid
    join pg_class ic on i.indexrelid = ic.oid
    where n.nspname = 'public'
      and t.relname = 'family_praise_claim'
      and i.indisunique
      and not i.indisprimary
  loop
    execute 'drop index if exists ' || r.idx_name;
  end loop;
end $ix$;

alter table public.family_praise_claim alter column id set not null;

alter table public.family_praise_claim
  add constraint family_praise_claim_pkey primary key (id);

create trigger trg_family_wallet_on_praise_claim
  after insert on public.family_praise_claim
  for each row
  execute function public.family_bump_wallet_on_complete ();

create trigger trg_family_wallet_on_praise_claim_del
  after delete on public.family_praise_claim
  for each row
  execute function public.family_drop_wallet_on_complete_delete ();
