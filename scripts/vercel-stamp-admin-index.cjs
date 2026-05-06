#!/usr/bin/env node
/**
 * Vercel 빌드 시에만: `index.html`의 `__SCHEDULE_SITE_ADMIN_UPDATE_LABEL__` 토큰을
 * `업데이트시각:0506 10:03` 형식(KST 한 줄)으로 치환합니다.
 */
const fs = require("fs");
const path = require("path");

if (!process.env.VERCEL && !process.env.FORCE_VERCEL_STAMP) {
  console.log("[vercel-stamp] Vercel 빌드 아님 → 생략");
  process.exit(0);
}

const indexPath = path.join(__dirname, "..", "index.html");
let html = fs.readFileSync(indexPath, "utf8");

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** KST `"0506 10:03"` (월일 + 시:분, 앞자리 0 패딩) */
function kstCompactMMddHm(isoUtc) {
  const d = new Date(isoUtc);
  if (Number.isNaN(d.getTime())) return String(isoUtc);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const m = parts.find((p) => p.type === "month")?.value.padStart(2, "0") || "";
  const day = parts.find((p) => p.type === "day")?.value.padStart(2, "0") || "";
  const h = parts.find((p) => p.type === "hour")?.value.padStart(2, "0") || "";
  const min = parts.find((p) => p.type === "minute")?.value.padStart(2, "0") || "";
  return `${m}${day} ${h}:${min}`;
}

const builtIso = new Date().toISOString();
const stampText = `업데이트시각:${kstCompactMMddHm(builtIso)}`;

const TOKEN = "__SCHEDULE_SITE_ADMIN_UPDATE_LABEL__";

if (!html.includes(TOKEN)) {
  console.warn("[vercel-stamp] 레이블 토큰 없음, 스킵");
  process.exit(0);
}

html = html.replace(TOKEN, esc(stampText));
fs.writeFileSync(indexPath, html, "utf8");
console.log("[vercel-stamp] 적용됨", stampText);
