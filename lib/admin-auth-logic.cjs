/**
 * 관리자 로그인 (서버 전용).
 *
 * 문제: 관리자 페이지(index.js)는 로딩 즉시 anon 키로 전 업체 schedules/payments/
 *       writers 를 직접 읽었다. anon 키·게이트 비번("6315")이 모두 페이지 소스에
 *       박혀 있어, B-4 에서 anon 을 잠그려면 관리자도 anon 에서 떼어내야 한다.
 *
 * 해결: 관리자 비밀번호(ADMIN_SHOOT_SITE_PASSWORD, 기존 admin-* 엔드포인트와 동일)를
 *       서버가 검증하고, 성공 시 { adm:1 } claim 의 HMAC 세션 토큰을 발급한다.
 *       이후 관리자 DB 접근은 이 토큰으로 /api/admin-db 프록시를 통한다.
 *
 * 노출 API:
 *   handleAdminAuthRequest(body) → { status, json }   // body = { action:"login", adminPassword }
 *   verifyAdminToken(token)      → claims | null       // claims.adm === 1 일 때만 통과
 *
 * 환경 변수: ADMIN_SHOOT_SITE_PASSWORD(기본 "6315") · CUSTOMER_SESSION_SECRET 또는 SERVICE_ROLE
 */
const { signSessionToken, verifySessionToken } = require("./customer-session.cjs");

// 관리자 토큰은 광범위한 DB 접근을 부여하므로 고객(60일)보다 짧게.
const ADMIN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30일

function norm(v) {
  return String(v == null ? "" : v).trim();
}

function adminPasswordOk(pw) {
  const expected = norm(process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315");
  const got = norm(pw);
  return Boolean(expected) && got === expected;
}

/** 관리자 토큰 검증: 서명·만료 + adm 클레임 확인. 유효하면 claims, 아니면 null. */
function verifyAdminToken(token) {
  const claims = verifySessionToken(token);
  if (!claims || Number(claims.adm) !== 1) return null;
  return claims;
}

async function handleAdminAuthRequest(body) {
  const action = norm(body && body.action).toLowerCase() || "login";
  if (action !== "login") {
    return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action}` } };
  }
  if (!adminPasswordOk(body && body.adminPassword)) {
    return {
      status: 200,
      json: { ok: false, reason: "admin_auth", message: "관리자 비밀번호가 일치하지 않습니다." },
    };
  }
  let token = "";
  try {
    token = signSessionToken({ adm: 1 }, ADMIN_TTL_SECONDS);
  } catch (e) {
    return { status: 500, json: { ok: false, error: e?.message || "토큰 발급 실패" } };
  }
  return { status: 200, json: { ok: true, token } };
}

module.exports = { handleAdminAuthRequest, verifyAdminToken, ADMIN_TTL_SECONDS };
