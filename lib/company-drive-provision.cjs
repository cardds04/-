/**
 * 업체별 Drive 루트 폴더 1개만 생성하고 company_directory 에 id·링크를 저장.
 * 작가 현장 확인은 여기서 만든 폴더 아래에만 촬영일 폴더를 둔다.
 */
const { buildCompanyRootDisplayName } = require("./delivery-drive-logic.cjs");
const {
  getDriveClient,
  getParentFolderId,
  ensureFolder,
  setAnyoneReaderLink,
  webViewLinkFromId,
} = require("./google-drive-delivery.cjs");

async function supabasePatchJson(supabaseHeaders, path, patchBody) {
  const r = await fetch(`${supabaseHeaders.url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      ...supabaseHeaders.headers,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patchBody),
    cache: "no-store",
  });
  if (!r.ok) {
    let msg = "";
    try {
      const body = await r.json();
      msg = typeof body?.message === "string" ? body.message : JSON.stringify(body || {});
    } catch (_) {}
    throw new Error(`Supabase PATCH ${path} (${r.status}): ${msg || r.statusText}`);
  }
}

/**
 * company_directory 행 하나에 대해 루트 폴더가 없으면 생성 후 DB 반영.
 * @param {{
 *   supabaseHeaders: { url: string, headers: Record<string, string> },
 *   directoryRow: object,
 *   drive?: import("googleapis").drive_v3.Drive,
 * }} opts
 */
async function provisionCompanyDirectoryFolder(opts) {
  const { supabaseHeaders, directoryRow } = opts;
  const hdrs = supabaseHeaders;
  const url = String(hdrs.url || "").trim();
  if (!url) throw new Error("Supabase URL 이 없습니다.");

  const dirId = String(directoryRow?.id || "").trim();
  const nm = String(directoryRow?.name || "").trim();
  if (!dirId) throw new Error("company_directory id 가 필요합니다.");
  if (!nm) throw new Error("업체명이 비어 있습니다.");

  const existing = String(directoryRow?.google_drive_company_folder_id || "").trim();
  if (existing) {
    const link =
      String(directoryRow?.google_drive_company_share_link || "").trim() || webViewLinkFromId(existing);
    return {
      directoryId: dirId,
      folderId: existing,
      shareLink: link,
      createdFolder: false,
    };
  }

  const drive = opts.drive || getDriveClient();
  const parentFolderId = getParentFolderId();
  if (!parentFolderId) throw new Error("GOOGLE_DRIVE_PARENT_FOLDER_ID 가 설정되어 있어야 업체 폴더를 만들 수 있습니다.");

  const displayName = buildCompanyRootDisplayName(nm, directoryRow?.code);
  const folderId = await ensureFolder(drive, parentFolderId, displayName, { skipAllowCheck: true });
  await setAnyoneReaderLink(drive, folderId);
  const shareLink = webViewLinkFromId(folderId);

  await supabasePatchJson(hdrs, `company_directory?id=eq.${encodeURIComponent(dirId)}`, {
    google_drive_company_folder_id: folderId,
    google_drive_company_share_link: shareLink,
  });

  return { directoryId: dirId, folderId, shareLink, createdFolder: true };
}

async function fetchCompanyDirectoryRowsForProvision(supabaseHeaders, filterPath) {
  const path =
    filterPath ||
    "company_directory?select=id,name,code,google_drive_company_folder_id,google_drive_company_share_link";
  const r = await fetch(`${supabaseHeaders.url}/rest/v1/${path}`, {
    method: "GET",
    headers: { ...supabaseHeaders.headers, Accept: "application/json" },
    cache: "no-store",
  });
  let rows = [];
  try {
    rows = await r.json();
  } catch (_) {}
  if (!r.ok) {
    throw new Error(`Supabase 조회 실패 (${r.status})`);
  }
  return Array.isArray(rows) ? rows : [];
}

module.exports = {
  provisionCompanyDirectoryFolder,
  fetchCompanyDirectoryRowsForProvision,
};
