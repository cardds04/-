/**
 * Vercel Serverless: POST /api/gemini-text
 *
 * 🔮 Gemini 텍스트 생성/분석 — 시나리오 검토(참고영상 말투·구조 분석) 등.
 * 브라우저 키 불필요(서버 GEMINI_API_KEY). 로직은 lib/gemini-text-logic.cjs (server.js 와 공유).
 *
 * 환경 변수:
 *  - GEMINI_API_KEY     (필수)
 *  - GEMINI_TEXT_MODEL  (선택, 기본 gemini-flash-latest — 자동 최신)
 */
const { handleGeminiText } = require("../lib/gemini-text-logic.cjs");
const { guard } = require("../lib/origin-guard.cjs");

function readJsonBody(req, maxLen = 2 * 1024 * 1024) {
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
    res.status(405).json({ ok: false, error: "POST만 지원합니다." });
    return;
  }

  try {
    const body =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : await readJsonBody(req);
    const out = await handleGeminiText(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/gemini-text]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
