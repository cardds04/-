/**
 * Vercel Serverless — Kling(클링) 공식 image2video 프록시
 * 로직은 lib/kling-video-logic.cjs (server.js 로컬 8787 와 공유)
 *
 * POST JSON:
 *  - { action:"create", access_key, secret_key, image, image_tail?, prompt?, model_name?, mode?, duration?, aspect_ratio? }
 *  - { action:"query",  access_key, secret_key, task_id }
 */
const { handleKlingVideoRequest } = require("../lib/kling-video-logic.cjs");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}
function readJsonBody(req, maxLen = 30 * 1024 * 1024) {
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
      res.status(200).json({
        ok: true,
        hasAccessKey: !!process.env.KLING_ACCESS_KEY, hasAK: !!process.env.KLING_AK,
        hasSecretKey: !!process.env.KLING_SECRET_KEY, hasSK: !!process.env.KLING_SK,
        akLen: (process.env.KLING_ACCESS_KEY || "").length, skLen: (process.env.KLING_SECRET_KEY || "").length,
        _refHasSupabase: !!process.env.SUPABASE_URL, _refHasGemini: !!process.env.GEMINI_API_KEY,
        _klingKeyNames: Object.keys(process.env).filter((k) => /KLING/i.test(k)),
      });
      return;
    }
    const out = await handleKlingVideoRequest(body);
    res.status(200).json(out);
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    console.error("[api/kling-video]", e && e.message);
    res.status(status).json({ ok: false, error: e.message || "서버 오류", detail: e.data || null });
  }
};
module.exports.config = { maxDuration: 60 };
