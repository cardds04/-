/**
 * POST JSON { scheduleId, adminPassword }
 * 메인 보드 「원」수동 완료 — photographer_original_upload_notified_at 기록 (납품 URL 불필요)
 * 비밀번호: ADMIN_SHOOT_SITE_PASSWORD (관리자 현장 확인과 동일, 미설정 시 "6315")
 */
const { markPhotographerOriginalUploadManualAsAdmin } = require("../lib/photographer-shoot-logic.cjs");

function adminPasswordOk(pw) {
  const expected = String(process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315").trim();
  return String(pw || "") === expected;
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }
  try {
    const body =
      typeof req.body === "object" && req.body !== null
        ? req.body
        : JSON.parse(typeof req.body === "string" && req.body ? req.body : "{}");
    const scheduleId = String(body.scheduleId || "").trim();
    const adminPassword = String(body.adminPassword || "");

    if (!adminPasswordOk(adminPassword)) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(401).json({ ok: false, message: "관리자 비밀번호가 올바르지 않습니다." });
      return;
    }

    const out = await markPhotographerOriginalUploadManualAsAdmin({ scheduleId });
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!out.ok) {
      res.status(out.status || 500).json({ ok: false, message: out.message || "처리 실패" });
      return;
    }
    res.status(200).json({ ok: true, ...out.data });
  } catch (error) {
    console.error("[admin-original-upload-mark]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
