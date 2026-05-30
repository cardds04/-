#!/usr/bin/env node
/**
 * 빌드 결과를 `public/`에 둡니다. Vercel은 이 폴더를 정적 파일 루트로 씁니다.
 * `vercel.json`에 outputDirectory를 두지 않는 것이 중요합니다(값이 `public`이면
 * CLI가 Node 진입점을 그 안에서 찾다가 "No entrypoint"로 실패할 수 있음).
 * 루트 정적 자산만 복사하고, `api/` 등은 제외합니다.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const destDir = path.join(root, "public");

const SKIP_TOP_DIR = new Set([
  "node_modules",
  ".git",
  ".vercel",
  "public",
  "api",
  "backups",
  "supabase",
  "scripts",
  "tools",
  "docs",
  "lightroom-ai-controller",
]);

const SKIP_TOP_FILE = new Set([
  "server.js",
  "Dockerfile",
  "docker-entrypoint.sh",
  "fly.toml",
  // sync-config.js 는 브라우저에서 fetch 하는 환경별 설정 파일.
  // public 에 포함시켜야 한다 — 빠지면 /sync-config.js 404 → HTML 응답을
  // 브라우저가 JS 로 파싱 시도하다가 SyntaxError 가 나면서 페이지가 일부
  // 깨졌었음. (Supabase URL 등은 index.html 안 fallback 이 있어 데이터는
  // 로드되지만, 다른 부수효과 위험 — 안전하게 포함)
  "package.json",
  "package-lock.json",
  "vercel.json",
  ".env",
  ".env.local",
  "auth_key.key",
]);

function isSkipRootFile(name) {
  if (SKIP_TOP_FILE.has(name)) return true;
  // .sql(스키마)·.bak(로컬 백업) 은 실서비스에 올리지 않는다
  return name.endsWith(".sql") || name.endsWith(".bak");
}

function rmRf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function main() {
  rmRf(destDir);
  fs.mkdirSync(destDir, { recursive: true });

  for (const name of fs.readdirSync(root)) {
    if (SKIP_TOP_DIR.has(name)) continue;
    const src = path.join(root, name);
    const st = fs.lstatSync(src);
    if (st.isFile() && isSkipRootFile(name)) continue;
    const dst = path.join(destDir, name);
    fs.cpSync(src, dst, { recursive: true });
  }

  console.log("[vercel-materialize-public]", destDir);
}

main();
