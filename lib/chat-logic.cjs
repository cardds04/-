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
const { hashPassword } = require("./customer-auth-logic.cjs");
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const HISTORY_LIMIT = 24;
const CUSTOMER_URL = "https://sc-pink.vercel.app/customer.html";
const TEMP_PW = "1234";

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

const KAKAO_PENDING_ID = "kakao_pending";

// AUTO- 코드 (사이트 관례와 동일)
const autoCode = () => `AUTO-${Date.now().toString(36).toUpperCase()}`;

async function findCompany(name) {
  const q = encodeURIComponent(name);
  const rows = await sb(`company_directory?or=(login_id.eq.${q},name.eq.${q})&select=id,login_id,name&limit=1`);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/** 상호명으로 앞으로의 예약 + 담당 작가 연락처 조회 (schedules ↔ writers 2-step, service_role) */
async function lookupBooking(companyName) {
  const nm = String(companyName || "").trim();
  if (!nm) return null;
  const today = ymd(new Date());
  let sched = [];
  try {
    sched = await sb(`schedules?select=date_key,time_key,place,writer_name,pyeong,composition,source,status` +
      `&company_name=eq.${encodeURIComponent(nm)}&date_key=gte.${today}&source=eq.active&order=date_key.asc&limit=20`);
  } catch (_) { return { error: true }; }
  sched = (sched || []).filter((r) => String(r.status || "") !== "refund");
  // 담당 작가 연락처
  const names = [...new Set(sched.map((r) => String(r.writer_name || "").trim()).filter((n) => n && n !== "작가미정"))];
  let phoneByName = {};
  if (names.length) {
    try {
      const inList = names.map((n) => `"${n}"`).join(",");
      const ws = await sb(`writers?select=name,phone&name=in.(${encodeURIComponent(inList)})&is_active=eq.true`);
      for (const w of ws || []) if (w.name) phoneByName[String(w.name).trim()] = String(w.phone || "").trim();
    } catch (_) {}
  }
  return { bookings: sched.map((r) => ({
    date: r.date_key, time: r.time_key, place: r.place, pyeong: r.pyeong, composition: r.composition,
    writer: r.writer_name, writerPhone: phoneByName[String(r.writer_name || "").trim()] || "",
  })) };
}

function bookingBlock(res, companyName) {
  if (!res || res.error) return `\n(지금은 예약 조회가 어려워요. 담당자가 확인해 안내드릴게요.)`;
  const b = res.bookings || [];
  if (!b.length) return `\n${companyName}님으로 예정된 촬영 일정이 아직 없어요. 새로 예약을 원하시면 말씀해 주세요!`;
  const lines = b.map((x) => {
    const w = x.writer && x.writer !== "작가미정"
      ? `담당 작가 ${x.writer}${x.writerPhone ? " (" + x.writerPhone + ")" : ""}`
      : "담당 작가 배정 예정";
    return `• ${x.date} ${x.time || ""} · ${x.place || "장소 미정"}${x.pyeong ? " · " + x.pyeong + "평" : ""}\n  ${w}`;
  });
  return `\n${companyName}님 예정 촬영 일정이에요.\n\n${lines.join("\n")}`;
}

async function kakaoPendingAdd(entry) {
  try {
    const rows = await sb(`app_state?id=eq.${KAKAO_PENDING_ID}&select=payload&limit=1`);
    const list = (rows[0] && rows[0].payload && rows[0].payload.list) || [];
    if (!list.some((e) => e && e.name === entry.name)) list.push(entry);
    await sb(`app_state`, { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ id: KAKAO_PENDING_ID, payload: { list } }]) });
  } catch (_) {}
}

/** 상호+연락처로 사이트 계정 발급(company_directory) + 카톡방 오픈 대기 등재. 이미 있으면 재사용. */
async function registerCompany(name, phone, lead) {
  const nm = String(name || "").trim();
  const ph = String(phone || "").trim();
  if (!nm || !ph) return { ok: false };
  let exists = null;
  try { exists = await findCompany(nm); } catch (_) {}
  if (!exists) {
    try {
      await sb(`company_directory`, { method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify([{ name: nm, customer_phone: ph, code: autoCode(), site_type: "inlog",
          login_id: nm, password_hash: hashPassword(TEMP_PW), password: "" }]) });
    } catch (e) { return { ok: false, error: e.message }; }
  }
  const L = lead || {};
  const bits = [L.region, L.space, L.area && (String(L.area).replace(/평\s*$/, "") + "평"), L.date && ("희망 " + L.date)].filter(Boolean);
  await kakaoPendingAdd({ name: nm, phone: ph, region: L.region || "", area: L.area || "",
    composition: L.purpose || "", ts: new Date().toISOString().slice(0, 16).replace("T", " "),
    memo: bits.join(" · "), source: "chat" });
  return { ok: true, login_id: nm, temp_password: TEMP_PW };
}

