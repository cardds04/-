/**
 * Vercel Serverless Function: POST /api/solapi-send
 * 본문: { to: "010xxxxxxxx", text: "...", subject?: string, from?: string, type?: "SMS"|"LMS"|"MMS" }
 *
 * 접근 인증 (lib/solapi-logic.cjs · authorizeSolapiSend):
 *  - 자동화(curl·서버): `x-solapi-token` 헤더 == SOLAPI_SEND_TOKEN
 *  - 사이트 페이지(브라우저 fetch): Origin/Referer 가 자사 오리진이면 허용
 *  - SOLAPI_SEND_ENFORCE 미설정 = 소프트 모드(미인증도 허용 + 경고 로그).
 *    호출처 전환이 끝나고 사장님 확인 후 SOLAPI_SEND_ENFORCE=1 로 강제 전환.
 *
 * 환경변수 (Vercel 프로젝트 Settings → Environment Variables — sc·sc-pink 모두):
 *   SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_NUMBER
 *   SOLAPI_SEND_TOKEN, SOLAPI_SEND_ENFORCE, SOLAPI_SEND_ALLOWED_ORIGINS(선택)
 */
const {
  handleSolapiSendRequest,
  authorizeSolapiSend,
  getAllowedBrowserOrigins,
  isSolapiSendEnforced,
} = require("../lib/solapi-logic.cjs");

function setCorsHeaders(req, res) {
  const origin = String(req.headers?.origin || "");
  if (origin && getAllowedBrowserOrigins().includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else if (!isSolapiSendEnforced()) {
    // 소프트 모드 동안은 종전(*) 동작 유지 — 미파악 크로스오리진 호출처가 있으면 로그로 드러나게.
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Vary", "Origin");
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    setCorsHeaders(req, res);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-solapi-token");
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const auth = authorizeSolapiSend(req.headers);
  if (!auth.allowed) {
    console.warn("[solapi-send] 미인증 호출 차단", JSON.stringify(auth.detail));
    setCorsHeaders(req, res);
    res.status(401).json({
      ok: false,
      message: "인증 필요: x-solapi-token 헤더가 없거나 올바르지 않습니다.",
    });
    return;
  }

  try {
    const body =
      typeof req.body === "object" && req.body !== null
        ? req.body
        : JSON.parse(typeof req.body === "string" && req.body ? req.body : "{}");
    if (!auth.authenticated) {
      console.warn(
        "[solapi-send] 미인증 호출 허용(소프트 모드)",
        JSON.stringify({ ...auth.detail, to: body?.to || null })
      );
    }
    const out = await handleSolapiSendRequest(body);
    setCorsHeaders(req, res);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[solapi-send]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
