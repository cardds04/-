/**
 * 이지숏폼 — 서버 렌더(Phase 2) 작업 큐 로직 (서버 전용, service_role).
 *
 * 앱(고객):
 *   - action:"create" (세션토큰, spec, name) → 렌더 작업 등록 → { id }
 *   - action:"status" (id)                    → { status, progress, result_url, error }
 *
 * Railway 워커(RENDER_WORKER_SECRET):
 *   - action:"claim"      (secret)                → 큐에서 가장 오래된 1개를 rendering 으로 집기 → { job } | { none:true }
 *   - action:"signresult" (secret, id, ext)       → 결과 MP4 업로드용 서명 URL(easy-music/out/)
 *   - action:"progress"   (secret, id, progress)  → 진행률 갱신
 *   - action:"complete"   (secret, id, result_url, dur) → done + 관리자 보관함(easy_customer_videos)에도 기록
 *   - action:"fail"       (secret, id, error)     → error 표시
 *
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RENDER_WORKER_SECRET
 */
const { verifySessionToken } = require("./customer-session.cjs");

const TABLE = "easy_render_jobs";
const VIDTABLE = "easy_customer_videos";
const BUCKET = "easy-music";

function norm(v) { return String(v == null ? "" : v).trim(); }
function getCfg() {
  const url = norm(process.env.SUPABASE_URL);
  const key = norm(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  return { url: url.replace(/\/+$/, ""), key };
}
function sh(key, extra) {
  return Object.assign({ apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" }, extra || {});
}
function userFromToken(token) { const p = verifySessionToken(token); return p && p.lid ? p : null; }
function workerOk(s) { const exp = norm(process.env.RENDER_WORKER_SECRET); return exp !== "" && norm(s) === exp; }
function nowISO() { return new Date().toISOString(); }
function publicUrl(url, path) { return `${url}/storage/v1/object/public/${BUCKET}/${path}`; }

// ── 앱(고객) ──────────────────────────────────────────────────────────
async function create(body) {
  const u = userFromToken(body.token);
  if (!u) return { status: 200, json: { ok: false, reason: "auth", message: "로그인이 필요해요." } };
  const spec = body.spec;
  if (!spec || typeof spec !== "object") return { status: 400, json: { ok: false, error: "spec(렌더 설계도)이 필요합니다." } };
  const { url, key } = getCfg();
  const row = {
    login_id: norm(u.lid),
    user_name: norm(u.nm) || norm(u.lid),
    name: norm(body.name).slice(0, 120) || "내 영상",
    status: "queued",
    spec,
    progress: 0,
  };
  const r = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: sh(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify([row]),
  });
  if (!r.ok) throw new Error(`작업 등록 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  const rows = await r.json().catch(() => []);
  return { status: 200, json: { ok: true, id: rows && rows[0] && rows[0].id } };
}

async function status(body) {
  const id = norm(body.id);
  if (!id) return { status: 400, json: { ok: false, error: "id 가 필요합니다." } };
  const { url, key } = getCfg();
  const r = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=id,status,progress,result_url,error,name&limit=1`, { headers: sh(key), cache: "no-store" });
  if (!r.ok) throw new Error(`상태 조회 실패 ${r.status}`);
  const j = (await r.json().catch(() => []))[0];
  if (!j) return { status: 200, json: { ok: false, reason: "notfound" } };
  return { status: 200, json: { ok: true, status: j.status, progress: j.progress || 0, result_url: j.result_url || null, error: j.error || null, name: j.name || "" } };
}

// ── Railway 워커 ──────────────────────────────────────────────────────
async function claim(body) {
  if (!workerOk(body.secret)) return { status: 401, json: { ok: false, error: "워커 인증 실패" } };
  const { url, key } = getCfg();
  // 가장 오래된 queued 1개 후보
  const gr = await fetch(`${url}/rest/v1/${TABLE}?status=eq.queued&order=created_at.asc&limit=1&select=id`, { headers: sh(key), cache: "no-store" });
  const cand = (await gr.json().catch(() => []))[0];
  if (!cand) return { status: 200, json: { ok: true, none: true } };
  // 원자적 claim: 여전히 queued 일 때만 rendering 으로(필터로 경합 방지) — representation 으로 spec 까지 반환
  const pr = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${cand.id}&status=eq.queued`, {
    method: "PATCH",
    headers: sh(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ status: "rendering", claimed_at: nowISO(), updated_at: nowISO() }),
  });
  const job = (await pr.json().catch(() => []))[0];
  if (!job) return { status: 200, json: { ok: true, none: true } };   // 다른 워커가 먼저 집음
  return { status: 200, json: { ok: true, job } };
}

async function signresult(body) {
  if (!workerOk(body.secret)) return { status: 401, json: { ok: false, error: "워커 인증 실패" } };
  const id = norm(body.id) || ("job_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
  let ext = norm(body.ext).toLowerCase().replace(/[^a-z0-9]/g, ""); if (!["mp4", "webm"].includes(ext)) ext = "mp4";
  const { url, key } = getCfg();
  const path = `out/${id}.${ext}`;
  const r = await fetch(`${url}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: sh(key, { "Content-Type": "application/json", "x-upsert": "true" }),
    body: "{}",
  });
  if (!r.ok) throw new Error(`결과 서명 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  const j = await r.json().catch(() => ({}));
  let token = j.token || "";
  if (!token && j.url) { const m = String(j.url).match(/[?&]token=([^&]+)/); if (m) token = decodeURIComponent(m[1]); }
  const uploadUrl = `${url}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${encodeURIComponent(token)}`;
  return { status: 200, json: { ok: true, uploadUrl, publicUrl: publicUrl(url, path), path } };
}

async function progress(body) {
  if (!workerOk(body.secret)) return { status: 401, json: { ok: false, error: "워커 인증 실패" } };
  const id = norm(body.id); if (!id) return { status: 400, json: { ok: false, error: "id 가 필요합니다." } };
  const { url, key } = getCfg();
  await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: sh(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ progress: Math.max(0, Math.min(1, Number(body.progress) || 0)), updated_at: nowISO() }),
  });
  return { status: 200, json: { ok: true } };
}

async function complete(body) {
  if (!workerOk(body.secret)) return { status: 401, json: { ok: false, error: "워커 인증 실패" } };
  const id = norm(body.id), resultUrl = norm(body.result_url);
  if (!id || !resultUrl) return { status: 400, json: { ok: false, error: "id · result_url 이 필요합니다." } };
  const { url, key } = getCfg();
  await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: sh(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ status: "done", progress: 1, result_url: resultUrl, error: null, updated_at: nowISO() }),
  });
  // 관리자 보관함(easy_customer_videos)에도 기록 — 기존 기능 재사용
  try {
    const jr = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}&select=login_id,user_name,name&limit=1`, { headers: sh(key), cache: "no-store" });
    const jrow = (await jr.json().catch(() => []))[0];
    if (jrow) await fetch(`${url}/rest/v1/${VIDTABLE}`, {
      method: "POST",
      headers: sh(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
      body: JSON.stringify([{ login_id: jrow.login_id || "", user_name: jrow.user_name || "", name: jrow.name || "내 영상", video_url: resultUrl, dur: Number(body.dur) || 0 }]),
    });
  } catch (_) {}
  return { status: 200, json: { ok: true } };
}

