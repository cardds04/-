/**
 * 디지털튜터 수업지원요청 (서버 전용, service_role).
 *
 * 목적: 학교 선생님 여러 명이 로그인 없이 시간표에서 교시를 골라 지원을 신청하고,
 *       디지털 튜터 한 명이 그것을 보고 수락/반려한다.
 *
 * 저장: 별도 테이블 없이 app_state 행으로. 요청 1건 = 행 1개.
 *       id = `tutorsup_r_<YYYY-MM-DD>_<rand>`
 *
 *       행을 주 단위로 묶지 않고 건당으로 쪼갠 이유: 여러 선생님이 동시에
 *       신청하면 read-modify-write 가 서로를 덮어쓴다. 건당 INSERT 면 경합이 없다.
 *       id 앞부분이 고정폭 ISO 날짜라 사전순 범위질의로 주간 조회가 된다.
 *
 * 권한: 신청·취소는 익명. 취소는 생성 시 발급한 cancelKey 를 아는 사람만 가능.
 *       수락·반려는 TUTOR_ADMIN_PASSWORD 로 로그인해 받은 토큰이 있어야 한다.
 *       중복 특별실 검사는 서버가 최종 판정한다(클라이언트 검사는 편의용).
 *
 * 노출 API: handleTutorSupportRequest(body) → { status, json }
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY · TUTOR_ADMIN_PASSWORD
 *           (선택) TUTOR_SESSION_SECRET — 없으면 TUTOR_ADMIN_PASSWORD 로 서명
 */
const crypto = require("crypto");

const ID_PREFIX = "tutorsup_r_";
const PERIODS = [1, 2, 3, 4, 5];
const ROOMS = ["컴퓨터실", "과학실", "도서관", "음악실", "미술실", "시청각실", "교실(이동 없음)"];
const STATUSES = ["pending", "confirmed", "declined"];
const MAX_PER_DAY = 200;
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

/* ── supabase ─────────────────────────────────────────── */
function sbHeaders() {
  const url = String(process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  return {
    url,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" },
  };
}

async function sb(path, init = {}) {
  const h = sbHeaders();
  const r = await fetch(`${h.url}/rest/v1/${path}`, {
    ...init,
    headers: { ...h.headers, ...(init.headers || {}) },
    cache: "no-store",
  });
  let body = null;
  try { body = await r.json(); } catch (_) {}
  if (!r.ok) throw new Error(`Supabase ${path} (${r.status}): ${JSON.stringify(body || {})}`);
  return body;
}

/* ── 값 검증 ───────────────────────────────────────────── */
const str = (v) => String(v == null ? "" : v).trim();

function isIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function isWeekday(s) {
  const day = new Date(s + "T00:00:00Z").getUTCDay();
  return day >= 1 && day <= 5;
}

function addDaysIso(iso, n) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 주 시작(월요일)로 정규화. 잘못된 값이면 null. */
function normalizeWeekStart(iso) {
  if (!isIsoDate(iso)) return null;
  const d = new Date(iso + "T00:00:00Z");
  const off = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - off);
  return d.toISOString().slice(0, 10);
}

function validateDraft(b) {
  const date = str(b.date);
  if (!isIsoDate(date)) return "희망 일자가 올바르지 않습니다.";
  if (!isWeekday(date)) return "수업 지원은 평일(월~금)만 신청할 수 있습니다.";

  const period = Number(b.period);
  if (!PERIODS.includes(period)) return "교시가 올바르지 않습니다.";

  const grade = Number(b.grade);
  if (!Number.isInteger(grade) || grade < 1 || grade > 6) return "학년을 1에서 6 사이로 선택해 주세요.";

  const classNo = Number(b.classNo);
  if (!Number.isInteger(classNo) || classNo < 1 || classNo > 20) return "반을 1에서 20 사이로 입력해 주세요.";

  const room = str(b.room);
  if (!ROOMS.includes(room)) return "특별실이 올바르지 않습니다.";

  const teacher = str(b.teacher);
  if (teacher.length < 1 || teacher.length > 20) return "담임 선생님 이름을 20자 이내로 입력해 주세요.";

  const topic = str(b.topic);
  if (topic.length > 300) return "요청 내용을 300자 이내로 줄여 주세요.";

  return null;
}