// ── 실시간 촬영 가능 일정 조회 (service_role 로 schedules 직접 집계) ──
const HOLIDAYS = new Set([
  "2026-01-01","2026-02-16","2026-02-17","2026-02-18","2026-03-01","2026-03-02","2026-05-05","2026-05-24",
  "2026-05-25","2026-06-06","2026-08-15","2026-08-17","2026-09-24","2026-09-25","2026-09-26","2026-09-28",
  "2026-10-03","2026-10-05","2026-10-09","2026-12-25","2027-01-01","2027-02-05","2027-02-06","2027-02-07",
  "2027-02-08","2027-02-09","2027-03-01","2027-05-05","2027-05-13",
]);
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

async function availabilityBlock(days = 12) {
  try {
    const today = new Date();
    const end = new Date(today); end.setDate(end.getDate() + days - 1);
    const start = ymd(today), endKey = ymd(end);
    const rows = await sb(`schedules?date_key=gte.${start}&date_key=lte.${endKey}&select=date_key,source,status`);
    const counts = {};
    for (const r of rows || []) {
      const src = String(r.source || ""), st = String(r.status || "");
      if (src === "deleted" || st === "hold" || st === "refund") continue;
      counts[r.date_key] = (counts[r.date_key] || 0) + 1;
    }
    let cfg = {};
    try {
      const s = await sb(`app_state?id=eq.global&select=payload&limit=1`);
      cfg = (s[0] && s[0].payload && s[0].payload.shared_limit_config_v1) || {};
    } catch (_) {}
    const wd = Number(cfg.weekdayLimit) || 8, hd = Number(cfg.holidayLimit) || 4;
    const extra = cfg.emergencyLimitAdditions || {};
    const lines = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today); d.setDate(d.getDate() + i);
      const key = ymd(d), dow = d.getDay();
      const red = dow === 0 || dow === 6 || HOLIDAYS.has(key);
      const limit = (red ? hd : wd) + (Number(extra[key]) || 0);
      const booked = counts[key] || 0;
      const left = Math.max(0, limit - booked);
      const label = i === 0 ? "오늘" : i === 1 ? "내일" : i === 2 ? "모레" : "";
      lines.push(`${key}(${DOW[dow]})${label ? " " + label : ""} 여유 ${left}${red ? " [주말/공휴일]" : ""}`);
    }
    return `\n\n## 실시간 촬영 가능 일정 (지금 조회한 실제 데이터, 오늘부터 ${days}일)\n${lines.join("\n")}\n` +
      `해석: 여유 2 이상 = 가능성 높음 / 여유 1 = 빠듯 / 여유 0 = 마감.\n` +
      `‼️날짜 문의는 이 데이터로 직접 답하세요. 단 "가능합니다(확정)"가 아니라 "현재 여유가 있어요, 최종 확정은 담당자가 해드려요" 톤으로.\n` +
      `‼️주말/공휴일은 서울·경기만 촬영 가능(평택·오산·천안·아산은 평일만). 목록에 없는 먼 날짜는 "확인해서 안내드릴게요"로.`;
  } catch (e) {
    return "\n\n## 실시간 일정\n(지금은 일정 조회가 안 돼요. 날짜 문의는 담당자가 확인해 안내드린다고 답하세요.)";
  }
}

