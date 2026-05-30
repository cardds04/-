/**
 * Vercel Serverless: POST /api/customer-write
 *
 * 고객 포털 쓰기 — 세션 토큰을 검증해 "본인 업체 행"에만 쓰기를 허용한다.
 * 자세한 동작은 lib/customer-write-logic.cjs 참고.
 *
 * body = { action, token, ... }
 *   - action="upsert_schedules": { rows: [...] }
 *   - action="delete_schedule":  { scheduleId }
 *   - action="hold_payment":     { scheduleId }
 *
 * 환경 변수:
 *  - SUPABASE_URL                (필수)
 *  - SUPABASE_SERVICE_ROLE_KEY   (필수)
 *  - CUSTOMER_SESSION_SECRET     (권장; 없으면 SERVICE_ROLE 로 서명 검증)
 */
const { handleCustomerWriteRequest } = require("../lib/customer-write-logic.cjs");

function readJsonBody(req, maxLen = 1 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxLen) {
        reject(new Error("요청 본문이 너무 큽니다."));
      }
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
    const out = await handleCustomerWriteRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/customer-write]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
