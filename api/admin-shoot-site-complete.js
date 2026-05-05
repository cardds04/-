/**
 * POST JSON: { scheduleId, adminPassword }
 * POST multipart: fields scheduleId, adminPassword, file photo (선택) — 관리자 작가 현장 확인완료 + Drive 폴더
 *
 * 비밀번호: 환경변수 ADMIN_SHOOT_SITE_PASSWORD (미설정 시 기본 "6315" — index.html 관리자 패턴과 동일)
 */
const busboy = require("busboy");
const { completeShootSiteAsAdmin } = require("../lib/photographer-shoot-logic.cjs");
const { friendlyDriveQuotaMessage } = require("../lib/google-drive-delivery.cjs");

function adminPasswordOk(pw) {
  const expected = String(process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315").trim();
  return String(pw || "") === expected;
}

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
      file.on("limit", () => reject(new Error("file_too_large")));
      file.on("end", () => {
        files.push({
          filename: info.filename,
          mimeType: info.mimeType || "",
          buffer: Buffer.concat(chunks),
        });
      });
    });
    bb.on("error", reject);
    bb.on("finish", () => resolve({ fields, files }));
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

  const ctype = String(req.headers["content-type"] || "").toLowerCase();

  try {
    let scheduleId = "";
    let adminPassword = "";
    let fileBuffer = null;
    let mimeType = "";

    if (ctype.includes("multipart/form-data")) {
      const { fields, files } = await parseMultipart(req);
      scheduleId = String(fields.scheduleId || "").trim();
      adminPassword = String(fields.adminPassword || "");
      const photo = files[0];
      if (photo?.buffer?.length) {
        fileBuffer = photo.buffer;
        mimeType = photo.mimeType || "image/jpeg";
      }
    } else {
      const body =
        typeof req.body === "object" && req.body !== null
          ? req.body
          : JSON.parse(typeof req.body === "string" && req.body ? req.body : "{}");
      scheduleId = String(body.scheduleId || "").trim();
      adminPassword = String(body.adminPassword || "");
    }

    if (!adminPasswordOk(adminPassword)) {
      res.status(401).json({ ok: false, message: "관리자 비밀번호가 올바르지 않습니다." });
      return;
    }

    const out = await completeShootSiteAsAdmin({
      scheduleId,
      fileBuffer,
      mimeType,
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
    const driveHelp = typeof friendlyDriveQuotaMessage === "function" ? friendlyDriveQuotaMessage(error) : null;
    if (driveHelp) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      console.error("[admin-shoot-site-complete] Drive quota / shared drive 설정", error);
      res.status(400).json({ ok: false, message: driveHelp });
      return;
    }
    console.error("[admin-shoot-site-complete]", error);
    res.status(500).json({ ok: false, message: error?.message || "서버 오류" });
  }
};
