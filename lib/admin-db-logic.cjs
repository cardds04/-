/**
 * 관리자 DB 프록시 (서버 전용, service_role).
 *
 * 목적: 관리자 페이지(index.js)가 anon 키로 직접 치던 schedules/payments/writers 등
 *       민감 테이블 접근을, 관리자 토큰으로 게이트하는 단일 프록시로 이관한다.
 *       이렇게 하면 B-4 에서 anon read/write 를 잠가도 관리자는 service_role 로
 *       계속 동작한다.
 *
 * 동작: 관리자 토큰(adm 클레임) 검증 → 허용 테이블인지 확인 → 받은 method/path/body 를
 *       service_role 로 PostgREST 에 그대로 포워드. 업스트림 상태코드·본문을 패스스루로
 *       돌려준다(클라가 기존 fetch 응답처럼 처리). 토큰 무효 시 401.
 *
 * 노출 API: handleAdminDbRequest(body) → { status, json }
 *   body = { token, method, path, body, prefer }
 *     - method: GET | POST | PATCH | DELETE
 *     - path  : "schedules?select=...", "payments?id=eq...." 등 (rest/v1/ 이후 경로)
 *     - body  : 쓰기 본문(JSON 문자열)
 *     - prefer: PostgREST Prefer 헤더
 *   응답 json = { ok:true, status:<업스트림코드>, body:"<업스트림본문>" }
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · (토큰검증: CUSTOMER_SESSION_SECRET 등)
 */
const { verifyAdminToken } = require("./admin-auth-logic.cjs");

// 관리자가 정당하게 전 업체를 다루는 테이블만 허용(임의 테이블 프록시 방지).
const ALLOWED_TABLES = new Set([
  "schedules",
  "payments",
  "writers",
  "coupon_passes",
  "dayoff_requests",
  "coupon_usage_history",
]);
const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "DELETE"]);

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

function tableOf(path) {
  // "schedules?select=..." 또는 "schedules/..." 의 앞 토큰을 테이블명으로.
  return norm(path).replace(/^\/+/, "").split(/[/?]/)[0].toLowerCase();
}

async function handleAdminDbRequest(body) {
  const claims = verifyAdminToken(body && body.token);
  if (!claims) return { status: 401, json: { ok: false, reason: "invalid_token" } };

  const path = norm(body && body.path).replace(/^\/+/, "");
  if (!path) return { status: 200, json: { ok: false, reason: "bad_request" } };
  const table = tableOf(path);
  if (!ALLOWED_TABLES.has(table)) {
    return { status: 200, json: { ok: false, reason: "forbidden_table", table } };
  }
  const method = norm(body && body.method).toUpperCase() || "GET";
  if (!ALLOWED_METHODS.has(method)) {
    return { status: 200, json: { ok: false, reason: "bad_method", method } };
  }

  const { url, key } = getServiceConfig();
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
  const prefer = norm(body && body.prefer);
  if (prefer) headers.Prefer = prefer;
  let payload;
  if (method !== "GET" && body && body.body != null && norm(body.body)) {
    headers["Content-Type"] = "application/json";
    payload = String(body.body);
  }

  const upstream = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: payload,
    cache: "no-store",
  });
  const text = await upstream.text().catch(() => "");
  // 업스트림 상태/본문을 패스스루 — 클라 sbAdminFetch 가 Response 로 재구성.
  return { status: 200, json: { ok: true, status: upstream.status, body: text } };
}

module.exports = { handleAdminDbRequest, ALLOWED_TABLES };
