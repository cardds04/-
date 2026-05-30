/**
 * 고객 포털 인증 로직 (서버 전용, service_role).
 *
 * 목적: 평문 비밀번호가 브라우저(anon 키)로 절대 내려가지 않도록,
 *       로그인/회원가입의 "비밀번호 검증·저장"을 서버에서만 수행한다.
 *
 *  - 저장: scrypt 해시(salt 포함)를 company_directory.password_hash 에 보관.
 *          평문 password 컬럼에는 빈 문자열만 남긴다(레거시 컬럼 점진 폐기).
 *  - 검증: password_hash 가 있으면 해시 비교, 없으면(레거시 평문) 평문 비교 후
 *          성공 시 즉시 해시로 업그레이드(lazy migration). 평문은 클라에 반환하지 않음.
 *  - 반환: password·password_hash 를 제거한 행(sanitized)만 반환.
 *
 * 환경 변수:
 *  - SUPABASE_URL                (필수)
 *  - SUPABASE_SERVICE_ROLE_KEY   (필수)
 *
 * 하위호환: password_hash 컬럼이 아직 없어도(마이그레이션 전) 로그인은
 *           레거시 평문 경로로 동작한다(업그레이드 UPDATE 만 조용히 실패).
 *
 * 노출 API: handleCustomerAuthRequest(body) → { status, json }
 *   body = { action: "login" | "signup", ... }
 */
const crypto = require("crypto");
const { signSessionToken } = require("./customer-session.cjs");

const TABLE = "company_directory";
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384; // 메모리 ≈ 128*N*r ≈ 16MB (기본 maxmem 32MB 이내)
const SCRYPT_R = 8;
const SCRYPT_P = 1;

function norm(v) {
  return String(v == null ? "" : v).trim();
}

/** 관리자 전용 액션(set_password) 게이트.
 *  기존 admin-* 엔드포인트와 동일한 비밀번호(ADMIN_SHOOT_SITE_PASSWORD, 기본 "6315")로 검증.
 *  세션 토큰이 없는 구조라 이 비밀번호 지식이 곧 관리자 권한 증명이다. */
function adminPasswordOk(pw) {
  const expected = norm(process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315");
  return expected !== "" && norm(pw) === expected;
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
    {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    extra || {}
  );
}

// ── 비밀번호 해시 (scrypt) ────────────────────────────────────────
function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(plain), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

function isHashedFormat(stored) {
  return typeof stored === "string" && stored.startsWith("scrypt$");
}

function verifyHashed(plain, stored) {
  try {
    const parts = String(stored).split("$");
    if (parts.length !== 4 || parts[0] !== "scrypt") return false;
    const N = Number(parts[1]) || SCRYPT_N;
    const salt = Buffer.from(parts[2], "hex");
    const expected = Buffer.from(parts[3], "hex");
    if (!salt.length || !expected.length) return false;
    const derived = crypto.scryptSync(String(plain), salt, expected.length, {
      N,
      r: SCRYPT_R,
      p: SCRYPT_P,
    });
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  } catch (_) {
    return false;
  }
}

/** password_hash(우선) 또는 레거시 평문 password 로 검증. */
function verifyRowPassword(plainPw, row) {
  const hash = norm(row && row.password_hash);
  if (hash) {
    return { ok: verifyHashed(plainPw, hash), legacy: false };
  }
  const legacy = String((row && row.password) != null ? row.password : "");
  // 레거시 평문은 trim 없이 정확 비교(기존 클라 동작과 동일하게 normalize 후 비교)
  return { ok: norm(legacy) === norm(plainPw) && norm(plainPw) !== "", legacy: true };
}

/** 로그인/회원가입 성공 행으로 세션 토큰 발급.
 *  서명 키(CUSTOMER_SESSION_SECRET/SERVICE_ROLE)가 없으면 빈 문자열을 돌려
 *  로그인 자체는 막지 않는다(클라는 토큰 없으면 레거시 anon 읽기로 폴백). */
function buildSessionTokenForRow(row) {
  try {
    return signSessionToken({
      lid: norm(row && row.login_id),
      cn: norm(row && row.name),
      cc: norm(row && row.code),
      st: norm(row && row.site_type),
    });
  } catch (_) {
    return "";
  }
}

/** password·password_hash 제거한 안전한 행만 반환. */
function sanitizeRow(row) {
  if (!row || typeof row !== "object") return row;
  const clone = {};
  for (const k of Object.keys(row)) {
    if (k === "password" || k === "password_hash") continue;
    clone[k] = row[k];
  }
  return clone;
}

// ── Supabase REST ────────────────────────────────────────────────
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

/** 레거시 평문 로그인 성공 시 해시로 업그레이드. 실패해도 무시(컬럼 없을 수 있음). */
async function upgradeRowToHash(rowId, plainPw) {
  try {
    if (!rowId) return;
    const { url, key } = getServiceConfig();
    await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      headers: serviceHeaders(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ password_hash: hashPassword(plainPw), password: "" }),
    });
  } catch (_) {
    /* 마이그레이션 전이면 password_hash 컬럼이 없어 실패할 수 있음 — 무시 */
  }
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
    const err = new Error(`가입 실패 (${res.status}): ${t}`);
    err.supabaseStatus = res.status;
    err.supabaseBody = t;
    throw err;
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

