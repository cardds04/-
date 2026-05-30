/**
 * 고객 세션 토큰 (서버 전용, HMAC-SHA256, 무상태).
 *
 * 목적: 고객 포털에는 사용자별 인증 세션이 없었다(anon 키 공유 + localStorage).
 *       서버가 "이 호출자가 어느 업체인지"를 신뢰할 수 있도록, 로그인/회원가입
 *       성공 시 서버가 서명한 토큰을 발급한다. 토큰에는 업체 식별자(login_id,
 *       업체명, 코드, site_type)만 담고 비밀번호는 담지 않는다.
 *
 * 형식: base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload))
 *       payload = { lid, cn, cc, st, iat, exp, v }
 *
 * 서명 키: CUSTOMER_SESSION_SECRET (권장) → 없으면 SUPABASE_SERVICE_ROLE_KEY.
 *         서버에만 존재하므로 클라이언트는 토큰을 위조할 수 없다.
 *
 * 무상태: DB에 세션을 저장하지 않는다(서명·만료만 검증). 폐기가 필요하면
 *         CUSTOMER_SESSION_SECRET 를 교체하면 전체 토큰이 무효화된다.
 */
const crypto = require("crypto");

const TOKEN_VERSION = "v1";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 60; // 60일 (localStorage 기반 장기 로그인)

function getSecret() {
  const s = String(
    process.env.CUSTOMER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  ).trim();
  if (!s) {
    throw new Error(
      "세션 서명 키가 없습니다 (CUSTOMER_SESSION_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY 필요)."
    );
  }
  return s;
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlDecode(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? "=".repeat(4 - (s.length % 4)) : "";
  return Buffer.from(s + pad, "base64");
}

function sign(data, secret) {
  return b64url(crypto.createHmac("sha256", secret).update(data).digest());
}

/** 업체 식별 claims 로 서명 토큰 생성. 실패 시 throw. */
function signSessionToken(claims, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.assign({}, claims, {
    iat: now,
    exp: now + Number(ttlSeconds || DEFAULT_TTL_SECONDS),
    v: TOKEN_VERSION,
  });
  const body = b64url(JSON.stringify(payload));
  const secret = getSecret();
  return `${body}.${sign(body, secret)}`;
}

/** 토큰 검증. 유효하면 payload 객체, 아니면 null. (절대 throw 하지 않음) */
function verifySessionToken(token) {
  try {
    const t = String(token || "").trim();
    if (!t || t.indexOf(".") < 0) return null;
    const dot = t.indexOf(".");
    const body = t.slice(0, dot);
    const sig = t.slice(dot + 1);
    if (!body || !sig) return null;
    const expected = sign(body, getSecret());
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (!payload || typeof payload !== "object") return null;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > Number(payload.exp)) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

module.exports = { signSessionToken, verifySessionToken, DEFAULT_TTL_SECONDS };
