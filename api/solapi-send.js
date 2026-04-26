/**
 * Vercel Serverless Function: POST /api/solapi-send
 * 본문: { to: "010xxxxxxxx", text: "...", subject?: string, from?: string, type?: "SMS"|"LMS"|"MMS" }
 *
 * 환경변수 (Vercel 프로젝트 Settings → Environment Variables):
 *   SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER
 */
const { handleSolapiSendRequest } = require("../lib/solapi-logic.cjs");

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
    const out = await handleSolapiSendRequest(body);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[solapi-send]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
