/**
 * 인로그 신뢰구축형 상담 챗봇 — 코어 로직 (MVP 1단계)
 *
 * 목표: AI가 즉답·상황이해·불안완화·정보수집(목적/공간/지역/평수/희망일)을 하고,
 *       관심이 높아지면 사람(사장)에게 넘긴다. AI는 가격/일정을 절대 확정하지 않는다.
 *
 * 저장: 별도 테이블 없이 app_state(anon 개방, service_role 쓰기) 행으로.
 *   - chatc_<token>            대화 메타 {token, mode:'ai'|'human'|'closed', lead, handoff, summary, ts...}
 *   - chatm_<token>_<ms>_<r>   메시지 {role:'user'|'ai'|'human', text, ts}
 *
 * 환경변수: ANTHROPIC_API_KEY(필수), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY(필수), CHAT_MODEL(선택)
 */
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const HISTORY_LIMIT = 24;

function sbHeaders() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요");
  return { url, headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}
async function sb(path, init = {}) {
  const h = sbHeaders();
  const r = await fetch(`${h.url}/rest/v1/${path}`, { ...init, headers: { ...h.headers, ...(init.headers || {}) }, cache: "no-store" });
  let body = null; try { body = await r.json(); } catch (_) {}
  if (!r.ok) throw new Error(`Supabase ${path} (${r.status}): ${JSON.stringify(body || {})}`);
  return body;
}

const safeToken = (t) => String(t || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48);

async function loadConv(token) {
  const rows = await sb(`app_state?id=eq.chatc_${encodeURIComponent(token)}&select=payload&limit=1`);
  return (Array.isArray(rows) && rows[0] && rows[0].payload) || null;
}
async function saveConv(token, payload) {
  await sb(`app_state`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ id: `chatc_${token}`, payload }]) });
}
async function loadMessages(token) {
  const rows = await sb(`app_state?id=like.chatm_${encodeURIComponent(token)}_%25&select=id,payload`);
  return (rows || []).map((r) => ({ id: r.id, ...(r.payload || {}) }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
}
async function addMessage(token, role, text) {
  const ts = Date.now();
  const id = `chatm_${token}_${String(ts).padStart(15, "0")}_${Math.random().toString(36).slice(2, 6)}`;
  await sb(`app_state`, { method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ id, payload: { role, text: String(text || ""), ts } }]) });
  return { id, role, text, ts };
}

const SYSTEM = `당신은 인테리어 촬영 업체 "인로그"의 상담 도우미 AI입니다. 인스타그램 광고를 보고 문의한 잠재고객과 웹 채팅으로 대화합니다.

## 정체성 — 반드시 지킬 것
- 당신은 AI 상담 도우미입니다. 사람인 척하지 마세요. (첫 인사는 화면이 이미 안내했으니 반복 고지는 불필요)
- 목표는 "설득해서 계약"이 아니라 "고객 상황을 이해하고, 불안을 낮추고, 필요한 정보를 자연스럽게 정리한 뒤, 적절한 순간에 실제 촬영 담당자(사장님)에게 넘기는 것"입니다.

## 대화 원칙
- 질문 1개 → 도움 1개. 고객 답을 받으면 그 상황에 맞는 짧고 구체적인 조언을 먼저 주고, 그다음 필요한 정보를 하나만 물어보세요. 연속 질문은 최대 2번.
- 폼처럼 캐묻지 마세요. "지역? 평수? 날짜?"를 연달아 묻는 건 금지.
- show don't sell: "저희 잘합니다" 같은 자기자랑 금지. 고객 공간에 맞는 실제 팁(예: 사용중 카페 → 계산대 주변만 정리해도 깔끔, 준공 → 자연광 시간대, 거주중 → 생활용품 최소 정리)으로 전문성을 보여주세요.
- 톤: 담백하고 구체적이고 존댓말. 과한 친근함·느끼함 금지("정말 멋진 공간일 것 같아요" 같은 표현 금지). 확실하지 않은 건 솔직히 말하세요.
- 짧게. 2~4문장 이내. 이모지는 있어도 1개 이하.

## 수집할 정보 (대화 속에서 자연스럽게, 순서대로)
촬영 목적 → 공간 종류 → 지역 → 대략 평수 → 원하는 시기. 사진/영상 선택은 너무 일찍 묻지 마세요.

## 절대 금지 (이건 사람만 함)
- 최종 가격 확정, 할인 약속, 출장비 면제, 특정 날짜 예약 확정, 촬영자 배정, 결과 보장.
- 가격은 "공개 기준가"만 말할 수 있습니다: "사진 촬영은 45평 이하 기준 15만원부터예요." 정확한 금액은 "담당자가 확인 후 안내드려요"로 넘기세요.
- 숫자(정확한 견적/특정 가능일)를 지어내지 마세요.

## 촬영 가능 범위 (사실)
- 지역: 서울·경기(사진·영상 모두), 평택·오산·천안·아산(사진만, 평일). 그 외 지역은 현재 어려움.
- 사진 기본 15만원(45평 이하), 영상 추가는 10만원부터. 정확한 금액은 담당자 확인.

## 사람(담당자)에게 넘겨야 하는 순간 → handoff=true
- 고객이 사람과 얘기하고 싶어함 / 불만·항의 / 예약변경·결제 / 개인정보·계약 질문
- 구체적 날짜를 말함 / "예약하고 싶다"·"진행하고 싶다" / 가격을 두 번째로 물음 / 포트폴리오·촬영사례 요청 / 경쟁사 비교
- 걱정을 반복함("잘 나올까요", "전에 다른 데서 실패했어요", "급해서 불안해요")
- 지역·평수·공간이 모두 파악되고 관심 신호가 있음 (대략 대화 4~8번째)
handoff=true일 땐 reply에서 "담당자가 직접 확인해서 이어서 도와드릴게요" 같이 자연스럽게 연결을 안내하세요. (단, 아직 사람이 붙기 전이므로 "잠시만요" 톤)

## 출력 형식 — 반드시 아래 JSON만 출력 (다른 텍스트 없이)
{
  "reply": "고객에게 보낼 답변",
  "lead": { "purpose": "", "space": "", "region": "", "area": "", "date": "", "concern": "" },
  "handoff": false,
  "handoff_reason": ""
}
lead는 지금까지 대화에서 파악된 항목만 채우고 모르는 건 빈 문자열로 두세요.`;

