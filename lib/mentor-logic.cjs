/**
 * AI 경영 멘토 — Express(server.js) / Vercel(api/mentor.js) 공용 로직
 *
 * "나를 큰 기업의 대표로 키워주는 멘토/상사/스승".
 * 일반 챗봇과 다른 점은 (1) 내 사업을 기억하고, (2) 한 명이 아니라
 * 4인 경영 자문단이 토론한 뒤 의장이 종합하며, (3) 과제를 내주고
 * 다음에 점검한다는 것. 모든 기억은 Supabase(mentor_* 테이블)에 저장된다.
 *
 * POST JSON:
 *   { action: "chat",        message: string }              // 멘토에게 상담
 *   { action: "get_state" }                                  // 프로필+과제+최근대화 조회
 *   { action: "update_profile", profile: {...} }             // 사업 정보 수정
 *   { action: "complete_assignment", id: number }            // 과제 완료 처리
 *   { action: "add_assignment", title, detail?, due_date? }  // 과제 직접 추가
 *
 * 환경 변수:
 *   - ANTHROPIC_API_KEY            (필수)
 *   - MENTOR_MODEL                 (선택, 기본 claude-sonnet-4-6)
 *   - SUPABASE_URL                 (필수)
 *   - SUPABASE_SERVICE_ROLE_KEY    (필수)
 */

const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const OWNER_ID = "me";
const HISTORY_LIMIT = 20; // 멘토에게 같이 넘길 최근 대화 수

