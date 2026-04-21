/**
 * AI 회의실(제미나이 · 그록 공동 브레인스토밍) — Express(server.js) / Vercel(api/ai-debate.js) 공용 로직
 *
 * POST JSON:
 *  {
 *    provider: "gemini" | "grok",
 *    topic: string,                       // 사용자가 제안한 안건/아이디어
 *    messages: [                          // 지금까지의 회의 발언 (순서대로)
 *      { role: "gemini" | "grok" | "user", text: string }
 *    ],
 *    style?: string,                      // 추가 지시
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
  const partner = provider === "gemini" ? "그록 (xAI Grok)" : "제미나이 (Google Gemini)";
  const persona =
    provider === "gemini"
      ? "너는 차분하고 구조적인 분석가다. 제안을 단계/구성 요소로 분해하고, 실행 순서·리스크·성공 지표(KPI)·참고 사례로 구체화하는 역할을 맡는다."
      : "너는 창의적이고 발산적인 기획자다. 통념을 뒤집는 각도, 다른 업계의 비유, 과감한 확장 아이디어로 제안을 더 흥미롭게 키우는 역할을 맡는다.";

  return [
    `당신은 AI 회의실의 참여자 ${myName} 입니다.`,
    `같은 팀 동료는 ${partner} 이고, 진행자이자 제안자는 '사용자'입니다. 세 명이 함께 아이디어를 발전시키는 공동 브레인스토밍 회의입니다.`,
    persona,
    "",
    "[회의 안건(사용자의 제안)]",
    topic || "(아직 안건이 구체화되지 않았습니다. 사용자의 가장 최근 발언을 안건으로 삼아 정리부터 해 주세요.)",
    "",
    "[회의 규칙]",
    "1) 한국어로 답한다.",
    "2) 이것은 토론/승부가 아니다. 상대를 반박하지 말고 상대의 아이디어 위에 **한 단계 더 구체적이거나 창의적인 것**을 쌓아 올려라.",
    "3) 250~500자 사이의 한 번의 발언으로 응답한다. 너무 길게 늘어놓지 말 것.",
    "4) 직전 발언을 구체적으로 이어받아 발전시켜라. '좋은 의견입니다' 같은 공허한 동의는 금지. 동의한다면 무엇을 어떻게 더 확장·보완할지 바로 말해라.",
    "5) 가능하면 다음 중 2가지 이상을 포함해라: 구체 실행 단계 / 유사 사례·레퍼런스 / 예상 리스크와 대응 / 성공 지표·측정 방법 / 바로 시도할 수 있는 실험 한 가지.",
    "6) 사용자가 새로 말하면 그 요청을 가장 우선하여 다뤄라.",
    "7) 머리말/꼬리말에 '제미나이:' 또는 '그록:' 같은 자기 이름 라벨을 붙이지 말고, 본문만 출력하라.",
    "8) 마지막 한 줄은 동료나 사용자가 바로 이어받을 수 있는 **열린 질문이나 액션 아이템** 한 줄로 마무리한다.",
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

function isGemini3OrLater(model) {
  const m = String(model || "").toLowerCase();
  const match = m.match(/gemini-(\d+)(?:\.(\d+))?/);
  if (!match) return false;
  const major = parseInt(match[1], 10) || 0;
  return major >= 3;
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

  const generationConfig = {
    temperature: 0.9,
    topP: 0.95,
    maxOutputTokens: 8192,
  };
  // Gemini 3 계열은 thinking 토큰이 maxOutputTokens 안에 포함돼서 본문이 잘림.
  // 답변 위주로 쓰도록 thinking budget 을 최소화.
  if (isGemini3OrLater(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const r = await fetch(GEMINI_ENDPOINT(model, apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig,
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
    const err = new Error(
      finish === "MAX_TOKENS"
        ? "Gemini 응답이 thinking 단계에서 토큰을 다 써서 본문이 비었습니다. 다른 모델(gemini-2.5-flash 등)로 바꿔 보세요."
        : "Gemini 응답이 비어 있습니다."
    );
    err.status = 502;
    throw err;
  }
  if (finish === "MAX_TOKENS") {
    text = text.trimEnd() + " …(토큰 한도로 잘림)";
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
      max_tokens: 2048,
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