async function fail(body) {
  if (!workerOk(body.secret)) return { status: 401, json: { ok: false, error: "워커 인증 실패" } };
  const id = norm(body.id); if (!id) return { status: 400, json: { ok: false, error: "id 가 필요합니다." } };
  const { url, key } = getCfg();
  await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: sh(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ status: "error", error: norm(body.error).slice(0, 500) || "렌더 실패", updated_at: nowISO() }),
  });
  return { status: 200, json: { ok: true } };
}

// 검증용 — 워커 시크릿으로 spec 을 직접 큐에 등록(고객 토큰 없이). 파이프라인 테스트 후 제거 가능.
async function testjob(body) {
  if (!workerOk(body.secret)) return { status: 401, json: { ok: false, error: "워커 인증 실패" } };
  const spec = body.spec;
  if (!spec || typeof spec !== "object") return { status: 400, json: { ok: false, error: "spec 이 필요합니다." } };
  const { url, key } = getCfg();
  const row = { login_id: "_test", user_name: "테스트", name: norm(body.name) || "렌더 테스트", status: "queued", spec, progress: 0 };
  const r = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: sh(key, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify([row]),
  });
  if (!r.ok) throw new Error(`테스트 작업 등록 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  const rows = await r.json().catch(() => []);
  return { status: 200, json: { ok: true, id: rows[0] && rows[0].id } };
}

async function handleEasyRender(body) {
  const action = norm(body && body.action).toLowerCase();
  try {
    switch (action) {
      case "create": return await create(body || {});
      case "status": return await status(body || {});
      case "testjob": return await testjob(body || {});
      case "claim": return await claim(body || {});
      case "signresult": return await signresult(body || {});
      case "progress": return await progress(body || {});
      case "complete": return await complete(body || {});
      case "fail": return await fail(body || {});
      default: return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action}` } };
    }
  } catch (e) {
    return { status: 500, json: { ok: false, error: (e && e.message) || "서버 오류" } };
  }
}

module.exports = { handleEasyRender };