function parseJson(text) {
  let t = String(text || "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) t = t.slice(a, b + 1);
  try { return JSON.parse(t); } catch (_) { return { reply: String(text || "").trim() || "죄송해요, 잠시 후 다시 말씀해 주시겠어요?", lead: {}, handoff: false }; }
}

async function callClaude(history, systemText) {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || "").trim();
  if (!apiKey) { const e = new Error("ANTHROPIC_API_KEY 미설정"); e.status = 500; throw e; }
  const model = String(process.env.CHAT_MODEL || "").trim() || DEFAULT_MODEL;
  const messages = history.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text || "" }))
    .filter((m) => m.content);
  const r = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION },
    body: JSON.stringify({ model, max_tokens: 700,
      system: [{ type: "text", text: systemText, cache_control: { type: "ephemeral" } }],
      messages }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(`Claude 오류: ${data?.error?.message || r.statusText}`); e.status = r.status; throw e; }
  let text = ""; if (Array.isArray(data?.content)) for (const c of data.content) if (c?.type === "text") text += c.text;
  return parseJson(text);
}

/**
 * POST /api/chat 처리
 * body: { token, text, action }
 *   action 'send'  : 고객 메시지 저장 → (mode=ai면) AI 응답 생성·저장 → 전체 메시지 반환
 *   action 'init'  : 대화 없으면 만들고 AI 첫인사 저장 → 메시지 반환
 */
async function handleChat(body) {
  const b = body && typeof body === "object" ? body : {};
  const token = safeToken(b.token);
  if (!token) return { status: 400, json: { ok: false, error: "token 필요" } };
  const action = b.action === "init" ? "init" : "send";
  const nowIso = new Date().toISOString();

  let conv = await loadConv(token);
  if (!conv) {
    conv = { token, mode: "ai", lead: {}, handoff: false, summary: "", created_at: nowIso, updated_at: nowIso };
    await saveConv(token, conv);
  }

  if (action === "init") {
    const msgs = await loadMessages(token);
    if (!msgs.length) {
      const greet = "안녕하세요, 인로그 촬영 상담 도우미예요 🙂\n어떤 공간을 촬영하려고 하시는지, 편하게 말씀해 주세요. 준비나 비용도 상황에 맞게 안내드릴게요.";
      const m = await addMessage(token, "ai", greet);
      return { status: 200, json: { ok: true, mode: conv.mode, messages: [m] } };
    }
    return { status: 200, json: { ok: true, mode: conv.mode, messages: msgs } };
  }

  const text = String(b.text || "").trim();
  if (!text) return { status: 400, json: { ok: false, error: "text 필요" } };
  await addMessage(token, "user", text);
  conv.updated_at = nowIso;
  conv.last_customer_at = nowIso;

  // 사람이 응대 중이면 AI는 생성하지 않는다 (핸드오프 후 AI 침묵)
  if (conv.mode === "human") {
    await saveConv(token, conv);
    return { status: 200, json: { ok: true, mode: "human", messages: await loadMessages(token) } };
  }

  const history = (await loadMessages(token)).slice(-HISTORY_LIMIT);
  let out;
  try { out = await callClaude(history, SYSTEM); }
  catch (e) { return { status: e.status || 502, json: { ok: false, error: e.message } }; }

  const reply = String(out.reply || "").trim() || "네, 조금 더 자세히 말씀해 주시겠어요?";
  await addMessage(token, "ai", reply);
  // lead 병합 (빈 값은 유지)
  conv.lead = conv.lead || {};
  if (out.lead && typeof out.lead === "object") {
    for (const k of ["purpose", "space", "region", "area", "date", "concern"]) {
      const v = String(out.lead[k] || "").trim();
      if (v) conv.lead[k] = v;
    }
  }
  if (out.handoff) { conv.handoff = true; conv.handoff_reason = String(out.handoff_reason || "").slice(0, 200); conv.handoff_at = nowIso; }
  await saveConv(token, conv);

  return { status: 200, json: { ok: true, mode: conv.mode, handoff: !!conv.handoff, lead: conv.lead, messages: await loadMessages(token) } };
}

module.exports = { handleChat };
