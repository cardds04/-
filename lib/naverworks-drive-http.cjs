/**
 * 네이버웍스 Drive 폴더 생성 + 공유 링크 (순수 Node / Python 불필요)
 * 프로젝트 루트 create_folder.py 와 같은 환경 변수·URL 규칙 사용.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { URLSearchParams } = require("url");

const TOKEN_URL = "https://auth.worksmobile.com/oauth2/v2.0/token";
const GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer";
const INTERNAL_DRIVE_API_HOST = "https://api.drive.worksmobile.com";
const AUTH_SCOPE_PREFIX = "https://www.worksapis.com/auth/";

function _e(name, fallback = "") {
  const v = process.env[name];
  return v === undefined || v === null ? fallback : String(v).trim();
}

function resolveWorksapApiBase() {
  return (_e("NAVER_WORKS_WORKSAPIS_BASE") || "https://www.worksapis.com/v1.0").replace(/\/+$/, "");
}

function normalizeNaverWorksOauthScope(raw) {
  const s = String(raw || "")
    .replace(/,/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return "";
  const parts = [];
  for (const tok of s.split(" ")) {
    const t = tok.trim();
    if (!t) continue;
    if (t.startsWith(AUTH_SCOPE_PREFIX)) parts.push(t);
    else if (t.startsWith("https://") && t.includes("worksapis.com/auth/")) parts.push(t);
    else parts.push(`${AUTH_SCOPE_PREFIX}${t.replace(/^\/*/, "")}`);
  }
  return parts.join(" ");
}

function resolveOauthScopeFromEnv() {
  for (const key of ["NAVER_WORKS_OAUTH_SCOPE", "NAVER_WORKS_SCOPE", "NAVER_WORKS_AUTH_SCOPE"]) {
    const raw = process.env[key];
    if (raw == null) continue;
    const s = String(raw).trim();
    if (s) return normalizeNaverWorksOauthScope(s);
  }
  throw new Error("NAVER_WORKS_OAUTH_SCOPE(또는 NAVER_WORKS_SCOPE) 이 비어 있습니다.");
}

function worksScopeSlugs(tokensSpaceSep) {
  const out = [];
  for (const tok of String(tokensSpaceSep || "").split(/\s+/)) {
    const t = tok.trim();
    if (!t) continue;
    if (t.startsWith(AUTH_SCOPE_PREFIX)) out.push(t.slice(AUTH_SCOPE_PREFIX.length).replace(/^\/*/, ""));
    else if (t.startsWith("https://")) {
      const idx = t.indexOf("/auth/");
      if (idx !== -1) out.push(t.slice(idx + "/auth/".length).replace(/^\/*/, ""));
      else out.push(t.replace(/^\/*/, ""));
    } else out.push(t.replace(/^\/*/, ""));
  }
  return out;
}

function pruneRedundantWorksScopeSlugs(slugs) {
  const set = new Set(slugs);
  const kept = [];
  for (const p of slugs) {
    if (p.length > 5 && p.endsWith(".read")) {
      const base = p.slice(0, -5);
      if (base === "file") {
        kept.push(p);
        continue;
      }
      if (base && set.has(base)) continue;
    }
    kept.push(p);
  }
  return kept;
}

function scopeStringForTokenRequest(normalizedScope, useFullUrl) {
  const slugs = pruneRedundantWorksScopeSlugs(worksScopeSlugs(normalizedScope));
  if (useFullUrl) return slugs.map((x) => `${AUTH_SCOPE_PREFIX}${x}`).join(" ");
  return slugs.join(" ");
}

function scopeTokenUseFullUrl() {
  const v = _e("NAVER_WORKS_SCOPE_TOKEN_USE_FULL_URL").toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function isSharedDriveFlag() {
  const v = _e("NAVER_WORKS_SHARED_DRIVE").toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

function resolveDriveSharedriveId() {
  return (_e("NAVER_WORKS_DRIVE_SHAREDRIVE_ID") || _e("NAVER_WORKS_SHAREDRIVE_ID")).trim();
}

/** Python quote(seg, safe='@') 과 유사(공용 드라이브 id 의 @ 유지) */
function quoteWorksPath(seg) {
  return encodeURIComponent(String(seg ?? "").trim()).replace(/%40/gi, "@");
}

function resolveDriveUserPathSegment() {
  const owner = _e("NAVER_WORKS_DRIVE_OWNER_USER_ID");
  if (owner) return owner;
  const pathMode = (_e("NAVER_WORKS_DRIVE_FOLDER_USER_PATH") || "me").toLowerCase();
  if (pathMode === "service_account" || pathMode === "serviceaccount" || pathMode === "service" || pathMode === "sub") {
    const svc =
      _e("NAVER_WORKS_SERVICE_ACCOUNT_ID") || _e("NAVER_WORKS_SERVICE_ACCOUNT") || _e("SERVICE_ACCOUNT");
    if (svc) return svc;
  }
  return "me";
}

function loadPrivateKeyPem(repoRootTry) {
  const keyPath = _e("NAVER_WORKS_PRIVATE_KEY_PATH");
  if (keyPath) {
    const pAbs = path.isAbsolute(keyPath) ? keyPath : path.join(repoRootTry, keyPath);
    if (fs.existsSync(pAbs)) return fs.readFileSync(pAbs, "utf8").trim();
  }
  const authKey = path.join(repoRootTry, "auth_key.key");
  if (fs.existsSync(authKey)) return fs.readFileSync(authKey, "utf8").trim();
  const raw = _e("PRIVATE_KEY") || _e("NAVER_WORKS_PRIVATE_KEY");
  if (raw) return raw.replace(/\\n/g, "\n").trim();
  throw new Error(
    "네이버웍스 JWT: PRIVATE_KEY 또는 NAVER_WORKS_PRIVATE_KEY_PATH 또는 프로젝트 루트 auth_key.key 가 필요합니다."
  );
}

function clientConfig() {
  const cid = _e("NAVER_WORKS_CLIENT_ID") || _e("CLIENT_ID");
  const secret = _e("NAVER_WORKS_CLIENT_SECRET") || _e("CLIENT_SECRET");
  const sub = _e("NAVER_WORKS_SERVICE_ACCOUNT") || _e("SERVICE_ACCOUNT");
  if (!cid || !secret || !sub)
    throw new Error("CLIENT_ID, CLIENT_SECRET, SERVICE_ACCOUNT(또는 NAVER_WORKS_* 별칭) 가 필요합니다.");
  return { clientId: cid, clientSecret: secret, serviceAccount: sub };
}

function buildJwtAssertion(clientId, serviceAccount, privateKeyPem, ttlSeconds = 3540) {
  const now = Math.floor(Date.now() / 1000);
  const headerObj = { alg: "RS256", typ: "JWT" };
  const payloadObj = { iss: clientId, sub: serviceAccount, iat: now, exp: now + ttlSeconds };
  const encHeader = Buffer.from(JSON.stringify(headerObj)).toString("base64url");
  const encPayload = Buffer.from(JSON.stringify(payloadObj)).toString("base64url");
  const signingInput = `${encHeader}.${encPayload}`;
  const sig = crypto.sign("RSA-SHA256", Buffer.from(signingInput, "utf8"), privateKeyPem).toString("base64url");
  return `${signingInput}.${sig}`;
}

async function fetchAccessToken(assertion, clientId, clientSecret, scopeNormalized) {
  const scope = scopeStringForTokenRequest(scopeNormalized, scopeTokenUseFullUrl());
  const body = new URLSearchParams({
    grant_type: GRANT_TYPE,
    assertion,
    client_id: clientId,
    client_secret: clientSecret,
    scope,
  }).toString();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new Error(
      `액세스 토큰 발급 실패: ${data?.error_description || data?.error || JSON.stringify(data)}`
    );
  }
  return String(data.access_token);
}

async function getAccessTokenForDrive(repoRootTry) {
  const directToken = _e("NAVER_WORKS_ACCESS_TOKEN");
  if (directToken) {
    const expAtStr = _e("NAVER_WORKS_TOKEN_EXPIRES_AT");
    const refreshTok = _e("NAVER_WORKS_REFRESH_TOKEN");
    if (expAtStr && refreshTok) {
      const expSec = Number.parseFloat(expAtStr);
      if (Number.isFinite(expSec) && Date.now() / 1000 >= expSec - 30) {
        const cid = _e("NAVER_WORKS_CLIENT_ID") || _e("CLIENT_ID");
        const secret = _e("NAVER_WORKS_CLIENT_SECRET") || _e("CLIENT_SECRET");
        const body = new URLSearchParams({
          grant_type: "refresh_token",
          client_id: cid,
          client_secret: secret,
          refresh_token: refreshTok,
        }).toString();
        const rr = await fetch(TOKEN_URL, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
          body,
        });
        const j = await rr.json().catch(() => ({}));
        if (!rr.ok || !j.access_token) throw new Error("토큰 refresh 실패(Naver Works)");
        return String(j.access_token);
      }
    }
    return directToken;
  }
  const { clientId, clientSecret, serviceAccount } = clientConfig();
  const pem = loadPrivateKeyPem(repoRootTry);
  const assertion = buildJwtAssertion(clientId, serviceAccount, pem);
  const scopeNorm = resolveOauthScopeFromEnv();
  return fetchAccessToken(assertion, clientId, clientSecret, scopeNorm);
}

function resolveDriveApiHintSegment() {
  const sid = resolveDriveSharedriveId();
  if (sid) return `sharedrives/${sid}`;
  return resolveDriveUserPathSegment();
}

function resolveDriveFolderListGetUrl(folderFileId) {
  const apiBase = resolveWorksapApiBase();
  const fid = String(folderFileId || "").trim();
  const low = fid.toLowerCase();
  if (isSharedDriveFlag()) {
    if (!low || low === "root" || low === "루트") {
      const pid = (_e("NAVER_WORKS_DRIVE_PARENT_FILE_ID") || "").trim();
      if (pid) return [`${apiBase}/drive/files/${quoteWorksPath(pid)}/children`, "shared_root_children"];
      return [`${apiBase}/drive/files`, "shared_drive_files"];
    }
    return [`${apiBase}/drive/files/${quoteWorksPath(fid)}/children`, "folder_children"];
  }
  const sid = resolveDriveSharedriveId();
  if (sid) {
    const qs = quoteWorksPath(sid);
    if (!low || low === "root" || low === "루트")
      return [`${apiBase}/sharedrives/${qs}/files`, "sharedrive_root_files"];
    return [`${apiBase}/sharedrives/${qs}/files/${quoteWorksPath(fid)}/children`, "sharedrive_folder_children"];
  }
  const uidSeg = quoteWorksPath(resolveDriveUserPathSegment());
  if (!low || low === "root" || low === "루트") return [`${apiBase}/users/${uidSeg}/drive/files`, "root_files"];
  return [`${apiBase}/users/${uidSeg}/drive/files/${quoteWorksPath(fid)}/children`, "folder_children"];
}

async function createFolderViaRelayServer(folderName, parentFileId, resourceLocation) {
  const relayBase = _e("NAVER_WORKS_RELAY_URL").replace(/\/+$/, "");
  const relaySecret = _e("NAVER_WORKS_RELAY_SECRET").trim();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (relaySecret) headers["Authorization"] = `Bearer ${relaySecret}`;
  const res = await fetch(`${relayBase}/createfolder`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      folderName: String(folderName || "").trim(),
      parentFileId: String(parentFileId || "root").trim(),
      resourceLocation: String(resourceLocation || "24101").trim(),
    }),
  });
  const text = await res.text().catch(() => "");
  let data = {};
  try { data = text.trim() ? JSON.parse(text) : {}; } catch (_) { data = { rawText: text.slice(0, 4000) }; }
  if (!res.ok || !data.ok) {
    const msg = (typeof data === "object" && data ? String(data.message || data.error || "") : "") || `HTTP ${res.status}`;
    return { ok: false, status: res.status, message: msg, response: data };
  }
  return { ok: true, body: { ...(typeof data === "object" && data ? data : {}), _source: "relay_createfolder" } };
}

async function createFolderViaInternalApi(token, folderName, parentFileId, resourceLocation) {
  const relayUrl = _e("NAVER_WORKS_RELAY_URL").trim();
  if (relayUrl) {
    return createFolderViaRelayServer(folderName, parentFileId, resourceLocation);
  }

  let pid = (parentFileId || "root").trim();
  if (!pid.toLowerCase() || pid.toLowerCase() === "루트") pid = "root";
  const url = `${INTERNAL_DRIVE_API_HOST}/rl/${resourceLocation}/v1/files/${quoteWorksPath(pid)}/createfolder?service=drive`;
  const sessionCookie = _e("NAVER_WORKS_SESSION_COOKIE").trim();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(sessionCookie
      ? { Cookie: sessionCookie }
      : { Authorization: `Bearer ${token}` }),
  };
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ fileName: String(folderName || "").trim() }),
  });
  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = text.trim() ? JSON.parse(text) : {};
  } catch (_) {
    data = { rawText: text.slice(0, 4000) };
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data ? String(data.message || data.error || "") : "";
    return { ok: false, status: res.status, message: msg || `HTTP ${res.status}`, response: data };
  }
  return { ok: true, body: { ...(typeof data === "object" && data ? data : {}), _source: "internal_createfolder" } };
}

function resolveCreateFolderPostUrl(parentFileId, apiBase) {
  const direct = _e("NAVER_WORKS_DRIVE_CREATE_FOLDER_URL").trim();
  if (direct) return direct;
  const pid = String(parentFileId || "").trim();
  const low = pid.toLowerCase();
  if (isSharedDriveFlag()) {
    if (!low || low === "루트")
      throw new Error("NAVER_WORKS_SHARED_DRIVE=true 에서 PARENT_FILE_ID 가 필요합니다.");
    return `${apiBase}/drive/files/${quoteWorksPath(pid)}`;
  }
  const sid = resolveDriveSharedriveId();
  if (sid) {
    const qs = quoteWorksPath(sid);
    if (!low || low === "root" || low === "루트") return `${apiBase}/sharedrives/${qs}/files`;
    if (!pid) throw new Error("공용 드라이브에서 부모 폴더 fileId 필요");
    return `${apiBase}/sharedrives/${qs}/files/${quoteWorksPath(pid)}`;
  }
  const uidSeg = quoteWorksPath(resolveDriveUserPathSegment());
  if (!low || low === "root" || low === "루트") return `${apiBase}/users/${uidSeg}/drive/files`;
  if (!pid) throw new Error("parentFileId 없음 (.env NAVER_WORKS_DRIVE_PARENT_FILE_ID 등)");
  return `${apiBase}/users/${uidSeg}/drive/files/${quoteWorksPath(pid)}`;
}

function buildDriveUploadRegisterBody(folderName) {
  const fn = String(folderName || "").trim();
  let fsize = 0;
  try {
    fsize = Math.max(0, parseInt(_e("NAVER_WORKS_DRIVE_FOLDER_CREATE_FILE_SIZE", "0"), 10) || 0);
  } catch (_) {}
  /** @type {Record<string, unknown>} */
  const body = { fileName: fn, fileSize: fsize, fileType: "FOLDER" };
  const mod = _e("NAVER_WORKS_DRIVE_FOLDER_MODIFIED_TIME");
  if (mod) body.modifiedTime = mod;
  const extra = _e("NAVER_WORKS_FOLDER_CREATE_JSON_EXTRA");
  if (extra) {
    try {
      const merge = JSON.parse(extra);
      if (merge && typeof merge === "object") {
        for (const [k, v] of Object.entries(merge)) {
          if (k !== "fileName") body[k] = v;
        }
      }
    } catch (e) {
      throw new Error(`NAVER_WORKS_FOLDER_CREATE_JSON_EXTRA JSON 오류: ${e.message}`);
    }
  }
  return body;
}

function extractFileId(body) {
  if (!body || typeof body !== "object") return "";
  const inner = body.file || body.folder || body.data;
  if (inner && typeof inner === "object") {
    const fid = String(inner.fileId || inner.id || inner.file_id || "").trim();
    if (fid) return fid;
  }
  return String(body.fileId || body.id || body.file_id || "").trim();
}

async function finalizeDriveViaUploadUrl(uploadUrl, token, folderName) {
  const name = String(folderName || "").trim();
  const form = new FormData();
  form.append("resourceName", name);
  const blob = new Blob([], { type: "inode/directory" });
  form.append("Filedata", blob, name);
  const res = await fetch(String(uploadUrl).trim(), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  /** @type {Record<string, unknown>} */
  let upData = {};
  try {
    upData = await res.json();
  } catch (_) {
    upData = { rawUploadText: (await res.text().catch(() => "")).slice(0, 4000) };
  }
  const fid =
    typeof upData === "object" && upData && upData.fileId ? String(upData.fileId).trim() : extractFileId(upData);
  if (res.ok && fid) return { ok: true, data: upData };
  const msg =
    typeof upData === "object" && upData ? String(upData.message || upData.error || upData.description || "") : "";
  return {
    ok: false,
    message: msg || `uploadUrl 단계 실패 HTTP ${res.status}`,
    data: upData,
    status: res.status,
  };
}

async function postCreateFolder(token, folderName, parentFileId) {
  const rl = _e("NAVER_WORKS_RESOURCE_LOCATION").trim();
  if (rl) {
    const intr = await createFolderViaInternalApi(token, folderName, parentFileId, rl);
    if (!intr.ok) return intr;
    return { ok: true, body: intr.body };
  }

  let url;
  try {
    url = resolveCreateFolderPostUrl(parentFileId, resolveWorksapApiBase());
  } catch (e) {
    return { ok: false, message: e.message };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(buildDriveUploadRegisterBody(folderName)),
  });
  /** @type {Record<string, unknown>} */
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = { raw: String(await res.text().catch(() => "")).slice(0, 4000) };
  }
  if (!res.ok) {
    const msg = typeof data === "object" && data ? String(data.message || data.error || data.description || "") : "";
    return { ok: false, status: res.status, message: msg || `HTTP ${res.status}`, response: data };
  }

  if (data.fileId) return { ok: true, body: data };

  const uploadU = typeof data.uploadUrl === "string" ? data.uploadUrl : "";
  if (uploadU) {
    const fin = await finalizeDriveViaUploadUrl(uploadU, token, folderName);
    const merged = { registerUploadResponse: { ...data } };
    if (fin.ok && fin.data && typeof fin.data === "object") Object.assign(merged, fin.data);
    else merged.uploadFail = fin;
    const fidAfter = extractFileId(merged);
    if (fin.ok && fidAfter) {
      merged.fileId = fidAfter;
      return { ok: true, body: merged };
    }
    return {
      ok: false,
      message: fin.message || "uploadUrl 완료 실패",
      body: merged,
      status: fin.status,
    };
  }
  return { ok: false, message: "응답에 fileId 또는 uploadUrl 이 없습니다.", response: data };
}

function pushList(resp, candLists, key) {
  const v = resp?.[key];
  if (Array.isArray(v)) candLists.push(v);
}

function findExistingFolderIdInListResponse(resp, folderName) {
  const want = String(folderName || "").trim();
  if (!want || !resp || typeof resp !== "object") return "";
  const candLists = [];
  pushList(resp, candLists, "files");
  pushList(resp, candLists, "elements");
  pushList(resp, candLists, "items");
  pushList(resp, candLists, "childFiles");
  pushList(resp, candLists, "folders");
  const inner = resp.response;
  if (inner && typeof inner === "object") {
    pushList(inner, candLists, "files");
    pushList(inner, candLists, "elements");
    pushList(inner, candLists, "items");
  }
  const page = resp.fileListPage;
  if (page && typeof page === "object") {
    pushList(page, candLists, "files");
    pushList(page, candLists, "elements");
  }
  for (const arr of candLists) {
    for (const it of arr) {
      if (!it || typeof it !== "object") continue;
      const name = String(it.fileName || it.name || it.displayName || "").trim();
      if (name !== want) continue;
      const typ = String(it.fileType || it.type || it.mimeType || "").toLowerCase();
      if (
        typ &&
        !typ.includes("folder") &&
        typ !== "directory" &&
        typ !== "dir" &&
        typ !== "fold"
      ) {
        continue;
      }
      const found = extractFileId(it);
      if (found) return found;
    }
  }
  return "";
}

async function getDriveFolderChildren(token, folderFileId) {
  const [listUrl] = resolveDriveFolderListGetUrl(folderFileId);
  const res = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    data = { rawText: (await res.text().catch(() => "")).slice(0, 4000) };
  }
  /** @type {Record<string, unknown>} */
  const wrap = {
    ok: res.ok,
    status: res.status,
    url: listUrl,
    drivePathUser: resolveDriveApiHintSegment(),
    response: typeof data === "object" && data ? data : {},
  };
  if (!res.ok)
    wrap.message =
      typeof data === "object" && data.message
        ? String(data.message)
        : typeof data === "object"
          ? ""
          : `HTTP ${res.status}`;
  return wrap;
}

function resolveDriveUserForLink() {
  return (_e("NAVER_WORKS_DRIVE_OWNER_USER_ID") || _e("NAVER_WORKS_DRIVE_USER_ID_FOR_LINK")).trim();
}

function resolveDriveLinkUserId(folderBody) {
  const explicit = resolveDriveUserForLink();
  if (explicit) return explicit;
  if (folderBody && typeof folderBody === "object") {
    const uid = folderBody.userId || folderBody.ownerUserId || folderBody.ownerId;
    if (uid) return String(uid).trim();
  }
  return "";
}

async function createEditShareLink(token, driveUserId, fileId) {
  const accessType = (_e("NAVER_WORKS_LINK_ACCESS_TYPE") || "ORGANIZATION").toUpperCase();
  const permType = (_e("NAVER_WORKS_LINK_PERMISSION_TYPE") || "EDIT").toUpperCase();
  /** @type {Record<string, unknown>} */
  const bodyJson = {
    accessType,
    linkPermissionType: permType,
  };
  const exp = _e("NAVER_WORKS_LINK_EXPIRATION");
  if (exp) bodyJson.expirationTime = exp;
  const pw = _e("NAVER_WORKS_LINK_PASSWORD");
  if (pw && accessType === "ANYONE") bodyJson.password = pw;
  const specRaw = _e("NAVER_WORKS_LINK_SPECIFIC_PEOPLE");
  if (accessType === "SPECIFIC_PEOPLE" && specRaw)
    bodyJson.specificPeople = specRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  const fidQuoted = quoteWorksPath(fileId);
  const sid = resolveDriveSharedriveId();

  let url = "";
  if (isSharedDriveFlag()) url = `${resolveWorksapApiBase()}/drive/files/${fidQuoted}/link`;
  else if (sid)
    url = `${resolveWorksapApiBase()}/sharedrives/${quoteWorksPath(sid)}/files/${fidQuoted}/link`;
  else url = `${resolveWorksapApiBase()}/users/${quoteWorksPath(driveUserId)}/drive/files/${fidQuoted}/link`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyJson),
  });
  const text = await res.text().catch(() => "");
  let data = {};
  try {
    data = text.trim() ? JSON.parse(text) : {};
  } catch (_) {
    data = { rawText: text.slice(0, 2000) };
  }
  if (!res.ok) {
    const msg =
      typeof data === "object" && data
        ? String(data.message || data.error_description || data.error || "")
        : "";
    return { ok: false, status: res.status, message: msg || `링크 생성 HTTP ${res.status}`, response: data };
  }
  if (typeof data === "object" && data) {
    data.ok = true;
    return data;
  }
  return { ok: true, raw: data };
}

/**
 * @param {{ folderName: string, parentFileId: string, reuseIfExists?: boolean, repoRoot?: string }} opts
 */
async function naverWorksCreateFolderViaHttp(opts) {
  const folderName = String(opts?.folderName || "").trim();
  const parentFileId = String(opts?.parentFileId || "").trim();
  const reuseIfExists = Boolean(opts?.reuseIfExists);
  const repoRoot =
    opts?.repoRoot && String(opts.repoRoot).trim()
      ? String(opts.repoRoot).trim()
      : path.join(__dirname, "..");

  /** @type {Record<string, unknown>} */
  const result = {
    ok: false,
    folderName,
    parentFileId,
    message: "",
  };

  try {
    if (!folderName) throw new Error("폴더 이름이 비어 있습니다.");
    if (!parentFileId && !_e("NAVER_WORKS_DRIVE_CREATE_FOLDER_URL"))
      throw new Error("--parent-file-id 또는 NAVER_WORKS_DRIVE_PARENT_FILE_ID 가 필요합니다.");

    // 릴레이 서버 + 내부 API 경로: 토큰 불필요
    const relayUrl = _e("NAVER_WORKS_RELAY_URL").trim();
    const rlForRelay = _e("NAVER_WORKS_RESOURCE_LOCATION").trim();
    if (relayUrl && rlForRelay) {
      const post = await postCreateFolder(null, folderName, parentFileId);
      if (!post.ok) {
        result.message = post.message || "폴더 생성 실패(릴레이)";
        result.createFolderHttp = post;
        return result;
      }
      const folder_body = post.body || {};
      const fid = String(folder_body.fileId || folder_body.folderId || "").trim();
      result.ok = true;
      result.fileId = fid;
      result.folderId = fid;
      result.folderResponse = folder_body;
      result.shareLinkUrl = "";
      return result;
    }

    const token = await getAccessTokenForDrive(repoRoot);

    /** @type {unknown} */
    let folder_body = {};

    if (reuseIfExists) {
      const listWrap = await getDriveFolderChildren(token, parentFileId);
      let existingId = "";
      if (listWrap.ok && typeof listWrap.response === "object" && listWrap.response) {
        existingId = findExistingFolderIdInListResponse(listWrap.response, folderName);
      }
      if (existingId) {
        folder_body = { fileId: existingId, reuseExisting: true };
      } else {
        const post = await postCreateFolder(token, folderName, parentFileId);
        if (!post.ok) {
          result.message = post.message || "폴더 생성 실패";
          result.createFolderHttp = post;
          return result;
        }
        folder_body = post.body || {};
      }
    } else {
      const post = await postCreateFolder(token, folderName, parentFileId);
      if (!post.ok) {
        result.message = post.message || "폴더 생성 실패";
        result.createFolderHttp = post;
        return result;
      }
      folder_body = post.body || {};
    }

    const fid = extractFileId(folder_body);
    result.folderId = fid;
    result.fileId = fid;
    result.folderResponse = folder_body;
    if (!fid) {
      result.message = "폴더 생성 응답에서 fileId 를 찾지 못했습니다.";
      return result;
    }

    const driveUid = resolveDriveLinkUserId(folder_body);

    /** @type {Record<string, unknown>} */
    let link_out = {};
    if (resolveDriveSharedriveId())
      link_out = await createEditShareLink(token, "", fid);
    else if (!driveUid) {
      result.shareLinkUrl = null;
      result.shareLinkNote =
        "링크 생성용 NAVER_WORKS_DRIVE_OWNER_USER_ID 가 없습니다(폴더는 생성됨).";
      result.ok = true;
      result.message = "";
      return result;
    } else link_out = await createEditShareLink(token, driveUid, fid);

    result.shareLink = link_out;
    const lu =
      link_out?.linkUrl != null
        ? String(link_out.linkUrl).trim()
        : link_out?.shareUrl != null
          ? String(link_out.shareUrl).trim()
          : "";
    if (lu) result.shareLinkUrl = lu;
    else {
      result.shareLinkUrl =
        typeof result.shareLinkUrl === "undefined" ? "" : String(result.shareLinkUrl || "").trim();
    }
    if (typeof link_out?.message === "string" && link_out.message && !lu)
      result.shareLinkError = link_out.message;
    /** 폴더 생성까지 성공이면 처리 완료(링크는 선택) */
    result.ok = true;
    result.message = "";
    return result;
  } catch (e) {
    result.ok = false;
    result.message = e?.message || String(e || "네이버웍스 처리 실패");
    return result;
  }
}

function shouldUseNaverWorksNodeHttp() {
  const vercel = process.env.VERCEL;
  if (vercel === "1" || /^true$/i.test(String(vercel || ""))) return true;
  const force = (_e("SCHEDULE_SITE_NAVER_DRIVE_USE_NODE") || "").toLowerCase();
  if (force === "1" || force === "true" || force === "yes") return true;
  return false;
}

module.exports = {
  naverWorksCreateFolderViaHttp,
  shouldUseNaverWorksNodeHttp,
};
