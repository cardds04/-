/**
 * 작가(포토그래퍼) 포털 인증 로직 (서버 전용, service_role).
 *
 * 목적: photographer.html 이 anon 키로 writers 테이블(비밀번호 컬럼까지!)을 통째로
 *       내려받아 클라에서 로그인 대조하던 구조를, 서버에서 비밀번호를 검증하고
 *       세션 토큰을 발급하는 방식으로 바꾼다. 이렇게 해야 B-6 에서 writers/schedules
 *       의 anon 접근을 잠가도 작가 로그인/일정 조회가 토큰 경로로 계속 동작한다.
 *
 * 비밀번호 정책: writers.password 는 평문이다(기존 photographer-shoot-logic.verifyWriter
 *               와 photographer-shoot-* 엔드포인트가 평문 비교에 의존). 따라서 여기서도
 *               평문 비교/저장을 유지한다(해시는 shoot 엔드포인트까지 함께 바꿔야 해 별도 과제).
 *
 * 토큰: customer-session.cjs 의 HMAC 세션 토큰 재사용. 클레임 { wr:1, lid, nm }.
 *
 * 노출 API: handleWriterAuthRequest(body) → { status, json }
 *   body = { action: "login" | "signup", ... }
 *   - login  → { ok:true, token } | { ok:false, reason }
 *   - signup → { ok:true, token } | { ok:false, reason }
 *   verifyWriterToken(token) → 클레임 | null
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · (토큰: CUSTOMER_SESSION_SECRET 등)
 */
const { signSessionToken, verifySessionToken } = require("./customer-session.cjs");

const TABLE = "writers";
const WRITER_TTL_SECONDS = 60 * 60 * 24 * 30; // 30일

function norm(v) {
  return String(v == null ? "" : v).trim();
}

function getServiceConfig() {
  const url = norm(process.env.SUPABASE_URL);
  const key = norm(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function serviceHeaders(key, extra) {
  return Object.assign(
    { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    extra || {}
  );
}

async function fetchRowsByLoginId(loginId) {
  const { url, key } = getServiceConfig();
  const q = encodeURIComponent(loginId);
  const res = await fetch(`${url}/rest/v1/${TABLE}?login_id=eq.${q}&select=*`, {
    headers: serviceHeaders(key),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`조회 실패 (${res.status}): ${t}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function fetchRowsByName(name) {
  const { url, key } = getServiceConfig();
  const q = encodeURIComponent(name);
  const res = await fetch(`${url}/rest/v1/${TABLE}?name=eq.${q}&select=login_id,name`, {
    headers: serviceHeaders(key),
    cache: "no-store",
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function insertRow(payload) {
  const { url, key } = getServiceConfig();
  const res = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: serviceHeaders(key, {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    }),
    body: JSON.stringify([payload]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`작가 등록 실패 (${res.status}): ${t}`);
    err.supabaseStatus = res.status;
    err.supabaseBody = t;
    throw err;
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

function buildWriterToken(row) {
  return signSessionToken(
    { wr: 1, lid: norm(row && row.login_id), nm: norm(row && row.name) },
    WRITER_TTL_SECONDS
  );
}

/** 작가 세션 토큰 검증. 유효하고 wr=1 이면 클레임, 아니면 null. */
function verifyWriterToken(token) {
  const claims = verifySessionToken(token);
  if (!claims) return null;
  if (Number(claims.wr) !== 1) return null;
  return claims;
}

async function handleLogin(body) {
  const loginId = norm(body && (body.loginId || body.id || body.username));
  const password = norm(body && body.password);
  if (!loginId || !password) {
    return { status: 200, json: { ok: false, reason: "bad_creds", message: "아이디/비밀번호를 입력해주세요." } };
  }
  const rows = await fetchRowsByLoginId(loginId);
  const w = rows[0];
  if (!w) {
    return { status: 200, json: { ok: false, reason: "not_found" } };
  }
  // writers.password 는 평문(verifyWriter 와 동일 규칙).
  if (String(w.password != null ? w.password : "") !== password) {
    return { status: 200, json: { ok: false, reason: "wrong_password" } };
  }
  return { status: 200, json: { ok: true, token: buildWriterToken(w) } };
}

async function handleSignup(body) {
  const name = norm(body && body.name);
  const loginId = norm(body && (body.loginId || body.id));
  const password = norm(body && body.password);
  const phone = norm(body && body.phone);
  const carNumber = norm(body && (body.carNumber || body.car_number));
  if (!name || !loginId || !password) {
    return { status: 200, json: { ok: false, reason: "missing", message: "필수 항목을 입력해주세요." } };
  }

  const byId = await fetchRowsByLoginId(loginId);
  if (byId.length) {
    return { status: 200, json: { ok: false, reason: "duplicate_id", message: "이미 사용 중인 아이디입니다." } };
  }
  const byName = await fetchRowsByName(name);
  if (byName.length) {
    return { status: 200, json: { ok: false, reason: "duplicate_name", message: "이미 등록된 작가명입니다." } };
  }

  const payload = {
    name,
    login_id: loginId,
    password, // writers 는 평문 정책 유지
    phone,
    car_number: carNumber,
    is_active: true,
  };
  try {
    const row = await insertRow(payload);
    return { status: 200, json: { ok: true, token: buildWriterToken(row) } };
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
      return { status: 200, json: { ok: false, reason: "duplicate_id", message: "이미 사용 중인 아이디입니다." } };
    }
    throw err;
  }
}

async function handleWriterAuthRequest(body) {
  const action = norm(body && body.action);
  switch (action) {
    case "login":
      return handleLogin(body || {});
    case "signup":
      return handleSignup(body || {});
    default:
      return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action || "(없음)"}` } };
  }
}

module.exports = { handleWriterAuthRequest, verifyWriterToken, WRITER_TTL_SECONDS };
