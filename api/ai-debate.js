/**
 * Vercel Serverless: POST /api/ai-debate
 *
 * 환경 변수:
 *  - GEMINI_API_KEY
 *  - XAI_API_KEY  (또는 GROK_WEB_DEFAULT_XAI_KEY)
 *  - GEMINI_DEBATE_MODEL (선택, 기본 gemini-3-flash-preview)
 *  - XAI_DEBATE_MODEL    (선택, 기본 grok-4)
 */
const { handleAiDebateRequest } = require("../lib/ai-debate-logic.cjs");

function readJsonBody(req, maxLen = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxLen) {
        reject(new Error("요청 본문이 너무 큽니다."));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST만 지원합니다." });
    return;
  }

  try {
    const body =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : await readJsonBody(req);
    const out = await handleAiDebateRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/ai-debate]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
