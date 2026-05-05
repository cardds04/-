/**
 * POST JSON: { scheduleId, kind: "photo" | "video", customerPhone? }
 * 15일 대시보드에서 납품 안내 문자 수동 발송 (비밀번호 없음).
 */
const { sendDashboardDeliverySms } = require("../lib/delivery-drive-run.cjs");

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
    const kind = String(body.kind || "").trim().toLowerCase();

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
