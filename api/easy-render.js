/**
 * Vercel Serverless: POST /api/easy-render  — 서버 렌더(Phase 2) 작업 큐
 *
 *  앱(고객): action:"create" | "status"
 *  워커:     action:"claim" | "signresult" | "progress" | "complete" | "fail"  (RENDER_WORKER_SECRET)
 *
 * 자세한 동작은 lib/easy-render-logic.cjs 참고.
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RENDER_WORKER_SECRET
 */
const { handleEasyRender } = require("../lib/easy-render-logic.cjs");

function readJsonBody(req, maxLen = 4 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => { raw += chunk; if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다.")); });
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
    const body =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : await readJsonBody(req);
    const out = await handleEasyRender(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/easy-render]", e);
    res.status(500).json({ ok: false, error: (e && e.message) || "서버 오류" });
  }
};
