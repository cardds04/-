/**
 * Vercel Serverless: POST /api/writer-db
 *
 * 작가 DB 프록시(읽기 전용) — 작가 토큰을 검증해 허용 테이블 GET 을 service_role 로
 * 포워드한다. 자세한 동작은 lib/writer-db-logic.cjs 참고.
 *
 * body = { token, method:"GET", path }
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 */
const { handleWriterDbRequest } = require("../lib/writer-db-logic.cjs");

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
    const out = await handleWriterDbRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/writer-db]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
