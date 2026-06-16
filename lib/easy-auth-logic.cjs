/**
 * 이지숏폼 고객 인증 로직 (서버 전용, service_role).
 *
 * 사장님 B2B 업체 명단(company_directory)과 분리된 별도 테이블 `easy_users` 사용.
 * 평문 비밀번호는 브라우저로 절대 내려가지 않고, 서버(service_role)에서만 검증·저장.
 *  - 저장: scrypt 해시(salt 포함)를 easy_users.password_hash 에 보관.
 *  - 검증: password_hash 해시 비교.
 *  - 반환: password_hash 제거한 행만.
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (필수)
 * 세션 서명: CUSTOMER_SESSION_SECRET → 없으면 SUPABASE_SERVICE_ROLE_KEY (customer-session 재사용)
 *
 * 노출 API: handleEasyAuthRequest(body) → { status, json }
 *   body = { action: "login" | "signup" | "change_password", ... }
 */
const { signSessionToken } = require("./customer-session.cjs");
const { hashPassword, verifyHashed } = require("./customer-auth-logic.cjs");

const TABLE = "easy_users";

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

/** login_id 는 대소문자·공백 무시(이메일/아이디 공통). */
function canonId(v) {
  return norm(v).toLowerCase();
}

function sanitizeRow(row) {
  if (!row || typeof row !== "object") return row;
  const clone = {};
  for (const k of Object.keys(row)) {
    if (k === "password_hash") continue;
    clone[k] = row[k];
  }
  return clone;
}

function tokenForRow(row) {
  try {
    return signSessionToken({
      uid: norm(row && row.id),
      lid: norm(row && row.login_id),
      nm: norm(row && row.name),
    });
  } catch (_) {
    return "";
  }
}

async function fetchByLoginId(loginId) {
  const { url, key } = getServiceConfig();
  const q = encodeURIComponent(canonId(loginId));
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

async function insertRow(payload) {
  const { url, key } = getServiceConfig();
  const res = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: serviceHeaders(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify([payload]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    const err = new Error(`가입 실패 (${res.status}): ${t}`);
    err.supabaseBody = t;
    throw err;
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function touchLastLogin(rowId) {
  try {
    if (!rowId) return;
    const { url, key } = getServiceConfig();
    await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(rowId)}`, {
      method: "PATCH",
      headers: serviceHeaders(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify({ last_login_at: new Date().toISOString() }),
    });
  } catch (_) {
    /* last_login_at 컬럼이 없거나 실패해도 로그인 자체엔 영향 없음 */
  }
}

// ── 핸들러 ────────────────────────────────────────────────────────
async function handleSignup(body) {
  const loginId = canonId(body.loginId || body.email || body.id || body.username);
  const password = norm(body.password);
  const name = norm(body.name || body.company || body.nickname) || loginId;
  const phone = norm(body.phone || body.customer_phone);
  const email = norm(body.email) || (loginId.includes("@") ? loginId : "");

  if (!loginId || !password) {
    return { status: 200, json: { ok: false, reason: "missing", message: "아이디(또는 이메일)와 비밀번호를 입력해주세요." } };
  }
  if (password.length < 6) {
    return { status: 200, json: { ok: false, reason: "weak_password", message: "비밀번호는 6자 이상이어야 합니다." } };
  }

  const existing = await fetchByLoginId(loginId);
  if (existing.length) {
    return { status: 200, json: { ok: false, reason: "duplicate_id", message: "이미 가입된 아이디(이메일)입니다." } };
  }

  const payload = {
    login_id: loginId,
    email: email || null,
    name: name,
    phone: phone || null,
    password_hash: hashPassword(password),
  };

  try {
    const row = await insertRow(payload);
    return { status: 200, json: { ok: true, user: sanitizeRow(row), token: tokenForRow(row) } };
  } catch (err) {
    const msg = String(err && err.message ? err.message : err);
    if (msg.includes("duplicate") || msg.includes("unique") || msg.includes("23505")) {
      return { status: 200, json: { ok: false, reason: "duplicate_id", message: "이미 가입된 아이디(이메일)입니다." } };
    }
    throw err;
  }
}

async function handleLogin(body) {
  const loginId = canonId(body.loginId || body.email || body.id || body.username);
  const password = norm(body.password);
  if (!loginId || !password) {
    return { status: 200, json: { ok: false, reason: "bad_creds", message: "아이디/비밀번호를 입력해주세요." } };
  }
  const rows = await fetchByLoginId(loginId);
  if (!rows.length) {
    return { status: 200, json: { ok: false, reason: "not_found", message: "가입되지 않은 아이디입니다." } };
  }
  const row = rows.find((r) => verifyHashed(password, norm(r.password_hash)));
  if (!row) {
    return { status: 200, json: { ok: false, reason: "wrong_password", message: "비밀번호가 일치하지 않습니다." } };
  }
  await touchLastLogin(row.id);
  return { status: 200, json: { ok: true, user: sanitizeRow(row), token: tokenForRow(row) } };
}

async function handleChangePassword(body) {
  const loginId = canonId(body.loginId || body.email || body.id);
  const oldPassword = norm(body.oldPassword);
  const newPassword = norm(body.newPassword || body.password);
  if (!loginId || !newPassword) {
    return { status: 200, json: { ok: false, reason: "bad_creds", message: "아이디/새 비밀번호가 필요합니다." } };
  }
  if (newPassword.length < 6) {
    return { status: 200, json: { ok: false, reason: "weak_password", message: "비밀번호는 6자 이상이어야 합니다." } };
  }
  const rows = await fetchByLoginId(loginId);
  const target = rows.find((r) => verifyHashed(oldPassword, norm(r.password_hash)));
  if (!target) {
    return { status: 200, json: { ok: false, reason: "wrong_password", message: "현재 비밀번호가 일치하지 않습니다." } };
  }
  const { url, key } = getServiceConfig();
  const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(target.id)}`, {
    method: "PATCH",
    headers: serviceHeaders(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ password_hash: hashPassword(newPassword) }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`비밀번호 변경 실패 (${res.status}): ${t}`);
  }
  return { status: 200, json: { ok: true } };
}

async function handleEasyAuthRequest(body) {
  const action = norm(body && body.action).toLowerCase();
  switch (action) {
    case "login":
      return await handleLogin(body || {});
    case "signup":
      return await handleSignup(body || {});
    case "change_password":
      return await handleChangePassword(body || {});
    default:
      return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action || "(없음)"}` } };
  }
}

module.exports = { handleEasyAuthRequest };
