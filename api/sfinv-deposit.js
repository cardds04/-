/**
 * 카카오뱅크 입금 푸시 → 숏폼 청구(app_state sfinv_*) 자동 입금확인.
 * 안드로이드 MacroDroid 가 알림(카카오뱅크·「입금」)을 받으면 POST 한다.
 *   POST /api/sfinv-deposit?t=<토큰>   JSON { title, text }   (토큰은 body.token 도 허용)
 * 규칙
 *  - 「입금」 이 없거나 「출금」 이면 무시(기록만).
 *  - 금액이 같은 숏폼 미입금 건이 1건 → 입금확인. 여러 건이면 입금자명이 업체명·담당자와 맞는 1건만. 그 밖엔 「확인 필요」로 기록만.
 *  - 모든 수신은 app_state sfdep_<시각> 행에 원문 그대로 남긴다(카카오뱅크 문구가 바뀌어도 사장님 화면에서 보인다).
 * 촬영 입금(스케줄 data)은 절대 건드리지 않는다.
 */
const crypto = require("crypto");
const TOKEN_SHA256 = "e666e3b7dca4e63786b8f08bf5477be5f336d7f94f057d67679221861772ed9d"; // 원문 토큰은 ~/schedule-site/.env SFINV_WEBHOOK_TOKEN (커밋 금지)

const norm = (v) => String(v || "").trim().replace(/^"|"$/g, "");
function sb() {
  const url = norm(process.env.SUPABASE_URL), key = norm(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error("SUPABASE env missing");
  const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  return { url, h };
}
function kstNow() { return new Date(Date.now() + 9 * 3600e3); }
function parseDeposit(raw) {
  const s = String(raw || "").replace(/\s+/g, " ").trim();
  const s2 = s.replace(/입출금/g, "");               // 「입출금통장」 의 출금에 걸리지 않게
  const isDeposit = /입금|보냈어요|받았어요/.test(s2) && !/출금/.test(s2);
  const m = s.match(/([0-9][0-9,]*)\s*원/);
  const amount = m ? Number(m[1].replace(/,/g, "")) : 0;
  let rest = s.replace(/([0-9][0-9,]*)\s*원/g, " ").replace(/잔액[^|]*$/g, " ");
  rest = rest.replace(/카카오뱅크|입금|출금|알림|내\s*통장|입출금통장|통장|잔액|이체|받은\s*돈|보낸\s*분|보낸분|원/g, " ");
  rest = rest.replace(/\([^)]*\)|\[[^\]]*\]|[0-9*:\-./|→>]/g, " ");
  rest = rest.replace(/님이|님으로부터|님|씨|을|를|보냈어요|받았어요/g, " ");
  const tok = rest.split(" ").map((x) => x.trim()).filter((x) => /[가-힣A-Za-z]/.test(x) && x.length >= 2 && x.length <= 20);
  return { isDeposit, amount, name: tok[0] || "", text: s };
}
const clean = (v) => String(v || "").replace(/\s|\(.*?\)|주식회사|\(주\)|인테리어|디자인/g, "").toLowerCase();

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ ok: false }); return; }
  let body = {};
  try { body = typeof req.body === "object" && req.body ? req.body : JSON.parse(req.body || "{}"); } catch (_) { body = {}; }
  const token = norm((req.query && req.query.t) || body.token);
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const want = norm(process.env.SFINV_WEBHOOK_TOKEN_SHA256) || TOKEN_SHA256;
  if (!token || hash.length !== want.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(want))) {
    res.status(401).json({ ok: false, message: "unauthorized" }); return;
  }
  const raw = [body.title, body.text, body.bigtext].filter(Boolean).join(" | ").slice(0, 500);
  const p = parseDeposit(raw);
  try {
    const { url, h } = sb();
    const now = kstNow(); const ymd = now.toISOString().slice(0, 10);
    // 같은 문구가 10분 안에 또 오면 무시(알림 중복)
    const recent = await (await fetch(`${url}/rest/v1/app_state?id=like.sfdep_%25&select=id,payload&order=id.desc&limit=20`, { headers: h })).json();
    if (Array.isArray(recent) && recent.some((r) => r.payload && r.payload.raw === raw && Date.now() - Date.parse(r.payload.receivedAt || 0) < 600e3)) {
      res.status(200).json({ ok: true, status: "duplicate" }); return;
    }
    let status = "ignored", matchedId = "", candidates = [];
    if (p.isDeposit && p.amount > 0) {
      const inv = await (await fetch(`${url}/rest/v1/app_state?id=like.sfinv_%25&select=id,payload`, { headers: h })).json();
      const unpaid = (Array.isArray(inv) ? inv : []).filter((r) => r.payload && !r.payload.paid && Number(r.payload.amount) === p.amount);
      candidates = unpaid.map((r) => r.id);
      let pick = null;
      if (unpaid.length === 1) pick = unpaid[0];
      else if (unpaid.length > 1 && p.name) {
        const n = clean(p.name);
        const byName = unpaid.filter((r) => [r.payload.customer, r.payload.company, r.payload.payer].some((v) => { const c = clean(v); return c && (c.includes(n) || n.includes(c)); }));
        if (byName.length === 1) pick = byName[0];
      }
      if (pick) {
        const payload = { ...pick.payload, paid: true, paidAt: ymd, payer: p.name || pick.payload.payer || "", autoPaid: true, updatedAt: new Date().toISOString() };
        const up = await fetch(`${url}/rest/v1/app_state`, { method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ id: pick.id, payload }]) });
        status = up.ok ? "matched" : "error"; matchedId = pick.id;
      } else {
        status = unpaid.length > 1 ? "ambiguous" : "unmatched";
      }
    }
    const depId = `sfdep_${now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 17)}`;
    await fetch(`${url}/rest/v1/app_state`, { method: "POST", headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ id: depId, payload: { raw, amount: p.amount, name: p.name, isDeposit: p.isDeposit, status, matchedId, candidates, receivedAt: new Date().toISOString() } }]) });
    res.status(200).json({ ok: true, status, amount: p.amount, name: p.name, matchedId });
  } catch (e) {
    res.status(500).json({ ok: false, message: String(e && e.message || e) });
  }
};
