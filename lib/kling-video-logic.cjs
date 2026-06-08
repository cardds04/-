/**
 * Kling(클링) 공식 API — image2video(첫·끝 프레임) 프록시 로직
 * server.js(로컬 8787)와 Vercel api/kling-video.js 가 공유.
 *
 * 클링 공식 API는 JWT(HS256) 서명이 필요하고 CORS가 막혀 있어 브라우저에서 직접 못 부름.
 * → 이 프록시가 AccessKey/SecretKey 로 JWT를 만들고 클링에 대신 요청.
 *
 * body:
 *  - { action:"create", access_key, secret_key, base?, model_name?, mode?, duration?,
 *      image(dataURI/base64), image_tail?(dataURI/base64), prompt?, negative_prompt?, cfg_scale?, aspect_ratio? }
 *      → { ok, task_id, task_status }
 *  - { action:"query", access_key, secret_key, base?, task_id }
 *      → { ok, status, status_msg, video_url }
 */
const crypto = require("crypto");

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
// 클링 JWT: HS256, payload { iss: accessKey, exp: +30분, nbf: -5초 }
function signJwt(accessKey, secretKey) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ iss: accessKey, exp: now + 1800, nbf: now - 5 }));
  const data = header + "." + payload;
  const sig = b64url(crypto.createHmac("sha256", secretKey).update(data).digest());
  return data + "." + sig;
}
const stripB64 = (s) => (typeof s === "string" ? s.replace(/^data:[^;]+;base64,/, "") : s);

async function handleKlingVideoRequest(body) {
  body = body || {};
  const ak = String(body.access_key || "").trim();
  const sk = String(body.secret_key || "").trim();
  if (!ak || !sk) { const e = new Error("Kling AccessKey/SecretKey가 필요합니다."); e.status = 400; throw e; }
  // 글로벌 계정 기본 엔드포인트(싱가포르). 중국 계정이면 base 로 덮어쓰기.
  const BASE = String(body.base || "https://api-singapore.klingai.com").replace(/\/+$/, "");
  const token = signJwt(ak, sk);
  const authH = { Authorization: "Bearer " + token };
  const action = String(body.action || "").trim().toLowerCase();

  if (action === "create") {
    if (!body.image) { const e = new Error("시작 이미지(image)가 필요합니다."); e.status = 400; throw e; }
    const payload = {
      model_name: body.model_name || "kling-v3",
      mode: body.mode || "pro",                 // image_tail(끝프레임)은 pro 모드에서 지원
      duration: String(body.duration || "5"),
      image: stripB64(body.image),
      prompt: body.prompt || "",
      cfg_scale: body.cfg_scale != null ? body.cfg_scale : 0.5,
    };
    if (body.image_tail) payload.image_tail = stripB64(body.image_tail);   // 끝프레임(원본/애프터)
    if (body.negative_prompt) payload.negative_prompt = body.negative_prompt;
    if (body.aspect_ratio) payload.aspect_ratio = body.aspect_ratio;
    const r = await fetch(BASE + "/v1/videos/image2video", {
      method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, authH), body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.code !== 0) {
      const msg = (j && (j.message || j.msg)) || `HTTP ${r.status} — Kling 영상 생성 실패`;
      const e = new Error(typeof msg === "string" ? msg : JSON.stringify(msg)); e.status = r.status || 502; e.data = j; throw e;
    }
    return { ok: true, task_id: j.data && j.data.task_id, task_status: j.data && j.data.task_status };
  }

  if (action === "query") {
    const id = String(body.task_id || "").trim();
    if (!id) { const e = new Error("task_id가 필요합니다."); e.status = 400; throw e; }
    const r = await fetch(BASE + "/v1/videos/image2video/" + encodeURIComponent(id), { headers: authH });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j) { const e = new Error(`HTTP ${r.status} — Kling 조회 실패`); e.status = r.status || 502; throw e; }
    if (j.code !== 0) { const e = new Error(j.message || j.msg || "Kling 조회 오류"); e.status = 502; e.data = j; throw e; }
    const d = j.data || {};
    const vids = (d.task_result && d.task_result.videos) || [];
    return { ok: true, status: d.task_status, status_msg: d.task_status_msg || "", video_url: (vids[0] && vids[0].url) || null };
  }

  const e = new Error('action은 "create" 또는 "query" 여야 합니다.'); e.status = 400; throw e;
}

module.exports = { handleKlingVideoRequest, signJwt };
