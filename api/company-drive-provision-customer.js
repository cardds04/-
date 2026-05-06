/**
 * POST JSON { loginId, password }
 * 본인 company_directory 행 확인 후 업체 Drive 루트 폴더가 없으면 생성·DB 저장.
 */
const {
  provisionCompanyDirectoryFolder,
  fetchCompanyDirectoryRowsForProvision,
} = require("../lib/company-drive-provision.cjs");

function getSupabaseServiceHeaders() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
}

function readJsonBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch (_) {
      return {};
    }
  }
  return req.body && typeof req.body === "object" ? req.body : {};
}

function normalizePlain(v) {
  return String(v || "").trim();
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  let headers;
  try {
    headers = getSupabaseServiceHeaders();
  } catch (e) {
    console.error("[company-drive-provision-customer] env", e?.message || e);
    res.status(503).json({ ok: false, message: "서버 환경(Supabase)이 설정되어 있지 않습니다." });
    return;
  }

  const body = readJsonBody(req);
  const loginId = String(body?.loginId || body?.login_id || "").trim();
  const password = String(body?.password ?? "").trim();

  if (!loginId || !password) {
    res.status(400).json({ ok: false, message: "아이디와 비밀번호가 필요합니다." });
    return;
  }

  try {
    const rows = await fetchCompanyDirectoryRowsForProvision(
      headers,
      `company_directory?login_id=eq.${encodeURIComponent(loginId)}&select=id,name,code,login_id,password,google_drive_company_folder_id,google_drive_company_share_link`
    );
    const row =
      rows.find((r) => normalizePlain(r?.login_id) === loginId && String(r?.password ?? "") === password) || null;
    if (!row) {
      res.status(401).json({ ok: false, message: "로그인 정보가 올바르지 않거나 해당 계정을 찾을 수 없습니다." });
      return;
    }

    const out = await provisionCompanyDirectoryFolder({
      supabaseHeaders: headers,
      directoryRow: row,
    });
    res.status(200).json({
      ok: true,
      folderId: out.folderId,
      shareLink: out.shareLink,
      created: out.createdFolder,
    });
  } catch (e) {
    console.error("[company-drive-provision-customer]", e);
    res.status(500).json({ ok: false, message: e?.message || "처리 실패" });
  }
};
