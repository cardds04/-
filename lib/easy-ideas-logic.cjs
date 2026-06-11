/**
 * 이지숏폼 '아이디어 상자' — 업종 하나 → 포맷(56개)별 맞춤 숏폼 아이디어
 * Express(server.js) / Vercel(api/easy-ideas.js) 공용 로직
 *
 * 입력 body:
 *   {
 *     action: "generate",
 *     industry: "세차장",
 *     taxonomy: [{ key, label, emoji, formats:[{id,label,level}] }],   // 고객 앱이 들고 있는 분류 체계
 *     avoid:   ["이미 본 아이디어 텍스트", ...]                          // 재생성 시 중복 회피
 *   }
 * 출력:
 *   { ok, industry, items:[{f:formatId, i:ideaText}], aces:[formatId], avoid:[formatId], why, tip }
 *   (클라이언트가 자기 taxonomy 와 formatId 로 합쳐서 카테고리별로 그린다)
 *
 * 환경 변수:
 *   - ANTHROPIC_API_KEY  (필수)
 *   - IDEAS_MODEL        (선택, 기본 claude-sonnet-4-6)
 */

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";

// ── 시스템 프롬프트(정적·캐시) — 가치 전달자 OS 의 핵심을 '포맷별 아이디어' 용으로 압축 ──
const SYSTEM = `너는 '가치 전달자 운영체제(Value Creator OS)'를 체득한 숏폼 콘텐츠 전략가다.
업종 하나가 들어오면, 주어진 '포맷 목록'의 각 포맷마다 그 업종에 딱 맞는 구체적인 숏폼 아이디어를 정확히 1개씩 만든다.

[핵심 원칙]
- 각인(Imprint): "옆집이 그대로 올려도 말이 되면 탈락." 그 가게만의 1인칭 경험·축적된 판단·시그니처·진짜 사연을 넣는다.
- 결과를 판다: 물건/서비스가 아니라 '고객의 변화·더 나은 오늘'을 보여준다.
- Show, don't tell: 컨셉을 말로 설명하지 말고 행동·디테일·숫자·장면으로 증명한다.
- 정보보다 판단: "이건 하지 마세요"처럼 골라주고 판단을 남긴다.

[아이디어 작성 규칙]
- 각 아이디어 = 그 포맷의 성격을 그 업종의 실제 상황으로 구체화한 1줄.
  (예: 비포애프터 → "진흙 범벅 → 출고 직전 광택샷" / 트렁크 유물 → "오늘 이 차에서 나온 것들 — 동전·모래 무게 재기")
- 추상적·뻔한 말 금지. 실제로 찍을 장면·소재가 머릿속에 그려지게 구체적으로.
- 40자 이내, 한국어 구어체, 자막처럼 짧게. 광고 카피처럼 들리지 않게.
- 두 컷 대비/선택지는 화살표(→)·슬래시(/)로 압축해도 좋다.

[업종 적합도]
- 이 업종에서 특히 강한(에이스) 포맷 5개와, 잘 안 맞는(비추) 포맷 2~3개를 formatId 로 골라라.
- 비추 포맷이라도 아이디어는 반드시 채운다. 적합도만 따로 표시한다.

반드시 지정된 JSON 스키마만 출력한다. 인사·설명·코드블록(\`\`\`)·주석 없이 순수 JSON 만.`;

// ── Claude 호출 (raw fetch — 다른 lib 와 동일 패턴) ──
async function callClaude({ userMessage, maxTokens = 8000, temperature = 0.9 }) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY 가 설정되어 있지 않습니다.");
    err.status = 500;
    throw err;
  }
  const model = String(process.env.IDEAS_MODEL || DEFAULT_MODEL).trim();

  const r = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || JSON.stringify(data) || r.statusText;
    const err = new Error(`Claude 오류: ${msg}`);
    err.status = r.status >= 400 && r.status < 600 ? r.status : 502;
    throw err;
  }
  let text = "";
  if (Array.isArray(data?.content)) {
    for (const c of data.content) if (c?.type === "text") text += c.text;
  }
  return extractJson(text);
}

function extractJson(raw) {
  const s = String(raw || "").trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try { return JSON.parse(s); } catch (_) {}
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { return JSON.parse(s.slice(a, b + 1)); } catch (_) {}
  }
  const err = new Error("AI 응답을 JSON으로 읽지 못했습니다. 다시 시도해 주세요.");
  err.status = 502;
  throw err;
}

