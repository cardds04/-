const fs = require("fs");
const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");

// 로컬 개발용 .env 로더 (의존성 없음). 이미 설정된 환경변수는 덮어쓰지 않으므로
// Vercel 처럼 환경변수가 주입되는 곳에서는 영향이 없다.
(function loadDotEnv() {
  try {
    const envPath = path.join(__dirname, ".env");
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      const key = m[1];
      if (process.env[key] !== undefined) continue;
      let val = m[2];
      if (/^".*"$/.test(val) || /^'.*'$/.test(val)) val = val.slice(1, -1);
      process.env[key] = val;
    }
  } catch (_) {}
})();

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
const { handleGeminiTtsRequest } = require("./lib/gemini-tts-logic.cjs");
const { handleTopazUpscaleRequest } = require("./lib/topaz-photo-ai-logic.cjs");
const { handleAiDebateRequest } = require("./lib/ai-debate-logic.cjs");
const { handleMentorRequest } = require("./lib/mentor-logic.cjs");
const { handleSolapiSendRequest } = require("./lib/solapi-logic.cjs");
const { handleCustomerAuthRequest } = require("./lib/customer-auth-logic.cjs");
const { handleCustomerDataRequest } = require("./lib/customer-data-logic.cjs");
const { handleCustomerWriteRequest } = require("./lib/customer-write-logic.cjs");
const { handleAdminAuthRequest } = require("./lib/admin-auth-logic.cjs");
const { handleAdminDbRequest } = require("./lib/admin-db-logic.cjs");
const { handlePublicOccupancyRequest } = require("./lib/public-occupancy-logic.cjs");
const { handleWriterAuthRequest } = require("./lib/writer-auth-logic.cjs");
const { handleWriterDbRequest } = require("./lib/writer-db-logic.cjs");

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

/** 나레이션 TTS — lib/gemini-tts-logic.cjs (Vercel api/gemini-tts.js 와 공유) */
app.post("/api/gemini-tts", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleGeminiTtsRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[gemini-tts]", error);
    res.status(500).json({ message: error?.message || "서버 오류" });
  }
});

