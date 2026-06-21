/**
 * Vercel Serverless: POST /api/typecast-tts
 * 환경변수 TYPECAST_API_KEY (목소리 기본값: TYPECAST_VOICE_FEMALE/MALE)
 */
const { handleTypecastTtsRequest } = require("../lib/typecast-tts-logic.cjs");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ message: "POST만 지원합니다." }); return; }

  try {
    const body =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : await readJsonBody(req);
    const out = await handleTypecastTtsRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/typecast-tts]", e);
    res.status(500).json({ message: e?.message || "서버 오류" });
  }
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) reject(new Error("요청 본문이 너무 큽니다."));
    });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (err) { reject(err); } });
    req.on("error", reject);
  });
}
