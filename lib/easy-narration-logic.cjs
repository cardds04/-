/**
 * 이지숏폼 나레이션 문구 생성 — Express(server.js) / Vercel(api/easy-narration.js) 공용 로직
 *
 * 고객이 프롬프트를 직접 적으면 → Claude 가 영상에 깔 한국어 나레이션 '대본'(plain text)을 써준다.
 * 고객은 키가 필요 없다(서버 ANTHROPIC_API_KEY 사용). reel-suggest 와 동일 패턴(SDK 없음).
 *
 * POST JSON:
 *   { action: "generate", prompt: string, tone?: string, maxChars?: number }
 *   → { ok: true, text: string }
 *   { action: "fixcaptions", lines: string[] }
 *   → { ok: true, lines: string[] }   // 같은 개수·순서로 문맥 교정된 자막
 *
 * 환경 변수:
 *   - ANTHROPIC_API_KEY  (필수)
 *   - NARRATION_MODEL    (선택, 기본 claude-sonnet-4-6)
 */

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";

const SYSTEM = `너는 숏폼(릴스/쇼츠) 영상 나레이션 작가다.
사용자가 주는 요청(프롬프트)에 맞춰, 영상에 깔아 읽을 한국어 나레이션 '대본'만 출력한다.

[주제 — 매우 중요]
- 업종·주제를 가리지 않는다. 사용자가 적은 내용이 무엇이든(가게 홍보, 일상, 인물·반려동물 소개, 제품, 여행, 행사 등) 그 요청에 충실하게 대본을 쓴다.
- "이 업종/주제와 관련 없어서 못 쓴다"는 식으로 절대 거절하지 마라. 사용자가 던진 한 줄이 짧고 모호해도, 그 한 줄을 살려 매력적인 나레이션으로 만들어 준다.

[출력 규칙 — 매우 중요]
- 실제로 성우가 읽을 '문장'만 출력한다. 따옴표·머리말·설명·메모·괄호 지시문·해시태그·이모지 금지.
- 자연스럽게 읽히도록 적당히 짧은 문장으로 끊어 쓴다.
- 과장·허위·클리셰 남발 금지. 담백하고 진심 있게. 1인칭 시점이 어울리면 자연스럽게 사용.
- 길이 지정이 없으면 영상에 어울리는 25~35초 분량(한국어 약 90~140자)으로.
- 행동 유도(상담/방문/예약/팔로우 등)는 요청에 어울릴 때만 마지막 한 문장으로.`;

// 🎤 자막 교정(STT 오인식 → 문맥 기반 바른 문장) 전용 시스템 프롬프트
const FIX_SYSTEM = `너는 한국어 자막 교정기다. 영상 속 말소리를 자동 음성인식(STT)한 결과(자막 줄들)를 받는다.
STT는 발음이 불분명하거나 동음이의어 때문에 단어를 잘못 받아쓰는 경우가 많다.
너의 일은 '문맥'을 보고 잘못 들린 부분을 자연스럽고 올바른 한국어 문장으로 고치는 것이다.

[규칙 — 매우 중요]
- 입력은 JSON 문자열 배열(자막 줄들)이다. 출력도 반드시 '같은 개수'의 JSON 문자열 배열만 출력한다. 설명·머리말·코드펜스 금지, 순수 JSON 배열만.
- 줄 개수와 순서를 절대 바꾸지 마라. i번째 입력 → i번째 출력으로 1:1 대응(자막 타이밍이 줄 단위로 맞춰져 있다).
- 줄을 합치거나 나누지 마라. 각 줄의 길이는 원본과 비슷하게 유지하되, 잘못 들린 단어만 문맥에 맞게 교정한다.
- 앞뒤 줄이 이루는 영상 전체 맥락을 보고 가장 그럴듯한 단어로 고른다. 특정 업종을 단정하지 말고 흐름에 맞춰라.
- 명백히 올바른 줄은 그대로 둔다. 없는 내용을 새로 지어내지 마라.
- '음…', '어…' 같은 군더더기나 명백한 중복은 자연스럽게 다듬어도 된다. 단, 문장의 핵심 의미는 보존한다.`;

// 💬 자막 생성 전용 — 화면에 띄울 짧은 자막 문구(나레이션 대본 X)
const CAPTION_SYSTEM = `너는 숏폼(릴스/쇼츠) 영상 자막 작가다.
사용자 요청에 맞춰, 영상 화면에 큼직하게 띄울 한국어 '자막 문구'만 만든다.
- ⭐말투는 반드시 '존댓말'. 반말 절대 금지. "~이에요/~예요/~했는데요/~어요/~네요" 같은 부드러운 존댓말로.
- 각 문구는 짧고 임팩트 있게: 6~18자, 한 줄.
- 나레이션 대본(긴 설명 문장)이 아니라, 화면 자막(짧은 후킹 문구)다.
- 출력은 반드시 JSON 문자열 배열만. 설명·머리말·코드펜스·번호·따옴표 금지.
- "관련 없어서 못 만든다"며 거절하지 마라. 짧고 모호한 한 줄도 살려서 매력적인 자막으로 만든다.`;

