/**
 * Vercel Serverless: POST /api/topaz-upscale
 *
 * NOTE
 * - Topaz Photo AI는 데스크톱 앱/CLI라 서버리스(Vercel)에서 실행 불가합니다.
 * - 로컬에서는 server.js의 /api/topaz-upscale 를 사용하세요.
 */

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  res
    .status(400)
    .json({ message: "Topaz 업스케일은 로컬에서만 동작합니다. (server.js 실행 후 /api/topaz-upscale 사용)" });
};

