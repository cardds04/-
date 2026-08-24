/**
 * Vercel Serverless: POST /api/tutor-support
 *
 * 디지털튜터 수업지원요청 — 선생님은 익명으로 신청, 튜터는 비밀번호 로그인 후 수락/반려.
 * 자세한 동작은 lib/tutor-support-logic.cjs 참고.
 *
 * body = { action: "list" | "create" | "cancel" | "tutor_login" | "decide", ... }
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · TUTOR_ADMIN_PASSWORD
 */
const { handleTutorSupportRequest } = require("../lib/tutor-support-logic.cjs");

function readJsonBody(req, maxLen = 256 * 1024) {
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
  res.setHeader("Cache-Control", "no-store");

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
    const out = await handleTutorSupportRequest(body);
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/tutor-support]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