// ── taxonomy → 모델에게 줄 포맷 개요(텍스트) + 유효 id 집합 ──
function buildOutline(taxonomy) {
  const ids = new Set();
  const blocks = [];
  (Array.isArray(taxonomy) ? taxonomy : []).forEach((c) => {
    if (!c || !Array.isArray(c.formats)) return;
    const rows = [];
    c.formats.forEach((f) => {
      const id = String((f && f.id) || "").trim();
      const label = String((f && f.label) || "").trim();
      if (!id || !label) return;
      ids.add(id);
      const lv = Number(f.level) || 1;
      rows.push(`${id} ${label} (난이도${lv})`);
    });
    if (rows.length) {
      blocks.push(`[${String(c.emoji || "").trim()} ${String(c.label || "").trim()}]\n${rows.join("\n")}`);
    }
  });
  return { outline: blocks.join("\n\n"), ids };
}

// ── 생성 ──
async function generate(body) {
  const industry = String(body?.industry || "").trim().slice(0, 40);
  if (!industry) {
    const err = new Error("업종을 입력해 주세요. (예: 세차장)");
    err.status = 400;
    throw err;
  }
  const { outline, ids } = buildOutline(body?.taxonomy);
  if (!ids.size) {
    const err = new Error("분류 체계(taxonomy)가 비어 있습니다.");
    err.status = 400;
    throw err;
  }
  // 토큰 보호 — 과거 아이디어는 최대 60개까지만 회피 힌트로 사용
  const avoidArr = Array.isArray(body?.avoid)
    ? body.avoid.map((s) => String(s || "").trim()).filter(Boolean).slice(0, 60)
    : [];
  const avoidBlock = avoidArr.length
    ? `\n이미 만들어 본 아이디어다. 이것들과 겹치지 말고 완전히 새로운 각도로:\n- ${avoidArr.join("\n- ")}\n`
    : "";

  const userMessage = `업종: "${industry}"

아래 포맷 목록의 각 포맷(id)마다, 이 업종에 딱 맞는 숏폼 아이디어를 정확히 1개씩 만들어라.
items 에는 아래 모든 포맷 id 를 빠짐없이 포함한다.

포맷 목록:
${outline}
${avoidBlock}
출력 JSON(정확히 이 형식):
{
  "items": [ {"f":"a1","i":"진흙 범벅 → 출고 직전 광택샷"} ],
  "aces": ["에이스 formatId 5개"],
  "avoid": ["비추 formatId 2~3개"],
  "why": "이 업종 에이스가 왜 강한지 한 줄",
  "tip": "어디부터 시작하면 좋은지 한 줄 추천"
}
JSON 외에 어떤 글자도 출력하지 마라.`;

  const out = await callClaude({
    userMessage,
    maxTokens: 8000,
    temperature: avoidArr.length ? 1.0 : 0.9,   // 재생성이면 더 과감하게
  });

  // 정규화 — 유효한 id 만, 중복 제거, 길이 제한
  const seen = new Set();
  const items = [];
  (Array.isArray(out?.items) ? out.items : []).forEach((it) => {
    const f = String((it && (it.f || it.id || it.formatId)) || "").trim();
    let i = String((it && (it.i || it.idea || it.text)) || "").trim();
    if (!f || !i || !ids.has(f) || seen.has(f)) return;
    if (i.length > 90) i = i.slice(0, 90);
    seen.add(f);
    items.push({ f, i });
  });
  if (!items.length) {
    const err = new Error("아이디어를 생성하지 못했습니다. 다시 시도해 주세요.");
    err.status = 502;
    throw err;
  }
  const onlyIds = (arr, max) =>
    (Array.isArray(arr) ? arr : [])
      .map((x) => String(x || "").trim())
      .filter((x) => ids.has(x))
      .filter((x, k, a) => a.indexOf(x) === k)
      .slice(0, max);

  const aces = onlyIds(out?.aces, 6);
  const aceSet = new Set(aces);
  const avoid = onlyIds(out?.avoid, 4).filter((x) => !aceSet.has(x));   // 에이스로 뽑힌 건 비추에서 제외
  return {
    ok: true,
    industry,
    items,
    aces,
    avoid,
    why: String(out?.why || "").trim().slice(0, 120),
    tip: String(out?.tip || "").trim().slice(0, 120),
  };
}

// ── 디스패처 ──
async function handleEasyIdeas(body) {
  const action = String(body?.action || "generate").trim();
  try {
    if (action === "generate") {
      const json = await generate(body);
      return { status: 200, json };
    }
    return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action}` } };
  } catch (e) {
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return { status, json: { ok: false, error: e?.message || "서버 오류" } };
  }
}

module.exports = { handleEasyIdeas, generate, buildOutline };
