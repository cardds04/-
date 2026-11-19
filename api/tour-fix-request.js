/**
 * Vercel Serverless: POST /api/tour-fix-request
 * 11-19 사장님 「3D 공간 사이트에서 고객이 수정사항을 요청할 수 있는 버튼 → 하루에 한 번 클로드가 확인해서 수정」
 * body = { vendor, site, room, text, contact }
 * 저장 = Supabase app_state 행 `tourfix_<vendor>_<site>_<시각>` (status: new → done)
 * 환경 변수: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
function readJsonBody(req, maxLen = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > maxLen) reject(new Error("too large")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}
const SLUG = /^[a-z0-9-]{1,40}$/;
module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") { res.statusCode = 405; return res.end(JSON.stringify({ error: "POST only" })); }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const b = req.body && typeof req.body === "object" ? req.body : await readJsonBody(req);
    const vendor = String(b.vendor || "").trim(), site = String(b.site || "").trim();
    const text = String(b.text || "").trim().slice(0, 2000), room = String(b.room || "").trim().slice(0, 40);
    const contact = String(b.contact || "").trim().slice(0, 80);
    if (!SLUG.test(vendor) || !SLUG.test(site)) { res.statusCode = 400; return res.end(JSON.stringify({ error: "잘못된 현장" })); }
    if (text.length < 2) { res.statusCode = 400; return res.end(JSON.stringify({ error: "수정 내용을 적어 주세요" })); }
    const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!U || !K) { res.statusCode = 500; return res.end(JSON.stringify({ error: "서버 설정 없음" })); }
    const now = new Date(Date.now() + 9 * 3600 * 1000).toISOString().replace("Z", "+09:00").slice(0, 25);
    const id = `tourfix_${vendor}_${site}_${Date.now()}`;
    const payload = { vendor, site, room, text, contact, status: "new", created_at: now };
    const r = await fetch(`${U}/rest/v1/app_state`, {
      method: "POST",
      headers: { apikey: K, Authorization: `Bearer ${K}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify([{ id, payload }]),
    });
    if (!r.ok) { res.statusCode = 502; return res.end(JSON.stringify({ error: "저장 실패" })); }
    return res.end(JSON.stringify({ ok: true, id }));
  } catch (e) {
    res.statusCode = 500; return res.end(JSON.stringify({ error: "요청 처리 실패" }));
  }
};
