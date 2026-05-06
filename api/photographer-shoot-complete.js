/**
 * POST multipart/form-data
 * fields: scheduleId, writerLoginId, writerPassword,
 * optional file field "photo" (현장 확인 이미지), optional omitSiteImage=1 (이미지 없이 현장확인만 저장)
 */
const busboy = require("busboy");
const { completePhotographerShoot } = require("../lib/photographer-shoot-logic.cjs");
const { friendlyDriveQuotaMessage, friendlyDriveFolderCreateDeniedMessage } = require("../lib/google-drive-delivery.cjs");

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

  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const serviceRole = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl || !serviceRole) {
    console.error(
      "[photographer-shoot-complete] 서버 환경 변수 누락: SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY"
    );
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(503).json({
      ok: false,
      message:
        "현장확인 기능 서버 설정이 아직 연결되지 않았습니다. Vercel(또는 배포 환경) → Environment Variables 에 Supabase의 SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY(서비스 롤, project settings → API)를 등록한 뒤 재배포해 주세요.",
    });
    return;
  }

  try {
    const { fields, files } = await parseMultipart(req);
    const scheduleId = String(fields.scheduleId || "").trim();
    const writerLoginId = String(fields.writerLoginId || "").trim();
    const writerPassword = String(fields.writerPassword || "");

    const omitRequested = /^(1|true|yes)$/i.test(String(fields.omitSiteImage || "").trim());
    const photo = files[0];
    const hasPhoto = Boolean(photo?.buffer?.length);
    if (!omitRequested && !hasPhoto) {
      res.status(400).json({ ok: false, message: "현장 확인용 이미지(photo) 파일이 필요합니다. (이미지 없이 완료하려면 omitSiteImage=1)" });
      return;
    }

    const out = await completePhotographerShoot({
      writerLoginId,
      writerPassword,
      scheduleId,
      fileBuffer: hasPhoto ? photo.buffer : null,
      mimeType: hasPhoto ? photo.mimeType || "image/jpeg" : "",
      omitSiteConfirmationImage: !hasPhoto,
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
      console.error("[photographer-shoot-complete] Drive quota / shared drive 설정", error);
      res.status(400).json({ ok: false, message: driveHelp });
      return;
    }
    console.error("[photographer-shoot-complete]", error);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
