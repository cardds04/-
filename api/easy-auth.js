/**
 * Vercel Serverless: POST /api/easy-auth
 *
 * 이지숏폼 고객 로그인/회원가입 — 별도 테이블 easy_users 사용.
 * 평문 비밀번호는 서버(service_role)에서만 검증·저장. 자세한 동작은 lib/easy-auth-logic.cjs 참고.
 *
 * body = { action: "login" | "signup" | "change_password", ... }
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (필수)
 */
const { handleEasyAuthRequest } = require("../lib/easy-auth-logic.cjs");

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
    const out = await handleEasyAuthRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/easy-auth]", e);
    res.status(500).json({ ok: false, error: (e && e.message) || "서버 오류" });
  }
};
