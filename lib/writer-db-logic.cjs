/**
 * 작가 DB 프록시 (서버 전용, service_role, 읽기 전용).
 *
 * 목적: photographer.html 이 anon 키로 직접 읽던 writers/schedules/dayoff_requests/
 *       company_directory 를, 작가 토큰으로 게이트하는 단일 GET 프록시로 이관한다.
 *       B-6 에서 anon read 를 잠가도 작가는 service_role 로 계속 조회할 수 있다.
 *
 * 보안: GET 만 허용(작가는 이 경로로 쓰기 불가 — 최소 권한). 허용 테이블만 포워드.
 *       토큰(wr 클레임) 검증 실패 시 401.
 *
 * 노출 API: handleWriterDbRequest(body) → { status, json }
 *   body = { token, method:"GET", path }
 *   응답 json = { ok:true, status:<업스트림코드>, body:"<업스트림본문>" }  (admin-db 와 동일 형식)
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 */
const { verifyWriterToken } = require("./writer-auth-logic.cjs");

// 작가 페이지가 정당하게 읽는 테이블만 허용.
const ALLOWED_TABLES = new Set([
  "writers",
  "schedules",
  "dayoff_requests",
  "company_directory",
]);

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
  return norm(path).replace(/^\/+/, "").split(/[/?]/)[0].toLowerCase();
}

async function handleWriterDbRequest(body) {
  const claims = verifyWriterToken(body && body.token);
  if (!claims) return { status: 401, json: { ok: false, reason: "invalid_token" } };

  const method = (norm(body && body.method) || "GET").toUpperCase();
  if (method !== "GET") {
    return { status: 200, json: { ok: false, reason: "bad_method", method } };
  }

  const path = norm(body && body.path).replace(/^\/+/, "");
  if (!path || path.includes("/rest/v1/")) {
    return { status: 200, json: { ok: false, reason: "bad_request" } };
  }
  const table = tableOf(path);
  if (!ALLOWED_TABLES.has(table)) {
    return { status: 200, json: { ok: false, reason: "forbidden_table", table } };
  }

  const { url, key } = getServiceConfig();
  const upstream = await fetch(`${url}/rest/v1/${path}`, {
    method: "GET",
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await upstream.text().catch(() => "");
  return { status: 200, json: { ok: true, status: upstream.status, body: text } };
}

module.exports = { handleWriterDbRequest, ALLOWED_TABLES };
