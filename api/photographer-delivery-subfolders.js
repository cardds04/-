/**
 * POST JSON { scheduleId, folderName, writerLoginId, writerPassword }
 * 작가 「폴더생성후열기」 — 업체 납품 폴더 안에
 *   {만들폴더명}/{MMDD}{업체명}사진원본·영상원본 트리를 만든다(있으면 재사용).
 * 업체 폴더 자체가 없으면 공유폴더 안에 업체 폴더를 만들고 공유링크를
 * company_directory 폴더연결 주소에 저장까지 한다.
 */
const { ensureWriterDeliverySubfolders } = require("../lib/photographer-shoot-logic.cjs");

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
    const out = await ensureWriterDeliverySubfolders({
      scheduleId: String(body.scheduleId || "").trim(),
      folderName: String(body.folderName || "").trim(),
      writerLoginId: String(body.writerLoginId || "").trim(),
      writerPassword: String(body.writerPassword || "")
    });
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!out.ok) {
      res.status(out.status || 500).json({ ok: false, message: out.message || "실패" });
      return;
    }
    res.status(200).json({ ok: true, ...out.data });
  } catch (error) {
    console.error("[photographer-delivery-subfolders]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