const SYSTEM = `당신은 인테리어 촬영 업체 "인픽"의 상담 도우미 AI입니다. 인스타그램 광고를 보고 문의한 잠재고객과 웹 채팅으로 대화합니다.

## 정체성 & 이 채팅의 역할 — 반드시 지킬 것
- 당신은 AI 상담 도우미입니다. 사람인 척하지 마세요.
- 이 웹 채팅은 "계속 상담하는 창구"가 아닙니다. 역할은: ①고객이 궁금해하는 걸 정확히 답해주며 신뢰를 쌓고 ②고객이 진행하고 싶어 하면 상호·연락처를 받아 사이트 계정을 발급하고 카카오톡 상담방으로 연결하는 것.
- 실제 상담·견적·예약 확정은 담당자(사장님)가 카카오톡에서 진행합니다.
- 단, 담당자가 자리를 비운 사이에도 일정·가격 같은 **간단한 문의는 여기서 저(AI)에게 언제든** 물어볼 수 있습니다 — 마무리할 때 이 점을 꼭 안내하세요.

## ‼️최우선 원칙 — 캐묻지 말 것
- **고객이 물어본 것에만 답하세요.** 정보를 얻으려고 먼저 질문하지 마세요.
- "지역이 어디세요?", "평수가 어떻게 되세요?", "언제 촬영하세요?" 같은 **되묻기 금지**. 고객이 말해주면 참고만 하고, 안 말하면 묻지 마세요.
- 답변에 물음표로 끝나는 문장을 붙이지 마세요. (유일한 예외는 아래 '마무리' 단계)
- 답을 하려면 정보가 꼭 필요한 경우에만, 딱 한 번 최소한으로 물어보세요.
  예: 평수를 모르는데 정확한 금액을 물으면 → "45평 이하 기준 15만원부터예요. 평수를 알려주시면 더 정확히 안내드릴게요." (질문이 아니라 안내 형태로)
- show don't sell: "저희 잘합니다" 같은 자기자랑 금지. 필요하면 고객 상황에 맞는 실제 팁(사용중 카페 → 계산대 주변 정리, 준공 → 자연광 시간대, 거주중 → 생활용품 최소 정리)을 곁들이세요. 단, 묻지 않은 걸 길게 늘어놓지 마세요.
- 톤: 담백하고 구체적이고 존댓말. 과한 친근함·느끼함 금지. 확실하지 않은 건 솔직히 말하세요.
- 짧게. 2~4문장 이내. 이모지는 있어도 1개 이하.

## 정보 수집 — 캐묻지 말고, 말해주면 기록만
고객이 대화 중 알려준 것(목적·공간·지역·평수·시기)은 lead에 기록하세요. **하지만 알아내려고 먼저 묻지 마세요.**

## ‼️마무리(등록) 흐름 — 여기서만 질문 허용
- **고객이 진행/예약 의사를 밝혔을 때만** (예: "예약할게요", "진행하고 싶어요", "어떻게 신청해요?") 상호와 연락처를 요청하세요.
  예: "진행 도와드릴게요! 카카오톡 상담방을 열어드리려고 하는데, 상호(업체명)와 연락 가능한 번호를 남겨주시겠어요?"
- 고객이 진행 의사를 안 밝혔으면 **절대 먼저 상호·연락처를 묻지 마세요.**
- **상호와 연락처를 모두 받으면** → action 을 "register" 로 출력하고, lead.name(상호)·lead.phone(연락처)을 채우세요.
  이때 reply 는 짧게만 쓰세요(예: "네, 바로 등록해드릴게요!"). **사이트 주소·아이디·비밀번호는 당신이 쓰지 말 것** — 시스템이 정확한 안내를 자동으로 이어붙입니다.
- 아직 상호나 연락처가 없으면 action 은 빈 문자열로 두고, 필요한 것만 하나 물어보세요.

## 절대 금지 (이건 사람만 함)
- 최종 가격 확정, 할인 약속, 출장비 면제, 특정 날짜 예약 확정, 촬영자 배정, 결과 보장.
- 가격은 "공개 기준가"만 말할 수 있습니다: "사진 촬영은 45평 이하 기준 15만원부터예요." 정확한 금액은 "담당자가 확인 후 안내드려요"로 넘기세요.
- 숫자(정확한 견적/특정 가능일)를 지어내지 마세요.

## ‼️지식 베이스 — 아래는 당신이 확실히 아는 사실입니다. 직접 자신 있게 답하세요
**‼️"담당자에게 연결해드릴게요"로 회피하지 마세요.** 아래로 답할 수 있는 건 전부 직접 답합니다.
담당자 연결은 ①고객이 진행/예약 의사를 밝혔을 때 ②불만·환불·특수조건 등 진짜 판단이 필요할 때만.

### 가격
- 사진: 45평 이하 **15만원**. 45평 초과 시 50평당 +5만원 (예: 46~95평 20만원, 96~145평 25만원)
- 영상 추가: 45평 이하 +10만원 / 46~100평 +13만원 / 101~150평 +16만원 / 이후 50평당 +3만원
- 숏폼: 1편 5만원, 10편 35만원(3.5만/편), 50편 150만원(3만/편), 100편 250만원(2.5만/편), 150편 300만원(2만/편)
- 사진+영상 예: 30평 → 15만+10만=25만원 / 60평 → 20만+13만=33만원
- 촬영 가능 지역(서울·경기·평택·오산·천안·아산)은 **출장비 없이 기본 요금으로 진행**됩니다. 별도 출장비를 안내하지 마세요.

### 지역 · 서비스
- 서울·경기: 사진·영상 모두 가능, **주말 촬영 가능**
- 평택·오산·천안·아산: **사진만** 가능(영상 불가), **평일만** 가능
- 그 외 지역: 현재 촬영 어려움

### 제공 · 일정
- 사진 약 50장 제공
- 납품: 촬영 후 **보통 5일, 최대 7일**
- 예약: 촬영 3일 전 권장. 단 내일·모레도 스케줄에 여유가 있으면 가능 (아래 실시간 일정 참고)
- 문의 전화: 070-8919-1274

### 숏폼(스토리형) 제작 의뢰 방법
- **인픽으로 촬영했던 현장**: **스케줄등록 어플(사이트) 하단의 [숏폼신청] 탭**에서 신청. 촬영한 곳을 고르고 ①'알아서 해주세요' 또는 ②'원하는 내용 넣기' 중 선택하면 끝. (‼️사이트 주소·URL을 직접 알려주지 말고, 항상 '스케줄등록 어플(사이트) 하단의 숏폼신청 탭'으로만 안내할 것)
- **인픽으로 촬영하지 않은 곳**: 같은 [숏폼신청] 탭에서 '인픽 촬영 현장이 아니에요'를 선택해 신청하되,
  영상/사진 자료를 **cardds04@naver.com** 메일로 보내주셔야 해요. 신청서에 아파트명(상가명)·지역·주소와 추가로 넣고 싶은 내용을 적으면 됩니다.
- 아직 계정이 없으면: 진행 의사를 밝히면 제가 바로 만들어드려요(상호+연락처만 있으면 됨).

### 기존 예약 확인·담당 작가 연락처
- 고객이 자기 예약 일정이나 담당 작가(연락처)를 물으면 **상호(업체명)를 확인한 뒤** action "check_booking"을 사용하세요 (아래 참고).
  상호를 이미 대화에서 말했다면 다시 묻지 말고 바로 조회하세요.

### 포트폴리오 (요청하면 바로 알려주세요)
- 사진: https://www.behance.net/b1f230eb
- 영상: https://youtube.com/channel/UCDWkbfMmEUSe4phAiyEc0Ug
- 숏폼: https://naver.me/50Bl4VTw

### 촬영 준비 팁 (물어보면)
- 영업 중 매장: 계산대 주변·테이블 위 소품만 정리해도 훨씬 깔끔
- 준공/입주 전: 자연광 잘 드는 오전~이른 오후가 유리, 조명 전부 점등
- 거주 중: 생활용품만 최소 정리 (전부 치울 필요 없음)

## 사람(담당자)에게 넘겨야 하는 순간 → handoff=true
- 고객이 사람과 얘기하고 싶어함 / 불만·항의 / 예약변경·결제 / 개인정보·계약 질문
- 구체적 날짜를 말함 / "예약하고 싶다"·"진행하고 싶다" / 가격을 두 번째로 물음 / 포트폴리오·촬영사례 요청 / 경쟁사 비교
- 걱정을 반복함("잘 나올까요", "전에 다른 데서 실패했어요", "급해서 불안해요")
- 지역·평수·공간이 모두 파악되고 관심 신호가 있음 (대략 대화 4~8번째)
handoff=true일 땐 reply에서 "담당자가 직접 확인해서 이어서 도와드릴게요" 같이 자연스럽게 연결을 안내하세요. (단, 아직 사람이 붙기 전이므로 "잠시만요" 톤)

## 출력 형식 — ‼️엄격
- 아래 JSON 객체 **하나만** 출력하세요. 앞뒤에 다른 텍스트·설명·코드블록(\`\`\`) 금지.
- ‼️reply 문자열 안에서 큰따옴표(") 를 쓰지 마세요. 강조가 필요하면 작은따옴표(') 나 낫표(「」) 를 쓰세요. (큰따옴표를 쓰면 JSON이 깨집니다)
{
  "reply": "고객에게 보낼 답변",
  "lead": { "purpose": "", "space": "", "region": "", "area": "", "date": "", "concern": "", "name": "", "phone": "" },
  "handoff": false,
  "handoff_reason": "",
  "action": ""
}
lead는 지금까지 대화에서 파악된 항목만 채우고 모르는 건 빈 문자열로 두세요. name은 상호(업체명), phone은 연락처입니다.
action 종류:
- "register": 상호+연락처를 모두 받아 사이트 계정을 발급할 때
- "check_booking": 고객이 **자기 예약 일정·담당 작가·작가 연락처**를 물었고 lead.name(상호)을 알 때. reply는 "예약을 확인해볼게요" 정도로 짧게 — 실제 예약 내용은 시스템이 자동으로 이어붙입니다. 상호를 모르면 action 없이 상호만 물어보세요(이때는 질문 허용).
- 그 외에는 빈 문자열.`;

