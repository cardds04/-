/**
 * 오리진 가드 — 우리 화면에서 온 브라우저 요청만 통과시킨다.
 *
 * 왜 있나 (2026-09-08 실사고)
 *   `api/gemini-image.js` 가 인증 없이 열려 있었다. 주소만 알면 누구나 호출할 수 있고,
 *   서버가 자기 GEMINI_API_KEY 를 붙여 주므로 **키를 몰라도** 사장님 계정으로 과금됐다.
 *   30일 ₩184,206 중 ₩76,350 이 쓰지도 않은 이미지 생성이었다.
 *
 * ‼️키를 새로 발급해도 이 구멍은 안 막힌다 — 새 키로 계속 과금될 뿐이다.
 *
 * 원리
 *   브라우저는 Origin 헤더를 스스로 붙이고 **스크립트가 위조할 수 없다**.
 *   그러니 우리 도메인 Origin 만 통과시키면 고객 화면은 그대로 돌고 외부 호출은 막힌다.
 *   curl·봇처럼 Origin 이 아예 없는 요청도 막는다(서버 대 서버는 이 API 를 쓰지 않는다).
 */
const ALLOW_SUFFIX = [
  ".vercel.app",            // sc-pink.vercel.app 등 우리 배포본
];
const ALLOW_EXACT = [
  "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000",
  "http://localhost:8080", "http://127.0.0.1:8080",
];

function allowedOrigin(origin) {
  if (!origin) return null;
  let host;
  try { host = new URL(origin).hostname; } catch { return null; }
  if (ALLOW_EXACT.includes(origin)) return origin;
  if (ALLOW_SUFFIX.some((s) => host.endsWith(s))) return origin;
  if (host === "localhost" || host === "127.0.0.1") return origin;
  return null;
}

/** true 를 돌려주면 호출부는 그대로 진행, false 면 이미 응답을 보냈으니 return 한다. */
function guard(req, res) {
  const origin = req.headers.origin || "";
  const ok = allowedOrigin(origin);
  if (ok) {
    res.setHeader("Access-Control-Allow-Origin", ok);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") { res.status(204).end(); return false; }
    return true;
  }
  res.setHeader("Access-Control-Allow-Origin", "null");
  res.status(403).json({
    ok: false,
    error: "이 API 는 지정된 화면에서만 호출할 수 있습니다.",
  });
  return false;
}

module.exports = { guard, allowedOrigin };
