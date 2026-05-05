/**
 * Google Drive — 서비스 계정으로 폴더 생성·조회·링크 공개
 */
const { Readable } = require("stream");
const { google } = require("googleapis");

const FOLDER_MIME = "application/vnd.google-apps.folder";

function getCredentialsFromEnv() {
  const raw = String(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || "").trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function getParentFolderId() {
  return String(process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || "").trim();
}

function getDriveClient() {
  const credentials = getCredentialsFromEnv();
  if (!credentials) {
    throw new Error("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON 가 유효한 JSON 이 아닙니다.");
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
}

module.exports = {
  getDriveClient,
  getParentFolderId,
  ensureFolder,
  listNonFolderFileIds,
  setAnyoneReaderLink,
  webViewLinkFromId,
  uploadBufferToFolder,
  FOLDER_MIME,
};
