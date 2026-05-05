/**
 * POST JSON { writerLoginId, writerPassword, scheduleId }
 * → 원본 업로드 완료 고객 안내 문자
 */
const { notifyPhotographerOriginalUploadComplete } = require("../lib/photographer-shoot-logic.cjs");

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

    const out = await notifyPhotographerOriginalUploadComplete({
      writerLoginId,
      writerPassword,
      scheduleId,
    });

    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!out.ok) {
      const code = typeof out.code === "string" ? out.code : undefined;
      const payload = code ? { ok: false, message: out.message || "실패", code } : { ok: false, message: out.message || "실패" };
      res.status(out.status || 500).json(payload);
      return;
    }
    res.status(200).json({ ok: true, ...out.data });
  } catch (error) {
    console.error("[photographer-original-upload-notify]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