// ── 핸들러 ────────────────────────────────────────────────────────
async function handleLogin(body) {
  const loginId = norm(body.loginId || body.id || body.username);
  const password = norm(body.password);
  if (!loginId || !password) {
    return { status: 200, json: { ok: false, reason: "bad_creds", message: "아이디/비밀번호를 입력해주세요." } };
  }
  const rows = await fetchRowsByLoginId(loginId);
  if (!rows.length) {
    return { status: 200, json: { ok: false, reason: "not_found" } };
  }
  let matched = null;
  let matchedLegacy = false;
  for (const row of rows) {
    const v = verifyRowPassword(password, row);
    if (v.ok) {
      matched = row;
      matchedLegacy = v.legacy;
      break;
    }
  }
  if (!matched) {
    return { status: 200, json: { ok: false, reason: "wrong_password" } };
  }
  // 레거시 평문이었다면 해시로 업그레이드(백그라운드, 실패 무시)
  if (matchedLegacy) {
    await upgradeRowToHash(matched.id, password);
  }
  return {
    status: 200,
    json: { ok: true, user: sanitizeRow(matched), token: buildSessionTokenForRow(matched) },
  };
}

async function handleSignup(body) {
  const company = norm(body.company || body.company_name);
  const loginId = norm(body.loginId || body.username);
  const password = norm(body.password);
  const phone = norm(body.phone || body.customer_phone);
  const contactName = norm(body.contactName || body.contact_name);
  const siteType = norm(body.siteType || body.site_type) || "thefeeling";

  if (!company || !loginId || !password) {
    return { status: 200, json: { ok: false, reason: "missing", message: "필수 항목을 입력해주세요." } };
  }
  if (password.length < 6) {
    return { status: 200, json: { ok: false, reason: "weak_password", message: "비밀번호는 6자 이상이어야 합니다." } };
  }

  // 중복 아이디 확인
  const existing = await fetchRowsByLoginId(loginId);
  if (existing.length) {
    return { status: 200, json: { ok: false, reason: "duplicate_id", message: "이미 사용 중인 아이디입니다." } };
  }

  // 주의: company_directory 에는 contact_name 컬럼이 없다(스키마 확인됨).
  // 존재하지 않는 컬럼을 넣으면 PostgREST 가 insert 를 통째로 거부(400)해
  // "가입 실패: 알 수 없는 오류"가 난다. 실제 스키마 컬럼만 보낸다.
  const payload = {
    name: company,
    login_id: loginId,
    password: "", // 평문 미저장
    password_hash: hashPassword(password),
    customer_phone: phone,
    site_type: siteType,
    code: `AUTO-${Date.now().toString(36).toUpperCase()}`,
  };
  void contactName; // 스키마에 없어 저장하지 않음(향후 컬럼 추가 시 사용)

  try {
    const row = await insertRow(payload);
    return {
      status: 200,
      json: { ok: true, user: sanitizeRow(row), token: buildSessionTokenForRow(row) },
    };
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
      return { status: 200, json: { ok: false, reason: "duplicate_id", message: "이미 사용 중인 아이디입니다." } };
    }
    throw err;
  }
}

