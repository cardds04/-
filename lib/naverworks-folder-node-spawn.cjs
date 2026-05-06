/**
 * Vercel 등 Python 없는 환경: Node HTTP 구현 + 별도 worker 프로세스로 실행(spawnSync 호환).
 */

const path = require("path");
const { spawnSync } = require("child_process");
const { shouldUseNaverWorksNodeHttp } = require("./naverworks-drive-http.cjs");

/**
 * @param {{ folderName: string, parentFileId: string, reuseIfExists?: boolean }} p
 * @param {{ force?: boolean }} [opts]
 * @returns {object|null} 성공 시 { ok,fileId,... }, 실패 시 { ok:false,message }, 미사용 시 null
 */
function tryNaverWorksFolderNodeWorker(p, opts) {
  const force = Boolean(opts?.force);
  if (!force && !shouldUseNaverWorksNodeHttp()) return null;
  const folderName = String(p?.folderName || "").trim();
  const parentFileId = String(p?.parentFileId || "").trim();
  const reuseIfExists = Boolean(p?.reuseIfExists);
  const repoRoot = path.join(__dirname, "..");
  const worker = path.join(repoRoot, "scripts", "naverworks-create-folder-worker.cjs");
  const payload = JSON.stringify({ folderName, parentFileId, reuseIfExists, repoRoot });

  const r = spawnSync(process.execPath, [worker], {
    cwd: repoRoot,
    encoding: "utf8",
    input: payload,
    env: process.env,
    maxBuffer: 25 * 1024 * 1024,
    timeout: 52000,
  });

  const stderr = String(r.stderr || "").trim();
  const rawOut = String(r.stdout || "").trim();
  if (r.error) {
    return { ok: false, message: `네이버웍스(Node): ${r.error.message || String(r.error)}` };
  }

  /** 마지막 JSON 줄만 사용(혹시 경고 문자열 prepend 대비) */
  let parsed = null;
  try {
    const lastLine =
      rawOut
        .split(/\r?\n/)
        .map((ln) => ln.trim())
        .filter(Boolean)
        .pop() || "{}";
    parsed = JSON.parse(lastLine);
  } catch (_) {
    return {
      ok: false,
      message:
        stderr || rawOut.slice(0, 800) || "네이버웍스(Node) 응답 JSON 을 해석하지 못했습니다.",
    };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "네이버웍스(Node) 무효한 응답" };
  }

  const fid = String(parsed.folderId || parsed.fileId || "").trim();
  if (parsed.ok && fid) {
    const sl =
      parsed.shareLinkUrl !== undefined && parsed.shareLinkUrl !== null
        ? String(parsed.shareLinkUrl).trim()
        : "";
    return {
      ok: true,
      fileId: fid,
      shareLinkUrl: sl || undefined,
      response: parsed,
    };
  }
  return {
    ok: false,
    message: String(parsed.message || stderr || "네이버웍스 폴더 생성 실패(Node)"),
    response: parsed,
  };
}

module.exports = { tryNaverWorksFolderNodeWorker };
