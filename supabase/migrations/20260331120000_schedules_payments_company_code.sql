-- schedules / payments: 업체 고유번호 — company_directory 의 `code` 와 동일한 의미·이름
alter table public.schedules add column if not exists code text not null default '';

alter table public.payments add column if not exists code text not null default '';

comment on column public.schedules.code is '업체 고유번호(표시·동기화, company_directory.code 와 동일 의미)';
comment on column public.payments.code is '업체 고유번호(표시·동기화, company_directory.code 와 동일 의미)';