/** AI 토론(제미나이 vs 그록) — lib/ai-debate-logic.cjs (Vercel api/ai-debate.js 와 공유) */
app.post("/api/ai-debate", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleAiDebateRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[ai-debate]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** AI 경영 멘토(Claude 4인 자문단 + 기억) — lib/mentor-logic.cjs (Vercel api/mentor.js 와 공유) */
app.post("/api/mentor", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleMentorRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[mentor]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** Solapi 문자 발송 — lib/solapi-logic.cjs (Vercel api/solapi-send.js 와 공유)
 *  환경변수: SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER_NUMBER */
app.post("/api/solapi-send", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleSolapiSendRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[solapi-send]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
});

/** 고객 포털 로그인/회원가입 — lib/customer-auth-logic.cjs (Vercel api/customer-auth.js 와 공유)
 *  평문 비밀번호를 브라우저에서 다루지 않도록 service_role 로 서버에서만 검증·저장.
 *  환경변수: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY */
app.post("/api/customer-auth", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleCustomerAuthRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[customer-auth]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 고객 포털 데이터 조회 — lib/customer-data-logic.cjs (Vercel api/customer-data.js 와 공유)
 *  세션 토큰을 검증해 본인 업체 일정만 전체 필드로, 타 업체는 익명 점유 신호만 반환.
 *  환경변수: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / CUSTOMER_SESSION_SECRET(권장) */
app.post("/api/customer-data", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleCustomerDataRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[customer-data]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 고객 포털 쓰기 — lib/customer-write-logic.cjs (Vercel api/customer-write.js 와 공유)
 *  세션 토큰을 검증해 본인 업체 행에만 일정 UPSERT/소프트삭제/결제 보류를 허용.
 *  환경변수: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / CUSTOMER_SESSION_SECRET(권장) */
app.post("/api/customer-write", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleCustomerWriteRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[customer-write]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 관리자 로그인 — lib/admin-auth-logic.cjs (Vercel api/admin-auth.js 와 공유)
 *  관리자 비밀번호를 검증해 { adm:1 } 세션 토큰 발급. */
app.post("/api/admin-auth", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleAdminAuthRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[admin-auth]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 관리자 DB 프록시 — lib/admin-db-logic.cjs (Vercel api/admin-db.js 와 공유)
 *  관리자 토큰으로 허용 테이블 읽기/쓰기를 service_role 로 포워드. */
app.post("/api/admin-db", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleAdminDbRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[admin-db]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 작가 인증 — lib/writer-auth-logic.cjs (Vercel api/writer-auth.js 와 공유)
 *  작가 로그인/회원가입을 service_role 로 검증·발급(토큰). */
app.post("/api/writer-auth", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleWriterAuthRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[writer-auth]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 작가 DB 프록시(읽기 전용) — lib/writer-db-logic.cjs (Vercel api/writer-db.js 와 공유)
 *  작가 토큰으로 허용 테이블 GET 을 service_role 로 포워드. */
app.post("/api/writer-db", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleWriterDbRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[writer-db]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 공개 점유 신호 — lib/public-occupancy-logic.cjs (Vercel api/public-occupancy.js 와 공유)
 *  로그인 전 달력 마감 판정용 익명 점유. 토큰 불필요, 민감 필드 없음. */
app.all("/api/public-occupancy", async (req, res) => {
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "GET 또는 POST만 지원합니다." });
    return;
  }
  try {
    const out = await handlePublicOccupancyRequest();
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[public-occupancy]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 배포 버전 확인 — Fly(Express)·Vercel(serverless) 공용 핸들러 */
const handleSiteReleaseMeta = require("./api/site-release-meta.js");
app.all("/api/site-release-meta", (req, res, next) => {
  Promise.resolve(handleSiteReleaseMeta(req, res)).catch(next);
});

/** Topaz Photo AI 2x 업스케일 — 로컬 전용 */
app.post("/api/topaz-upscale", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleTopazUpscaleRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[topaz-upscale]", error);
    res.status(500).json({ message: error?.message || "서버 오류" });
  }
});

/** 참조 스타일 복제 — 로컬 uvicorn(style_transfer_server) 로 프록시 (Docker/온라인 동일 출처) */
const STYLE_PROXY_HOST = process.env.STYLE_TRANSFER_HOST || "127.0.0.1";
const STYLE_PROXY_PORT = Number(process.env.STYLE_TRANSFER_PORT || 8790);

function proxyStyleTransferApi(req, res) {
  const headers = { ...req.headers };
  headers.host = `${STYLE_PROXY_HOST}:${STYLE_PROXY_PORT}`;
  const preq = http.request(
    {
      hostname: STYLE_PROXY_HOST,
      port: STYLE_PROXY_PORT,
      path: req.originalUrl,
      method: req.method,
      headers,
    },
    (pres) => {
      res.writeHead(pres.statusCode, pres.headers);
      pres.pipe(res);
    }
  );
  preq.on("error", (err) => {
    console.error("[style-transfer proxy]", err.message);
    if (!res.headersSent) {
      res.status(502).json({ detail: "스타일 API에 연결하지 못했습니다: " + err.message });
    }
  });
  req.pipe(preq);
}

app.post("/api/phase1", proxyStyleTransferApi);
app.post("/api/phase2", proxyStyleTransferApi);
app.post("/api/chat", proxyStyleTransferApi);
app.post("/api/raw-preview", proxyStyleTransferApi);

/** 관리 페이지 루트 — CDN·브라우저가 index.html 을 길게 캐시하는 경우 방지 (static 보다 우선) */
function setScheduleAdminHtmlNoCacheHeaders(res) {
  const sha = String(process.env.SCHEDULE_SITE_IMAGE_GIT_SHA || "").trim().slice(0, 12);
  if (sha) res.setHeader("X-Schedule-Site-Image-Sha", sha);
  res.setHeader(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
}

app.get("/", (req, res, next) => {
  setScheduleAdminHtmlNoCacheHeaders(res);
  res.sendFile(path.join(__dirname, "index.html"), next);
});

app.get("/index.html", (req, res, next) => {
  setScheduleAdminHtmlNoCacheHeaders(res);
  res.sendFile(path.join(__dirname, "index.html"), next);
});

app.use(
  express.static(__dirname, {
    setHeaders(res, filePath) {
      try {
        if (/\.html?$/i.test(filePath)) {
          const sha = String(process.env.SCHEDULE_SITE_IMAGE_GIT_SHA || "").trim().slice(0, 12);
          if (sha) res.setHeader("X-Schedule-Site-Image-Sha", sha);
          res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      } catch (_) {
        //
      }
    },
  })
);

const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT} (bind ${HOST})`);
  console.log(`Blog helper: http://localhost:${PORT}/blog-writing-assistant.html`);
  console.log(`스타일 복제 웹: http://localhost:${PORT}/style-transfer-web.html`);
  console.log(
    `  → 같은 주소로 API 프록시: /api/phase1|phase2|chat|raw-preview → http://${STYLE_PROXY_HOST}:${STYLE_PROXY_PORT}`
  );
  console.log(`State file path: ${STATE_PATH}`);
  console.log(
    `[blog-generate] Gemini 기본 후보: ${pickGeminiModel({})} (페이지에서 모델 선택 시 그 값이 우선)`
  );
  if (process.env.GEMINI_API_KEY) {
    console.log("[blog-generate] GEMINI_API_KEY: 서버 환경변수로 설정됨 (클라이언트 입력 생략 가능)");
  }
});
