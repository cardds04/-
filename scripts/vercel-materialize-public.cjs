#!/usr/bin/env node
/**
 * Vercel이 Output Directory로 `public`만 기대할 때(`public/` 없음` 빌드 실패 방지).
 * 루트 정적 자산만 `public/`으로 복사하고, 서버리스 `api/`·서버 전용 디렉터리는 제외합니다.
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
  "sync-config.js",
  "solapi-notify.js",
  "package.json",
  "package-lock.json",
  "vercel.json",
]);

function isSkipRootFile(name) {
  if (SKIP_TOP_FILE.has(name)) return true;
  return name.endsWith(".sql");
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
