/**
 * POST multipart/form-data
 * fields: scheduleId, writerLoginId, writerPassword, file field "photo"
 *
 * 현장 확인 이미지 1장(사진 또는 PNG 서명) 업로드 + 해당 스케줄 업체 Drive 폴더 트리 생성(없을 때) + 완료 시각 저장.
 */
const busboy = require("busboy");
const { completePhotographerShoot } = require("../lib/photographer-shoot-logic.cjs");

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const bb = busboy({
      headers: req.headers,
      limits: { fileSize: 12 * 1024 * 1024 },
    });
    const fields = {};
    const files = [];
    bb.on("field", (name, val) => {
      fields[name] = val;
    });
    bb.on("file", (name, file, info) => {
      if (name !== "photo") {
        file.resume();
        return;
      }
      const chunks = [];
      file.on("data", (d) => chunks.push(d));
      file.on("limit", () => {
        reject(new Error("file_too_large"));
      });
      file.on("end", () => {
        files.push({
          filename: info.filename,
          mimeType: info.mimeType || "",
          buffer: Buffer.concat(chunks),
        });
      });
    });
    bb.on("error", reject);
    bb.on("finish", () => {
      resolve({ fields, files });
    });
    req.pipe(bb);
  });
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
    const { fields, files } = await parseMultipart(req);
    const scheduleId = String(fields.scheduleId || "").trim();
    const writerLoginId = String(fields.writerLoginId || "").trim();
    const writerPassword = String(fields.writerPassword || "");

    const photo = files[0];
    if (!photo?.buffer?.length) {
      res.status(400).json({ ok: false, message: "현장 확인용 이미지(photo) 파일이 필요합니다." });
      return;
    }

    const out = await completePhotographerShoot({
      writerLoginId,
      writerPassword,
      scheduleId,
      fileBuffer: photo.buffer,
      mimeType: photo.mimeType || "image/jpeg",
    });

    if (!out.ok) {
      res.status(out.status || 500).json({ ok: false, message: out.message || "처리 실패" });
      return;
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).json({ ok: true, ...out.data });
  } catch (error) {
    if (String(error?.message || "") === "file_too_large") {
      res.status(400).json({ ok: false, message: "파일 크기는 12MB 이하여야 합니다." });
      return;
    }
    console.error("[photographer-shoot-complete]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
