/**
 * POST JSON { writerLoginId, writerPassword, scheduleId }
 * 업체 company_directory 행 보장(없으면 생성·로그인 없으면 디자인/인테리어 제거 규칙 아이디 + 비번 1234) 후 Drive 납품 루트 폴더 생성.
 */
const { provisionPhotographerCompanyDeliveryFolder } = require("../lib/photographer-shoot-logic.cjs");
const { friendlyDriveFolderCreateDeniedMessage } = require("../lib/google-drive-delivery.cjs");

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

    const out = await provisionPhotographerCompanyDeliveryFolder({
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
    console.error("[photographer-company-delivery-provision]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
