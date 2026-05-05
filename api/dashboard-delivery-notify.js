/**
 * POST JSON: { scheduleId, adminPassword, kind: "photo" | "video", customerPhone? }
 * 선택 customerPhone 으로 shoot_delivery_drive_state.customer_phone 업데이트 후 발송(유효한 로컬번호일 때).
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

    const customerPhone = typeof body.customerPhone === "string" ? String(body.customerPhone).trim() : "";

    const out = await sendDashboardDeliverySms({
      scheduleId,
      kind: kindNorm,
      ...(customerPhone ? { customerPhoneOverride: customerPhone } : {}),
    });
    if (!out.ok) {
      const payload = { ok: false, message: out.message || "처리 실패" };
      if (out.code) payload.code = out.code;
      res.status(out.status || 500).json(payload);
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ ok: true, ...out.data });
  } catch (e) {
    console.error("[dashboard-delivery-notify]", e);
    res.status(500).json({ ok: false, message: e?.message || "서버 오류" });
  }
};
