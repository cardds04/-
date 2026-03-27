/**
 * 블로그 도우미 Gemini/OpenAI 호출 — Express(server.js)와 Vercel(api/blog-generate.js) 공용
 */

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

const GEMINI_MODEL_ALIASES = {
  "gemini-3-flash": "gemini-3-flash-preview",
  "gemini-3-pro": "gemini-3.1-pro-preview"
};

function coerceGeminiModelId(raw) {
  let m = String(raw || "").trim();
  if (!m) m = DEFAULT_GEMINI_MODEL;
  if (m.startsWith("models/")) m = m.slice("models/".length);
  if (/2\.0-flash/i.test(m)) {
    return DEFAULT_GEMINI_MODEL;
  }
  const aliased = GEMINI_MODEL_ALIASES[m];
  if (aliased) m = aliased;
  if (!/^gemini-[a-zA-Z0-9_.-]+$/.test(m)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return m;
}

function pickGeminiModel(body) {
  const fromClient =
    body && typeof body.geminiModel === "string" ? body.geminiModel.trim() : "";
  const fromEnv = (process.env.GEMINI_VISION_MODEL || "").trim();
  const raw = fromClient || fromEnv || DEFAULT_GEMINI_MODEL;
  const out = coerceGeminiModelId(raw);
  if (/2\.0-flash/i.test(raw) && out === DEFAULT_GEMINI_MODEL) {
    console.warn(
      "[blog-generate] 구형/단종 모델(%s) → %s 로 치환했습니다.",
      raw,
      out
    );
  }
  return out;
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ status: number, json: Record<string, unknown> }>}
 */
async function handleBlogGenerateRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const provider = String(b.provider || "gemini").toLowerCase();
  const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
  const images = Array.isArray(b.images) ? b.images : [];

  if (!prompt) {
    return { status: 400, json: { message: "prompt가 필요합니다." } };
  }
  if (!images.length) {
    return { status: 400, json: { message: "이미지가 1장 이상 필요합니다." } };
  }
  if (images.length > 24) {
    return { status: 400, json: { message: "이미지는 24장 이하로 줄여 주세요." } };
  }

  for (let i = 0; i < images.length; i++) {
    const im = images[i];
    if (!im || typeof im !== "object" || typeof im.base64 !== "string" || !im.base64.length) {
      return { status: 400, json: { message: `images[${i}]에 base64 데이터가 없습니다.` } };
    }
    if (typeof im.mimeType !== "string" || !im.mimeType.startsWith("image/")) {
      return { status: 400, json: { message: `images[${i}]의 mimeType이 올바르지 않습니다.` } };
    }
  }

  if (provider === "openai") {
    const apiKey = (typeof b.apiKey === "string" && b.apiKey.trim()) || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        status: 400,
        json: {
          message: "OpenAI API 키가 없습니다. 입력란에 넣거나 환경변수 OPENAI_API_KEY를 설정하세요."
        }
      };
    }
    const content = [{ type: "text", text: prompt }];
    for (const im of images) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${im.mimeType};base64,${im.base64}` }
      });
    }
    const ores = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
        max_tokens: 8192,
        messages: [{ role: "user", content }]
      })
    });
    const data = await ores.json().catch(() => ({}));
    if (!ores.ok) {
      const msg = data?.error?.message || JSON.stringify(data) || ores.statusText;
      return { status: 502, json: { message: `OpenAI 오류: ${msg}` } };
    }
    const text = data?.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      return { status: 502, json: { message: "OpenAI 응답에 본문이 없습니다." } };
    }
    return { status: 200, json: { text: text.trim() } };
  }

  const apiKey =
    (typeof b.apiKey === "string" && b.apiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 400,
      json: {
        message:
          "Gemini API 키가 없습니다. Google AI Studio에서 발급 후 입력하거나 환경변수 GEMINI_API_KEY를 설정하세요."
      }
    };
  }

  const model = pickGeminiModel(b);
  console.log("[blog-generate] Gemini 호출 모델:", model);
  const parts = [{ text: prompt }];
  for (const im of images) {
    parts.push({
      inline_data: {
        mime_type: im.mimeType,
        data: im.base64.replace(/\s/g, "")
      }
    });
  }

  const gres = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.7
        }
      })
    }
  );
  const data = await gres.json().catch(() => ({}));
  if (!gres.ok) {
    const msg = data?.error?.message || JSON.stringify(data) || gres.statusText;
    return { status: 502, json: { message: `Gemini 오류: ${msg}` } };
  }
  const cand = data?.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish === "SAFETY" || finish === "BLOCKLIST") {
    return { status: 502, json: { message: "Gemini가 안전 정책으로 응답을 차단했습니다." } };
  }
  const partsOut = cand?.content?.parts;
  let text = "";
  if (Array.isArray(partsOut)) {
    for (const p of partsOut) {
      if (p && typeof p.text === "string") text += p.text;
    }
  }
  text = text.trim();
  if (!text) {
    return { status: 502, json: { message: "Gemini 응답에 본문이 없습니다." } };
  }
  return { status: 200, json: { text } };
}

module.exports = { handleBlogGenerateRequest, pickGeminiModel, coerceGeminiModelId };
