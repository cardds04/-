/**
 * Drive 납품 배치: 폴더 트리(조건부)·폴더 업로드 감지 후 솔라피 납품 안내 문자 등.
 *
 * 레포 정책: Vercel 일일 Cron 은 두지 않습니다. 이 라우트는 호출돼도
 * DELIVERY_DRIVE_CRON_ENABLED=1 일 때만 Job 이 실행되며, 기본은 건너뜁니다.
 *
 * 환경변수 (Vercel):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY     — 필수 (shoot_delivery_drive_state 접근용)
 *   SUPABASE_ANON_KEY             — 선택 (없으면 service role 로 schedules 조회만 수행됨)
 *   SOLAPI_*                      — 솔라피 (solapi-send 와 동일)
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON  — 서비스계정 전체 JSON 문자열
 *   GOOGLE_DRIVE_PARENT_FOLDER_ID      — 업체별 최상위를 만들 최상단 부모 폴더 ID
 *   DELIVERY_DRIVE_ALLOW_NEW_FOLDERS  — `1` 일 때만 Drive **새 폴더** 생성(ensureFolder·작가 현장확인·Cron Job).
 *                                      미설정 시 생성 안 함(자동 폴더 난립 방지).
 *   DELIVERY_MIN_SHOOT_DATE       — 선택, 기본 2026-04-28 (이 날짜 이상 스케줄만 처리)
 *   DELIVERY_FOLDER_MAX_LAG_DAYS — 선택, 촬영일로부터 폴더 생성 최대 후퇴 일수 (기본 120)
 *   DELIVERY_DRIVE_LINK_PERMISSION — anyone | private (기본 anyone, 고객용 링크 열람)
 *   DELIVERY_BACKFILL_SHOOT_FROM — 선택 YYYY-MM-DD, DELIVERY_BACKFILL_SHOOT_TO 와 함께 쓰면
 *                                   해당 촬영일 구간은 「다음날」 조건 없이 폴더 생성(일회성 백필).
 *   DELIVERY_AUTO_NEXT_DAY_FOLDERS — DELIVERY_DRIVE_CRON_ENABLED=1 일 때만 의미 있음.
 *                                   `1` 이면 촬영 다음날부터 Job 이 Drive 폴더 트리를 만들 수 있음(기본 끔).
 *   DELIVERY_DRIVE_CRON_ENABLED — `1` 일 때만 이 API 호출 시 runDeliveryDriveJob 실행 (기본 no-op).
 *                                 다시 예약 실행하려면 외부 스케줄러(Cron)·GitHub Actions 등으로 호출하고
 *                                 동시에 이 값을 1 로 설정.
 *   원본폴더 만료 정리 (사진원본파일·영상원본파일 직속 파일만, 편집완료 폴더는 제외):
 *   DELIVERY_ORIGINAL_PURGE_ENABLED — `1` 일 때만 일일 크론 끝에 실행 (기본 끔, 실수 삭제 방지).
 *   DELIVERY_ORIGINAL_RETENTION_DAYS — 기본 60 (Drive createdTime). 고객 문자「30일 이내 권장」과 별개(운영 버퍼).
 *   DELIVERY_ORIGINAL_PURGE_HARD_DELETE — `1` 이면 휴지통이 아닌 영구 삭제(복구 불가). 기본은 휴지통 이동.
 *   CRON_SECRET 또는 DELIVERY_DRIVE_CRON_SECRET — 설정 시 Bearer 토큰과 일치해야 호출 허용
 *
 * 준비: Google Drive에서 PARENT 폴더를 해당 서비스계정 메일 주소와 공유(편집자).
 *
 * 배포 후: Supabase SQL 마이그레이션 실행 (shoot_delivery_drive_state 테이블).
 */
const { runDeliveryDriveJob } = require("../lib/delivery-drive-run.cjs");

function isAuthorizedCron(req) {
  const configured =
    String(process.env.DELIVERY_DRIVE_CRON_SECRET || "").trim() ||
    String(process.env.CRON_SECRET || "").trim();
  if (!configured) return true;
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const bearer =
    typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : "";
  const qToken = typeof req.query?.token === "string" ? req.query.token.trim() : "";
  const bodyToken =
    typeof req.body?.cronSecret === "string" ? req.body.cronSecret.trim() : "";

  return bearer === configured || qToken === configured || bodyToken === configured;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.status(204).end();
    return;
  }

  const method = req.method || "GET";
  if (!["GET", "POST"].includes(method)) {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  if (!isAuthorizedCron(req)) {
    res.status(401).json({ ok: false, message: "Unauthorized" });
    return;
  }

  if (!/^(1|true|yes)$/i.test(String(process.env.DELIVERY_DRIVE_CRON_ENABLED || "").trim())) {
    res.status(200).json({
      ok: true,
      skipped: true,
      message:
        "DELIVERY_DRIVE_CRON_ENABLED 가 1(true)이 아니어서 Drive 크론 Job 을 실행하지 않았습니다. (자동 폴더 생성·납품 문자 루프 중지 상태)",
    });
    return;
  }

  try {
    const stats = await runDeliveryDriveJob((msg) => {
      console.log(msg);
    });
    res.status(200).json({ ok: true, stats });
  } catch (e) {
    console.error("[delivery-drive-cron]", e);
    res.status(500).json({ ok: false, message: e?.message || "서버 오류" });
  }
};
