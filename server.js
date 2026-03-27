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

const { handleBlogGenerateRequest, pickGeminiModel } = require("./lib/blog-generate-logic.cjs");

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

/** 블로그 도우미 — 로직은 lib/blog-generate-logic.cjs (Vercel api/blog-generate.js 와 공유) */
app.post("/api/blog-generate", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleBlogGenerateRequest(body);
    res.status(out.status).json(out.json);
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
