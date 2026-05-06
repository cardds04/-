#!/usr/bin/env node
/**
 * Vercel 빌드 시에만 실행: index.html 안의 슬롯을 «배포 시각·커밋» 문자열로 바꿉니다.
 * (静的 HTML 이 그대로 배포되면 이전 캐시와 구분이 어려워서)
 */
const fs = require("fs");
const path = require("path");

if (!process.env.VERCEL && !process.env.FORCE_VERCEL_STAMP) {
  console.log("[vercel-stamp] Vercel 빌드 아님 → 생략");
  process.exit(0);
}

const indexPath = path.join(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");
const marker = "<!-- VERCEL_ADMIN_UPDATE_STAMP_SLOT -->";
if (!html.includes(marker)) {
  console.warn("[vercel-stamp] 슬롯 없음, 스킵");
  process.exit(0);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kstLabel(isoUtc) {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return String(isoUtc);
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

const builtIso = new Date().toISOString();
const sha = String(process.env.VERCEL_GIT_COMMIT_SHA || "").trim();
const short = sha ? sha.slice(0, 7) : "—";

const block = `<p class="schedule-admin-vercel-stamp" style="text-align:center;margin:10px auto 0;max-width:min(920px,96vw);padding:10px 14px;font-size:15px;font-weight:800;color:#0c4a6e;background:linear-gradient(180deg,#e0f2fe 0%,#bae6fd 100%);border:2px solid #0ea5e9;border-radius:12px;box-shadow:0 2px 10px rgba(14,165,233,0.25);">
  <span style="color:#0369a1">Vercel 배포 반영</span> · 업데이트(KST) <strong>${esc(kstLabel(builtIso))}</strong> · 커밋 <code style="background:#fff;padding:2px 8px;border-radius:6px">${esc(
    short
  )}</code>
</p>`;

html = html.replace(marker, block);
fs.writeFileSync(indexPath, html, "utf8");
console.log("[vercel-stamp] 적용됨", short, kstLabel(builtIso));
