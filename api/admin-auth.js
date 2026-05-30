/**
 * Vercel Serverless: POST /api/admin-auth
 *
 * 관리자 로그인 — 관리자 비밀번호를 검증해 { adm:1 } 세션 토큰을 발급한다.
 * 자세한 동작은 lib/admin-auth-logic.cjs 참고.
 *
 * body = { action:"login", adminPassword }
 *
 * 환경 변수: ADMIN_SHOOT_SITE_PASSWORD(기본 "6315") · CUSTOMER_SESSION_SECRET 또는 SERVICE_ROLE
 */
const { handleAdminAuthRequest } = require("../lib/admin-auth-logic.cjs");

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
    const out = await handleAdminAuthRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/admin-auth]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
