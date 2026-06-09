/**
 * Vercel Serverless: POST /api/reel-suggest
 *
 * 릴스 제안 제조기 — 각인 기반 제안 5개 / 고른 제안의 촬영 지시서.
 * 로직은 lib/reel-suggest-logic.cjs (server.js 와 공유).
 *
 * 환경 변수:
 *  - ANTHROPIC_API_KEY  (필수)
 *  - REEL_MODEL         (선택, 기본 claude-sonnet-4-6)
 */
const { handleReelRequest } = require("../lib/reel-suggest-logic.cjs");

function readJsonBody(req, maxLen = 1 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다."));
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
    const out = await handleReelRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/reel-suggest]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
