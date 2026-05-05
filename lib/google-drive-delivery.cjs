/**
 * Google Drive — 서비스 계정으로 폴더 생성·조회·링크 공개
 */
const { Readable } = require("stream");
const { google } = require("googleapis");

const FOLDER_MIME = "application/vnd.google-apps.folder";

function getCredentialsFromEnv() {
  let raw = String(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!raw) return null;
  /** BOM */
  if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch (_) {
      return null;
    }
  };
  let parsed = tryParse(raw);
  if (parsed && typeof parsed === "object") return parsed;
  /** 전체 값이 Base64 인 경우 (Vercel에 여 줄 JSON 넣기 어려울 때) */
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    parsed = tryParse(decoded.trim());
    if (parsed && typeof parsed.type === "string" && parsed.type === "service_account") return parsed;
    if (parsed && typeof parsed === "object") return parsed;
  } catch (_) {}
  return null;
}

function getParentFolderId() {
  return String(process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || "").trim();
}

/** Gaxios 등으로 중첩된 Google API 오류에서 문자열 모으기 */
function collectErrorStringsDeep(val, out, depth) {
  if (depth > 18 || val == null) return;
  const t = typeof val;
  if (t === "string") {
    out.push(val);
    return;
  }
  if (t !== "object") return;
  if (typeof val.stack === "string") out.push(val.stack);
  for (const k of ["message", "reason", "statusText", "detail", "description"]) {
    if (typeof val[k] === "string") out.push(val[k]);
  }
  if (Array.isArray(val)) {
    val.forEach((x) => collectErrorStringsDeep(x, out, depth + 1));
    return;
  }
  for (const k of ["error", "errors", "response", "data", "cause"]) {
    if (val[k] != null) collectErrorStringsDeep(val[k], out, depth + 1);
  }
}

/** Google API — 서비스 계정은 My Drive 에 직접 쓸 수 없어 자주 나는 오류 */
function isServiceAccountNoQuotaError(err) {
  const out = [];
  collectErrorStringsDeep(err, out, 0);
  const blob = out.join("\n").toLowerCase();
  return (
    blob.includes("service accounts do not") ||
    blob.includes("does not have storage quota") ||
    blob.includes("service account") && blob.includes("no storage quota")
  );
}

function driveQuotaHelpMessage() {
  return (
    "[Drive 설정 필요] 서비스 계정 전용 저장공간은 없습니다. " +
      "①가장 확실: Google Workspace 「공유 드라이브」를 만들고, 키 JSON의 client_email(…iam.gserviceaccount.com)을 " +
      "그 공유 드라이브 구성원으로 「콘텐츠 관리자」급으로 추가합니다. 공유 드라이브 안에 작업 폴더를 만든 뒤 " +
      "그 폴더 URL의 GOOGLE_DRIVE_PARENT_FOLDER_ID 만 Vercel에 넣습니다. " +
      "②개인 계정만 있을 때: 내 드라이브에 폴더를 만들고 서비스 계정에 「편집자」로 공유했어도, " +
      "Google 정책상 파일 업로드만 막힐 수 있습니다(폴더 생성은 가능)."
  );
}

/** 촬영완료 등에서 업로드 생략 판별용 (한글 재포장 에러 포함) */
const DRIVE_SERVICE_ACCOUNT_NO_QUOTA_CODE = "DRIVE_SERVICE_ACCOUNT_NO_QUOTA";

function makeDriveQuotaError(originalErr) {
  const err = new Error(driveQuotaHelpMessage());
  err.code = DRIVE_SERVICE_ACCOUNT_NO_QUOTA_CODE;
  err.cause = originalErr;
  return err;
}

function isDriveQuotaBypassError(err) {
  return err?.code === DRIVE_SERVICE_ACCOUNT_NO_QUOTA_CODE || isServiceAccountNoQuotaError(err);
}

/** API 에서 사용자에게 줄 한글 안내 또는 null */
function friendlyDriveQuotaMessage(error) {
  return isDriveQuotaBypassError(error) ? driveQuotaHelpMessage() : null;
}

function getDriveClient() {
  const credentials = getCredentialsFromEnv();
  if (!credentials) {
    throw new Error(
      "GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON 이 비어 있거나 파싱할 수 없습니다. " +
        "Google Cloud 서비스 계정 키 JSON 전체를 한 줄로 붙이거나, " +
        "그 JSON 파일 내용을 UTF-8 Base64 로 인코딩한 문자열만 넣어 주세요. (따옴표로 감싸지 말 것)"
    );
  }
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

function escapeDriveQueryLiteral(value) {
  return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function findChildFolderByName(drive, parentId, name) {
  const q = [
    `'${escapeDriveQueryLiteral(parentId)}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `name = '${escapeDriveQueryLiteral(name)}'`,
  ].join(" and ");
  const res = await drive.files.list({
    q,
    fields: "files(id,name)",
    pageSize: 10,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const files = res.data.files || [];
  return files[0]?.id || null;
}

async function createFolder(drive, name, parentId) {
  try {
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: FOLDER_MIME,
        parents: [parentId],
      },
      fields: "id,name",
      supportsAllDrives: true,
    });
    return created.data.id;
  } catch (e) {
    if (isServiceAccountNoQuotaError(e)) {
      throw makeDriveQuotaError(e);
    }
    throw e;
  }
}

async function ensureFolder(drive, parentId, name) {
  const existing = await findChildFolderByName(drive, parentId, name);
  if (existing) return existing;
  return createFolder(drive, name, parentId);
}

async function listNonFolderFileIds(drive, folderId) {
  const q = `'${escapeDriveQueryLiteral(folderId)}' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`;
  const ids = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(id,name,mimeType)",
      pageSize: 200,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files || []) {
      if (f.id) ids.push(f.id);
    }
    pageToken = res.data.nextPageToken || null;
  } while (pageToken);
  return ids;
}

async function setAnyoneReaderLink(drive, fileId) {
  const allow = String(process.env.DELIVERY_DRIVE_LINK_PERMISSION || "anyone").trim().toLowerCase();
  if (allow === "none" || allow === "private") return;
  try {
    await drive.permissions.create({
      fileId,
      requestBody: { type: "anyone", role: "reader" },
      supportsAllDrives: true,
    });
  } catch (e) {
    console.warn("[drive] anyone 링크 공유 실패(조직 정책일 수 있음)", e?.message || e);
  }
}

/** 웹에서 열리는 링크 */
function webViewLinkFromId(fileId) {
  return `https://drive.google.com/drive/folders/${fileId}`;
}

async function uploadBufferToFolder(drive, { parentId, name, buffer, mimeType }) {
  const stream = Readable.from(buffer);
  try {
    const created = await drive.files.create({
      requestBody: {
        name: String(name || "upload.bin").slice(0, 200),
        parents: [parentId],
      },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: stream,
      },
      fields: "id,name",
      supportsAllDrives: true,
    });
    return created.data.id;
  } catch (e) {
    if (isServiceAccountNoQuotaError(e)) {
      throw makeDriveQuotaError(e);
    }
    throw e;
  }
}

module.exports = {
  getDriveClient,
  getParentFolderId,
  ensureFolder,
  listNonFolderFileIds,
  setAnyoneReaderLink,
  webViewLinkFromId,
  uploadBufferToFolder,
  friendlyDriveQuotaMessage,
  isDriveQuotaBypassError,
  DRIVE_SERVICE_ACCOUNT_NO_QUOTA_CODE,
  FOLDER_MIME,
};