// 📖 독백/일기체 자막 — 영상에 깔리는, 말하듯 혼잣말하듯 흐르는 긴 글
const DIARY_SYSTEM = `너는 숏폼(릴스/쇼츠) 영상에 깔리는 한국어 '독백 자막'을 쓴다.
- ⭐말투는 반드시 '존댓말(해요체)'. 반말 절대 금지. 어미는 "~이에요/~예요/~했어요/~했는데요/~더라고요/~네요/~거든요/~답니다"처럼 부드럽고 친근한 존댓말로 끝낸다.
- 일기를 쓰듯, 혼잣말하듯, 보는 분께 다정하게 말 걸듯한 1인칭 시점. 단, 어디까지나 존댓말로.
- 담담하고 진솔하게, 보는 사람이 공감하도록 감성적으로 흐르게.
- 한 편의 이어지는 글(여러 문장). 짧은 캐치프레이즈·해시태그·이모지 남발 금지.
- 출력은 독백 대본 글만. 설명·머리말·따옴표·번호·길이표기 금지.
- "관련 없어서 못 쓴다"며 거절하지 마라. 짧고 모호한 주제도 살려서 매력적인 독백으로 만든다.`;

// 🗣 말투 흉내 독백 — [말투 예시]의 어투를 그대로 따라함(존댓말/반말 등 예시대로). 존댓말 강제 안 함.
const DIARY_TONE_SYSTEM = `너는 주어진 '말투 예시'의 말투를 그대로 흉내내 한국어 영상 자막/대본을 쓰는 도구다.
- ⭐오직 [말투 예시]의 '말투'만 따라한다: 어미·어투·존댓말이냐 반말이냐·자주 쓰는 표현·말버릇·감탄사·문장 길이·리듬을 똑같이. 예시의 '내용'은 절대 베끼지 말고 [주제]를 쓴다.
- ⭐일기체·존댓말 강제·담담함 같은 다른 규칙은 적용하지 않는다. 예시 말투가 반말이면 반말로, 톡톡 튀면 톡톡 튀게 — 예시가 곧 규칙이다.
- 출력은 대본 글만. 설명·머리말·따옴표·번호·길이표기 금지.
- "관련 없어서 못 쓴다"며 거절하지 마라.`;

async function callClaude(userMessage, maxTokens, opts) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) { const err = new Error("ANTHROPIC_API_KEY 가 설정되어 있지 않습니다."); err.status = 500; throw err; }
  const model = String(process.env.NARRATION_MODEL || DEFAULT_MODEL).trim();
  const system = (opts && opts.system) || SYSTEM;
  const temperature = (opts && typeof opts.temperature === "number") ? opts.temperature : 0.85;
  const r = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    body: JSON.stringify({
      model, max_tokens: maxTokens || 1200, temperature,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const msg = data?.error?.message || JSON.stringify(data) || r.statusText; const err = new Error(`Claude 오류: ${msg}`); err.status = (r.status >= 400 && r.status < 600) ? r.status : 502; throw err; }
  let text = "";
  if (Array.isArray(data?.content)) for (const c of data.content) if (c?.type === "text") text += c.text;
  return String(text || "").trim();
}

