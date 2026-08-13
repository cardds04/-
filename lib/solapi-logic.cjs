/**
 * Solapi(쿨에스엠에스) v4 메시지 전송 로직.
 *  - server.js (로컬 개발) 와 api/solapi-send.js (Vercel) 가 공유한다.
 *  - 인증: HMAC-SHA256 (apiKey + date + salt + signature)
 *  - 발신번호는 솔라피 콘솔에 사전 등록된 번호여야 함.
 */
const crypto = require("crypto");

const SOLAPI_SEND_MANY_DETAIL = "https://api.solapi.com/messages/v4/send-many/detail";

function getEnvCredentials() {
  const apiKey = String(process.env.SOLAPI_API_KEY || "").trim();
  const apiSecret = String(process.env.SOLAPI_API_SECRET || "").trim();
  const senderNumber = onlyDigits(process.env.SOLAPI_SENDER_NUMBER || "");
  return { apiKey, apiSecret, senderNumber };
}

function onlyDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

/** 솔라피는 발/수신번호 모두 숫자만 포함된 한국 휴대전화/일반전화 번호를 요구함. */
function normalizeKoreanPhone(value) {
  const digits = onlyDigits(value);
  if (!digits) return "";
  if (digits.startsWith("82")) return "0" + digits.slice(2);
  return digits;
}

function isValidKoreanMobile(value) {
  const v = onlyDigits(value);
  return /^01[016789]\d{7,8}$/.test(v);
}

function buildAuthorizationHeader(apiKey, apiSecret) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(date + salt)
    .digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

const SOLAPI_SEND_TOKEN_HEADER = "x-solapi-token";

/** 사이트 자체 페이지(브라우저 fetch)가 뜨는 오리진 — 정적 페이지에는 토큰을 심을 수 없어 오리진으로 구분한다. */
const DEFAULT_BROWSER_ORIGINS = [
  "https://sc-pink.vercel.app",
  "https://sc.vercel.app",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
];

function getAllowedBrowserOrigins() {
  const raw = String(process.env.SOLAPI_SEND_ALLOWED_ORIGINS || "").trim();
  if (!raw) return DEFAULT_BROWSER_ORIGINS;
  return raw.split(",").map((v) => v.trim()).filter(Boolean);
}

function isSolapiSendEnforced() {
  return /^(1|true|on|yes)$/i.test(String(process.env.SOLAPI_SEND_ENFORCE || "").trim());
}

