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
const { handleTypecastTtsRequest, handleTypecastVoicesRequest } = require("./lib/typecast-tts-logic.cjs");
const { handleKlingVideoRequest } = require("./lib/kling-video-logic.cjs");
const { handleWaveSpeedFaceSwap } = require("./lib/wavespeed-faceswap-logic.cjs");
const { handleTopazUpscaleRequest } = require("./lib/topaz-photo-ai-logic.cjs");
const { handleAiDebateRequest } = require("./lib/ai-debate-logic.cjs");
const { handleMentorRequest } = require("./lib/mentor-logic.cjs");
const { handleReelRequest } = require("./lib/reel-suggest-logic.cjs");
const { handleNarrationRequest } = require("./lib/easy-narration-logic.cjs");
const { handleEasyIdeas } = require("./lib/easy-ideas-logic.cjs");
const { handleEasyTitle } = require("./lib/easy-title-logic.cjs");
const { handleSttRequest } = require("./lib/stt-logic.cjs");
const { handleEasyAudio } = require("./lib/easy-audio-logic.cjs");
const { handleShortsExplore } = require("./lib/shorts-explore-logic.cjs");
const { handleShortsAnalyze } = require("./lib/shorts-analyze-logic.cjs");
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

/** 음성→자막 STT — lib/stt-logic.cjs (Vercel api/stt.js 와 공유) */
app.post("/api/stt", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleSttRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[stt]", error);
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

/** 🎙 Typecast 나레이션 TTS — lib/typecast-tts-logic.cjs (Vercel api/typecast-tts.js 와 공유) */
app.post("/api/typecast-tts", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleTypecastTtsRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[typecast-tts]", error);
    res.status(500).json({ message: error?.message || "서버 오류" });
  }
});

/** 🎙 Typecast 목소리 목록 */
app.all("/api/typecast-voices", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleTypecastVoicesRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[typecast-voices]", error);
    res.status(500).json({ message: error?.message || "서버 오류" });
  }
});

/** Kling(클링) 공식 image2video 프록시 — lib/kling-video-logic.cjs (Vercel api/kling-video.js 와 공유) */
app.post("/api/kling-video", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleKlingVideoRequest(body);
    res.status(200).json(out);
  } catch (error) {
    const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    console.error("[kling-video]", error?.message);
    res.status(status).json({ ok: false, error: error?.message || "서버 오류", detail: error?.data || null });
  }
});

/** WaveSpeedAI 영상 얼굴 교체 프록시 — lib/wavespeed-faceswap-logic.cjs (Vercel api/wavespeed-faceswap.js 와 공유) */
app.post("/api/wavespeed-faceswap", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleWaveSpeedFaceSwap(body);
    res.status(200).json(out);
  } catch (error) {
    const status = error?.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    console.error("[wavespeed-faceswap]", error?.message);
    res.status(status).json({ ok: false, error: error?.message || "서버 오류", detail: error?.data || null });
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

/** 릴스 제안 제조기(각인 기반 제안 + 촬영 지시서) — lib/reel-suggest-logic.cjs (Vercel api/reel-suggest.js 와 공유) */
app.post("/api/reel-suggest", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleReelRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[reel-suggest]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 이지숏폼 나레이션 문구 생성(고객 프롬프트 → Claude 대본) — lib/easy-narration-logic.cjs (Vercel api/easy-narration.js 와 공유) */
app.post("/api/easy-narration", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleNarrationRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[easy-narration]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 아이디어 상자(업종 → 포맷별 맞춤 숏폼 아이디어) — lib/easy-ideas-logic.cjs (Vercel api/easy-ideas.js 와 공유) */
app.post("/api/easy-ideas", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleEasyIdeas(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[easy-ideas]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 타이틀 메이커(문구+스타일 → AI 이미지 크로마키 타이틀) — lib/easy-title-logic.cjs (Vercel api/easy-title.js 와 공유) */
app.post("/api/easy-title", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleEasyTitle(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[easy-title]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 음악 라이브러리 — lib/easy-audio-logic.cjs (Vercel api/easy-audio.js 와 공유) */
app.all("/api/easy-audio", async (req, res) => {
  try {
    const out = await handleEasyAudio({ method: req.method, query: req.query || {}, body: req.body || {} });
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[easy-audio]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 숏츠 탐색기 — lib/shorts-explore-logic.cjs (Vercel api/shorts-explore.js 와 공유) */
app.all("/api/shorts-explore", async (req, res) => {
  try {
    const out = await handleShortsExplore({ method: req.method, query: req.query || {}, body: req.body || {} });
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[shorts-explore]", error);
    res.status(500).json({ ok: false, error: error?.message || "서버 오류" });
  }
});

/** 쇼츠 분석 → 따라 찍는 지시서 — lib/shorts-analyze-logic.cjs (Vercel api/shorts-analyze.js 와 공유) */
app.post("/api/shorts-analyze", async (req, res) => {
  try {
    const out = await handleShortsAnalyze({ method: "POST", body: req.body || {} });
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[shorts-analyze]", error);
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
