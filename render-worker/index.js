"use strict";
/**
 * 이지숏폼 — 서버 렌더 워커 (Railway 등 컨테이너에서 상시 실행)
 *
 * 루프: claim(큐에서 작업 집기) → 헤드리스 크롬으로 render.html 열고 spec 주입 →
 *       페이지가 렌더 + 결과 업로드 + complete 까지 처리 → #renderDone 신호 읽고 다음 작업.
 *
 * 환경변수:
 *   RENDER_WORKER_SECRET  (필수, Vercel 의 같은 값과 일치)
 *   RENDER_API            (기본 https://sc-pink.vercel.app/api/easy-render)
 *   RENDER_PAGE           (기본 https://sc-pink.vercel.app/easy/render.html)
 *   POLL_MS               (기본 5000)  RENDER_TIMEOUT_MS (기본 900000=15분)
 */
const puppeteer = require("puppeteer");
const http = require("http");

// Railway 등은 '웹 서버'(포트 응답)를 기대하므로, 헬스체크용 작은 HTTP 서버를 띄운다.
// (워커는 백그라운드 폴링이라 원래 포트가 없어 healthcheck 가 실패함)
const PORT = process.env.PORT || 8080;
http.createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/plain" }); res.end("render-worker ok"); })
  .listen(PORT, () => console.log("✓ health 서버 listening on", PORT));

const API = process.env.RENDER_API || "https://sc-pink.vercel.app/api/easy-render";
const RENDER_URL = process.env.RENDER_PAGE || "https://sc-pink.vercel.app/easy/render.html";
const SECRET = process.env.RENDER_WORKER_SECRET || "";
const POLL_MS = Number(process.env.POLL_MS || 5000);
const RENDER_TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 900000);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(action, extra) {
  try {
    const r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ action, secret: SECRET }, extra || {})),
    });
    return await r.json().catch(() => ({}));
  } catch (e) { return { ok: false, error: (e && e.message) || "net" }; }
}

let browser = null;
async function getBrowser() {
  if (browser && browser.isConnected && browser.isConnected()) return browser;
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
      "--autoplay-policy=no-user-gesture-required",
      "--use-gl=swiftshader", "--enable-unsafe-swiftshader",
    ],
  });
  return browser;
}

async function renderJob(job) {
  const b = await getBrowser();
  const page = await b.newPage();
  try {
    page.on("console", (m) => { try { console.log("[page]", m.text()); } catch (_) {} });
    page.on("pageerror", (e) => console.error("[pageerror]", (e && e.message) || e));
    await page.evaluateOnNewDocument((j) => { window.__renderJob = j; }, { id: job.id, secret: SECRET, spec: job.spec });
    await page.goto(RENDER_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector("#renderDone", { timeout: RENDER_TIMEOUT_MS });
    const data = await page.$eval("#renderDone", (el) => el.getAttribute("data-result"));
    return JSON.parse(data || "{}");
  } catch (e) {
    // 페이지가 fail 을 못 부르고 죽었을 수 있으니 워커가 직접 실패 처리
    try { await post("fail", { id: job.id, error: "워커: " + ((e && e.message) || "오류") }); } catch (_) {}
    return { ok: false, error: (e && e.message) || "worker error" };
  } finally {
    try { await page.close(); } catch (_) {}
  }
}

async function loop() {
  if (!SECRET) { console.error("✗ RENDER_WORKER_SECRET 환경변수가 필요합니다."); process.exit(1); }
  console.log("🖥  렌더 워커 시작 — API:", API, "| RENDER:", RENDER_URL);
  // 시작 시 브라우저 미리 띄워(첫 작업 지연 방지)
  try { await getBrowser(); console.log("✓ 헤드리스 크롬 준비됨"); } catch (e) { console.error("크롬 시작 실패:", (e && e.message) || e); }
  for (;;) {
    try {
      const c = await post("claim", {});
      if (c && c.ok && c.job) {
        console.log("▶ 작업 집음:", c.job.id);
        const t0 = Date.now();
        const res = await renderJob(c.job);
        const sec = Math.round((Date.now() - t0) / 1000);
        console.log("  작업", c.job.id, "(", sec, "초):", res.ok ? ("✅ " + res.url) : ("✗ " + res.error));
      } else {
        await sleep(POLL_MS);
      }
    } catch (e) {
      console.error("루프 오류:", (e && e.message) || e);
      await sleep(POLL_MS);
    }
  }
}

loop();
