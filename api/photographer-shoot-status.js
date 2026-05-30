/**
 * POST JSON { writerLoginId, writerPassword, scheduleIds: string[] }
 * → { ok: true, doneScheduleIds: string[], deliveryByScheduleId: Record<id, {...}> }
 */
const { listPhotographerShootPanel } = require("../lib/photographer-shoot-logic.cjs");
const { resolveWriterCredsFromToken } = require("../lib/writer-auth-logic.cjs");

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
    let writerLoginId = String(body.writerLoginId || "").trim();
    let writerPassword = String(body.writerPassword || "");
    // 작가 토큰이 오면 비밀번호 없이도 인증(토큰 → service_role 자격 조회).
    const writerToken = String(body.writerToken || "").trim();
    if (writerToken && !writerPassword) {
      const creds = await resolveWriterCredsFromToken(writerToken);
      if (creds) {
        writerLoginId = creds.loginId;
        writerPassword = creds.password;
      }
    }
    const scheduleIds = Array.isArray(body.scheduleIds) ? body.scheduleIds : [];

    const { doneScheduleIds, deliveryByScheduleId } = await listPhotographerShootPanel({
      writerLoginId,
      writerPassword,
      scheduleIds,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ ok: true, doneScheduleIds, deliveryByScheduleId });
  } catch (error) {
    console.error("[photographer-shoot-status]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
