-- 스케줄 원복 사고(2026-08-05·08-07) 최종 차단 — 옛 코드 클라이언트의 UPDATE 거부
--
-- 배경: 버그 수정본을 배포해도, 배포 전에 열어둔 관리자 탭(옛 코드)이 살아있는 한
--       옛 로직(일괄 dirty 도장·이름불일치 강제 업서트)이 계속 서버를 덮어쓴다.
--       "탭을 닫아달라" 안내로는 재발을 못 막았음(08-07 아침 10:15 KST, 12행 일괄 원복).
--
-- 방법: UPDATE 정책의 WITH CHECK 에서 요청 헤더 x-sched-client 를 요구한다.
--       새 코드만 이 헤더를 보내므로, 옛 코드 탭의 기존 행 갱신(업서트의 conflict-update 포함)은
--       42501 로 실패한다 → 옛 탭은 "서버 저장 실패" 배너를 보게 되고 데이터는 보호된다.
--       INSERT 는 게이트하지 않는다(옛 고객 탭의 신규 접수까지 막지 않기 위해 —
--       신규 행은 원복 사고와 무관하고, 고객 접수의 1순위는 서버 API(service role)라 무관).
--       서버 API(customer-write 등)는 service role 이라 RLS 를 우회하므로 영향 없음.
--
-- 클라이언트 버전을 올릴 때는 이 값과 각 페이지의 SCHED_WRITE_VERSION 을 함께 바꾼다.
DROP POLICY IF EXISTS "anon_update_schedules" ON public.schedules;
CREATE POLICY "anon_update_schedules" ON public.schedules
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (
    coalesce(current_setting('request.headers', true)::json ->> 'x-sched-client', '') = 'v20260807'
  );