function timingSafeEqualString(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length === 0 || ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * POST /api/solapi-send 접근 인증.
 *  - 자동화(curl·서버): `x-solapi-token` 헤더 == SOLAPI_SEND_TOKEN 환경변수 (정본 값: ~/.config/solapi/send-token)
 *  - 사이트 페이지(브라우저): Origin/Referer 가 자사 오리진 목록에 있으면 허용
 *  - SOLAPI_SEND_ENFORCE 가 1|true|on|yes 가 아니면 소프트 모드: 미인증도 allowed=true 로 통과시키되
 *    호출자가 경고 로그를 남겨 남은 호출처를 파악한다. 강제 전환은 사장님 확인 후.
 *
 * @param {object} headers 요청 헤더 (소문자 키)
 * @returns {{ allowed: boolean, authenticated: boolean, via: string, detail?: object }}
 */
function authorizeSolapiSend(headers) {
  const h = headers && typeof headers === "object" ? headers : {};
  const get = (name) => {
    const direct = h[name] != null ? h[name] : h[name.toLowerCase()];
    return Array.isArray(direct) ? String(direct[0] || "") : String(direct || "");
  };

  const expectedToken = String(process.env.SOLAPI_SEND_TOKEN || "").trim();
  const providedToken = get(SOLAPI_SEND_TOKEN_HEADER).trim();
  if (expectedToken && timingSafeEqualString(providedToken, expectedToken)) {
    return { allowed: true, authenticated: true, via: "token" };
  }

  const allowedOrigins = getAllowedBrowserOrigins();
  const origin = get("origin").trim();
  if (origin && allowedOrigins.includes(origin)) {
    return { allowed: true, authenticated: true, via: "origin" };
  }
  const referer = get("referer").trim();
  if (referer) {
    try {
      if (allowedOrigins.includes(new URL(referer).origin)) {
        return { allowed: true, authenticated: true, via: "referer" };
      }
    } catch (_) {}
  }

  const detail = {
    origin: origin || null,
    referer: referer || null,
    userAgent: get("user-agent") || null,
    tokenProvided: Boolean(providedToken),
    tokenConfigured: Boolean(expectedToken),
  };
  const enforce = isSolapiSendEnforced();
  return { allowed: !enforce, authenticated: false, via: enforce ? "denied" : "soft-allow", detail };
}

/** 솔라피 응답 본문에서 사용자에게 의미 있는 에러 메시지를 추출. */
function extractSolapiErrorMessage(body) {
  if (!body || typeof body !== "object") return "";
  if (body.errorMessage) return String(body.errorMessage);
  if (body.message) return String(body.message);
  const failed = Array.isArray(body.failedMessageList) ? body.failedMessageList : [];
  if (failed.length) {
    const head = failed[0] || {};
    return [head.statusMessage, head.errorMessage].filter(Boolean).join(" / ");
  }
  return "";
}

/**
 * 단건 SMS/LMS 발송. text 의 바이트 길이에 따라 자동으로 SMS / LMS 가 결정되도록
 * type 은 솔라피에 위임(필드 미지정 → AUTO). 필요하면 호출자가 type 을 직접 줄 수도 있다.
 *
 * 항상 즉시 발송 — 솔라피 예약(`scheduledDate`) 은 사용하지 않는다.
 *
 * @param {{
 *   to: string,
 *   text: string,
 *   from?: string,
 *   subject?: string,
 *   type?: string,
 *   referenceDate?: Date,
 * }} input
 */
async function sendSolapiMessage(input) {
  const { apiKey, apiSecret, senderNumber } = getEnvCredentials();
  if (!apiKey || !apiSecret) {
    return {
      ok: false,
      status: 500,
      message: "SOLAPI_API_KEY / SOLAPI_API_SECRET 환경변수가 설정되지 않았습니다.",
    };
  }

  const sendNow = input?.referenceDate instanceof Date ? input.referenceDate : new Date();
  const to = normalizeKoreanPhone(input?.to);
  const from = normalizeKoreanPhone(input?.from || senderNumber);
  const text = String(input?.text || "").trim();

  if (!isValidKoreanMobile(to)) {
    return { ok: false, status: 400, message: "수신번호 형식이 올바르지 않습니다." };
  }
  if (!from) {
    return { ok: false, status: 500, message: "발신번호(SOLAPI_SENDER_NUMBER) 가 비어있습니다." };
  }
  if (!text) {
    return { ok: false, status: 400, message: "전송할 본문(text) 이 비어있습니다." };
  }

  const recordAtIsoOut = sendNow.toISOString();

  const message = { to, from, text };
  if (input?.subject) message.subject = String(input.subject).slice(0, 40);
  if (input?.type) message.type = String(input.type).toUpperCase();

  const headers = {
    Authorization: buildAuthorizationHeader(apiKey, apiSecret),
    "Content-Type": "application/json; charset=utf-8",
  };

  let response;
  try {
    response = await fetch(SOLAPI_SEND_MANY_DETAIL, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: [message] }),
    });
  } catch (error) {
    return {
      ok: false,
      status: 502,
      message: `솔라피 호출 실패: ${error?.message || "network error"}`,
    };
  }

  let body = null;
  try {
    body = await response.json();
  } catch (_) {
    body = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: extractSolapiErrorMessage(body) || `솔라피 오류 (${response.status})`,
      raw: body,
    };
  }

  const failedReg = Array.isArray(body?.failedMessageList) ? body.failedMessageList : [];
  if (failedReg.length > 0) {
    return {
      ok: false,
      status: 502,
      message: extractSolapiErrorMessage(body) || "메시지 접수에 실패했습니다.",
      raw: body,
    };
  }

  return {
    ok: true,
    status: 200,
    messageId: body?.messageId || body?.groupInfo?.groupId || null,
    raw: body,
    scheduledDate: null,
    recordAtIso: recordAtIsoOut,
    deferredToQuietHoursMorning: false,
  };
}

/**
 * Express / Vercel 양쪽에서 공유하는 핸들러.
 * 입력: { to, text, from?, subject?, type? }
 * 출력: { status, json }
 */
async function handleSolapiSendRequest(body) {
  const result = await sendSolapiMessage({
    to: body?.to,
    from: body?.from,
    text: body?.text,
    subject: body?.subject,
    type: body?.type,
  });
  if (result.ok) {
    return {
      status: 200,
      json: {
        ok: true,
        messageId: result.messageId || null,
        smsDeferredToQuietHoursMorning: !!result.deferredToQuietHoursMorning,
        scheduledDate: result.scheduledDate || null,
        recordAtIso: result.recordAtIso || null,
      },
    };
  }
  return { status: result.status || 500, json: { ok: false, message: result.message } };
}

module.exports = {
  sendSolapiMessage,
  handleSolapiSendRequest,
  normalizeKoreanPhone,
  isValidKoreanMobile,
  authorizeSolapiSend,
  getAllowedBrowserOrigins,
  isSolapiSendEnforced,
  SOLAPI_SEND_TOKEN_HEADER,
};
