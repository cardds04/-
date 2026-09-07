/**
 * Vercel Serverless: POST /api/gemini-tts
 * 환경변수 GEMINI_API_KEY 또는 요청 본문 apiKey
 */
const { handleGeminiTtsRequest } = require("../lib/gemini-tts-logic.cjs");
const { guard } = require("../lib/origin-guard.cjs");

module.exports = async (req, res) => {
  // ‼️09-08 — 인증 없이 열려 있어 남의 호출이 사장님 키로 과금됐다(origin-guard.cjs)
  if (!guard(req, res)) return;
res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "POST만 지원합니다." });
    return;
  }

  try {
    const body =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : await readJsonBody(req);
    const out = await handleGeminiTtsRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/gemini-tts]", e);
    res.status(500).json({ message: e?.message || "서버 오류" });
  }
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error("요청 본문이 너무 큽니다."));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}