async function generate(body) {
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) { const err = new Error("프롬프트가 비어 있습니다."); err.status = 400; throw err; }
  const tone = String(body?.tone || "").trim();
  const maxChars = Number(body?.maxChars) || 0;
  let user = `다음 요청에 맞는 영상 나레이션 대본을 써줘.\n\n[요청]\n${prompt}`;
  if (tone) user += `\n\n[말투/톤]\n${tone}`;
  if (maxChars > 0) user += `\n\n[길이]\n공백 포함 한국어 약 ${maxChars}자 이내.`;
  const text = await callClaude(user, Math.min(2000, Math.max(400, (maxChars || 200) * 4)));
  // 혹시 모델이 따옴표로 감쌌으면 벗김
  const clean = text.replace(/^["'“”『「]+/, "").replace(/["'“”』」]+$/, "").trim();
  return { ok: true, text: clean };
}

// 모델 응답에서 JSON 문자열 배열을 안전하게 뽑아냄(코드펜스·머리말 허용)
function parseLinesJson(text) {
  let s = String(text || "").trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  let arr;
  try { arr = JSON.parse(s); } catch { return null; }
  if (!Array.isArray(arr)) return null;
  return arr.map((x) => (x == null ? "" : String(x)));
}

// 🎤 STT로 받은 자막 줄들을 문맥 기반으로 교정(개수·순서 보존). 실패 시 원본 그대로 반환.
async function fixCaptions(body) {
  const lines = Array.isArray(body?.lines) ? body.lines.map((x) => (x == null ? "" : String(x))) : [];
  if (!lines.length) { const err = new Error("교정할 자막(lines)이 비어 있습니다."); err.status = 400; throw err; }
  if (lines.length > 400) { const err = new Error("자막 줄이 너무 많습니다(최대 400줄)."); err.status = 400; throw err; }
  const user = `다음은 영상 음성을 STT로 받아쓴 자막 줄들이다(JSON 배열). 문맥을 보고 잘못 들린 부분만 자연스럽게 교정해서, '같은 개수'의 JSON 문자열 배열로만 답해라.\n\n${JSON.stringify(lines, null, 0)}`;
  const totalCh = lines.reduce((s, l) => s + l.length, 0);
  const maxTokens = Math.min(8000, Math.max(800, totalCh * 4 + 400));
  const raw = await callClaude(user, maxTokens, { system: FIX_SYSTEM, temperature: 0.3 });
  const fixed = parseLinesJson(raw);
  // 개수가 어긋나면 싱크가 깨지므로 원본 유지(부분 교정 금지)
  if (!fixed || fixed.length !== lines.length) return { ok: true, lines, corrected: false };
  const out = fixed.map((ln, i) => { const t = String(ln || "").trim(); return t || lines[i]; });
  return { ok: true, lines: out, corrected: true };
}

// 💬 화면 자막 문구 N개 생성 (짧은 자막, 나레이션 대본 아님)
async function genCaptions(body) {
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) { const err = new Error("프롬프트가 비어 있습니다."); err.status = 400; throw err; }
  const count = Math.max(1, Math.min(12, Number(body?.count) || 3));
  const user = `다음 영상에 들어갈 화면 자막 문구를 정확히 ${count}개 만들어줘. JSON 문자열 배열로만 답해라(각 6~18자, 짧게).\n\n[영상]\n${prompt}`;
  const raw = await callClaude(user, 600, { system: CAPTION_SYSTEM, temperature: 0.9 });
  let lines = parseLinesJson(raw);
  if (!lines) lines = String(raw || "").split("\n").map((l) => l.replace(/^[\s\d.)\-•·"']+/, "").trim()).filter(Boolean);
  lines = lines.map((l) => String(l || "").replace(/^["'“”]+|["'“”]+$/g, "").trim()).filter(Boolean).slice(0, count);
  if (!lines.length) { const err = new Error("자막을 생성하지 못했습니다."); err.status = 502; throw err; }
  return { ok: true, lines };
}

// 📖 독백/일기체 자막을 약 N자 분량으로 생성 (chars 반환 → 클라가 예상시간 계산)
async function genDiary(body) {
  const prompt = String(body?.prompt || "").trim();
  if (!prompt) { const err = new Error("프롬프트가 비어 있습니다."); err.status = 400; throw err; }
  const maxChars = Math.max(50, Math.min(800, Number(body?.maxChars) || 300));
  const tone = String(body?.tone || "").trim().slice(0, 1200);   // 🗣 말투 예시(영상 음성 STT 전사 등) — 있으면 이 어투를 흉내
  let user, system;
  if (tone) {
    user = `[말투 예시]의 말투만 그대로 흉내내서 [주제] 내용으로 영상 자막/대본을 써줘. ⭐다른 규칙(일기체·존댓말 강제 등)은 전부 무시하고, 오직 예시의 어미·어투(존댓말/반말)·말버릇·표현·길이감만 똑같이 따라해. 예시 '내용'은 베끼지 말 것. 공백 포함 한국어 약 ${maxChars}자(±15%).\n\n[말투 예시]\n${tone}\n\n[주제]\n${prompt}`;
    system = DIARY_TONE_SYSTEM;
  } else {
    user = `다음 주제로 영상에 깔 독백 자막을 써줘. 일기 쓰듯 말하듯 독백체로, 공백 포함 한국어 약 ${maxChars}자(±15%) 분량으로. ⭐반드시 존댓말(해요체)로, 반말 쓰지 마. "~했는데요/~이에요/~더라고요" 같은 부드러운 존댓말 어미로.\n\n[주제]\n${prompt}`;
    system = DIARY_SYSTEM;
  }
  const text = await callClaude(user, Math.min(2200, maxChars * 4 + 300), { system, temperature: 0.92 });
  const clean = String(text || "").replace(/^["'“”『「]+/, "").replace(/["'“”』」]+$/, "").trim();
  if (!clean) { const err = new Error("독백을 생성하지 못했습니다."); err.status = 502; throw err; }
  return { ok: true, text: clean, chars: clean.length };
}

async function handleNarrationRequest(body) {
  try {
    const action = String(body?.action || "generate");
    if (action === "generate") return { status: 200, json: await generate(body) };
    if (action === "captions") return { status: 200, json: await genCaptions(body) };
    if (action === "diary") return { status: 200, json: await genDiary(body) };
    if (action === "fixcaptions") return { status: 200, json: await fixCaptions(body) };
    return { status: 400, json: { ok: false, error: "지원하지 않는 action 입니다." } };
  } catch (e) {
    return { status: e?.status || 500, json: { ok: false, error: e?.message || "서버 오류" } };
  }
}

module.exports = { handleNarrationRequest, generate, fixCaptions };
