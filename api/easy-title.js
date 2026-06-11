/**
 * Vercel Serverless: POST /api/easy-title
 *
 * 타이틀 메이커 — 문구 + 스타일 → Gemini 이미지로 타이틀 레터링(평평한 흰 배경).
 * 배경 투명화는 클라이언트가 처리. 로직은 lib/easy-title-logic.cjs (server.js 와 공유).
 *
 * 환경 변수: GEMINI_API_KEY (필수), GEMINI_TITLE_MODEL (선택)
 */
const { handleEasyTitle } = require("../lib/easy-title-logic.cjs");

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
    const out = await handleEasyTitle(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/easy-title]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
