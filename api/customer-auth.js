/**
 * Vercel Serverless: POST /api/customer-auth
 *
 * 고객 포털 로그인/회원가입 — 평문 비밀번호를 브라우저(anon)에서 다루지 않도록
 * 서버(service_role)에서만 검증·저장한다. 자세한 동작은 lib/customer-auth-logic.cjs 참고.
 *
 * body = { action: "login" | "signup", ... }
 *
 * 환경 변수:
 *  - SUPABASE_URL                (필수)
 *  - SUPABASE_SERVICE_ROLE_KEY   (필수)
 */
const { handleCustomerAuthRequest } = require("../lib/customer-auth-logic.cjs");

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
    const out = await handleCustomerAuthRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/customer-auth]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