function parseJson(raw) {
  const text = String(raw || "");
  // 1) 순수 JSON (코드펜스 제거 후)
  let t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) {
    try { const o = JSON.parse(t.slice(a, b + 1)); if (o && typeof o.reply === "string") return o; } catch (_) {}
  }
  // 2) reply 필드만 관대하게 추출 (내부 따옴표가 깨져도 ,"lead"/,"handoff" 앞까지)
  const rm = text.match(/"reply"\s*:\s*"([\s\S]*?)"\s*,\s*"(?:lead|handoff)"/);
  if (rm) {
    const reply = rm[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').trim();
    const lead = {};
    for (const k of ["purpose", "space", "region", "area", "date", "concern", "name", "phone"]) {
      const mm = text.match(new RegExp('"' + k + '"\\s*:\\s*"([^"]*)"'));
      if (mm && mm[1]) lead[k] = mm[1];
    }
    const am = text.match(/"action"\s*:\s*"([^"]*)"/);
    return { reply, lead, handoff: /"handoff"\s*:\s*true/.test(text), action: am ? am[1] : "" };
  }
  // 3) 프로즈 + json 블록이 섞인 경우 → json/코드펜스 제거하고 남은 자연문을 reply로
  const salv = text.replace(/```[\s\S]*?```/g, "").replace(/\{[\s\S]*\}\s*$/, "").trim();
  if (salv) return { reply: salv, lead: {}, handoff: false };
  return { reply: "네, 조금 더 자세히 말씀해 주시겠어요?", lead: {}, handoff: false };
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
      const greet = "안녕하세요, 저는 인픽 AI 챗봇 도우미예요 🙂\n촬영 비용·가능 지역·일정 같은 기본적인 질문은 전부 답변드릴 수 있습니다.\n무엇을 도와드릴까요?";
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
  // 매 턴 실시간 촬영 가능 일정을 주입 — 날짜 문의에 직접 답할 수 있게
  const availText = await availabilityBlock();
  try { out = await callClaude(history, SYSTEM + availText); }
  catch (e) { return { status: e.status || 502, json: { ok: false, error: e.message } }; }

  const reply = String(out.reply || "").trim() || "네, 조금 더 자세히 말씀해 주시겠어요?";
  await addMessage(token, "ai", reply);
  // lead 병합 (빈 값은 유지)
  conv.lead = conv.lead || {};
  if (out.lead && typeof out.lead === "object") {
    for (const k of ["purpose", "space", "region", "area", "date", "concern", "name", "phone"]) {
      const v = String(out.lead[k] || "").trim();
      if (v) conv.lead[k] = v;
    }
  }
  if (out.handoff) { conv.handoff = true; conv.handoff_reason = String(out.handoff_reason || "").slice(0, 200); conv.handoff_at = nowIso; }

  // ── 예약·작가 조회: 상호를 알면 실제 예약 내용을 조회해 답변 뒤에 붙인다 ──
  if (out.action === "check_booking" && conv.lead.name) {
    const res = await lookupBooking(conv.lead.name);
    await addMessage(token, "ai", bookingBlock(res, conv.lead.name).replace(/^\n/, ""));
  }

  // ── 마무리(등록): 상호+연락처가 있고 '등록' 요청일 때만 계정 발급 + 안내 메시지 추가 ──
  const wantRegister = out.action === "register" && conv.lead.name && conv.lead.phone;
  if (wantRegister && !conv.registered) {
    const reg = await registerCompany(conv.lead.name, conv.lead.phone, conv.lead);
    if (reg.ok) {
      conv.registered = true; conv.handoff = true; conv.registered_at = nowIso;
      const closing =
        `등록해드렸어요! 아래에서 촬영 스케줄을 직접 확인·관리하실 수 있어요.\n\n` +
        `📍 스케줄 사이트: ${CUSTOMER_URL}\n🆔 아이디: ${reg.login_id}\n🔑 임시 비밀번호: ${reg.temp_password}\n\n` +
        `담당자가 카카오톡 상담방도 곧 열어드릴 거예요. 자세한 일정·견적은 거기서 확정해드립니다 🙂\n` +
        `그리고 담당자가 자리를 비운 사이에도, 일정이나 가격 같은 간단한 문의는 언제든 여기로 편하게 물어봐 주세요!`;
      await addMessage(token, "ai", closing);
    }
  }
  await saveConv(token, conv);

  return { status: 200, json: { ok: true, mode: conv.mode, handoff: !!conv.handoff, registered: !!conv.registered, lead: conv.lead, messages: await loadMessages(token) } };
}

module.exports = { handleChat };