/* ── 행 ↔ 요청 변환 ────────────────────────────────────── */
function rowToRequest(row) {
  const p = row && row.payload ? row.payload : {};
  return {
    id: row.id,
    date: str(p.date),
    period: Number(p.period),
    grade: Number(p.grade),
    classNo: Number(p.classNo),
    room: str(p.room),
    topic: str(p.topic),
    teacher: str(p.teacher),
    status: STATUSES.includes(p.status) ? p.status : "pending",
    createdAt: str(p.createdAt),
  };
}

/** 하루치 행 (사전순 범위질의 — id 앞부분이 고정폭 ISO 날짜라 성립) */
async function fetchRange(fromIso, toIsoExclusive) {
  const rows = await sb(
    `app_state?id=gte.${ID_PREFIX}${fromIso}&id=lt.${ID_PREFIX}${toIsoExclusive}&select=id,payload&order=id.asc`
  );
  return (Array.isArray(rows) ? rows : []).map(rowToRequest).filter((r) => isIsoDate(r.date));
}

async function fetchDay(iso) {
  return fetchRange(iso, addDaysIso(iso, 1));
}

async function fetchOne(id) {
  const rows = await sb(`app_state?id=eq.${encodeURIComponent(id)}&select=id,payload&limit=1`);
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

/** 같은 날·같은 교시·같은 특별실에 이미 확정된 건 (자기 자신 제외) */
function findClash(dayRows, period, room, skipId) {
  return dayRows.find(
    (r) => r.period === period && r.room === room && r.status === "confirmed" && r.id !== skipId
  ) || null;
}

/* ── 튜터 토큰 ─────────────────────────────────────────── */
function tutorSecret() {
  const pw = String(process.env.TUTOR_ADMIN_PASSWORD || "").trim();
  if (!pw) return null;
  const sec = String(process.env.TUTOR_SESSION_SECRET || "").trim() || pw;
  return { pw, sec };
}

function sign(exp, sec) {
  return crypto.createHmac("sha256", sec).update(`tutor|${exp}`).digest("base64url");
}

function issueToken(sec) {
  const exp = Date.now() + TOKEN_TTL_MS;
  return `${exp}.${sign(exp, sec)}`;
}

function verifyToken(token) {
  const cfg = tutorSecret();
  if (!cfg) return false;
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return false;
  const exp = Number(parts[0]);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const want = Buffer.from(sign(exp, cfg.sec));
  const got = Buffer.from(String(parts[1]));
  return want.length === got.length && crypto.timingSafeEqual(want, got);
}

function samePassword(input, actual) {
  const a = Buffer.from(String(input || ""));
  const b = Buffer.from(String(actual || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ── 액션 ──────────────────────────────────────────────── */
async function actionList(b) {
  const weekStart = normalizeWeekStart(str(b.weekStart));
  if (!weekStart) return { status: 400, json: { ok: false, error: "조회할 주가 올바르지 않습니다." } };
  const rows = await fetchRange(weekStart, addDaysIso(weekStart, 5));
  return {
    status: 200,
    json: {
      ok: true,
      weekStart,
      rooms: ROOMS,
      tutorConfigured: !!tutorSecret(),
      requests: rows.filter((r) => r.status !== "declined"),
    },
  };
}

async function actionCreate(b) {
  const bad = validateDraft(b);
  if (bad) return { status: 400, json: { ok: false, error: bad } };

  const date = str(b.date);
  const period = Number(b.period);
  const room = str(b.room);

  const day = await fetchDay(date);
  if (day.length >= MAX_PER_DAY) {
    return { status: 429, json: { ok: false, error: "이 날짜의 신청이 너무 많습니다. 튜터에게 문의해 주세요." } };
  }

  const clash = findClash(day, period, room, null);
  if (clash) {
    return {
      status: 409,
      json: {
        ok: false,
        error: `${clash.grade}학년 ${clash.classNo}반이 이 교시에 ${room} 지원을 이미 확정했습니다. 다른 특별실이나 교시를 골라 주세요.`,
      },
    };
  }

  const cancelKey = crypto.randomBytes(12).toString("base64url");
  const id = `${ID_PREFIX}${date}_${Date.now().toString(36)}${crypto.randomBytes(3).toString("hex")}`;
  const payload = {
    date,
    period,
    grade: Number(b.grade),
    classNo: Number(b.classNo),
    room,
    topic: str(b.topic),
    teacher: str(b.teacher),
    status: "pending",
    createdAt: new Date().toISOString(),
    cancelHash: crypto.createHash("sha256").update(cancelKey).digest("hex"),
  };

  await sb("app_state", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify([{ id, payload }]),
  });

  return { status: 200, json: { ok: true, id, cancelKey } };
}

async function actionCancel(b) {
  const id = str(b.id);
  const cancelKey = str(b.cancelKey);
  if (!id.startsWith(ID_PREFIX)) return { status: 400, json: { ok: false, error: "잘못된 요청입니다." } };

  const row = await fetchOne(id);
  if (!row) return { status: 404, json: { ok: false, error: "이미 삭제된 요청입니다." } };

  const p = row.payload || {};
  const want = String(p.cancelHash || "");
  const got = cancelKey ? crypto.createHash("sha256").update(cancelKey).digest("hex") : "";
  if (!want || want !== got) {
    return { status: 403, json: { ok: false, error: "이 요청을 취소할 권한이 없습니다. 신청한 기기에서 취소해 주세요." } };
  }
  if (p.status === "confirmed") {
    return { status: 409, json: { ok: false, error: "이미 확정된 요청입니다. 튜터에게 취소를 요청해 주세요." } };
  }

  await sb(`app_state?id=eq.${encodeURIComponent(id)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  return { status: 200, json: { ok: true } };
}

async function actionTutorLogin(b) {
  const cfg = tutorSecret();
  if (!cfg) {
    return { status: 503, json: { ok: false, error: "튜터 비밀번호가 서버에 설정되지 않았습니다. TUTOR_ADMIN_PASSWORD 를 지정해 주세요." } };
  }
  if (!samePassword(str(b.password), cfg.pw)) {
    return { status: 401, json: { ok: false, error: "비밀번호가 맞지 않습니다." } };
  }
  return { status: 200, json: { ok: true, token: issueToken(cfg.sec) } };
}

async function actionDecide(b) {
  if (!verifyToken(b.token)) {
    return { status: 401, json: { ok: false, error: "튜터 로그인이 필요합니다." } };
  }
  const id = str(b.id);
  const to = str(b.to);
  if (!id.startsWith(ID_PREFIX)) return { status: 400, json: { ok: false, error: "잘못된 요청입니다." } };
  if (!STATUSES.includes(to)) return { status: 400, json: { ok: false, error: "알 수 없는 상태입니다." } };

  const row = await fetchOne(id);
  if (!row) return { status: 404, json: { ok: false, error: "이미 삭제된 요청입니다." } };
  const p = row.payload || {};

  if (to === "confirmed") {
    const day = await fetchDay(str(p.date));
    const clash = findClash(day, Number(p.period), str(p.room), id);
    if (clash) {
      return {
        status: 409,
        json: {
          ok: false,
          error: `${clash.grade}학년 ${clash.classNo}반이 같은 교시에 ${p.room}을(를) 이미 확정했습니다.`,
        },
      };
    }
  }

  await sb(`app_state?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ payload: { ...p, status: to, decidedAt: new Date().toISOString() } }),
  });
  return { status: 200, json: { ok: true } };
}

/* ── 진입점 ────────────────────────────────────────────── */
async function handleTutorSupportRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  switch (str(b.action)) {
    case "list":        return actionList(b);
    case "create":      return actionCreate(b);
    case "cancel":      return actionCancel(b);
    case "tutor_login": return actionTutorLogin(b);
    case "decide":      return actionDecide(b);
    default:
      return { status: 400, json: { ok: false, error: "알 수 없는 action 입니다." } };
  }
}

module.exports = {
  handleTutorSupportRequest,
  // 테스트용 노출
  _internal: { normalizeWeekStart, validateDraft, findClash, isWeekday, addDaysIso, ROOMS, PERIODS, ID_PREFIX },
};
