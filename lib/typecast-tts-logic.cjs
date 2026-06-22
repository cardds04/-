/**
 * Typecast TTS — Express(server.js)와 Vercel(api/typecast-*.js) 공용
 * 나레이션 음성을 Typecast v1 API로 생성. (Gemini TTS 대체)
 * @see https://typecast.ai/docs/api-reference/text-to-speech/text-to-speech
 *
 * 환경변수:
 *   TYPECAST_API_KEY        (필수) — Typecast 대시보드 발급 키
 *   TYPECAST_VOICE_FEMALE   (선택) — 기본 여성 voice_id (tc_...) — 화면에서 안 고르면 폴백
 *   TYPECAST_VOICE_MALE     (선택) — 기본 남성 voice_id (tc_...)
 */

const TC_BASE = "https://api.typecast.ai/v1";
const DEFAULT_MODEL = "ssfm-v21"; // 목소리 목록이 보고하는 모델(요청 시 voice의 model을 그대로 보내는 게 안전)

function apiKeyFrom(b) {
  return (b && typeof b.apiKey === "string" && b.apiKey.trim()) || process.env.TYPECAST_API_KEY || "";
}

/** 🎙 목소리 목록 — GET /v1/voices → [{voice_id, voice_name, model, emotions}] */
async function handleTypecastVoicesRequest(body) {
  const apiKey = apiKeyFrom(body);
  if (!apiKey) {
    return { status: 400, json: { message: "Typecast API 키가 없습니다. 환경변수 TYPECAST_API_KEY를 설정하세요." } };
  }
  let res;
  try {
    res = await fetch(`${TC_BASE}/voices`, { headers: { "X-API-KEY": apiKey } });
  } catch (e) {
    return { status: 502, json: { message: "Typecast 연결 실패: " + (e && e.message || e) } };
  }
  const raw = await res.text();
  let data;
  try { data = raw ? JSON.parse(raw) : []; }
  catch { return { status: 502, json: { message: "목소리 목록 응답을 JSON으로 읽지 못했습니다.", detail: raw.slice(0, 300) } }; }
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || `Typecast 목소리 오류 HTTP ${res.status}`;
    return { status: res.status >= 400 && res.status < 500 ? res.status : 502, json: { message: msg } };
  }
  const list = Array.isArray(data) ? data : (data.voices || data.result || []);
  const voices = list.map((v) => ({
    voice_id: v.voice_id || v.id,
    voice_name: v.voice_name || v.name || v.voice_id,
    model: v.model || DEFAULT_MODEL,
    emotions: Array.isArray(v.emotions) ? v.emotions : [],
  })).filter((v) => v.voice_id);
  return { status: 200, json: { ok: true, voices } };
}

/** 🔊 나레이션 생성 — POST /v1/text-to-speech → WAV 바이너리 → base64로 감싸 반환(Gemini 모듈과 동일 모양) */
async function handleTypecastTtsRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const script = typeof b.script === "string" ? b.script.trim() : "";
  if (!script) return { status: 400, json: { message: "나레이션 대본(script)이 필요합니다." } };
  if (script.length > 50000) return { status: 400, json: { message: "대본이 5만 자를 넘습니다. 줄여 주세요." } };

  const apiKey = apiKeyFrom(b);
  if (!apiKey) {
    return { status: 400, json: { message: "Typecast API 키가 없습니다. 환경변수 TYPECAST_API_KEY를 설정하세요." } };
  }

  // 화면에서 고른 voice_id 우선, 없으면 성별 기본 환경변수
  const gender = String(b.voiceGender || "female").toLowerCase();
  const voiceId =
    (typeof b.voiceId === "string" && b.voiceId.trim()) ||
    (gender === "male" ? process.env.TYPECAST_VOICE_MALE : process.env.TYPECAST_VOICE_FEMALE) ||
    process.env.TYPECAST_VOICE_FEMALE || process.env.TYPECAST_VOICE_MALE || "";
  if (!voiceId) {
    return { status: 400, json: { message: "목소리를 골라주세요. (voice_id 또는 환경변수 TYPECAST_VOICE_FEMALE/MALE)" } };
  }

  const model = (typeof b.model === "string" && b.model.trim()) || DEFAULT_MODEL;
  const language = (typeof b.language === "string" && b.language.trim()) || "kor";

  let res;
  try {
    res = await fetch(`${TC_BASE}/text-to-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
      body: JSON.stringify({
        voice_id: voiceId,
        text: script,
        model,
        language,
        prompt: (typeof b.emotionPrompt === "string" && b.emotionPrompt.trim()) ? { emotion_prompt: b.emotionPrompt.trim().slice(0, 200) } : { emotion_type: "smart" }, // 말투 지정(emotion_prompt) 있으면 그 말투로, 없으면 문맥 자동(smart)
        output: { volume: 100, audio_pitch: 0, audio_tempo: 1, audio_format: "wav" },
      }),
    });
  } catch (e) {
    return { status: 502, json: { message: "Typecast 연결 실패: " + (e && e.message || e) } };
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    let msg = `Typecast 나레이션 오류 HTTP ${res.status}`;
    try { const j = JSON.parse(t); msg = j.message || j.error || msg; } catch { if (t) msg += ": " + t.slice(0, 200); }
    return { status: res.status >= 400 && res.status < 500 ? res.status : 502, json: { message: msg } };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) return { status: 502, json: { message: "음성 데이터가 비어있어요." } };
  return {
    status: 200,
    json: { ok: true, mimeType: "audio/wav", audioBase64: buf.toString("base64"), voiceId, model },
  };
}

module.exports = { handleTypecastTtsRequest, handleTypecastVoicesRequest };
