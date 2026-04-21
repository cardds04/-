/**
 * AI 토론(제미나이 vs 그록) — Express(server.js) / Vercel(api/ai-debate.js) 공용 로직
 *
 * POST JSON:
 *  {
 *    provider: "gemini" | "grok",
 *    topic: string,                       // 전체 토론 주제
 *    messages: [                          // 지금까지의 대화 (말한 순서대로)
 *      { role: "gemini" | "grok" | "user", text: string }
 *    ],
 *    style?: string,                      // 추가 지시 (예: "반대 입장으로 강하게 반박")
 *    geminiModel?: string,
 *    grokModel?: string,
 *    gemini_api_key?: string,
 *    xai_api_key?: string
 *  }
 *
 * 반환: { status, json: { ok, text } }
 */

const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";
const DEFAULT_GROK_MODEL = "grok-4";

const GEMINI_ENDPOINT = (model, key) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(key)}`;
const GROK_ENDPOINT = "https://api.x.ai/v1/chat/completions";

function speakerLabel(role) {
  if (role === "gemini") return "제미나이";
  if (role === "grok") return "그록";
  if (role === "user") return "사용자";
  return "익명";
}

function buildSystemPrompt(provider, topic, style) {
  const myName = provider === "gemini" ? "제미나이 (Google Gemini)" : "그록 (xAI Grok)";
  const opponent = provider === "gemini" ? "그록 (xAI Grok)" : "제미나이 (Google Gemini)";
  const persona =
    provider === "gemini"
      ? "너는 침착하고 분석적이며 근거를 구조적으로 제시하는 편이다. 정돈된 논리와 균형잡힌 시각을 선호한다."
      : "너는 솔직하고 재치있으며 통념에 도전하는 편이다. 날카롭지만 예의는 지키고, 때로는 농담과 비유를 섞는다.";

  return [
    `당신은 ${myName} 입니다.`,
    `토론 상대는 ${opponent} 이며, 사용자가 주제를 던지고 중간에 개입할 수 있습니다.`,
    persona,
    "",
    `[토론 주제]`,
    topic || "(주제가 지정되지 않았습니다. 먼저 짧게 주제를 정리해 주세요.)",
    "",
    "[규칙]",
    "1) 한국어로 답하라.",
    "2) 200~450자 사이의 한 번의 발언으로 응답하라. 너무 길게 늘어놓지 말 것.",
    "3) 직전 상대 발언이나 사용자 발언을 구체적으로 인용/반박/확장하라. '동의합니다'만으로 끝내지 말 것.",
    "4) 상대를 존중하되, 생각이 다르면 확실히 다르게 말하라. 가식적 중립은 금지.",
    "5) 필요하면 예시·비유·간단한 수치/근거를 사용하라.",
    "6) 머리말/꼬리말에 '제미나이:' 또는 '그록:' 같은 자기 이름 라벨을 붙이지 말고, 본문만 출력하라.",
    "7) 마지막 한 줄은 상대 또는 사용자에게 던지는 짧은 질문/도전으로 마무리해도 좋다.",
    style ? `\n[추가 지시]\n${style}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildTranscript(messages) {
  if (!Array.isArray(messages) || !messages.length) return "(아직 발언이 없습니다.)";
  const lines = [];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const t = typeof m.text === "string" ? m.text.trim() : "";
    if (!t) continue;
    lines.push(`${speakerLabel(m.role)}: ${t}`);
  }
  return lines.join("\n\n");
}

function sanitizeText(s) {
  return String(s || "")
    .replace(/^\s*(제미나이|그록|사용자)\s*[:：]\s*/i, "")
    .trim();
}

function resolveGeminiKey(b) {
  const fromBody =
    (typeof b.gemini_api_key === "string" && b.gemini_api_key.trim()) ||
    (typeof b.apiKey === "string" && b.apiKey.trim()) ||
    "";
  return fromBody || (process.env.GEMINI_API_KEY || "").trim();
}

function resolveGrokKey(b) {
  const fromBody =
    (typeof b.xai_api_key === "string" && b.xai_api_key.trim()) ||
    (typeof b.grok_api_key === "string" && b.grok_api_key.trim()) ||
    (typeof b.apiKey === "string" && b.apiKey.trim()) ||
    "";
  return (
    fromBody ||
    (process.env.XAI_API_KEY || process.env.GROK_WEB_DEFAULT_XAI_KEY || "").trim()
  );
}

