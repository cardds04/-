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
};
