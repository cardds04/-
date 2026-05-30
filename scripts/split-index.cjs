#!/usr/bin/env node
/**
 * index.html(약 23k줄) 에서 거대 <style> 와 거대 인라인 <script> 를
 * 외부 파일(index.css / index.js)로 추출한다.
 *  - 실행 동작은 100% 동일 (바이트만 외부로 이동, 로드 순서·위치 보존)
 *  - 경계선이 예상과 다르면 즉시 중단 (안전장치)
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const cssPath = path.join(root, "index.css");
const jsPath = path.join(root, "index.js");

const raw = fs.readFileSync(htmlPath, "utf8");
const eol = raw.includes("\r\n") ? "\r\n" : "\n";
const lines = raw.split(/\r?\n/); // 0-based; lines[0] === 파일 1행

function assertLine(idx0, mustInclude, label) {
  const got = lines[idx0];
  if (got === undefined || !got.includes(mustInclude)) {
    throw new Error(
      `경계 검증 실패 [${label}] ${idx0 + 1}행에 "${mustInclude}" 없음. 실제: ${JSON.stringify(got)}`
    );
  }
}

// 1-based 기준 경계: <style>=8, </style>=1871, <script>(big)=2854, </script>=23039
assertLine(7, "<style>", "style-open");
assertLine(1870, "</style>", "style-close");
assertLine(2853, "<script>", "bigscript-open");
assertLine(23038, "</script>", "bigscript-close");
// 큰 스크립트 직전 두 줄이 sync-config / supabase CDN 인지 확인
assertLine(2851, "sync-config.js", "sync-config");
assertLine(2852, "supabase-js", "supabase-cdn");

// 내용 슬라이스 (1-based → 0-based)
const cssBody = lines.slice(8, 1870).join(eol); // 9..1870행 = CSS 본문
const jsBody = lines.slice(2854, 23038).join(eol); // 2855..23038행 = JS 본문

// 들여쓰기 보존용
const linkTag = '    <link rel="stylesheet" href="./index.css" />';
const scriptTag = '    <script src="./index.js"></script>';

const head = lines.slice(0, 7); // 1..7행 (<style> 직전까지)
const middle = lines.slice(1871, 2853); // 1872..2853행 (</head> ~ supabase CDN)
const tail = lines.slice(23039); // 23040행 ~ 끝 (</body></html>)

const newHtml = []
  .concat(head, [linkTag], middle, [scriptTag], tail)
  .join(eol);

// 백업 (git 외 추가 보험)
fs.writeFileSync(htmlPath + ".bak", raw, "utf8");
fs.writeFileSync(cssPath, cssBody + eol, "utf8");
fs.writeFileSync(jsPath, jsBody + eol, "utf8");
fs.writeFileSync(htmlPath, newHtml + eol, "utf8");

console.log("[split-index] 완료");
console.log("  index.css :", cssBody.split(eol).length, "줄");
console.log("  index.js  :", jsBody.split(eol).length, "줄");
console.log("  index.html:", raw.split(eol).length, "→", newHtml.split(eol).length, "줄");
console.log("  백업       : index.html.bak");
