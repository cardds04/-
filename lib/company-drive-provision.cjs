/**
 * 업체별 Drive 루트 폴더 1개만 생성하고 company_directory 에 id·링크를 저장.
 * 작가 현장 확인은 여기서 만든 폴더 아래에만 촬영일 폴더를 둔다.
 * 네이버웍스(공용 sharedrives + NAVER_WORKS_DRIVE_PARENT_FILE_ID)는 create_folder.py 로 동일 규칙(업체명) 생성.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

function resolveNaverWorksPythonBin() {
  const explicit = String(process.env.NAVER_WORKS_PYTHON_BIN || "").trim();
  if (explicit) return explicit;
  try {
    const v = "/opt/venv/bin/python";
    if (fs.existsSync(v)) return v;
  } catch (_) {
    //
  }
  return process.platform === "win32" ? "python" : "python3";
}

function resolveCreateFolderPyAbsolutePath() {
  const tries = [path.join(__dirname, "..", "create_folder.py"), path.join(process.cwd(), "create_folder.py")];
  for (const p of tries) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {
      //
    }
  }
  return "";
}

/** create_folder.py 의 indent=2 JSON 전체 stdout 파싱 */
function parseCreateFolderPyJsonStdout(rawOut) {
  const t = String(rawOut || "").trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch (_) {
    return null;
  }
}

/**
 * 루트 create_folder.py 실행 — 폴더 + (가능 시) 공유 링크.
 * 링크 단계만 실패해도 folderId 가 있으면 ok 로 간주.
 * @returns {{ ok: boolean, fileId?: string, shareLinkUrl?: string | null, message?: string, response?: object }}
 */
function runCreateFolderPyScript(folderName, parentFileId) {
  const scriptPath = resolveCreateFolderPyAbsolutePath();
  if (!scriptPath) {
    return { ok: false, message: "프로젝트 루트에 create_folder.py 가 없습니다." };
  }
  const bin = resolveNaverWorksPythonBin();
  const repoRoot = path.dirname(scriptPath);
  const name = String(folderName || "").trim();
  const pid = String(parentFileId || "").trim();
  const r = spawnSync(bin, [scriptPath, "--folder-name", name, "--parent-file-id", pid], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
    cwd: repoRoot,
  });
  if (r.error) {
    const code = r.error.code;
    if (code === "ENOENT") {
      return {
        ok: false,
        message:
          "Python 실행 파일을 찾을 수 없습니다. NAVER_WORKS_PYTHON_BIN 또는 python3 를 설정하고 requirements-naverworks.txt 를 설치하세요.",
      };
    }
    return { ok: false, message: r.error.message || String(r.error) };
  }
  const stderr = typeof r.stderr === "string" ? r.stderr.trim() : "";
  const rawOut = typeof r.stdout === "string" ? r.stdout.trim() : "";
  const parsed = parseCreateFolderPyJsonStdout(rawOut);
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: stderr || rawOut.slice(0, 500) || "create_folder.py JSON 파싱 실패" };
  }
  const fid = String(parsed.folderId || parsed.fileId || "").trim();
  const link = parsed.shareLinkUrl != null ? String(parsed.shareLinkUrl).trim() : "";
  if (fid) {
    return { ok: true, fileId: fid, shareLinkUrl: link || null, response: parsed };
  }
  if (parsed.ok) {
    return { ok: false, message: "응답에 folderId가 없습니다.", response: parsed };
  }
  return {
    ok: false,
    message: String(parsed.message || stderr || "네이버웍스 폴더 생성 실패"),
    response: parsed,
  };
}

/**
 * company_directory 에 네이버웍스 업체 루트 폴더 저장.
 * 환경: JWT·NAVER_WORKS_DRIVE_SHAREDRIVE_ID(공용)·NAVER_WORKS_DRIVE_PARENT_FILE_ID(포토영상 상위 fileId 등).
 */
async function provisionNaverWorksCompanyDirectoryFolder(opts) {
  const { supabaseHeaders, directoryRow } = opts;
  const hdrs = supabaseHeaders;
  const url = String(hdrs.url || "").trim();
  if (!url) throw new Error("Supabase URL 이 없습니다.");

  const dirId = String(directoryRow?.id || "").trim();
  const nm = String(directoryRow?.name || "").trim();
  if (!dirId) throw new Error("company_directory id 가 필요합니다.");
  if (!nm) throw new Error("업체명이 비어 있습니다.");

  const existing = String(directoryRow?.naver_works_company_folder_id || "").trim();
  if (existing) {
    const link = String(directoryRow?.naver_works_company_share_link || "").trim();
    return {
      directoryId: dirId,
      folderId: existing,
      shareLink: link,
      createdFolder: false,
    };
  }

  const parentFileId = String(
    process.env.NAVER_WORKS_DRIVE_PARENT_FILE_ID || process.env.NAVER_WORKS_PARENT_FILE_ID || ""
  ).trim();
  if (!parentFileId) {
    throw new Error(
      "NAVER_WORKS_DRIVE_PARENT_FILE_ID 가 필요합니다(포토영상 공용 드라이브 안 상위 폴더 fileId)."
    );
  }

  const displayName = buildCompanyRootDisplayName(nm, directoryRow?.code);
  const out = runCreateFolderPyScript(displayName, parentFileId);
  if (!out.ok || !out.fileId) {
    throw new Error(out.message || "네이버웍스 업체 폴더 생성 실패");
  }

  const folderId = out.fileId;
  const shareLink = String(out.shareLinkUrl || "").trim();

  try {
    await supabasePatchJson(hdrs, `company_directory?id=eq.${encodeURIComponent(dirId)}`, {
      naver_works_company_folder_id: folderId,
      naver_works_company_share_link: shareLink || null,
    });
  } catch (e) {
    const m = e?.message || String(e);
    if (/naver_works|column|42703|could not find/i.test(m)) {
      throw new Error(
        `${m}\n` +
          "→ company_directory 에 naver_works_* 컬럼이 없습니다. Supabase SQL로 `supabase/migrations/20260521140000_company_directory_naver_works_columns.sql` 를 먼저 실행하세요."
      );
    }
    throw e;
  }

  return { directoryId: dirId, folderId, shareLink: shareLink || "", createdFolder: true };
}

async function fetchCompanyDirectoryRowsForProvision(supabaseHeaders, filterPath) {
  /** `select=*` 는 마이그레이션 전에도 조회만 통과(존재하지 않는 컬럼을 나열하면 PostgREST 400). */
  const path = filterPath || "company_directory?select=*";
  const r = await fetch(`${supabaseHeaders.url}/rest/v1/${path}`, {
    method: "GET",
    headers: { ...supabaseHeaders.headers, Accept: "application/json" },
    cache: "no-store",
  });
  const text = await r.text();
  let rows = [];
  if (!r.ok) {
    let detail = text.slice(0, 800).trim();
    try {
      const j = JSON.parse(text);
      detail = typeof j?.message === "string" ? j.message : JSON.stringify(j);
    } catch (_) {}
    throw new Error(`Supabase 조회 실패 (${r.status}): ${detail || r.statusText}`);
  }
  try {
    rows = text ? JSON.parse(text) : [];
  } catch (_) {
    rows = [];
  }
  return Array.isArray(rows) ? rows : [];
}

module.exports = {
  provisionCompanyDirectoryFolder,
  provisionNaverWorksCompanyDirectoryFolder,
  fetchCompanyDirectoryRowsForProvision,
  runCreateFolderPyScript,
};
