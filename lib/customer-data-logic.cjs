/**
 * 고객 포털 데이터 조회 (서버 전용, service_role).
 *
 * 문제: 기존 고객 페이지(customer.html · public-order.html)는 anon 키로
 *       schedules 전체를 필터 없이 내려받았다 → 모든 업체의 현관비밀번호·결제금액·
 *       메모·작가 연락처가 모든 고객 브라우저로 유출.
 *
 * 해결: 로그인 시 발급된 세션 토큰을 검증해 "이 호출자의 업체"를 서버가 확정하고,
 *       그 업체의 일정만 전체 필드로 돌려준다.
 *
 * 단, 예약 달력의 "하루 마감" 판정은 모든 업체의 (날짜·시간·업체·장소) 건수를
 * 합산해야 동작한다(스튜디오 일일 촬영 capacity 공유). 그래서 타 업체 정보는
 * 민감 필드를 모두 제거하고 익명 점유(occupancy) 신호만 내려준다:
 *   occupancy = [{ d: 날짜, k: "시간|해시" }]  (업체명·주소·비번·금액 전부 비노출)
 * 해시는 (업체키|장소키)를 SHA-256 한 16자리로, 같은 예약은 같은 키 → 중복 제거되어
 * 클라이언트가 distinct 개수만 세면 마감 판정이 그대로 유지된다.
 *
 * 노출 API: handleCustomerDataRequest(body) → { status, json }
 *   body = { token }
 */
const crypto = require("crypto");
const { verifySessionToken } = require("./customer-session.cjs");

const TABLE = "schedules";

// customer.html / public-order.html 의 기존 schedules SELECT 와 동일한 필드.
const OWN_SELECT =
  "id,company_name,code,writer_name,date_key,time_key,place,pyeong,composition,memo,joint_code,door_code,payment_status,payment_payer,payment_amount,payment_date,coupon_used,source,status,updated_at,created_at";

// 점유 계산에 필요한 최소 필드만.
const OCC_SELECT = "date_key,time_key,company_name,code,place,source";

// customer.html / public-order.html 의 기존 payments SELECT 와 동일한 필드.
const PAYMENTS_SELECT = "id,company_name,code,payer_name,amount,paid_at,status,memo,updated_at";

const HIDDEN_SOURCES = new Set(["hold", "refund", "deleted"]);

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

function serviceHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
}

// 클라이언트 getCompanyKey 와 동등한 규칙(코드 우선, 없으면 업체명 정규화).
function companyKey(name, code) {
  const c = norm(code);
  if (c) return `code:${c.toLowerCase()}`;
  return `name:${norm(name)
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()}`;
}

function placeKey(place) {
  return norm(place).replace(/\s+/g, "").toLowerCase() || "noplace";
}

// (업체키|장소키)를 비가역 해시 → 타 업체명·주소 비노출, 그러나 distinct 유지.
function occHash(name, code, place) {
  const raw = `${companyKey(name, code)}|${placeKey(place)}`;
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

async function fetchTableRows(url, key, table, query) {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
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

// schedules 전용 단축 래퍼(기존 호출부 호환).
function fetchRows(url, key, query) {
  return fetchTableRows(url, key, TABLE, query);
}

/** 내 업체 결제 — 전체 필드. company_name·code 양쪽으로 조회 후 id 머지. */
async function fetchOwnPayments(url, key, companyName, companyCode) {
  const tasks = [];
  if (companyName) {
    tasks.push(
      fetchTableRows(
        url,
        key,
        "payments",
        `select=${PAYMENTS_SELECT}&company_name=eq.${encodeURIComponent(
          companyName
        )}&order=updated_at.desc&limit=4000`
      )
    );
  }
  if (companyCode) {
    tasks.push(
      fetchTableRows(
        url,
        key,
        "payments",
        `select=${PAYMENTS_SELECT}&code=eq.${encodeURIComponent(
          companyCode
        )}&order=updated_at.desc&limit=4000`
      )
    );
  }
  if (!tasks.length) return [];
  const lists = await Promise.all(tasks);
  const byId = new Map();
  for (const row of lists.flat()) {
    if (!row || row.id == null) continue;
    byId.set(String(row.id), row);
  }
  return [...byId.values()];
}

/** 내 업체 일정 — 전체 필드, 모든 source(soft-delete 포함: 클라가 로컬 정리에 사용). */
async function fetchOwnSchedules(url, key, companyName, companyCode) {
  const tasks = [];
  if (companyName) {
    tasks.push(
      fetchRows(
        url,
        key,
        `select=${OWN_SELECT}&company_name=eq.${encodeURIComponent(
          companyName
        )}&order=updated_at.desc&limit=4000`
      )
    );
  }
  if (companyCode) {
    tasks.push(
      fetchRows(
        url,
        key,
        `select=${OWN_SELECT}&code=eq.${encodeURIComponent(
          companyCode
        )}&order=updated_at.desc&limit=4000`
      )
    );
  }
  if (!tasks.length) return [];
  const lists = await Promise.all(tasks);
  const byId = new Map();
  for (const row of lists.flat()) {
    if (!row || row.id == null) continue;
    byId.set(String(row.id), row);
  }
  return [...byId.values()];
}

/** 전 업체 점유 신호 — 익명화·중복제거. active 만(hold/refund/deleted 제외). */
async function fetchOccupancy(url, key) {
  const raw = await fetchRows(
    url,
    key,
    `select=${OCC_SELECT}&order=date_key.desc&limit=50000`
  );
  const seen = new Set();
  const occupancy = [];
  for (const r of raw) {
    if (HIDDEN_SOURCES.has(norm(r.source).toLowerCase())) continue;
    const d = norm(r.date_key);
    if (!d) continue;
    const t = norm(r.time_key) || "09:00";
    const k = `${t}|${occHash(r.company_name, r.code, r.place)}`;
    const dedupe = `${d}${k}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    occupancy.push({ d, k });
  }
  return occupancy;
}

async function handleCustomerDataRequest(body) {
  const claims = verifySessionToken(body && body.token);
  if (!claims) {
    return { status: 200, json: { ok: false, reason: "invalid_token" } };
  }
  const companyName = norm(claims.cn);
  const companyCode = norm(claims.cc);
  if (!companyName && !companyCode) {
    return { status: 200, json: { ok: false, reason: "no_company" } };
  }
  const { url, key } = getServiceConfig();
  const [schedules, payments, occupancy] = await Promise.all([
    fetchOwnSchedules(url, key, companyName, companyCode),
    fetchOwnPayments(url, key, companyName, companyCode),
    fetchOccupancy(url, key),
  ]);
  return { status: 200, json: { ok: true, schedules, payments, occupancy } };
}

module.exports = {
  handleCustomerDataRequest,
  // 공개 점유 엔드포인트(api/public-occupancy)에서 재사용
  getServiceConfig,
  fetchOccupancy,
  // 테스트 재사용
  occHash,
  companyKey,
  placeKey,
};
