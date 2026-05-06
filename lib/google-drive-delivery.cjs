/**
 * Google Drive — 서비스 계정으로 폴더 생성·조회·링크 공개
 */
const { Readable } = require("stream");
const { google } = require("googleapis");

const FOLDER_MIME = "application/vnd.google-apps.folder";

function sleepMs(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

/** Google Drive API 는 새 폴더 생성을 막지 않아, 운영 플래그로만 제한한다. */
const DRIVE_FOLDER_CREATE_DISALLOWED_CODE = "DRIVE_FOLDER_CREATE_DISALLOWED";

function isDriveFolderCreateAllowed() {
  return /^(1|true|yes)$/i.test(String(process.env.DELIVERY_DRIVE_ALLOW_NEW_FOLDERS || "").trim());
}

function makeDriveFolderCreateDisallowedError(hint) {
  const err = new Error(
    "서버에서 Drive 새 폴더 생성을 허용하지 않습니다. 필요 시 배포 환경 변수 DELIVERY_DRIVE_ALLOW_NEW_FOLDERS=1 을 설정하세요."
  );
  err.code = DRIVE_FOLDER_CREATE_DISALLOWED_CODE;
  if (hint) err.hint = String(hint).slice(0, 120);
  return err;
}

/** API 한글 안내 (quota 와 동일 패턴) */
function friendlyDriveFolderCreateDeniedMessage(error) {
  return error?.code === DRIVE_FOLDER_CREATE_DISALLOWED_CODE
    ? "Google Drive 에 새 폴더를 만들지 않도록 서버가 설정되어 있습니다. 현장 확인·자동 납품 폴더가 필요하면 배포 환경 변수 DELIVERY_DRIVE_ALLOW_NEW_FOLDERS=1 후 재배포해 주세요."
    : null;
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
  const nm = String(name || "");
  const q = [
    `'${escapeDriveQueryLiteral(parentId)}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `name = '${escapeDriveQueryLiteral(nm)}'`,
  ].join(" and ");
  const res = await drive.files.list({
    q,
    fields: "files(id,name,createdTime)",
    pageSize: 100,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });
  const raw = res.data.files || [];
  const exact = raw.filter((f) => String(f?.name || "") === nm);
  if (!exact.length) return null;
  exact.sort((a, b) => {
    const ta = Date.parse(a?.createdTime || "") || 0;
    const tb = Date.parse(b?.createdTime || "") || 0;
    return ta - tb;
  });
  if (exact.length > 1) {
    console.warn(
      `[drive] 동일 이름 폴더 ${exact.length}개(부모 …${String(parentId).slice(-8)} / "${nm.slice(0, 80)}") → 가장 먼저 만든 폴더만 사용. 나머지는 필요 시 병합·삭제해 주세요.`
    );
  }
  return exact[0]?.id || null;
}

async function createFolder(drive, name, parentId, opts = {}) {
  const skipAllowCheck = opts && opts.skipAllowCheck === true;
  if (!skipAllowCheck && !isDriveFolderCreateAllowed()) {
    throw makeDriveFolderCreateDisallowedError(name);
  }
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

async function ensureFolder(drive, parentId, name, opts = {}) {
  let existing = await findChildFolderByName(drive, parentId, name);
  if (existing) return existing;
  try {
    await createFolder(drive, name, parentId, opts);
  } catch (e) {
    existing = await findChildFolderByName(drive, parentId, name);
    if (existing) return existing;
    throw e;
  }
  /** create 직후 Drive 목록 API 가 한 박자 늦는 경우가 있어 짧게 재시도 */
  for (let attempt = 0; attempt < 12; attempt++) {
    existing = await findChildFolderByName(drive, parentId, name);
    if (existing) return existing;
    if (attempt < 11) await sleepMs(100 + attempt * 50);
  }
  throw new Error(`ensureFolder: 폴더 생성 후 조회 실패 "${String(name).slice(0, 80)}"`);
}

/** 촬영일 폴더 바로 아래 하위폴더만 (직접 자식), 이름 검증용 */
async function listImmediateChildFolders(drive, parentId) {
  const pid = String(parentId || "").trim();
  if (!pid) return [];
  const q = [
    `'${escapeDriveQueryLiteral(pid)}' in parents`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
  ].join(" and ");
  const out = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(id,name)",
      pageSize: 100,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files || []) {
      if (f?.id && f?.name) out.push({ id: f.id, name: String(f.name) });
    }
    pageToken = res.data.nextPageToken || null;
  } while (pageToken);
  return out;
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

/** 원본 폴더 보존 기간용: 직접 자식 파일만(하위 폴더 안은 제외), createdTime = Drive 에 올라온 시각 */
async function listNonFolderFilesWithCreated(drive, folderId) {
  const q = `'${escapeDriveQueryLiteral(folderId)}' in parents and mimeType != '${FOLDER_MIME}' and trashed = false`;
  const out = [];
  let pageToken = null;
  do {
    const res = await drive.files.list({
      q,
      fields: "nextPageToken, files(id,name,mimeType,createdTime)",
      pageSize: 200,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    });
    for (const f of res.data.files || []) {
      if (f?.id && f.createdTime) {
        out.push({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
          createdTime: f.createdTime,
        });
      }
    }
    pageToken = res.data.nextPageToken || null;
  } while (pageToken);
  return out;
}

async function renameDriveItem(drive, fileId, newName) {
  const id = String(fileId || "").trim();
  const name = String(newName || "").trim().slice(0, 255);
  if (!id || !name) throw new Error("renameDriveItem: id·이름 필요");
  await drive.files.update({
    fileId: id,
    requestBody: { name },
    fields: "id,name",
    supportsAllDrives: true,
  });
}

async function trashDriveFile(drive, fileId) {
  await drive.files.update({
    fileId: String(fileId || "").trim(),
    requestBody: { trashed: true },
    supportsAllDrives: true,
  });
}

async function deleteDriveFilePermanently(drive, fileId) {
  await drive.files.delete({
    fileId: String(fileId || "").trim(),
    supportsAllDrives: true,
  });
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
  DRIVE_FOLDER_CREATE_DISALLOWED_CODE,
  getDriveClient,
  getParentFolderId,
  ensureFolder,
  findChildFolderByName,
  listImmediateChildFolders,
  listNonFolderFileIds,
  listNonFolderFilesWithCreated,
  renameDriveItem,
  trashDriveFile,
  deleteDriveFilePermanently,
  setAnyoneReaderLink,
  webViewLinkFromId,
  uploadBufferToFolder,
  friendlyDriveQuotaMessage,
  friendlyDriveFolderCreateDeniedMessage,
  isDriveFolderCreateAllowed,
  isDriveQuotaBypassError,
  DRIVE_SERVICE_ACCOUNT_NO_QUOTA_CODE,
  FOLDER_MIME,
};
