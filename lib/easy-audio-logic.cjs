/**
 * 이지숏폼 음악 라이브러리 — 관리자 큐레이션 → 고객 선택 (빠른/중간/느린)
 *
 *   GET                                   → 공개 음악 목록 (고객 picker 가 사용)
 *   POST { key, action:"add", name, tempo, audioB64, audioType }  → 음악 추가 (관리자)
 *   POST { key, action:"delete", id }  또는  DELETE { key, id }    → 음악 삭제 (관리자)
 *
 * 저장: 음악 파일 = Storage 'easy-music' 버킷(이미 존재) / 목록 = easy_config['bgm_library'] JSON
 * → 새 SQL/테이블 불필요. (easy_templates 와 같은 인프라 재사용)
 *
 * 환경변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 *           EASY_ADMIN_KEY (없으면 ADMIN_SHOOT_SITE_PASSWORD, 그것도 없으면 "6315")
 */
"use strict";

const BUCKET = "easy-music";
const CONFIG_KEY = "bgm_library";
const TEMPOS = ["fast", "mid", "slow"];

function norm(s) { return String(s || "").trim().replace(/\/+$/, ""); }
function env() {
  const url = norm(process.env.SUPABASE_URL);
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  return { url, key };
}
function adminKey() {
  return String(process.env.EASY_ADMIN_KEY || process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315");
}
function restHeaders(key, extra) {
  return Object.assign({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, extra || {});
}
function extFromType(t) {
  t = String(t || "").toLowerCase();
  if (t.includes("mpeg") || t.includes("mp3")) return "mp3";
  if (t.includes("wav")) return "wav";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("aac")) return "aac";
  if (t.includes("mp4") || t.includes("m4a")) return "m4a";
  return "mp3";
}
function publicUrl(url, path) { return path ? `${url}/storage/v1/object/public/${BUCKET}/${path}` : null; }
function normTempo(t) { t = String(t || "").toLowerCase(); return TEMPOS.includes(t) ? t : "mid"; }
function rowToOut(url, t) { return { id: t.id, name: t.name || "", tempo: normTempo(t.tempo), url: publicUrl(url, t.path), sort: t.sort || 0 }; }

async function loadLib(url, key) {
  const r = await fetch(`${url}/rest/v1/easy_config?k=eq.${CONFIG_KEY}&select=v`, { headers: restHeaders(key), cache: "no-store" });
  if (!r.ok) return [];
  const rows = await r.json().catch(() => []);
  const v = rows && rows[0] && rows[0].v;
  if (!v) return [];
  try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch (_) { return []; }
}
async function saveLib(url, key, arr) {
  const r = await fetch(`${url}/rest/v1/easy_config?on_conflict=k`, {
    method: "POST",
    headers: restHeaders(key, { Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify([{ k: CONFIG_KEY, v: JSON.stringify(arr) }]),
  });
  if (!r.ok) throw new Error(`라이브러리 저장 실패 ${r.status}: ${await r.text().catch(() => "")}`);
}

async function list() {
  const { url, key } = env();
  const lib = await loadLib(url, key);
  const tracks = lib.map((t) => rowToOut(url, t)).filter((t) => t.url);
  return { status: 200, json: { ok: true, tracks } };
}

async function add(body) {
  if (String(body.key || "") !== adminKey()) return { status: 401, json: { ok: false, error: "관리자 키가 올바르지 않습니다." } };
  const name = String(body.name || "").trim().slice(0, 60);
  const tempo = normTempo(body.tempo);
  if (!name) return { status: 400, json: { ok: false, error: "음악 이름이 필요합니다." } };
  if (!body.audioB64) return { status: 400, json: { ok: false, error: "오디오 데이터가 필요합니다." } };
  const { url, key } = env();
  const id = "bgm_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const path = `bgm/${id}.${extFromType(body.audioType)}`;
  const bytes = Buffer.from(body.audioB64, "base64");
  const up = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": body.audioType || "audio/mpeg", "x-upsert": "true" },
    body: bytes,
  });
  if (!up.ok) throw new Error(`음악 업로드 실패 ${up.status}: ${await up.text().catch(() => "")}`);
  const lib = await loadLib(url, key);
  lib.push({ id, name, tempo, path, sort: lib.length });
  await saveLib(url, key, lib);
  return { status: 200, json: { ok: true, track: rowToOut(url, { id, name, tempo, path }) } };
}

// ── 대용량·다중 업로드: ① sign 으로 서명 URL 받아 클라이언트가 Supabase 에 직접 PUT(Vercel 4.5MB 우회) ② register 로 목록 등록 ──
async function sign(body) {
  if (String(body.key || "") !== adminKey()) return { status: 401, json: { ok: false, error: "관리자 키가 올바르지 않습니다." } };
  const { url, key } = env();
  const id = "bgm_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const path = `bgm/${id}.${extFromType(body.audioType)}`;
  const r = await fetch(`${url}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "x-upsert": "true" },
    body: "{}",
  });
  if (!r.ok) throw new Error(`서명 발급 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  const j = await r.json().catch(() => ({}));
  let token = j.token || "";
  if (!token && j.url) { const m = String(j.url).match(/[?&]token=([^&]+)/); if (m) token = decodeURIComponent(m[1]); }
  const uploadUrl = `${url}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${encodeURIComponent(token)}`;
  return { status: 200, json: { ok: true, id, path, uploadUrl, publicUrl: publicUrl(url, path) } };
}

async function register(body) {
  if (String(body.key || "") !== adminKey()) return { status: 401, json: { ok: false, error: "관리자 키가 올바르지 않습니다." } };
  const name = String(body.name || "").trim().slice(0, 60);
  const tempo = normTempo(body.tempo);
  const path = String(body.path || "").trim();
  if (!name) return { status: 400, json: { ok: false, error: "음악 이름이 필요합니다." } };
  if (!/^bgm\/[A-Za-z0-9._-]+$/.test(path)) return { status: 400, json: { ok: false, error: "잘못된 path 입니다." } };   // bgm/ 경로만 등록 허용
  const id = String(body.id || "").trim() || ("bgm_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7));
  const { url, key } = env();
  const lib = await loadLib(url, key);
  lib.push({ id, name, tempo, path, sort: lib.length });
  await saveLib(url, key, lib);
  return { status: 200, json: { ok: true, track: rowToOut(url, { id, name, tempo, path }) } };
}

async function remove(body) {
  if (String(body.key || "") !== adminKey()) return { status: 401, json: { ok: false, error: "관리자 키가 올바르지 않습니다." } };
  const id = String(body.id || "");
  if (!id) return { status: 400, json: { ok: false, error: "id 가 필요합니다." } };
  const { url, key } = env();
  const lib = await loadLib(url, key);
  const t = lib.find((x) => x.id === id);
  await saveLib(url, key, lib.filter((x) => x.id !== id));
  if (t && t.path) { try { await fetch(`${url}/storage/v1/object/${BUCKET}/${t.path}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } }); } catch (_) {} }
  return { status: 200, json: { ok: true, deleted: id } };
}

async function handleEasyAudio({ method, query, body }) {
  method = String(method || "GET").toUpperCase();
  if (method === "GET") return list();
  if (method === "POST") {
    if (body && (body.action === "delete" || body.delete)) return remove(body);
    if (body && body.action === "sign") return sign(body || {});
    if (body && body.action === "register") return register(body || {});
    return add(body || {});   // 기존 base64(소용량) — 앱 안 picker 호환
  }
  if (method === "DELETE") return remove(body || query || {});
  return { status: 405, json: { ok: false, error: "GET/POST/DELETE 만 지원합니다." } };
}

module.exports = { handleEasyAudio, adminKey, BUCKET };
