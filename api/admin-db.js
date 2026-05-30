/**
 * Vercel Serverless: POST /api/admin-db
 *
 * 관리자 DB 프록시 — 관리자 토큰을 검증해 허용 테이블에 대한 읽기/쓰기를
 * service_role 로 포워드한다. 자세한 동작은 lib/admin-db-logic.cjs 참고.
 *
 * body = { token, method, path, body, prefer }
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · (토큰: CUSTOMER_SESSION_SECRET 등)
 */
const { handleAdminDbRequest } = require("../lib/admin-db-logic.cjs");

function readJsonBody(req, maxLen = 4 * 1024 * 1024) {
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
    const out = await handleAdminDbRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/admin-db]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
