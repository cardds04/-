/**
 * Vercel Serverless: GET/POST /api/typecast-voices — Typecast 목소리 목록
 * 환경변수 TYPECAST_API_KEY
 */
const { handleTypecastVoicesRequest } = require("../lib/typecast-tts-logic.cjs");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "GET" && req.method !== "POST") { res.status(405).json({ message: "GET/POST만 지원합니다." }); return; }

  try {
    const body =
      req.method === "POST" && req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : {};
    const out = await handleTypecastVoicesRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/typecast-voices]", e);
    res.status(500).json({ message: e?.message || "서버 오류" });
  }
};
