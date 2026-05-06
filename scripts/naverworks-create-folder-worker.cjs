#!/usr/bin/env node
/**
 * stdin: JSON 한 덩어리 { folderName, parentFileId, reuseIfExists?, repoRoot? }
 * stdout: 한 줄 JSON ( ok, folderId, fileId, shareLinkUrl, message )
 */
const chunks = [];

(async () => {
  for await (const c of process.stdin) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  /** @type {Record<string, unknown>} */
  let payload = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.log(
      JSON.stringify({
        ok: false,
        message: `stdin JSON 파싱 실패: ${e?.message || e}`,
      })
    );
    process.exit(1);
    return;
  }

  const { naverWorksCreateFolderViaHttp } = require("../lib/naverworks-drive-http.cjs");
  const out = await naverWorksCreateFolderViaHttp({
    folderName: String(payload.folderName || ""),
    parentFileId: String(payload.parentFileId || ""),
    reuseIfExists: Boolean(payload.reuseIfExists),
    repoRoot:
      typeof payload.repoRoot === "string" && payload.repoRoot.trim()
        ? payload.repoRoot.trim()
        : undefined,
  });

  const fid = String(out.folderId || out.fileId || "").trim();
  const success = !!(out.ok && fid);
  console.log(
    JSON.stringify({
      ok: success,
      folderId: fid || undefined,
      fileId: fid || undefined,
      shareLinkUrl: out.shareLinkUrl != null ? out.shareLinkUrl : undefined,
      message: success ? "" : String(out.message || "네이버웍스 폴더 생성 실패"),
      shareLinkNote: out.shareLinkNote,
      shareLinkError: out.shareLinkError,
      folderResponse: out.folderResponse,
      shareLink: out.shareLink,
      createFolderHttp: out.createFolderHttp,
    })
  );
  process.exit(success ? 0 : 1);
})().catch((e) => {
  console.log(JSON.stringify({ ok: false, message: e?.message || String(e || "네이버웍스 worker 실패") }));
  process.exit(1);
});