async function callGemini({ model, apiKey, systemPrompt, transcript }) {
  const contents = [
    {
      role: "user",
      parts: [
        {
          text:
            systemPrompt +
            "\n\n[지금까지의 토론 로그]\n" +
            transcript +
            "\n\n위 흐름에 이어서, 당신의 다음 발언 한 번만 출력하세요.",
        },
      ],
    },
  ];

  const r = await fetch(GEMINI_ENDPOINT(model, apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.9,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || JSON.stringify(data) || r.statusText;
    const err = new Error(`Gemini 오류: ${msg}`);
    err.status = r.status >= 400 && r.status < 600 ? r.status : 502;
    throw err;
  }
  const cand = data?.candidates?.[0];
  const finish = cand?.finishReason;
  if (finish === "SAFETY" || finish === "BLOCKLIST") {
    const err = new Error("Gemini 안전 정책으로 응답이 차단되었습니다.");
    err.status = 502;
    throw err;
  }
  const parts = cand?.content?.parts;
  let text = "";
  if (Array.isArray(parts)) {
    for (const p of parts) if (p && typeof p.text === "string") text += p.text;
  }
  text = sanitizeText(text);
  if (!text) {
    const err = new Error("Gemini 응답이 비어 있습니다.");
    err.status = 502;
    throw err;
  }
  return text;
}

async function callGrok({ model, apiKey, systemPrompt, messages }) {
  const msgs = [{ role: "system", content: systemPrompt }];
  for (const m of messages) {
    if (!m || typeof m !== "object") continue;
    const t = typeof m.text === "string" ? m.text.trim() : "";
    if (!t) continue;
    if (m.role === "grok") {
      msgs.push({ role: "assistant", content: t });
    } else {
      const label = speakerLabel(m.role);
      msgs.push({ role: "user", content: `[${label}]\n${t}` });
    }
  }
  msgs.push({
    role: "user",
    content: "위 흐름에 이어 당신의 다음 발언을 한 번만 출력하세요.",
  });

  const r = await fetch(GROK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      top_p: 0.95,
      max_tokens: 1024,
      messages: msgs,
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || data?.error || JSON.stringify(data) || r.statusText;
    const err = new Error(`Grok 오류: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
    err.status = r.status >= 400 && r.status < 600 ? r.status : 502;
    throw err;
  }
  const choice = data?.choices?.[0];
  let text =
    typeof choice?.message?.content === "string" ? choice.message.content : "";
  if (Array.isArray(choice?.message?.content)) {
    text = choice.message.content
      .map((x) => (typeof x === "string" ? x : x?.text || ""))
      .join("");
  }
  text = sanitizeText(text);
  if (!text) {
    const err = new Error("Grok 응답이 비어 있습니다.");
    err.status = 502;
    throw err;
  }
  return text;
}

async function handleAiDebateRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const provider = String(b.provider || "").toLowerCase();
  const topic = typeof b.topic === "string" ? b.topic.trim() : "";
  const style = typeof b.style === "string" ? b.style.trim() : "";
  const messages = Array.isArray(b.messages) ? b.messages : [];

  if (provider !== "gemini" && provider !== "grok") {
    return { status: 400, json: { ok: false, error: "provider는 gemini 또는 grok 이어야 합니다." } };
  }
  if (!topic) {
    return { status: 400, json: { ok: false, error: "topic(토론 주제)이 필요합니다." } };
  }

  const systemPrompt = buildSystemPrompt(provider, topic, style);
  const transcript = buildTranscript(messages);

  try {
    if (provider === "gemini") {
      const apiKey = resolveGeminiKey(b);
      if (!apiKey) {
        return {
          status: 401,
          json: {
            ok: false,
            error:
              "Gemini API 키가 없습니다. 환경변수 GEMINI_API_KEY 를 설정하거나 화면에서 키를 입력하세요.",
          },
        };
      }
      const model =
        (typeof b.geminiModel === "string" && b.geminiModel.trim()) ||
        process.env.GEMINI_DEBATE_MODEL ||
        DEFAULT_GEMINI_MODEL;
      const text = await callGemini({ model, apiKey, systemPrompt, transcript });
      return { status: 200, json: { ok: true, text, model } };
    }

    const apiKey = resolveGrokKey(b);
    if (!apiKey) {
      return {
        status: 401,
        json: {
          ok: false,
          error:
            "xAI(Grok) API 키가 없습니다. 환경변수 XAI_API_KEY 를 설정하거나 화면에서 키를 입력하세요.",
        },
      };
    }
    const model =
      (typeof b.grokModel === "string" && b.grokModel.trim()) ||
      process.env.XAI_DEBATE_MODEL ||
      DEFAULT_GROK_MODEL;
    const text = await callGrok({ model, apiKey, systemPrompt, messages });
    return { status: 200, json: { ok: true, text, model } };
  } catch (e) {
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return {
      status,
      json: { ok: false, error: e?.message || "서버 오류" },
    };
  }
}

module.exports = { handleAiDebateRequest, DEFAULT_GEMINI_MODEL, DEFAULT_GROK_MODEL };
