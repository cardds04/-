/**
 * 네이버웍스 create_folder 등에서 쓸 Python 실행 파일 경로 결정.
 * - GUI에서 띄운 Node처럼 PATH에 python3 없을 때 ENOENT 완화
 * - scripts/.venv(로컬 venv)·프로젝트 .venv·Docker /opt/venv 우선
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

/** @returns {string} spawnSync 첫 인자용 경로 또는 호출 이름 */
function resolveNaverWorksPythonBin() {
  const explicit = String(process.env.NAVER_WORKS_PYTHON_BIN || "").trim();
  if (explicit) return explicit;

  const repoRoot = path.join(__dirname, "..");

  const exists = (p) => {
    try {
      return fs.existsSync(p);
    } catch (_) {
      return false;
    }
  };

  /** @type {string[]} */
  const fileCandidates = [
    path.join(repoRoot, "scripts", ".venv", "bin", "python"),
    path.join(repoRoot, "scripts", ".venv", "bin", "python3"),
    path.join(repoRoot, "scripts", ".venv", "Scripts", "python.exe"),
    path.join(repoRoot, ".venv", "bin", "python"),
    path.join(repoRoot, ".venv", "bin", "python3"),
    path.join(repoRoot, ".venv", "Scripts", "python.exe"),
    "/opt/venv/bin/python",
  ].filter(Boolean);

  for (const p of fileCandidates) {
    if (exists(p)) return p;
  }

  /** macOS/Linux: 로그인 셸 PATH로 which (GUI 앱의 빈약한 PATH 보완) */
  if (process.platform !== "win32") {
    const r = spawnSync("/bin/sh", ["-lc", "command -v python3 || command -v python"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      timeout: 5000,
    });
    const line =
      typeof r.stdout === "string"
        ? r.stdout
            .trim()
            .split(/\r?\n/)
            .find((l) => l.trim()) || ""
        : "";
    const t = line.trim();
    if (t && exists(t)) return t;
  }

  if (process.platform === "win32") {
    const wr = spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "where python"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024,
      timeout: 5000,
    });
    const wins = typeof wr.stdout === "string" ? wr.stdout.trim().split(/\r?\n/).filter(Boolean)[0] : "";
    if (wins && exists(wins)) return wins;
    return process.env.PYTHON || "python";
  }

  return "python3";
}

/** 사용자 안내 문구 공통화 */
function naverWorksPythonMissingHint() {
  return [
    "Python 실행 파일을 찾지 못했습니다.",
    "1) 한 번 실행: npm run naverworks:venv  (scripts/.venv 생성 + requirements 설치)",
    "2) .env 에 NAVER_WORKS_PYTHON_BIN 을 설정 (예: mac/linux → 프로젝트/scripts/.venv/bin/python, Docker → /opt/venv/bin/python)",
    "패키지(로컬 Python): 프로젝트 루트 requirements-naverworks.txt",
    "※ Vercel 등 서버리스 배포에서는 Python 없이 Node 로 동일 API 를 호출합니다. NAVER WORKS 클라이언트·PRIVATE_KEY 등 환경 변수는 반드시 Vercel(Project Settings → Environment Variables)에도 넣어야 합니다.",
  ].join("\n");
}

module.exports = { resolveNaverWorksPythonBin, naverWorksPythonMissingHint };