// ------------------------------------------------------------
// Supabase REST (다른 lib 와 동일한 service-role fetch 패턴)
// ------------------------------------------------------------
function getSupabaseHeaders() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error("멘토 기억 저장을 위해 SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

async function sb(path, init = {}) {
  const h = getSupabaseHeaders();
  const r = await fetch(`${h.url}/rest/v1/${path}`, {
    ...init,
    headers: { ...h.headers, ...(init.headers || {}) },
    cache: "no-store",
  });
  let body = null;
  try {
    body = await r.json();
  } catch (_) {}
  if (!r.ok) {
    const msg = typeof body?.message === "string" ? body.message : JSON.stringify(body || {});
    throw new Error(`Supabase ${path} (${r.status}): ${msg}`);
  }
  return body;
}

// ------------------------------------------------------------
// 기억 로드/저장
// ------------------------------------------------------------
async function loadProfile() {
  const rows = await sb(`mentor_profile?owner_id=eq.${OWNER_ID}&limit=1`);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function loadOpenAssignments() {
  return sb(
    `mentor_assignments?owner_id=eq.${OWNER_ID}&status=eq.open&order=created_at.asc`
  );
}

async function loadRecentMessages(limit = HISTORY_LIMIT) {
  const rows = await sb(
    `mentor_messages?owner_id=eq.${OWNER_ID}&order=created_at.desc&limit=${limit}`
  );
  return Array.isArray(rows) ? rows.reverse() : []; // 오래된→최신
}

async function insertMessage(role, content, panel) {
  await sb("mentor_messages", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([
      { owner_id: OWNER_ID, role, content, panel: panel || {} },
    ]),
  });
}

async function insertAssignments(items) {
  const rows = (Array.isArray(items) ? items : [])
    .map((a) => ({
      owner_id: OWNER_ID,
      title: String(a?.title || "").trim(),
      detail: String(a?.detail || "").trim(),
      due_date: normalizeDate(a?.due_date),
    }))
    .filter((a) => a.title);
  if (!rows.length) return [];
  return sb("mentor_assignments", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
}

async function applyProfileUpdates(updates) {
  const allowed = ["business", "team", "customers", "goals", "challenges"];
  const patch = {};
  for (const k of allowed) {
    if (typeof updates?.[k] === "string" && updates[k].trim()) patch[k] = updates[k].trim();
  }
  if (!Object.keys(patch).length) return;
  await sb(`mentor_profile?owner_id=eq.${OWNER_ID}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

function normalizeDate(v) {
  const s = String(v || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

// ------------------------------------------------------------
// 시스템 프롬프트 — 4인 자문단 + 경영 사고 프레임워크 (정적 = 캐시 대상)
// ------------------------------------------------------------
const PANEL_SYSTEM = [
  "당신은 대표님을 '소상공인에서 대기업 대표로' 단계적으로 성장시키는 책임을 맡은 상사이자 멘토, 코치입니다.",
  "세계적인 기업을 키워낸 경영자들의 사고방식을 갖고 있습니다.",
  "",
  "[가장 중요한 원칙 — 주도권은 당신에게 있다]",
  "- 이것은 대표가 묻고 당신이 답하는 Q&A가 아니다. 거꾸로다. **당신이 진단하고, 묻고, 지시하고, 대표는 답하고 보고한다.**",
  "- 대표는 경영 지식과 상상력이 부족하다고 스스로 말했다. 그러니 '무엇을 하고 싶으세요?' 같은 막연하고 열린 질문은 금지. 대신 **답하기 쉬운 구체적 질문**을 하거나, **선택지를 제시**하거나, **할 일을 분명히 지시**하라.",
  "- 당신이 회사의 상사라면 부하 직원에게 어떻게 하겠는가? 상황을 파악하고 → 다음 할 일을 정해주고 → 결과를 보고받는다. 그 방식으로 대표를 대하라.",
  "",
  "[스텝 바이 스텝 — 절대 규칙]",
  "- 한 번에 한 걸음. 한 번의 응답에서 **새 과제는 보통 1개**, 많아도 2개. 절대 쏟아붓지 마라.",
  "- 과제는 반드시 **대표의 현재 수준에 맞는 작고 구체적이며 이번 주에 실제로 끝낼 수 있는 것**이어야 한다. 수준에 안 맞는 높고 거창한 과제는 금지.",
  "- 대표가 한 단계를 해내면 칭찬하고 다음 한 단계로 올린다. 못 했으면 더 쉽게 쪼개준다.",
  "- 큰 목표(대기업)는 마음속에 두되, 대표에게는 늘 '지금 당장의 다음 한 걸음'만 제시한다.",
  "",
  "[내부 자문 회의 — 4명의 위원]",
  "당신은 결정을 내리기 전, 머릿속에서 4명의 전문가 회의를 거친다. 이 회의 내용은 '근거'로 따로 보여준다.",
  "1) 성장 전략가: 매출·시장 확장. 단위경제, 가격, 새 수익원, 차별화.",
  "2) 운영·시스템 전문가: 대표 없이도 굴러가는 회사. 표준화·문서화·자동화, 병목 제거.",
  "3) 사람·조직 전문가: 채용·교육·위임. 사람으로 레버리지 만들기.",
  "4) 재무 전문가: 현금흐름·마진·재투자·위험. 숫자로 본 진짜 문제.",
  "→ 4명의 의견을 종합해, 당신(상사)은 대표에게 **하나의 분명한 목소리**로 말한다.",
  "",
  "[경영 사고 원칙]",
  "- 거꾸로 일하기 / 레버리지 / 병목 우선 / 숫자로 측정 / 싸게 검증하는 작은 실험.",
  "",
  "[대화 운영]",
  "- 매 응답은 반드시 (a) 대표가 답할 구체적 질문 하나, 또는 (b) 분명한 지시 + '하면 보고해 달라'로 끝낸다. 대화가 멈추지 않게 당신이 계속 끌고 간다.",
  "- 대표의 사업 정보가 부족하면(아래 [내 사업]에 미입력이 많으면), 먼저 현황을 파악하는 쉬운 질문부터 하나씩 던져 채워나가라. 한 번에 하나씩만 묻는다.",
  "- 대표가 보고하면: 먼저 평가/피드백 → 그다음 한 걸음.",
  "- 한국어로, 따뜻하지만 단호하게. 대표를 진짜 성장시킬 책임감으로.",
  "",
  "[출력 형식] — 반드시 아래 JSON 하나만 출력한다. 코드블록/설명 없이 순수 JSON.",
  "{",
  '  "council": [',
  '    {"role": "성장 전략가", "take": "이 지시/질문을 뒷받침하는 의견 (1~3문장)"},',
  '    {"role": "운영·시스템 전문가", "take": "..."},',
  '    {"role": "사람·조직 전문가", "take": "..."},',
  '    {"role": "재무 전문가", "take": "..."}',
  "  ],",
  '  "message": "상사로서 대표에게 하는 말. (보고가 있으면) 평가 → 지금 상황 진단 → 다음 한 걸음/질문. 따뜻하고 분명하게.",',
  '  "ask": "이번에 대표가 답해야 할 핵심 질문 한 가지. 답하기 쉽게 구체적으로. 질문이 아니라 지시만 할 때는 빈 문자열.",',
  '  "assignments": [{"title": "지시할 과제(작고 구체적)", "detail": "어떻게 하는지 단계까지", "due_date": "YYYY-MM-DD 또는 null"}],',
  '  "profile_updates": {"business": "대화 중 새로 알게 된 사업 정보가 있으면만", "team": "...", "customers": "...", "goals": "...", "challenges": "..."},',
  '  "stage": "현재 성장 단계 한 줄 (예: \\"0단계 · 현황 파악\\", \\"1단계 · 매출/시간 기록 시작\\")"',
  "}",
  "- assignments 는 보통 1개(많아도 2개). 이번 턴이 질문/현황파악 단계라 아직 과제를 줄 때가 아니면 빈 배열.",
  "- profile_updates 는 대표가 명시적으로 알려준 정보만. 없으면 빈 객체.",
].join("\n");

function buildMemoryBlock(profile, assignments) {
  const p = profile || {};
  const lines = [
    "[내 사업 — 대표님의 현재 상황]",
    `- 사업: ${p.business || "(미입력)"}`,
    `- 팀/인력: ${p.team || "(미입력)"}`,
    `- 고객: ${p.customers || "(미입력)"}`,
    `- 목표: ${p.goals || "(미입력)"}`,
    `- 고민/한계: ${p.challenges || "(미입력)"}`,
    "",
    "[지난 과제 — 멘토가 이전에 내줬고 아직 진행 중인 것]",
  ];
  if (Array.isArray(assignments) && assignments.length) {
    for (const a of assignments) {
      const due = a.due_date ? ` (기한 ${a.due_date})` : "";
      lines.push(`- #${a.id} ${a.title}${due}: ${a.detail || ""}`);
    }
    lines.push("");
    lines.push("→ 위 과제의 진행 상황을 먼저 점검(보고 요청/평가)한 뒤 다음 한 걸음으로 넘어가라.");
  } else {
    lines.push("- (아직 내준 과제 없음)");
  }
  const missing = ["business", "team", "customers", "goals", "challenges"].filter((k) => !String(p[k] || "").trim());
  if (missing.length) {
    lines.push("");
    lines.push(`→ [내 사업] 중 미입력 항목(${missing.join(", ")})이 있다. 아직 잘 모르는 부분이니, 답하기 쉬운 질문으로 하나씩 현황부터 파악하라.`);
  }
  return lines.join("\n");
}

// ------------------------------------------------------------
// Claude 호출 (프롬프트 캐싱 적용)
// ------------------------------------------------------------
function resolveModel(b) {
  return (
    (typeof b?.model === "string" && b.model.trim()) ||
    String(process.env.MENTOR_MODEL || "").trim() ||
    DEFAULT_MODEL
  );
}

async function callClaude({ model, memoryBlock, history, userMessage }) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("ANTHROPIC_API_KEY 가 설정되어 있지 않습니다.");
    err.status = 500;
    throw err;
  }

  const messages = [];
  for (const m of history) {
    if (!m || !m.content) continue;
    messages.push({
      role: m.role === "user" ? "user" : "assistant",
      content: m.role === "user" ? m.content : assistantContentFromRow(m),
    });
  }
  messages.push({ role: "user", content: userMessage });

  const r = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: [
        // 정적 페르소나/프레임워크 — 캐시해서 반복 호출 비용/지연 절감
        { type: "text", text: PANEL_SYSTEM, cache_control: { type: "ephemeral" } },
        // 매번 달라지는 기억(프로필/과제)
        { type: "text", text: memoryBlock },
      ],
      messages,
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
  return parseMentorJson(text);
}

