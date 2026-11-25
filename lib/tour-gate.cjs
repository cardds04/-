/**
 * 3D 둘러보기 업체 페이지 잠금 (서버 전용).
 *
 * 규칙(사장님 2026-11-25):
 *  - 현장 페이지 /tour/<업체>/<현장>/ = 링크만으로 열림(잠금 없음)
 *  - 업체 페이지 /tour/<업체>/        = 그 업체의 촬영스케줄 아이디·비번이 있어야 열림
 *  - 전체 목록  /tour/                = 관리자만
 *  - 촬영스케줄 사이트에 이미 로그인한 업체·관리자는 비번 없이 바로 들어감
 *
 * 쿠키 t3d = base64url(JSON{vs:[업체슬러그], adm, exp}) + "." + HMAC-SHA256
 * 서명 키 = (CUSTOMER_SESSION_SECRET || SUPABASE_SERVICE_ROLE_KEY) + "|tour3d"
 *   → 고객/관리자 세션 토큰과 키가 달라 서로 바꿔 쓸 수 없다.
 *   검증은 루트 middleware.js(Edge)가 같은 방식으로 한다.
 */
const crypto = require("crypto");

const COOKIE = "t3d";
const TTL = 60 * 60 * 24 * 30; // 30일

function norm(v) {
  return String(v == null ? "" : v).trim();
}
function nameKey(s) {
  return norm(s).normalize("NFC").replace(/[\s()\[\]·.\-_]/g, "").toLowerCase();
}
function secret() {
  const s = norm(process.env.CUSTOMER_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!s) throw new Error("서명 키가 없습니다.");
  return s + "|tour3d";
}
function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  const s = String(str).replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(s + "=".repeat((4 - (s.length % 4)) % 4), "base64");
}
function sign(body) {
  return b64url(crypto.createHmac("sha256", secret()).update(body).digest());
}
function makeToken(claims) {
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ vs: claims.vs || [], adm: claims.adm ? 1 : 0, iat: now, exp: now + TTL }));
  return `${body}.${sign(body)}`;
}
function readToken(t) {
  try {
    const [body, sig] = String(t || "").split(".");
    if (!body || !sig) return null;
    const a = Buffer.from(sig), b = Buffer.from(sign(body));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const p = JSON.parse(b64urlDecode(body).toString("utf8"));
    if (!p || (p.exp && Math.floor(Date.now() / 1000) > p.exp)) return null;
    return p;
  } catch (_) {
    return null;
  }
}
function cookieFromReq(req) {
  const raw = String((req.headers && req.headers.cookie) || "");
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === COOKIE) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return "";
}
function setCookieHeader(token) {
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/tour; Max-Age=${TTL}; HttpOnly; Secure; SameSite=Lax`;
}

function svc() {
  const url = norm(process.env.SUPABASE_URL).replace(/\/+$/, "");
  const key = norm(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE 환경변수가 필요합니다.");
  return { url, key, h: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" } };
}

/** 업체명(company_directory.name) → 그 업체의 3D 업체 슬러그 목록 (tour3d_* 작업 행의 site_url 기준). */
async function vendorsForCompany(companyName) {
  const want = nameKey(companyName);
  if (!want) return [];
  const { url, h } = svc();
  const res = await fetch(`${url}/rest/v1/app_state?select=payload&id=like.tour3d_*`, { headers: h, cache: "no-store" });
  if (!res.ok) throw new Error(`조회 실패 (${res.status})`);
  const rows = await res.json();
  const out = new Set();
  const bySched = {}; // 3D 작업의 업체명이 계정 이름과 다르게 적힌 경우(예: 랩/램) 스케줄 업체명으로 한 번 더 맞춘다
  for (const r of rows || []) {
    const p = (r && r.payload) || {};
    const m = /\/tour\/([^/?#]+)\//.exec(String(p.site_url || ""));
    if (!m) continue;
    if (nameKey(p.company) === want) out.add(m[1]);
    else if (p.schedule_id) bySched[p.schedule_id] = m[1];
  }
  const ids = Object.keys(bySched).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (ids.length) {
    const r2 = await fetch(`${url}/rest/v1/schedules?select=id,company_name&id=in.(${ids.join(",")})`, {
      headers: h,
      cache: "no-store",
    });
    if (r2.ok) {
      for (const s of (await r2.json()) || []) {
        if (nameKey(s.company_name) === want && bySched[s.id]) out.add(bySched[s.id]);
      }
    }
  }
  return [...out];
}

async function fetchCompanyByLogin(loginId) {
  const { url, h } = svc();
  const res = await fetch(`${url}/rest/v1/company_directory?login_id=eq.${encodeURIComponent(loginId)}&select=*`, {
    headers: h,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`조회 실패 (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

module.exports = {
  COOKIE,
  makeToken,
  readToken,
  cookieFromReq,
  setCookieHeader,
  vendorsForCompany,
  fetchCompanyByLogin,
  norm,
};
