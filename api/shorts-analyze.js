/**
 * Vercel Serverless: POST /api/shorts-analyze
 *   { videoId, title? } → { ok, refAnalysis, guide } (Gemini 영상 분석 → 따라 찍는 지시서)
 * 로직: lib/shorts-analyze-logic.cjs · 환경변수: GEMINI_API_KEY
 */
const { handleShortsAnalyze } = require("../lib/shorts-analyze-logic.cjs");

function readJsonBody(req, maxLen = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다.")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST만 지원합니다." }); return; }

  try {
    const body = req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : await readJsonBody(req);
    const out = await handleShortsAnalyze({ method: "POST", body });
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/shorts-analyze]", e);
    res.status(500).json({ ok: false, error: (e && e.message) || "서버 오류" });
  }
};
