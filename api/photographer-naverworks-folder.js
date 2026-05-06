/**
 * POST JSON { writerLoginId, writerPassword, scheduleId }
 * 네이버웍스(NAVER WORKS) API 2.0 Service Account JWT — Drive 상위 폴더 아래 촬영일 폴더 생성
 * (루트에 create_folder.py 있으면 우선 사용·공유 링크 포함, 없으면 scripts/naverworks_drive_create_folder.py + venv)
 */
const { createNaverWorksFolderForPhotographer } = require("../lib/photographer-shoot-logic.cjs");

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

    const out = await createNaverWorksFolderForPhotographer({
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
    console.error("[photographer-naverworks-folder]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
