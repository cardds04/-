/**
 * POST JSON { writerLoginId, writerPassword, scheduleId }
 * 현장 확인 완료 후 Drive 업체·촬영일·하위 폴더 생성
 */
const {
  ensurePhotographerDriveFolders,
} = require("../lib/photographer-shoot-logic.cjs");
const { friendlyDriveQuotaMessage, friendlyDriveFolderCreateDeniedMessage } = require("../lib/google-drive-delivery.cjs");

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
    const writerLoginId = String(body.writerLoginId || "").trim();
    const writerPassword = String(body.writerPassword || "");
    const scheduleId = String(body.scheduleId || "").trim();

    const out = await ensurePhotographerDriveFolders({
      writerLoginId,
      writerPassword,
      scheduleId,
    });

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
    console.error("[photographer-ensure-folders]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
