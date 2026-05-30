/**
 * 고객 포털 쓰기 (서버 전용, service_role).
 *
 * 문제: 고객 페이지가 anon 키로 schedules/payments 를 직접 UPSERT/PATCH 했다.
 *       anon 은 행 소유권을 구분하지 못하므로, 누구나 임의 업체의 일정을 덮어쓰거나
 *       삭제(소프트)할 수 있었다.
 *
 * 해결: 세션 토큰으로 "이 호출자의 업체"를 확정하고, 본인 업체 행에만 쓰기를 허용한다.
 *       - upsert_schedules: 기존 행이 타 업체면 거부, 서버가 더 최신이면 스킵,
 *                           결제 필드는 서버 값 보존(고객이 덮어쓰지 않음), source=customer.
 *       - delete_schedule : 대상 일정이 본인 업체일 때만 source="deleted" 소프트삭제.
 *       - hold_payment    : 해당 일정의 결제행이 본인 업체일 때만 status="보류" 이관.
 *
 * 노출 API: handleCustomerWriteRequest(body) → { status, json }
 *   body = { action, token, ... }
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · CUSTOMER_SESSION_SECRET(권장)
 */
const { verifySessionToken } = require("./customer-session.cjs");

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

function normName(s) {
  return norm(s)
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/** 클라 getCompanyKey 와 동등: 코드 일치 또는 정규화 업체명 일치면 같은 업체. */
function sameCompany(rowName, rowCode, tokenName, tokenCode) {
  const rc = norm(rowCode);
  const tc = norm(tokenCode);
  if (tc && rc && rc.toLowerCase() === tc.toLowerCase()) return true;
  const rn = normName(rowName);
  const tn = normName(tokenName);
  if (tn && rn && rn === tn) return true;
  return false;
}

async function fetchRows(url, key, path) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
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

// ── upsert_schedules ─────────────────────────────────────────────
function buildScheduleRow(r, ex, tokenName, tokenCode) {
  const clientName = norm(r.company_name);
  // 본인 업체로 확인되면 클라가 보낸 업체명을 그대로(관리자 화면과 일관),
  // 아니면 토큰의 표준 업체명으로 강제 → 타 업체명으로는 절대 기록 불가.
  const belongs = sameCompany(clientName, "", tokenName, tokenCode);
  const row = {
    id: norm(r.id),
    company_name: belongs && clientName ? clientName : tokenName,
    writer_name: norm(r.writer_name) || "작가미정",
    date_key: norm(r.date_key),
    time_key: norm(r.time_key) || "09:00",
    place: norm(r.place),
    pyeong: norm(r.pyeong),
    composition: norm(r.composition) || "사진만",
    memo: norm(r.memo),
    joint_code: norm(r.joint_code),
    door_code: norm(r.door_code),
    payment_status: norm(r.payment_status) || "미입금",
    payment_payer: norm(r.payment_payer),
    payment_amount: norm(r.payment_amount),
    payment_date: norm(r.payment_date),
    coupon_used: Boolean(r.coupon_used),
    status: "",
    source: "customer",
  };
  // 결제 필드는 관리자/서버가 관리 → 기존 서버 값이 있으면 보존(고객 덮어쓰기 차단).
  if (ex) {
    row.payment_status = norm(ex.payment_status) || row.payment_status;
    row.payment_payer = norm(ex.payment_payer) || row.payment_payer;
    row.payment_amount = norm(ex.payment_amount) || row.payment_amount;
    row.payment_date = norm(ex.payment_date) || row.payment_date;
    row.coupon_used = ex.coupon_used != null ? Boolean(ex.coupon_used) : row.coupon_used;
  }
  row.status = (ex && norm(ex.status)) || (row.payment_status === "입금완료" ? "paid" : "unpaid");
  return row;
}

async function handleUpsertSchedules(claims, body) {
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const tokenName = norm(claims.cn);
  const tokenCode = norm(claims.cc);
  if (!rows.length) return { status: 200, json: { ok: true, upsertedIds: [], deletedIds: [] } };
  const { url, key } = getServiceConfig();

  const ids = [...new Set(rows.map((r) => norm(r.id)).filter(Boolean))];
  const existingById = new Map();
  if (ids.length) {
    const inList = ids.map(encodeURIComponent).join(",");
    const exRows = await fetchRows(
      url,
      key,
      `schedules?id=in.(${inList})&select=id,source,updated_at,payment_status,payment_payer,payment_amount,payment_date,coupon_used,status,company_name,code`
    );
    exRows.forEach((r) => existingById.set(String(r.id), r));
  }

  const deletedIds = [];
  const finalRows = [];
  for (const r of rows) {
    const id = norm(r.id);
    if (!id) continue;
    const ex = existingById.get(id);
    if (ex) {
      // 기존 행이 타 업체면 거부(남의 일정 하이재킹 차단).
      if (!sameCompany(ex.company_name, ex.code, tokenName, tokenCode)) continue;
      // 관리자가 삭제한 일정은 되살리지 않고, 클라에 로컬 정리를 알림.
      if (norm(ex.source) === "deleted") {
        deletedIds.push(id);
        continue;
      }
      // 서버가 더 최신이면 고객 덮어쓰기 스킵.
      const remoteMs = Date.parse(norm(ex.updated_at));
      const localMs = Date.parse(norm(r.localUpdatedAt));
      if (Number.isFinite(remoteMs) && Number.isFinite(localMs) && remoteMs > localMs) continue;
    }
    finalRows.push(buildScheduleRow(r, ex, tokenName, tokenCode));
  }

  if (finalRows.length) {
    const res = await fetch(`${url}/rest/v1/schedules?on_conflict=id`, {
      method: "POST",
      headers: serviceHeaders(key, {
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify(finalRows),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`일정 저장 실패 (${res.status}): ${t}`);
    }
  }
  return { status: 200, json: { ok: true, upsertedIds: finalRows.map((r) => r.id), deletedIds } };
}

// ── delete_schedule (소프트삭제) ──────────────────────────────────
async function handleDeleteSchedule(claims, body) {
  const id = norm(body.scheduleId);
  if (!id) return { status: 200, json: { ok: false, reason: "bad_request" } };
  const { url, key } = getServiceConfig();
  const exRows = await fetchRows(
    url,
    key,
    `schedules?id=eq.${encodeURIComponent(id)}&select=id,company_name,code,source`
  );
  if (!exRows.length) return { status: 200, json: { ok: true, missing: true } };
  const ex = exRows[0];
  if (!sameCompany(ex.company_name, ex.code, norm(claims.cn), norm(claims.cc))) {
    return { status: 200, json: { ok: false, reason: "forbidden" } };
  }
  const res = await fetch(`${url}/rest/v1/schedules?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: serviceHeaders(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ source: "deleted" }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`소프트삭제 실패 (${res.status}): ${t}`);
  }
  return { status: 200, json: { ok: true } };
}

// ── hold_payment (취소 시 입금완료 → 보류 이관) ───────────────────
async function handleHoldPayment(claims, body) {
  const scheduleId = norm(body.scheduleId);
  if (!scheduleId) return { status: 200, json: { ok: false, reason: "bad_request" } };
  const { url, key } = getServiceConfig();
  const rows = await fetchRows(
    url,
    key,
    `payments?memo=ilike.*${encodeURIComponent(scheduleId)}*&select=id,memo,status,company_name,code`
  );
  let updated = 0;
  for (const row of rows) {
    // 결제행이 타 업체면 스킵(본인 업체 결제만 이관).
    if (!sameCompany(row.company_name, row.code, norm(claims.cn), norm(claims.cc))) continue;
    let memoObj = {};
    try {
      memoObj = row.memo ? JSON.parse(row.memo) : {};
    } catch (_) {
      memoObj = {};
    }
    const currentSource = norm(memoObj.source) || "active";
    if (currentSource === "hold" || currentSource === "refund") continue;
    const identity = norm(memoObj.identity) || `sid:${scheduleId}`;
    const newMemo = JSON.stringify({ ...memoObj, source: "hold", syncKey: `hold::${identity}` });
    const res = await fetch(`${url}/rest/v1/payments?id=eq.${encodeURIComponent(row.id)}`, {
      method: "PATCH",
      headers: serviceHeaders(key, {
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      }),
      body: JSON.stringify({ status: "보류", memo: newMemo }),
    });
    if (res.ok) updated += 1;
  }
  return { status: 200, json: { ok: true, updated } };
}

async function handleCustomerWriteRequest(body) {
  const claims = verifySessionToken(body && body.token);
  if (!claims) return { status: 200, json: { ok: false, reason: "invalid_token" } };
  if (!norm(claims.cn) && !norm(claims.cc)) {
    return { status: 200, json: { ok: false, reason: "no_company" } };
  }
  const action = norm(body && body.action).toLowerCase();
  switch (action) {
    case "upsert_schedules":
      return await handleUpsertSchedules(claims, body || {});
    case "delete_schedule":
      return await handleDeleteSchedule(claims, body || {});
    case "hold_payment":
      return await handleHoldPayment(claims, body || {});
    default:
      return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action || "(없음)"}` } };
  }
}

module.exports = { handleCustomerWriteRequest, sameCompany, buildScheduleRow };
