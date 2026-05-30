/**
 * 작가 DB 프록시 (서버 전용, service_role, 읽기 전용).
 *
 * 목적: photographer.html 이 anon 키로 직접 읽던 writers/schedules/dayoff_requests/
 *       company_directory 를, 작가 토큰으로 게이트하는 단일 GET 프록시로 이관한다.
 *       B-6 에서 anon read 를 잠가도 작가는 service_role 로 계속 조회할 수 있다.
 *
 * 보안: 읽기는 ALLOWED_TABLES 만 GET 포워드. 쓰기는 최소 권한으로 WRITE_TABLES
 *       (=dayoff_requests, 휴무요청 생성/취소)에 한해 POST/DELETE 만 허용한다.
 *       토큰(wr 클레임) 검증 실패 시 401.
 *
 * 노출 API: handleWriterDbRequest(body) → { status, json }
 *   body = { token, method:"GET", path }
 *   응답 json = { ok:true, status:<업스트림코드>, body:"<업스트림본문>" }  (admin-db 와 동일 형식)
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 */
const { verifyWriterToken } = require("./writer-auth-logic.cjs");

// 작가 페이지가 정당하게 읽는 테이블만 허용(GET).
const ALLOWED_TABLES = new Set([
  "writers",
  "schedules",
  "dayoff_requests",
  "company_directory",
]);

// 작가가 쓰기(생성/취소)할 수 있는 테이블 — 휴무요청만. 그 외 테이블은 읽기 전용.
const WRITE_TABLES = new Set(["dayoff_requests"]);
const WRITE_METHODS = new Set(["POST", "DELETE"]);

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

  const path = norm(body && body.path).replace(/^\/+/, "");
  if (!path || path.includes("/rest/v1/")) {
    return { status: 200, json: { ok: false, reason: "bad_request" } };
  }
  const table = tableOf(path);

  // 쓰기(POST/DELETE)는 WRITE_TABLES(=dayoff_requests)만 허용. 그 외 쓰기는 거부.
  if (method !== "GET") {
    if (!WRITE_METHODS.has(method)) {
      return { status: 200, json: { ok: false, reason: "bad_method", method } };
    }
    if (!WRITE_TABLES.has(table)) {
      return { status: 200, json: { ok: false, reason: "forbidden_table", table } };
    }
  } else if (!ALLOWED_TABLES.has(table)) {
    return { status: 200, json: { ok: false, reason: "forbidden_table", table } };
  }

  // FU-2: writers 비밀번호 보호 — 프록시로도 password 컬럼은 절대 반환하지 않는다.
  //   (로그인한 작가가 writers?select=password 로 다른 작가 평문 비번을 읽는 경로 차단)
  if (method === "GET" && table === "writers") {
    const lower = path.toLowerCase();
    if (!/[?&]select=/.test(lower)) {
      // select 미지정 = 기본 * = 비번 포함 → 거부.
      return { status: 200, json: { ok: false, reason: "select_required" } };
    }
    if (/[?&]select=[^&]*(\*|password)/.test(lower)) {
      return { status: 200, json: { ok: false, reason: "forbidden_column", column: "password" } };
    }
  }

  const { url, key } = getServiceConfig();
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" };
  const init = { method, headers, cache: "no-store" };
  if (method !== "GET") {
    const prefer = norm(body && body.prefer);
    if (prefer) headers.Prefer = prefer;
    if (body && body.body != null && norm(body.body)) {
      headers["Content-Type"] = "application/json";
      init.body = String(body.body);
    }
  }
  const upstream = await fetch(`${url}/rest/v1/${path}`, init);
  const text = await upstream.text().catch(() => "");
  return { status: 200, json: { ok: true, status: upstream.status, body: text } };
}

module.exports = { handleWriterDbRequest, ALLOWED_TABLES, WRITE_TABLES };
