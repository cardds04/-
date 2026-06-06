-- 우리가족 투두: 쿠폰 → 용돈(돈) 전환
-- 아이 지갑에 "지급한 금액(원)"을 기록할 컬럼 추가.
--   * 번 돈 = (스탬프 수 × 100) + 스터디게임 적립금
--   * 받을 돈 = 번 돈 − paid_won
-- 관리자 페이지에서 실제로 용돈을 줬을 때 paid_won 을 올려서 기록합니다.

alter table public.family_kid_wallet
  add column if not exists paid_won integer not null default 0;

-- (선택) 음수 방지
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'family_kid_wallet_paid_won_nonneg'
  ) then
    alter table public.family_kid_wallet
      add constraint family_kid_wallet_paid_won_nonneg check (paid_won >= 0);
  end if;
end $$;
