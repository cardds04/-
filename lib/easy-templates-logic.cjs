/**
 * 이지숏폼 온라인 공유 템플릿 — 서버 로직 (테스트 가능, DOM/req 비의존)
 *
 *  GET    → 공개 템플릿 목록 (고객 사이트가 사용)
 *  POST   → 템플릿 게시/수정 (관리자 키 필요, 음악은 storage 업로드)
 *  DELETE → 템플릿 내리기 (관리자 키 필요)
 *
 * 환경변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 *           EASY_ADMIN_KEY (없으면 ADMIN_SHOOT_SITE_PASSWORD, 그것도 없으면 "6315")
 */
"use strict";

const BUCKET = "easy-music";

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
  return "bin";
}
function publicUrl(url, path) {
  return path ? `${url}/storage/v1/object/public/${BUCKET}/${path}` : null;
}

function rowToOut(url, r) {
  return {
    id: r.id, name: r.name || "", aspect: r.aspect || "9:16",
    slots: r.slots || [], texts: r.texts || [],
    music: publicUrl(url, r.music_path),
    thumb: r.thumb || null,
    sort: r.sort || 0, updatedAt: r.updated_at || null,
  };
}

async function list() {
  const { url, key } = env();
  const r = await fetch(`${url}/rest/v1/easy_templates?select=*&order=sort.asc,updated_at.desc`, { headers: restHeaders(key) });
  if (!r.ok) throw new Error(`목록 조회 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  const rows = await r.json();
  return { status: 200, json: { ok: true, templates: (rows || []).map((x) => rowToOut(url, x)) } };
}

async function uploadMusic(url, key, id, musicB64, musicType) {
  const ext = extFromType(musicType);
  const path = `${id}.${ext}`;
  const bytes = Buffer.from(musicB64, "base64");
  const up = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": musicType || "application/octet-stream", "x-upsert": "true" },
    body: bytes,
  });
  if (!up.ok) throw new Error(`음악 업로드 실패 ${up.status}: ${await up.text().catch(() => "")}`);
  return path;
}

async function upsert(body) {
  if (String(body.key || "") !== adminKey()) return { status: 401, json: { ok: false, error: "관리자 키가 올바르지 않습니다." } };
  const t = body.template;
  if (!t || !t.id) return { status: 400, json: { ok: false, error: "template.id 가 필요합니다." } };
  const { url, key } = env();

  let music_path; // undefined = 변경 안 함
  if (body.musicB64) {
    music_path = await uploadMusic(url, key, t.id, body.musicB64, body.musicType);
  } else if (body.clearMusic) {
    music_path = null;
  }

  const row = {
    id: String(t.id),
    name: t.name || "",
    aspect: t.aspect || "9:16",
    slots: Array.isArray(t.slots) ? t.slots : [],
    texts: Array.isArray(t.texts) ? t.texts : [],
    sort: Number.isFinite(t.sort) ? t.sort : 0,
    updated_at: new Date().toISOString(),
  };
  if (music_path !== undefined) row.music_path = music_path;
  if (typeof body.thumb === "string") row.thumb = body.thumb || null;   // 미리보기 썸네일(dataURL)

  const doUpsert = (rowObj) => fetch(`${url}/rest/v1/easy_templates?on_conflict=id`, {
    method: "POST",
    headers: restHeaders(key, { Prefer: "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(rowObj),
  });
  let r = await doUpsert(row);
  if (!r.ok) {
    const errText = await r.text().catch(() => "");
    // thumb 컬럼이 아직 없으면(스키마 SQL 미실행) 썸네일 빼고 한 번 더 시도
    if ("thumb" in row && /thumb/i.test(errText)) {
      delete row.thumb;
      r = await doUpsert(row);
      if (!r.ok) throw new Error(`게시 실패 ${r.status}: ${await r.text().catch(() => "")}`);
    } else {
      throw new Error(`게시 실패 ${r.status}: ${errText}`);
    }
  }
  const saved = (await r.json())[0];
  return { status: 200, json: { ok: true, template: rowToOut(url, saved) } };
}

async function remove(query, body) {
  const key0 = (body && body.key) || (query && query.key) || "";
  if (String(key0) !== adminKey()) return { status: 401, json: { ok: false, error: "관리자 키가 올바르지 않습니다." } };
  const id = (body && body.id) || (query && query.id) || "";
  if (!id) return { status: 400, json: { ok: false, error: "id 가 필요합니다." } };
  const { url, key } = env();
  // 음악 파일도 함께 제거 (실패해도 무시)
  try {
    const g = await fetch(`${url}/rest/v1/easy_templates?id=eq.${encodeURIComponent(id)}&select=music_path`, { headers: restHeaders(key) });
    const rows = g.ok ? await g.json() : [];
    const mp = rows[0] && rows[0].music_path;
    if (mp) await fetch(`${url}/storage/v1/object/${BUCKET}/${mp}`, { method: "DELETE", headers: { apikey: key, Authorization: `Bearer ${key}` } });
  } catch (_) {}
  const r = await fetch(`${url}/rest/v1/easy_templates?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: restHeaders(key) });
  if (!r.ok) throw new Error(`삭제 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  return { status: 200, json: { ok: true, deleted: id } };
}

// Kling 키를 Supabase easy_config 에 저장 (Vercel env 우회용)
async function setKling(body) {
  if (String(body.key || "") !== adminKey()) return { status: 401, json: { ok: false, error: "관리자 키가 올바르지 않습니다." } };
  const ak = String(body.ak || "").trim(), sk = String(body.sk || "").trim();
  if (!ak || !sk) return { status: 400, json: { ok: false, error: "ak·sk 가 모두 필요합니다." } };
  const { url, key } = env();
  const r = await fetch(`${url}/rest/v1/easy_config?on_conflict=k`, {
    method: "POST",
    headers: restHeaders(key, { Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify([{ k: "kling_ak", v: ak }, { k: "kling_sk", v: sk }]),
  });
  if (!r.ok) throw new Error(`키 저장 실패 ${r.status}: ${await r.text().catch(() => "")}`);
  return { status: 200, json: { ok: true, saved: true } };
}

async function handleEasyTemplates({ method, query, body }) {
  method = String(method || "GET").toUpperCase();
  if (method === "GET") return list();
  if (method === "POST") {
    if (body && body.action === "setkling") return setKling(body);
    if (body && (body.action === "delete" || body.delete)) return remove(query, body);
    return upsert(body || {});
  }
  if (method === "DELETE") return remove(query || {}, body || {});
  return { status: 405, json: { ok: false, error: "GET/POST/DELETE 만 지원합니다." } };
}

module.exports = { handleEasyTemplates, adminKey, extFromType, publicUrl, BUCKET };
