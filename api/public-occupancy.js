/**
 * Vercel Serverless: GET/POST /api/public-occupancy
 *
 * 로그인 전 예약 달력의 "하루 마감" 판정용 익명 점유 신호. 토큰 불필요.
 * 민감 필드 없음(익명 해시만). 자세한 동작은 lib/public-occupancy-logic.cjs 참고.
 *
 * 환경 변수: SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
 */
const { handlePublicOccupancyRequest } = require("../lib/public-occupancy-logic.cjs");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "GET" && req.method !== "POST") {
    res.status(405).json({ ok: false, error: "GET 또는 POST만 지원합니다." });
    return;
  }

  try {
    const out = await handlePublicOccupancyRequest();
    res.status(out.status).json(out.json);
  } catch (e) {
    console.error("[api/public-occupancy]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
