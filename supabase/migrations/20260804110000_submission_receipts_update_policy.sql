-- 접수원장(customer_submission_receipts) anon UPDATE 허용
-- 용도: 관리자 화면에서 접수·변경 이력 한 줄 숨김(source 앞에 hidden_ 프리픽스).
-- DELETE 정책은 의도적으로 안 만든다 — anon 영구삭제 금지, 숨김은 되돌릴 수 있게.
DROP POLICY IF EXISTS "public_update_customer_submission_receipts" ON public.customer_submission_receipts;
CREATE POLICY "public_update_customer_submission_receipts" ON public.customer_submission_receipts
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);