// 멘토 응답 row 를 Claude 에게 다시 줄 때, 본문(+질문) 위주로 압축해 전달
function assistantContentFromRow(m) {
  const p = m.panel && typeof m.panel === "object" ? m.panel : {};
  const msg = typeof p.message === "string" && p.message.trim() ? p.message.trim() : (m.content || "");
  const ask = typeof p.ask === "string" && p.ask.trim() ? `\n\n[질문] ${p.ask.trim()}` : "";
  return msg + ask;
}

function parseMentorJson(raw) {
  const s = String(raw || "").trim();
  // 혹시 코드블록으로 감싸 나오면 제거
  const cleaned = s.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch (_) {
    // 첫 { 부터 마지막 } 까지만 잘라 재시도
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        obj = JSON.parse(cleaned.slice(a, b + 1));
      } catch (_) {}
    }
  }
  if (!obj || typeof obj !== "object") {
    // JSON 파싱 실패 시에도 최소한 본문은 살린다
    return {
      council: [],
      message: cleaned || "(응답을 해석하지 못했습니다. 다시 시도해 주세요.)",
      ask: "",
      assignments: [],
      profile_updates: {},
      stage: "",
      _parse_failed: true,
    };
  }
  return {
    // council(신규)·panel(구버전 호환) 둘 다 수용
    council: Array.isArray(obj.council) ? obj.council : (Array.isArray(obj.panel) ? obj.panel : []),
    message: typeof obj.message === "string" ? obj.message : (typeof obj.synthesis === "string" ? obj.synthesis : ""),
    ask: typeof obj.ask === "string" ? obj.ask : "",
    assignments: Array.isArray(obj.assignments) ? obj.assignments : [],
    profile_updates: obj.profile_updates && typeof obj.profile_updates === "object" ? obj.profile_updates : {},
    stage: typeof obj.stage === "string" ? obj.stage : "",
  };
}

