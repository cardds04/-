/**
 * Vercel Serverless: POST /api/board
 *
 * 11-20 사장님 「게시현황판을 아티팩트로 두지 말고 사이트로 아예 만들어 줘」 — sc-pink.vercel.app/board/ 의 데이터 창구.
 * 관리자 로그인(/api/admin-auth, 관리자 비밀번호) 토큰이 있어야 읽고 쓴다(수익·계정 정보가 있어 공개 금지).
 *
 * body = { token, action:"get", names:["slots", ...] }   → { ok, data:{ name:{ rows, updated_at, by } } }
 *        { token, action:"params" }                       → { ok, params }
 *        { token, action:"set_params", params }           → { ok }
 *
 * 데이터는 제작맥 셸(~/tools/board_site/push.py, 10분마다)이 Supabase app_state 에 올린다:
 *   board_ds_<이름> = { rows, updated_at, by } · board_params = 사장님이 누른 할 일 상태(했음·허용·알아서 해·코멘트)
 */
const { verifyAdminToken } = require("../lib/admin-auth-logic.cjs");

const NAME_RE = /^[a-z][a-z0-9_]{0,40}$/;
function norm(v) {
  return String(v == null ? "" : v).trim();
}

function readJsonBody(req, maxLen = 512 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxLen) reject(new Error("요청 본문이 너무 큽니다."));
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST만 지원합니다." });
    return;
  }
  try {
    const body =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body) ? req.body : await readJsonBody(req);
    if (!verifyAdminToken(body && body.token)) {
      res.status(401).json({ ok: false, reason: "admin_auth", error: "관리자 로그인이 필요합니다." });
      return;
    }
    const url = norm(process.env.SUPABASE_URL).replace(/\/+$/, "");
    const key = norm(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!url || !key) {
      res.status(500).json({ ok: false, error: "서버 설정(SUPABASE) 없음" });
      return;
    }
    const h = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    const action = norm(body.action) || "get";

    if (action === "get") {
      const names = (Array.isArray(body.names) ? body.names : []).map(norm).filter((n) => NAME_RE.test(n)).slice(0, 40);
      if (!names.length) {
        res.status(400).json({ ok: false, error: "names 없음" });
        return;
      }
      const ids = names.map((n) => `board_ds_${n}`).join(",");
      const r = await fetch(`${url}/rest/v1/app_state?id=in.(${encodeURIComponent(ids)})&select=id,payload`, { headers: h });
      if (!r.ok) throw new Error(`app_state 읽기 실패 ${r.status}`);
      const rows = await r.json();
      const data = {};
      for (const row of rows) data[String(row.id).slice(9)] = row.payload;
      res.status(200).json({ ok: true, data });
      return;
    }

    if (action === "params") {
      const r = await fetch(`${url}/rest/v1/app_state?id=eq.board_params&select=payload`, { headers: h });
      if (!r.ok) throw new Error(`app_state 읽기 실패 ${r.status}`);
      const rows = await r.json();
      res.status(200).json({ ok: true, params: (rows[0] && rows[0].payload) || {} });
      return;
    }

    if (action === "set_params") {
      const params = body.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params : null;
      if (!params) {
        res.status(400).json({ ok: false, error: "params 없음" });
        return;
      }
      const payload = { ...params, _updated_at: new Date().toISOString() };
      const r = await fetch(`${url}/rest/v1/app_state`, {
        method: "POST",
        headers: { ...h, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([{ id: "board_params", payload }]),
      });
      if (!r.ok) throw new Error(`app_state 쓰기 실패 ${r.status}`);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ ok: false, error: `알 수 없는 action: ${action}` });
  } catch (e) {
    console.error("[api/board]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
