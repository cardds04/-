/**
 * Vercel Serverless: POST /api/stt
 *
 * 음성→자막 STT — 영상/오디오 base64 → OpenAI Whisper(단어 타임스탬프) → 자막 세그먼트.
 * 로직은 lib/stt-logic.cjs (server.js 와 공유).
 *
 * 입력 body: { audio: "data:<mime>;base64,...", mime?, language? }
 * 출력: { ok, words:[{w,start,end}], segments, text, duration }
 *
 * 환경 변수:
 *  - OPENAI_API_KEY  (필수)
 *  - STT_MODEL       (선택, 기본 whisper-1)
 *
 * 주의: Vercel 서버리스 요청 본문 한도(약 4.5MB) 때문에 긴 녹음은 잘릴 수 있음.
 * 짧은 녹음(수십 초)은 정상 동작.
 */
const { handleSttRequest } = require("../lib/stt-logic.cjs");

function readJsonBody(req, maxLen = 40 * 1024 * 1024) {
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
    const out = await handleSttRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/stt]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
