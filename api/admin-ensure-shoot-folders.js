/**
 * POST JSON { scheduleId, adminPassword }
 * 관리자 비밀번호 확인 후 해당 스케줄 촬영일 현장 Drive 폴더가 없으면 생성.
 * 이미 shoot_folder_id 가 있으면 { alreadyExists: true } 만 반환.
 *
 * 비밀번호: ADMIN_SHOOT_SITE_PASSWORD (미설정 시 기본 "6315")
 */
const { ensureShootDriveFoldersAsAdmin } = require("../lib/photographer-shoot-logic.cjs");
const { friendlyDriveQuotaMessage, friendlyDriveFolderCreateDeniedMessage } = require("../lib/google-drive-delivery.cjs");

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
    const adminPassword = String(body.adminPassword ?? body.password ?? "");

    if (!adminPasswordOk(adminPassword)) {
      res.status(401).json({ ok: false, message: "관리자 비밀번호가 올바르지 않습니다." });
      return;
    }

    const out = await ensureShootDriveFoldersAsAdmin({ scheduleId });

    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!out.ok) {
      res.status(out.status || 500).json({ ok: false, message: out.message || "실패" });
      return;
    }
    res.status(200).json({ ok: true, ...out.data });
  } catch (error) {
    const driveDeny =
      typeof friendlyDriveFolderCreateDeniedMessage === "function"
        ? friendlyDriveFolderCreateDeniedMessage(error)
        : null;
    if (driveDeny) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(403).json({ ok: false, message: driveDeny });
      return;
    }
    const driveHelp = typeof friendlyDriveQuotaMessage === "function" ? friendlyDriveQuotaMessage(error) : null;
    if (driveHelp) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(400).json({ ok: false, message: driveHelp });
      return;
    }
    console.error("[admin-ensure-shoot-folders]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
