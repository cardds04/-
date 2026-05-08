/**
 * POST JSON { scheduleId, adminPassword, kind }
 * kind: "photo" | "video" | "site" | "original"
 * — 납품 완료 로그용 DB 완료 시각 제거 (대시보드 스케줄 대기로 복귀)
 * 비밀번호: ADMIN_SHOOT_SITE_PASSWORD (미설정 시 "6315")
 */
const { revertDashboardDeliveryLogEventAsAdmin } = require("../lib/photographer-shoot-logic.cjs");

function adminPasswordOk(pw) {
  const expected = String(process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315").trim();
  return String(pw || "") === expected;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }
  try {
    const body =
      typeof req.body === "object" && req.body !== null
        ? req.body
        : JSON.parse(typeof req.body === "string" && req.body ? req.body : "{}");

    if (!adminPasswordOk(body.adminPassword)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(401).json({ ok: false, message: "관리자 비밀번호가 올바르지 않습니다." });
      return;
    }

    const out = await revertDashboardDeliveryLogEventAsAdmin({
      scheduleId: body.scheduleId,
      kind: body.kind,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!out.ok) {
      res.status(out.status || 500).json({ ok: false, message: out.message || "처리 실패" });
      return;
    }
    res.status(200).json({ ok: true, ...out.data });
  } catch (error) {
    console.error("[admin-delivery-log-revert]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
