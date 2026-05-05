/**
 * GET — 관리자(index.html) 페이지에서 현재 라이브 빌드·Git 메타 확인용.
 * 새 Vercel 배포마다 serverless 번들이 새로 로드되어 boot 시각이 갱신됩니다.
 */

const SERVER_REVISION_BOOT_AT_ISO = new Date().toISOString();

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.status(204).end();
    return;
  }
  if (req.method !== "GET") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(405).json({ ok: false, message: "Method not allowed" });
    return;
  }

  const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || "").trim();
  const manualIso = String(process.env.SCHEDULE_SITE_DEPLOY_AT_ISO || "").trim();

  try {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    res.status(200).json({
      ok: true,
      /** 이 serverless 인스턴스 부팅(배포 직후 콜드스타트) 시각 ≈ 새 코드 반영 시각 */
      serverRevisionStartedAtIsoUtc: manualIso || SERVER_REVISION_BOOT_AT_ISO,
      gitCommitShaFull: sha || "",
      gitCommitShaShort: sha ? sha.slice(0, 7) : "",
      gitCommitRef: String(process.env.VERCEL_GIT_COMMIT_REF || "").trim(),
      vercelEnv: String(process.env.VERCEL_ENV || "").trim(),
      manualDeployStamp: manualIso ? "env:SCHEDULE_SITE_DEPLOY_AT_ISO" : "",
    });
  } catch (e) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(500).json({ ok: false, message: e?.message || "오류" });
  }
};
