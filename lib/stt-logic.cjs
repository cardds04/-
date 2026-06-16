/**
 * 음성 → 자막 (STT) — 영상/오디오 → OpenAI Whisper(단어 타임스탬프) → 자막 세그먼트
 * Express(server.js) / Vercel(api/stt.js) 공용 로직.
 *
 * 입력 body: { audio: "data:<mime>;base64,...", mime?, language? }
 * 출력: { ok, words:[{w,start,end}], segments:[{text,start,end}], text, duration }
 *   → 클라이언트가 words 를 15글자 이내로 끊어 씽크에 맞춰 자막을 만든다.
 *
 * 환경변수: OPENAI_API_KEY (필수)
 */
async function handleSttRequest(body) {
  try {
    const dataUri = String((body && body.audio) || "");
    const m = dataUri.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) return { status: 400, json: { ok: false, error: "오디오 데이터가 없습니다." } };
    const mime = String((body && body.mime) || m[1] || "video/mp4");
    const buf = Buffer.from(m[2], "base64");
    if (!buf.length) return { status: 400, json: { ok: false, error: "오디오가 비어 있습니다." } };
    if (buf.length > 25 * 1024 * 1024) return { status: 400, json: { ok: false, error: "영상이 너무 깁니다(25MB 이내). 더 짧은 영상으로 시도하세요." } };
    const key = String(process.env.OPENAI_API_KEY || "").trim();
    if (!key) return { status: 500, json: { ok: false, error: "OPENAI_API_KEY 가 설정되어 있지 않습니다." } };
    const ext = /mp4/.test(mime) ? "mp4" : /webm/.test(mime) ? "webm" : /quicktime|mov/.test(mime) ? "mov" : /wav/.test(mime) ? "wav" : /mpeg|mp3/.test(mime) ? "mp3" : /m4a|aac/.test(mime) ? "m4a" : "mp4";
    const fd = new FormData();
    fd.append("file", new Blob([buf], { type: mime }), "audio." + ext);
    fd.append("model", String(process.env.STT_MODEL || "whisper-1").trim());
    fd.append("response_format", "verbose_json");
    fd.append("timestamp_granularities[]", "word");
    fd.append("timestamp_granularities[]", "segment");
    const lang = String((body && body.language) || "ko").trim();
    if (lang) fd.append("language", lang);
    const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST", headers: { Authorization: "Bearer " + key }, body: fd,
    });
    const txt = await r.text();
    let data; try { data = txt ? JSON.parse(txt) : {}; } catch (_) { data = {}; }
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || ("HTTP " + r.status);
      return { status: r.status >= 400 && r.status < 600 ? r.status : 502, json: { ok: false, error: typeof msg === "string" ? msg : JSON.stringify(msg) } };
    }
    const words = Array.isArray(data.words)
      ? data.words.map((w) => ({ w: String(w.word || "").trim(), start: +w.start || 0, end: +w.end || 0 })).filter((w) => w.w)
      : [];
    const segments = Array.isArray(data.segments)
      ? data.segments.map((s) => ({ text: String(s.text || "").trim(), start: +s.start || 0, end: +s.end || 0 })).filter((s) => s.text)
      : [];
    return { status: 200, json: { ok: true, words, segments, text: String(data.text || ""), duration: +data.duration || 0 } };
  } catch (e) {
    return { status: 500, json: { ok: false, error: (e && e.message) || "서버 오류" } };
  }
}

module.exports = { handleSttRequest };
