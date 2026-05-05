/**
 * POST JSON: { scheduleId, adminPassword, kind: "photo" | "video" }
 * 15일 스케줄 대시보드에서 사진·영상 납품 안내 문자를 수동 발송하고 shoot_delivery_drive_state 에 시각 반영.
 * 비밀번호: ADMIN_SHOOT_SITE_PASSWORD (관리자 현장 완료 API 와 동일)
 */
const { sendDashboardDeliverySms } = require("../lib/delivery-drive-run.cjs");

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
    const body = typeof req.body === "object" && req.body !== null ? req.body : {};
    const scheduleId = String(body.scheduleId || "").trim();
    const adminPassword = String(body.adminPassword || "");
    const kind = String(body.kind || "").trim().toLowerCase();

    if (!adminPasswordOk(adminPassword)) {
      res.status(401).json({ ok: false, message: "관리자 비밀번호가 올바르지 않습니다." });
      return;
    }

    const kindNorm = kind === "video" ? "video" : kind === "photo" ? "photo" : "";
    if (!kindNorm) {
      res.status(400).json({ ok: false, message: 'kind는 "photo" 또는 "video" 여야 합니다.' });
      return;
    }

    const out = await sendDashboardDeliverySms({
      scheduleId,
      kind: kindNorm,
    });
    if (!out.ok) {
      res.status(out.status || 500).json({ ok: false, message: out.message || "처리 실패" });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ ok: true, ...out.data });
  } catch (e) {
    console.error("[dashboard-delivery-notify]", e);
    res.status(500).json({ ok: false, message: e?.message || "서버 오류" });
  }
};
