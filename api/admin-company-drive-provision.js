/**
 * POST JSON { adminPassword, directoryId?: string(uuid), all?: boolean, provider?: "google"|"naver"|"naverworks" }
 * 관리자 비밀번호 확인 후 업체 폴더 프로비저닝(이미 있으면 스킵).
 * provider 기본 google. naver 는 네이버웍스(맥·create_folder.py 환경이 있는 서버에서만 권장).
 */
const {
  provisionCompanyDirectoryFolder,
  provisionNaverWorksCompanyDirectoryFolder,
  fetchCompanyDirectoryRowsForProvision,
} = require("../lib/company-drive-provision.cjs");
const { getDriveClient } = require("../lib/google-drive-delivery.cjs");

function getAdminPasswordExpected() {
  return String(process.env.ADMIN_SHOOT_SITE_PASSWORD || "6315").trim();
}

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

  const body = readJsonBody(req);
  const adminPassword = String(body?.adminPassword ?? body?.password ?? "").trim();
  if (adminPassword !== getAdminPasswordExpected()) {
    res.status(401).json({ ok: false, message: "관리자 비밀번호가 올바르지 않습니다." });
    return;
  }

  let headers;
  try {
    headers = getSupabaseServiceHeaders();
  } catch (e) {
    console.error("[admin-company-drive-provision] env", e?.message || e);
    res.status(503).json({ ok: false, message: "서버 환경(Supabase)이 설정되어 있지 않습니다." });
    return;
  }

  const wantsAll = /^(1|true|yes)$/i.test(String(body?.all ?? "").trim());
  const directoryId = String(body?.directoryId || "").trim();
  const provider = String(body?.provider ?? "google").trim().toLowerCase();
  const wantsNaver = provider === "naver" || provider === "naverworks";

  try {
    let drive = null;
    if (!wantsNaver) {
      drive = getDriveClient();
    }
    /** select=* : 아직 naver 컬럼 마이그레이션이 없어도 목록 조회 400 방지 */
    const selectCols = "*";

    /** @type {Array<object>} */
    let rows = [];
    if (wantsAll) {
      rows = await fetchCompanyDirectoryRowsForProvision(headers);
    } else if (directoryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(directoryId)) {
      rows = await fetchCompanyDirectoryRowsForProvision(
        headers,
        `company_directory?id=eq.${encodeURIComponent(directoryId)}&select=${selectCols}`
      );
    } else {
      res.status(400).json({ ok: false, message: "directoryId(UUID) 또는 all=true 가 필요합니다." });
      return;
    }

    const results = [];
    for (const row of rows) {
      try {
        const out = wantsNaver
          ? await provisionNaverWorksCompanyDirectoryFolder({
              supabaseHeaders: headers,
              directoryRow: row,
            })
          : await provisionCompanyDirectoryFolder({
              supabaseHeaders: headers,
              directoryRow: row,
              drive,
            });
        results.push({
          directoryId: out.directoryId,
          name: row?.name || "",
          created: out.createdFolder,
          shareLink: out.shareLink,
          provider: wantsNaver ? "naver" : "google",
        });
      } catch (e) {
        results.push({
          directoryId: row?.id || "",
          name: row?.name || "",
          error: e?.message || String(e),
        });
      }
    }

    const created = results.filter((r) => r.created === true).length;
    const errors = results.filter((r) => r.error).length;
    res.status(200).json({ ok: errors === 0, created, errors, total: results.length, results });
  } catch (e) {
    console.error("[admin-company-drive-provision]", e);
    res.status(500).json({ ok: false, message: e?.message || "처리 실패" });
  }
};
