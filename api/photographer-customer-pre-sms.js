/**
 * POST JSON { writerLoginId, writerPassword, scheduleId, kind }
 * kind: "pre_site" | "pre_original" — 고객 안내 문자(작가 수동)
 */
const {
  notifyPhotographerPreCustomerSms,
} = require("../lib/photographer-shoot-logic.cjs");

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
    const writerLoginId = String(body.writerLoginId || "").trim();
    const writerPassword = String(body.writerPassword || "");
    const scheduleId = String(body.scheduleId || "").trim();
    const kind = String(body.kind || "").trim();

    const out = await notifyPhotographerPreCustomerSms({
      writerLoginId,
      writerPassword,
      scheduleId,
      kind,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!out.ok) {
      res.status(out.status || 500).json({ ok: false, message: out.message || "실패" });
      return;
    }
    res.status(200).json({
      ok: true,
      notice_sms: out.notice_sms,
      kind: out.kind,
      sms_deferred_quiet_hours: !!out.sms_deferred_quiet_hours,
      sms_scheduled_iso: out.sms_scheduled_iso || null,
    });
  } catch (error) {
    console.error("[photographer-customer-pre-sms]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
