/**
 * Vercel Serverless: POST /api/easy-title
 *
 * 타이틀 메이커 — 문구 + 스타일 → AI 이미지로 타이틀 레터링(평평한 크로마키 배경).
 * 배경 투명화는 클라이언트가 처리. 로직은 lib/easy-title-logic.cjs (server.js 와 공유).
 *
 * 환경 변수: OPENAI_API_KEY (기본 엔진 필수), OPENAI_IMAGE_MODEL (선택), TITLE_ENGINE=gemini 로 되돌릴 경우 GEMINI_API_KEY
 */
const { handleEasyTitle } = require("../lib/easy-title-logic.cjs");

function readJsonBody(req, maxLen = 12 * 1024 * 1024) {   // 참조 이미지 dataURI 수용
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
module.exports.config = { maxDuration: 60 };   // ⏱ 이미지 생성(특히 인물 사진)이 기본 제한시간을 넘겨 504 나던 것 방지
