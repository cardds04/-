/**
 * Vercel Serverless — WaveSpeedAI 영상 얼굴 교체(face swap) 프록시
 * 로직은 lib/wavespeed-faceswap-logic.cjs (server.js 로컬 8787 와 공유)
 *
 * POST JSON:
 *  - { action:"create", video, face_image, target_index? }  → { ok, id, status }
 *  - { action:"query",  id }                                → { ok, status, video_url }
 */
const { handleWaveSpeedFaceSwap } = require("../lib/wavespeed-faceswap-logic.cjs");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
function readJsonBody(req, maxLen = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다.")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") { res.status(204).end(); return; }
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST 만 허용됩니다." }); return; }
  try {
    const body = req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : await readJsonBody(req);
    if (body && body.debug === "envcheck") {
      res.status(200).json({ ok: true, hasKey: !!(process.env.WAVESPEED_API_KEY || process.env.WAVESPEED_KEY), keyLen: (process.env.WAVESPEED_API_KEY || process.env.WAVESPEED_KEY || "").length, hasSupabase: !!process.env.SUPABASE_URL });
      return;
    }
    const out = await handleWaveSpeedFaceSwap(body);
    res.status(200).json(out);
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    console.error("[api/wavespeed-faceswap]", e && e.message);
    res.status(status).json({ ok: false, error: e.message || "서버 오류", detail: e.data || null });
  }
};
module.exports.config = { maxDuration: 60 };
