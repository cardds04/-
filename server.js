const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.join(__dirname, "data");
const STATE_PATH = path.join(DATA_DIR, "shared-state.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STATE_PATH)) {
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify({ state: {}, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));

/** AI Studio 목록 기준: Flash는 gemini-3-flash-preview 가 ID (gemini-3-flash 단독은 없을 수 있음) */
const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview";

/** 예전 문서·설정용 짧은 이름 → Studio에 나오는 실제 ID */
const GEMINI_MODEL_ALIASES = {
  "gemini-3-flash": "gemini-3-flash-preview",
  "gemini-3-pro": "gemini-3.1-pro-preview"
};

function coerceGeminiModelId(raw) {
  let m = String(raw || "").trim();
  if (!m) m = DEFAULT_GEMINI_MODEL;
  if (m.startsWith("models/")) m = m.slice("models/".length);
  if (/2\.0-flash/i.test(m)) {
    return DEFAULT_GEMINI_MODEL;
  }
  const aliased = GEMINI_MODEL_ALIASES[m];
  if (aliased) m = aliased;
  if (!/^gemini-[a-zA-Z0-9_.-]+$/.test(m)) {
    return DEFAULT_GEMINI_MODEL;
  }
  return m;
}

/** 클라이언트 body.geminiModel 이 환경변수보다 우선 (잘못된 PC 설정 무력화) */
function pickGeminiModel(body) {
  const fromClient =
    body && typeof body.geminiModel === "string" ? body.geminiModel.trim() : "";
  const fromEnv = (process.env.GEMINI_VISION_MODEL || "").trim();
  const raw = fromClient || fromEnv || DEFAULT_GEMINI_MODEL;
  const out = coerceGeminiModelId(raw);
  if (/2\.0-flash/i.test(raw) && out === DEFAULT_GEMINI_MODEL) {
    console.warn(
      "[blog-generate] 구형/단종 모델(%s) → %s 로 치환했습니다. PC에 GEMINI_VISION_MODEL이 있으면 unset 하세요.",
      raw,
      out
    );
  }
  return out;
}

function readState() {
  const raw = fs.readFileSync(STATE_PATH, "utf8");
  const parsed = JSON.parse(raw || "{}");
  const state = parsed && typeof parsed.state === "object" && parsed.state ? parsed.state : {};
  const updatedAt = parsed && parsed.updatedAt ? parsed.updatedAt : null;
  return { state, updatedAt };
}

function writeState(nextState) {
  const payload = {
    state: nextState || {},
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(STATE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", async (req, res) => {
  try {
    const { state, updatedAt } = readState();
    res.json({ state, updatedAt });
  } catch (error) {
    res.status(500).json({ message: "Failed to read state." });
  }
});

app.put("/api/state", async (req, res) => {
  try {
    const incoming = req.body && typeof req.body === "object" ? req.body.state : null;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return res.status(400).json({ message: "Invalid payload. Expected object at body.state." });
    }
    writeState(incoming);
    const { updatedAt } = readState();
    res.json({ ok: true, updatedAt });
  } catch (error) {
    res.status(500).json({ message: "Failed to write state." });
  }
});

app.get("/inlog", (req, res) => {
  res.sendFile(path.join(__dirname, "inlog.html"));
});

/**
 * 블로그 도우미: 멀티모달 AI로 본문 생성 (브라우저 CORS 회피용).
 * 키 우선순위: 요청 body.apiKey → 환경변수 GEMINI_API_KEY / OPENAI_API_KEY
 */
app.post("/api/blog-generate", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const provider = String(body.provider || "gemini").toLowerCase();
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const images = Array.isArray(body.images) ? body.images : [];

    if (!prompt) {
      return res.status(400).json({ message: "prompt가 필요합니다." });
    }
    if (!images.length) {
      return res.status(400).json({ message: "이미지가 1장 이상 필요합니다." });
    }
    if (images.length > 24) {
      return res.status(400).json({ message: "이미지는 24장 이하로 줄여 주세요." });
    }

    for (let i = 0; i < images.length; i++) {
      const im = images[i];
      if (!im || typeof im !== "object" || typeof im.base64 !== "string" || !im.base64.length) {
        return res.status(400).json({ message: `images[${i}]에 base64 데이터가 없습니다.` });
      }
      if (typeof im.mimeType !== "string" || !im.mimeType.startsWith("image/")) {
        return res.status(400).json({ message: `images[${i}]의 mimeType이 올바르지 않습니다.` });
      }
    }

    if (provider === "openai") {
      const apiKey = (typeof body.apiKey === "string" && body.apiKey.trim()) || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          message: "OpenAI API 키가 없습니다. 입력란에 넣거나 환경변수 OPENAI_API_KEY를 설정하세요."
        });
      }
      const content = [{ type: "text", text: prompt }];
      for (const im of images) {
        content.push({
          type: "image_url",
          image_url: { url: `data:${im.mimeType};base64,${im.base64}` }
        });
      }
      const ores = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_VISION_MODEL || "gpt-4o-mini",
          max_tokens: 8192,
          messages: [{ role: "user", content }]
        })
      });
      const data = await ores.json().catch(() => ({}));
      if (!ores.ok) {
        const msg = data?.error?.message || JSON.stringify(data) || ores.statusText;
        return res.status(502).json({ message: `OpenAI 오류: ${msg}` });
      }
      const text = data?.choices?.[0]?.message?.content;
      if (!text || typeof text !== "string") {
        return res.status(502).json({ message: "OpenAI 응답에 본문이 없습니다." });
      }
      return res.json({ text: text.trim() });
    }

    const apiKey =
      (typeof body.apiKey === "string" && body.apiKey.trim()) || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        message:
          "Gemini API 키가 없습니다. Google AI Studio에서 발급 후 입력하거나 환경변수 GEMINI_API_KEY를 설정하세요."
      });
    }

    const model = pickGeminiModel(body);
    console.log("[blog-generate] Gemini 호출 모델:", model);
    const parts = [{ text: prompt }];
    for (const im of images) {
      parts.push({
        inline_data: {
          mime_type: im.mimeType,
          data: im.base64.replace(/\s/g, "")
        }
      });
    }

    const gres = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.7
          }
        })
      }
    );
    const data = await gres.json().catch(() => ({}));
    if (!gres.ok) {
      const msg = data?.error?.message || JSON.stringify(data) || gres.statusText;
      return res.status(502).json({ message: `Gemini 오류: ${msg}` });
    }
    const cand = data?.candidates?.[0];
    const finish = cand?.finishReason;
    if (finish === "SAFETY" || finish === "BLOCKLIST") {
      return res.status(502).json({ message: "Gemini가 안전 정책으로 응답을 차단했습니다." });
    }
    const partsOut = cand?.content?.parts;
    let text = "";
    if (Array.isArray(partsOut)) {
      for (const p of partsOut) {
        if (p && typeof p.text === "string") text += p.text;
      }
    }
    text = text.trim();
    if (!text) {
      return res.status(502).json({ message: "Gemini 응답에 본문이 없습니다." });
    }
    return res.json({ text });
  } catch (error) {
    console.error("[blog-generate]", error);
    res.status(500).json({ message: error?.message || "서버 오류" });
  }
});

app.use(express.static(__dirname));

const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT} (bind ${HOST})`);
  console.log(`Blog helper: http://localhost:${PORT}/blog-writing-assistant.html`);
  console.log(`State file path: ${STATE_PATH}`);
  console.log(
    `[blog-generate] Gemini 기본 후보: ${pickGeminiModel({})} (페이지에서 모델 선택 시 그 값이 우선)`
  );
  if (process.env.GEMINI_API_KEY) {
    console.log("[blog-generate] GEMINI_API_KEY: 서버 환경변수로 설정됨 (클라이언트 입력 생략 가능)");
  }
});
