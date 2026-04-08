/**
 * Gemini 2.5 Flash TTS — Express(server.js)와 Vercel(api/gemini-tts.js) 공용
 * @see https://ai.google.dev/gemini-api/docs/speech-generation
 */

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const PCM_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS = 16;

/** 남성: Charon(Informative), 여성: Sulafat(Warm) — 문서 보이스 표 기준 */
const VOICE_BY_GENDER = {
  male: "Charon",
  female: "Sulafat"
};

function pcmToWav(pcmBuffer, sampleRate, numChannels, bitsPerSample) {
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * numChannels * bitsPerSample) / 8, 28);
  header.writeUInt16LE((numChannels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcmBuffer]);
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ status: number, json: Record<string, unknown> }>}
 */
async function handleGeminiTtsRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const script = typeof b.script === "string" ? b.script.trim() : "";
  if (!script) {
    return { status: 400, json: { message: "나레이션 대본(script)이 필요합니다." } };
  }
  if (script.length > 50000) {
    return { status: 400, json: { message: "대본이 5만 자를 넘습니다. 줄여 주세요." } };
  }

  const apiKey =
    (typeof b.apiKey === "string" && b.apiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 400,
      json: {
        message:
          "Gemini API 키가 없습니다. 입력란에 넣거나 환경변수 GEMINI_API_KEY를 설정하세요."
      }
    };
  }

  const gender = String(b.voiceGender || "male").toLowerCase();
  const voiceName = VOICE_BY_GENDER[gender] || VOICE_BY_GENDER.male;

  const styleHint = typeof b.styleHint === "string" ? b.styleHint.trim() : "";
  const fullText = styleHint ? `${styleHint}\n\n---\n\n${script}` : script;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${TTS_MODEL}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullText }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    })
  });

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    return {
      status: 502,
      json: { message: "Gemini 응답을 JSON으로 읽지 못했습니다.", detail: raw.slice(0, 400) }
    };
  }

  if (!res.ok) {
    const msg = data.error?.message || data.message || `Gemini 오류 HTTP ${res.status}`;
    const st = res.status >= 400 && res.status < 500 ? res.status : 502;
    return { status: st, json: { message: msg } };
  }

  const part = data.candidates?.[0]?.content?.parts?.[0];
  const inline = part?.inlineData || part?.inline_data;
  const b64 = inline?.data;
  if (!b64 || typeof b64 !== "string") {
    const fr = data.candidates?.[0]?.finishReason;
    return {
      status: 502,
      json: {
        message: "오디오 데이터가 응답에 없습니다.",
        detail: fr || String(JSON.stringify(data)).slice(0, 500)
      }
    };
  }

  const pcm = Buffer.from(b64, "base64");
  const wav = pcmToWav(pcm, PCM_RATE, PCM_CHANNELS, PCM_BITS);
  return {
    status: 200,
    json: {
      ok: true,
      mimeType: "audio/wav",
      audioBase64: wav.toString("base64"),
      voiceName
    }
  };
}

module.exports = { handleGeminiTtsRequest };
