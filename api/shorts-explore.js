/**
 * Vercel Serverless: /api/shorts-explore
 *   GET ?q=...   또는   POST { q }   → YouTube 쇼츠 레퍼런스 목록
 * 로직: lib/shorts-explore-logic.cjs
 * 환경변수: YOUTUBE_API_KEY (없으면 GEMINI_API_KEY)
 */
const { handleShortsExplore } = require("../lib/shorts-explore-logic.cjs");

function readJsonBody(req, maxLen = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다.")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
function parseQuery(req) {
  try { const u = new URL(req.url, "http://x"); const q = {}; u.searchParams.forEach((v, k) => (q[k] = v)); return q; }
  catch (_) { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  try {
    let body = {};
    if (req.method === "POST") {
      body = req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : await readJsonBody(req);
    }
    const out = await handleShortsExplore({ method: req.method, query: parseQuery(req), body });
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/shorts-explore]", e);
    res.status(500).json({ ok: false, error: (e && e.message) || "서버 오류" });
  }
};
