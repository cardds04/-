/**
 * 이지숏폼 — 고객이 만든 영상을 관리자가 보기 (서버 전용, service_role).
 *
 * 흐름:
 *  - 고객(로그인됨)이 영상을 다운로드하면 클라가:
 *    ① action:"sign"  → 세션토큰 검증 후 서명 업로드 URL 발급(Supabase 스토리지에 직접 PUT용)
 *    ② 서명 URL로 영상 blob 직접 업로드(Vercel 함수 본문한도 4.5MB 우회)
 *    ③ action:"record" → DB(easy_customer_videos)에 기록
 *  - 관리자: action:"list" (관리자키) → 전체 목록(최신순)
 *
 * 버킷은 기존 공개 easy-music 재사용(영상도 이미 저장 중) — cust/ 접두사.
 * 환경변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY. 세션검증: customer-session.
 */
const { verifySessionToken } = require("./customer-session.cjs");

const BUCKET = "easy-music";
const TABLE = "easy_customer_videos";

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
function adminOk(k) {
  const exp = norm(process.env.EASY_ADMIN_KEY || process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315");
  return exp !== "" && norm(k) === exp;
}
function userFromToken(token) {
  const p = verifySessionToken(token);
  return p && p.lid ? p : null;
}
function safeSeg(s) { return norm(s).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "u"; }
function publicUrl(url, path) { return `${url}/storage/v1/object/public/${BUCKET}/${path}`; }

async function handleSign(body) {
  const u = userFromToken(body.token);
  if (!u) return { status: 200, json: { ok: false, reason: "auth", message: "로그인이 필요해요." } };
  const ext = norm(body.ext) === "mp4" ? "mp4" : "webm";
  const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const path = `cust/${safeSeg(u.lid)}/${ts}.${ext}`;   // 모두 URL-safe → 인코딩 불필요
  const { url, key } = getCfg();
  const r = await fetch(`${url}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: sh(key, { "Content-Type": "application/json", "x-upsert": "true" }),
    body: "{}",
  });
  if (!r.ok) throw new Error(`서명 발급 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  const j = await r.json().catch(() => ({}));
  let token = j.token || "";
  if (!token && j.url) { const m = String(j.url).match(/[?&]token=([^&]+)/); if (m) token = decodeURIComponent(m[1]); }
  const uploadUrl = `${url}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${encodeURIComponent(token)}`;
  return { status: 200, json: { ok: true, uploadUrl, path, publicUrl: publicUrl(url, path) } };
}

async function handleRecord(body) {
  const u = userFromToken(body.token);
  if (!u) return { status: 200, json: { ok: false, reason: "auth" } };
  const videoUrl = norm(body.publicUrl) || norm(body.video_url);
  if (!videoUrl) return { status: 200, json: { ok: false, reason: "no_url" } };
  const row = {
    login_id: norm(u.lid),
    user_name: norm(u.nm) || norm(u.lid),
    name: norm(body.name).slice(0, 120) || "내 영상",
    video_url: videoUrl,
    dur: Number(body.dur) || 0,
  };
  const { url, key } = getCfg();
  const r = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: sh(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify([row]),
  });
  if (!r.ok) throw new Error(`기록 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  return { status: 200, json: { ok: true } };
}

async function handleList(body) {
  if (!adminOk(body && body.adminKey)) return { status: 200, json: { ok: false, reason: "admin_auth", message: "관리자 비밀번호가 일치하지 않습니다." } };
  const { url, key } = getCfg();
  const r = await fetch(`${url}/rest/v1/${TABLE}?select=*&order=created_at.desc&limit=300`, {
    headers: sh(key), cache: "no-store",
  });
  if (!r.ok) throw new Error(`목록 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  const rows = await r.json();
  return { status: 200, json: { ok: true, videos: Array.isArray(rows) ? rows : [] } };
}

async function handleEasyCustomerVideo(body) {
  const action = norm(body && body.action).toLowerCase();
  switch (action) {
    case "sign": return await handleSign(body || {});
    case "record": return await handleRecord(body || {});
    case "list": return await handleList(body || {});
    default: return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action || "(없음)"}` } };
  }
}

module.exports = { handleEasyCustomerVideo };
