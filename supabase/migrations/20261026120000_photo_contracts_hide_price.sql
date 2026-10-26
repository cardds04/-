-- 계약서 가격표 숨기기 옵션(10-26) — true 면 계약서에 「가격표」 표를 그리지 않는다.
alter table public.photo_contracts add column if not exists hide_price boolean not null default false;