/** 본인 비밀번호 변경: 현재 비밀번호(oldPassword)를 검증해야만 새 비밀번호로 교체.
 *  세션 토큰이 없는 구조라, "현재 비밀번호를 안다"는 사실로 본인을 증명한다(계정 탈취 방지).
 *  현재 비밀번호는 클라가 기기 비밀(device secret)에 보관 중인 값을 보낸다. */
async function handleChangePassword(body) {
  const loginId = norm(body.loginId || body.id || body.username);
  const oldPassword = String(body.oldPassword != null ? body.oldPassword : "");
  const newPassword = norm(body.newPassword || body.password);
  if (!loginId || !newPassword) {
    return { status: 200, json: { ok: false, reason: "bad_creds", message: "아이디/새 비밀번호가 필요합니다." } };
  }
  if (newPassword.length < 6) {
    return { status: 200, json: { ok: false, reason: "weak_password", message: "비밀번호는 6자 이상이어야 합니다." } };
  }
  const rows = await fetchRowsByLoginId(loginId);
  if (!rows.length) {
    return { status: 200, json: { ok: false, reason: "not_found" } };
  }
  // 현재 비밀번호 검증(해시 또는 레거시 평문)
  let target = null;
  for (const row of rows) {
    if (verifyRowPassword(oldPassword, row).ok) {
      target = row;
      break;
    }
  }
  if (!target) {
    return { status: 200, json: { ok: false, reason: "wrong_password", message: "현재 비밀번호가 일치하지 않습니다." } };
  }
  const { url, key } = getServiceConfig();
  const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(target.id)}`, {
    method: "PATCH",
    headers: serviceHeaders(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ password_hash: hashPassword(newPassword), password: "" }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`비밀번호 변경 실패 (${res.status}): ${t}`);
  }
  return { status: 200, json: { ok: true } };
}

/** 관리자가 임의의 고객 비밀번호를 재설정(set). 현재 비밀번호 없이 가능하므로
 *  반드시 adminPassword(ADMIN_SHOOT_SITE_PASSWORD)로 게이트한다 — 게이트가 없으면
 *  공개 엔드포인트라 누구나 계정 탈취가 가능해진다.
 *  평문은 저장하지 않고 password_hash 만 기록(password 컬럼은 "" 로 비움). */
async function handleSetPassword(body) {
  if (!adminPasswordOk(body && body.adminPassword)) {
    return { status: 200, json: { ok: false, reason: "admin_auth", message: "관리자 비밀번호가 일치하지 않습니다." } };
  }
  const loginId = norm(body.loginId || body.id || body.username);
  const newPassword = norm(body.newPassword || body.password);
  if (!loginId || !newPassword) {
    return { status: 200, json: { ok: false, reason: "bad_creds", message: "아이디/새 비밀번호가 필요합니다." } };
  }
  const rows = await fetchRowsByLoginId(loginId);
  if (!rows.length) {
    return { status: 200, json: { ok: false, reason: "not_found" } };
  }
  const { url, key } = getServiceConfig();
  const hash = hashPassword(newPassword);
  for (const row of rows) {
    if (!row || !row.id) continue;
    const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: serviceHeaders(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ password_hash: hash, password: "" }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`비밀번호 설정 실패 (${res.status}): ${t}`);
    }
  }
  return { status: 200, json: { ok: true } };
}

async function handleCustomerAuthRequest(body) {
  const action = norm(body && body.action).toLowerCase();
  switch (action) {
    case "login":
      return await handleLogin(body || {});
    case "signup":
      return await handleSignup(body || {});
    case "change_password":
      return await handleChangePassword(body || {});
    case "set_password":
      return await handleSetPassword(body || {});
    default:
      return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action || "(없음)"}` } };
  }
}

module.exports = {
  handleCustomerAuthRequest,
  // 테스트·백필 재사용
  hashPassword,
  verifyHashed,
  isHashedFormat,
  verifyRowPassword,
  sanitizeRow,
};
