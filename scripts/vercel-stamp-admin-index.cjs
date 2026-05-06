#!/usr/bin/env node
/**
 * Vercel 빌드 시에만: 페이지별 `<span id="…">__SCHEDULE_SITE_ADMIN_UPDATE_LABEL__</span>`
 * 를 `업데이트시각:0506 10:03` 형식(KST 한 줄)으로 치환합니다.
 * (스크립트 안의 `STAMP_PENDING` 문자열은 치환하지 않습니다.)
 */
const fs = require("fs");
const path = require("path");

if (!process.env.VERCEL && !process.env.FORCE_VERCEL_STAMP) {
  console.log("[vercel-stamp] Vercel 빌드 아님 → 생략");
  process.exit(0);
}

const root = path.join(__dirname, "..");

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
const stampTextRaw = `업데이트시각:${kstCompactMMddHm(builtIso)}`;
const stampedInner = esc(stampTextRaw);

const FILES = [
  ["index.html", "adminUpdateStampInner"],
  ["photographer.html", "writerUpdateStampInner"],
];

let any = false;
for (const [rel, spanId] of FILES) {
  const fp = path.join(root, rel);
  let html = fs.readFileSync(fp, "utf8");
  const re = new RegExp(
    `<span id="${spanId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}">\\s*__SCHEDULE_SITE_ADMIN_UPDATE_LABEL__\\s*</span>`
  );
  if (!re.test(html)) {
    console.warn("[vercel-stamp] 슬롯 없음 → 스킵:", rel);
    continue;
  }
  html = html.replace(re, `<span id="${spanId}">${stampedInner}</span>`);
  fs.writeFileSync(fp, html, "utf8");
  any = true;
  console.log("[vercel-stamp] 적용됨", rel, stampTextRaw);
}

if (!any) {
  console.warn("[vercel-stamp] 처리된 HTML 없음");
}
