-- 스케줄 원복 재발(2026-08-24 18:20 KST, 12행) 대응 — 게이트 버전 인상
--
-- 원인: schedules 가 1301행으로 늘어 PostgREST 기본 1000행 캡을 초과.
--       푸시 전 "서버 최신성 검사"용 id 목록 GET 이 1000행까지만 반환 →
--       목록에 빠진 행을 "서버에 없는 신규 행"으로 오판해 최신성 검사 없이 통째 업서트 →
--       옛 데이터를 든 탭이 당일 오후 수정분(작가 배정·시간)을 되밀었다.
--       (같은 날 16:37 admin_delete 된 행까지 source=active 로 부활시킴)
--
-- 수정: 클라이언트는 Range 페이지네이션 + Content-Range 총계 검증으로 전량 수집(v20260824 코드).
--       이 마이그레이션은 UPDATE 게이트 헤더 값을 v20260824 로 올려,
--       배포 전에 열려 있던 옛 코드 탭(전량 미수집)의 기존 행 갱신을 42501 로 거부한다.
-- ‼️클라이언트 SCHED_WRITE_VERSION(index.js)·하드코딩 헤더(customer.html·public-order.html 각 2곳)와
--   반드시 같은 값으로 유지할 것 — 어긋나면 전 기기 저장이 멈춘다.
DROP POLICY IF EXISTS "anon_update_schedules" ON public.schedules;
CREATE POLICY "anon_update_schedules" ON public.schedules
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (
    coalesce(current_setting('request.headers', true)::json ->> 'x-sched-client', '') = 'v20260824'
  );
