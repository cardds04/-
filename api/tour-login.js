/**
 * Vercel Serverless: POST /api/tour-login — 3D 업체 페이지 잠금 해제 (lib/tour-gate.cjs 참고)
 *
 * body:
 *  { action:"login",   vendor, loginId, password }  // 잠금 화면에서 촬영스케줄 아이디·비번
 *  { action:"admin_pw", password }                    // 잠금 화면에서 관리자 비번
 *  { action:"session", token }                        // 고객 포털: 로그인 세션 토큰 → 비번 없이
 *  { action:"admin",   token }                        // 관리자 사이트: 관리자 토큰 → 비번 없이
 * 성공 시 HttpOnly 쿠키 t3d 를 심고 { ok, vendors:[{slug,url}], adm } 반환.
 */
const g = require("../lib/tour-gate.cjs");
const { verifyRowPassword } = require("../lib/customer-auth-logic.cjs");
const { verifySessionToken } = require("../lib/customer-session.cjs");
const { verifyAdminToken } = require("../lib/admin-auth-logic.cjs");

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => {
      raw += c;
      if (raw.length > 64 * 1024) reject(new Error("요청 본문이 너무 큽니다."));
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

function adminPwOk(pw) {
  const expected = g.norm(process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315");
  return expected !== "" && g.norm(pw) === expected;
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
    const action = g.norm(body.action);
    const prev = g.readToken(g.cookieFromReq(req)) || { vs: [], adm: 0 };
    let vs = [];
    let adm = 0;

    if (action === "admin_pw") {
      if (!adminPwOk(body.password)) return res.status(401).json({ ok: false, error: "비밀번호가 올바르지 않습니다." });
      adm = 1;
    } else if (action === "admin") {
      if (!verifyAdminToken(body.token)) return res.status(401).json({ ok: false, error: "관리자 로그인이 필요합니다." });
      adm = 1;
    } else if (action === "session") {
      const c = verifySessionToken(body.token);
      if (!c || !c.lid) return res.status(401).json({ ok: false, error: "다시 로그인해 주세요." });
      vs = await g.vendorsForCompany(c.cn);
      if (!vs.length) return res.status(200).json({ ok: true, vendors: [], adm: 0 });
    } else if (action === "login") {
      const vendor = g.norm(body.vendor);
      const loginId = g.norm(body.loginId);
      const pw = g.norm(body.password);
      if (!loginId || !pw) return res.status(400).json({ ok: false, error: "아이디와 비밀번호를 넣어 주세요." });
      // 관리자는 아이디 admin + 관리자 비번으로도 열 수 있다
      if (loginId.toLowerCase() === "admin" && adminPwOk(pw)) {
        adm = 1;
      } else {
        const rows = await g.fetchCompanyByLogin(loginId);
        const row = rows.find((r) => verifyRowPassword(pw, r).ok);
        if (!row) return res.status(401).json({ ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." });
        vs = await g.vendorsForCompany(row.name);
        if (vendor && !vs.includes(vendor))
          return res.status(403).json({ ok: false, error: "이 업체 페이지를 볼 수 있는 계정이 아닙니다." });
      }
    } else {
      return res.status(400).json({ ok: false, error: "알 수 없는 요청입니다." });
    }

    const merged = [...new Set([...(prev.vs || []), ...vs])];
    const token = g.makeToken({ vs: merged, adm: adm || prev.adm ? 1 : 0 });
    res.setHeader("Set-Cookie", g.setCookieHeader(token));
    res.status(200).json({ ok: true, adm: adm ? 1 : 0, vendors: vs.map((s) => ({ slug: s, url: `/tour/${s}/` })) });
  } catch (e) {
    console.error("[api/tour-login]", e);
    res.status(500).json({ ok: false, error: "서버 오류" });
  }
};
