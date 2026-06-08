/**
 * Vercel Serverless: /api/easy-templates
 *
 *   GET                         → 공개 템플릿 목록 (고객 사이트가 사용)
 *   POST  { key, template, musicB64?, musicType?, clearMusic? } → 게시/수정 (관리자)
 *   POST  { key, action:"delete", id }  또는  DELETE ?id=&key=      → 내리기 (관리자)
 *
 * 로직: lib/easy-templates-logic.cjs
 */
const { handleEasyTemplates } = require("../lib/easy-templates-logic.cjs");

function readJsonBody(req, maxLen = 24 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다 (음악 파일이 너무 큼).")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function parseQuery(req) {
  try { const u = new URL(req.url, "http://x"); const q = {}; u.searchParams.forEach((v, k) => (q[k] = v)); return q; }
  catch (_) { return {}; }
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") { res.status(204).end(); return; }

  try {
    let body = {};
    if (req.method === "POST" || req.method === "DELETE") {
      body = req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : await readJsonBody(req);
    }
    const out = await handleEasyTemplates({ method: req.method, query: parseQuery(req), body });
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/easy-templates]", e);
    res.status(500).json({ ok: false, error: (e && e.message) || "서버 오류" });
  }
};
