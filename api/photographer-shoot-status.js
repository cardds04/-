/**
 * POST JSON { writerLoginId, writerPassword, scheduleIds: string[] }
 * → { ok: true, doneScheduleIds: string[] }  (작가 현장 확인완료 처리된 스케줄 id만)
 */
const { listPhotographerShootDone } = require("../lib/photographer-shoot-logic.cjs");

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
    const scheduleIds = Array.isArray(body.scheduleIds) ? body.scheduleIds : [];

    const doneScheduleIds = await listPhotographerShootDone({
      writerLoginId,
      writerPassword,
      scheduleIds,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ ok: true, doneScheduleIds });
  } catch (error) {
    console.error("[photographer-shoot-status]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