// ------------------------------------------------------------
// 액션 핸들러
// ------------------------------------------------------------
// 대표가 메시지 없이 들어오거나 '다음 지시'를 누르면, 멘토가 주도해서 먼저 말을 건다.
const KICKOFF_PROMPT =
  "(대표가 멘토 화면에 접속했습니다. 이건 대표의 발언이 아니라 시스템 신호입니다. " +
  "상사로서 당신이 먼저 주도하세요. [내 사업]과 [지난 과제], 대화기록을 보고 " +
  "현재 상태를 점검한 뒤, 진행 중 과제가 있으면 보고를 요청하고, 없으면 다음 한 걸음을 지시하거나 " +
  "현황 파악에 필요한 답하기 쉬운 질문을 하나만 하세요. 한 번에 하나씩만.)";

async function handleChat(b) {
  const rawMessage = typeof b.message === "string" ? b.message.trim() : "";
  const isKickoff = !rawMessage; // 메시지가 없으면 멘토가 먼저 주도

  const [profile, assignments, history] = await Promise.all([
    loadProfile(),
    loadOpenAssignments(),
    loadRecentMessages(),
  ]);

  const memoryBlock = buildMemoryBlock(profile, assignments);
  const model = resolveModel(b);
  const userMessage = isKickoff ? KICKOFF_PROMPT : rawMessage;
  const result = await callClaude({ model, memoryBlock, history, userMessage });

  // 기억에 저장: (대표의 실제 발언일 때만 user 저장) → 멘토 응답
  if (!isKickoff) await insertMessage("user", rawMessage);
  await insertMessage("mentor", result.message, {
    council: result.council,
    message: result.message,
    ask: result.ask,
    stage: result.stage,
  });

  // 멘토가 내린 새 과제 / 프로필 변화 반영
  const createdAssignments = await insertAssignments(result.assignments);
  await applyProfileUpdates(result.profile_updates);

  return {
    status: 200,
    json: {
      ok: true,
      council: result.council,
      message: result.message,
      ask: result.ask,
      stage: result.stage,
      new_assignments: createdAssignments,
      model,
    },
  };
}

async function handleGetState() {
  const [profile, assignments, history] = await Promise.all([
    loadProfile(),
    loadOpenAssignments(),
    loadRecentMessages(),
  ]);
  return {
    status: 200,
    json: { ok: true, profile, assignments, messages: history },
  };
}

async function handleUpdateProfile(b) {
  await applyProfileUpdates(b.profile || {});
  const profile = await loadProfile();
  return { status: 200, json: { ok: true, profile } };
}

async function handleCompleteAssignment(b) {
  const id = Number(b.id);
  if (!Number.isFinite(id)) {
    return { status: 400, json: { ok: false, error: "id 가 필요합니다." } };
  }
  await sb(`mentor_assignments?id=eq.${id}&owner_id=eq.${OWNER_ID}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "done", completed_at: new Date().toISOString() }),
  });
  return { status: 200, json: { ok: true } };
}

async function handleAddAssignment(b) {
  const created = await insertAssignments([
    { title: b.title, detail: b.detail, due_date: b.due_date },
  ]);
  if (!created.length) {
    return { status: 400, json: { ok: false, error: "title 이 필요합니다." } };
  }
  return { status: 200, json: { ok: true, assignment: created[0] } };
}

async function handleMentorRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const action = String(b.action || "chat").toLowerCase();
  try {
    switch (action) {
      case "chat":
        return await handleChat(b);
      case "get_state":
        return await handleGetState();
      case "update_profile":
        return await handleUpdateProfile(b);
      case "complete_assignment":
        return await handleCompleteAssignment(b);
      case "add_assignment":
        return await handleAddAssignment(b);
      default:
        return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action}` } };
    }
  } catch (e) {
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return { status, json: { ok: false, error: e?.message || "서버 오류" } };
  }
}

module.exports = { handleMentorRequest };
