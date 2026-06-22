/**
 * WaveSpeedAI — Video Face Swap(영상 얼굴 교체) 프록시 로직
 * server.js(로컬 8787)와 Vercel api/wavespeed-faceswap.js 가 공유.
 *
 * WaveSpeed 공식 REST (비동기 폴링 방식):
 *   POST https://api.wavespeed.ai/api/v3/wavespeed-ai/video-face-swap
 *        헤더 Authorization: Bearer <KEY>
 *        body { video(공개 URL), face_image(공개 URL), target_index? }
 *        → { data: { id, status } }
 *   GET  https://api.wavespeed.ai/api/v3/predictions/<id>/result
 *        → { data: { status:"created|processing|completed|failed", outputs:[url], error } }
 *
 * 브라우저에서 직접 부르면 키가 노출되므로 이 프록시로 대신 호출.
 *
 * body:
 *  - { action:"create", video, face_image, target_index?, api_key? }  → { ok, id, status }
 *  - { action:"query",  id, api_key? }                                → { ok, status, video_url, error? }
 */

const WS_BASE = "https://api.wavespeed.ai/api/v3";
// mode: "face"=얼굴 부위만(머리·안경 유지) / "head"=머리 통째로 / "kling"=클링 모션컨트롤(인물 전체 재생성, 배경도 바뀜)
const WS_MODELS = { face: "wavespeed-ai/video-face-swap", head: "wavespeed-ai/video-head-swap", kling: "kwaivgi/kling-v2.6-std/motion-control" };

// Supabase easy_config 에서 WaveSpeed 키 읽기 (Vercel env 가 안 먹힐 때 우회) — kling 패턴과 동일.
async function configWaveSpeedKey() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) return "";
  try {
    const H = { apikey: key, Authorization: `Bearer ${key}` };
    const r = await fetch(`${url}/rest/v1/easy_config?k=eq.wavespeed_key&select=v`, { headers: H });
    if (!r.ok) return "";
    const rows = await r.json();
    return String((rows[0] && rows[0].v) || "").trim();
  } catch (_) { return ""; }
}

// 고객(서버키) 모드 하루 한도 — kling 과 같은 카운터 테이블 공유.
async function enforceDailyCap() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const limit = parseInt(process.env.EASY_AI_DAILY_LIMIT || "30", 10);
  if (!url || !key || !(limit > 0)) return;
  const day = new Date().toISOString().slice(0, 10);
  const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  try {
    const g = await fetch(`${url}/rest/v1/easy_ai_usage?day=eq.${day}&select=count`, { headers: H });
    const rows = g.ok ? await g.json() : [];
    const cur = (rows[0] && rows[0].count) || 0;
    if (cur >= limit) { const e = new Error(`오늘 AI 영상 생성 한도(${limit}개)를 다 썼어요. 내일 다시 시도하거나 관리자에게 문의해 주세요.`); e.status = 429; throw e; }
    await fetch(`${url}/rest/v1/easy_ai_usage?on_conflict=day`, {
      method: "POST",
      headers: Object.assign({ Prefer: "resolution=merge-duplicates" }, H),
      body: JSON.stringify({ day, count: cur + 1, updated_at: new Date().toISOString() }),
    });
  } catch (e) { if (e && e.status === 429) throw e; }
}

async function resolveKey(body) {
  let k = String((body && body.api_key) || "").trim();           // 관리자 동봉 키 우선
  if (k) return { key: k, server: false };
  k = String(process.env.WAVESPEED_API_KEY || process.env.WAVESPEED_KEY || "").trim();
  if (!k) k = await configWaveSpeedKey();
  return { key: k, server: true };
}

async function wsCreate(key, body) {
  const video = String(body.video || "").trim();
  const face = String(body.face_image || "").trim();
  if (!/^https?:\/\//.test(video)) { const e = new Error("video 는 공개 URL 이어야 합니다."); e.status = 400; throw e; }
  if (!/^https?:\/\//.test(face)) { const e = new Error("face_image 는 공개 URL 이어야 합니다."); e.status = 400; throw e; }
  const mode = (body.mode === "head" || body.mode === "kling") ? body.mode : "face";
  const model = WS_MODELS[mode];
  const resolution = (body.resolution === "480p" || body.resolution === "720p") ? body.resolution : "720p";   // 머리교체 기본 720p(480p는 어색)
  let payload;
  if (mode === "kling") {
    // 🎬 클링 모션컨트롤 — image=바꿔넣을 인물(캐릭터), video=원본(움직임 참조). 인물 전체를 새로 생성(배경도 바뀜).
    payload = { image: face, video, character_orientation: "front", keep_original_sound: body.keep_original_sound !== false };
  } else if (mode === "head") {
    payload = { video, face_image: face, resolution };   // 머리 교체 — target_index 없음, 해상도 지정(720p 기본)
  } else {
    payload = { video, face_image: face, target_index: Number.isFinite(+body.target_index) ? +body.target_index : 0 };
  }
  const r = await fetch(`${WS_BASE}/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j && (j.message || j.error)) || `WaveSpeed 생성 실패 (HTTP ${r.status})`); e.status = r.status; e.data = j; throw e; }
  const d = j.data || j;
  const id = d && (d.id || d.request_id || d.prediction_id);
  if (!id) { const e = new Error("WaveSpeed 응답에 작업 id 가 없습니다."); e.data = j; throw e; }
  return { ok: true, id: String(id), status: String((d && d.status) || "created") };
}

async function wsQuery(key, body) {
  const id = String(body.id || "").trim();
  if (!id) { const e = new Error("id 가 필요합니다."); e.status = 400; throw e; }
  const r = await fetch(`${WS_BASE}/predictions/${encodeURIComponent(id)}/result`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error((j && (j.message || j.error)) || `WaveSpeed 조회 실패 (HTTP ${r.status})`); e.status = r.status; e.data = j; throw e; }
  const d = j.data || j;
  const status = String((d && d.status) || "").toLowerCase();
  const outs = (d && (d.outputs || d.output)) || [];
  const video_url = Array.isArray(outs) ? (outs[0] || null) : (typeof outs === "string" ? outs : null);
  const error = (d && (d.error || d.message)) || null;
  return { ok: true, status: status || "processing", video_url, error: status === "failed" ? error : null };
}

async function handleWaveSpeedFaceSwap(body) {
  body = body || {};
  const { key, server } = await resolveKey(body);
  if (!key) { const e = new Error("WaveSpeed API 키가 설정되지 않았습니다. (WAVESPEED_API_KEY)"); e.status = 400; throw e; }
  const action = String(body.action || "").toLowerCase();
  if (action === "create") {
    if (server) await enforceDailyCap();   // 고객(서버키)만 한도 검사
    return await wsCreate(key, body);
  }
  if (action === "query") return await wsQuery(key, body);
  const e = new Error("action 은 create 또는 query 여야 합니다."); e.status = 400; throw e;
}

module.exports = { handleWaveSpeedFaceSwap };
