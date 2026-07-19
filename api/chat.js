/**
 * Vercel Serverless: POST /api/chat
 * 인로그 신뢰구축형 상담 챗봇 (MVP). 로직은 lib/chat-logic.cjs 참고.
 * 환경변수: ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CHAT_MODEL(선택)
 */
const { handleChat } = require("../lib/chat-logic.cjs");

function readJsonBody(req, maxLen = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다.")); });
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
    const out = await handleChat(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/chat]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
