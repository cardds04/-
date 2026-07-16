/**
 * POST /api/english-travel-dialogue
 * Locked, meaning-first evaluator for the child 3D English travel game.
 */
const { handleEnglishTravelDialogue } = require("../lib/english-travel-dialogue-logic.cjs");

const rateBuckets = new Map();
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 45;

function clientKey(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown").split(",")[0].trim();
}

function isRateLimited(req) {
  const now = Date.now();
  const key = clientKey(req);
  const current = rateBuckets.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT;
}

function readJsonBody(req, maxLength = 8 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    let finished = false;
    req.on("data", (chunk) => {
      if (finished) return;
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > maxLength) {
        finished = true;
        const error = new Error("요청이 너무 큽니다.");
        error.code = "BODY_TOO_LARGE";
        reject(error);
      }
    });
    req.on("end", () => {
      if (finished) return;
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        const error = new Error("올바른 JSON 요청이 아닙니다.");
        error.code = "INVALID_JSON";
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, code: "method_not_allowed", error: "POST만 지원합니다." });
    return;
  }
  if (isRateLimited(req)) {
    res.status(429).json({ ok: false, code: "rate_limited", error: "대화를 아주 빠르게 이어가고 있어요. 잠시 후 다시 말해 주세요." });
    return;
  }
  try {
    let body;
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
      const bytes = Buffer.byteLength(JSON.stringify(req.body), "utf8");
      if (bytes > 8 * 1024) {
        res.status(413).json({ ok: false, code: "body_too_large", error: "요청이 너무 큽니다." });
        return;
      }
      body = req.body;
    } else {
      body = await readJsonBody(req);
    }
    const output = await handleEnglishTravelDialogue(body);
    res.status(output.status).json(output.json);
  } catch (error) {
    const tooLarge = error && error.code === "BODY_TOO_LARGE";
    res.status(tooLarge ? 413 : 400).json({
      ok: false,
      code: tooLarge ? "body_too_large" : "bad_request",
      error: tooLarge ? "요청이 너무 큽니다." : "대화 요청을 읽지 못했습니다.",
    });
  }
};
