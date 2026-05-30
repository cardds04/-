#!/usr/bin/env node
/**
 * 분리 정밀 검증: index.html.bak(원본) 기준으로
 *  - index.css 가 원본 CSS 본문과 100% 동일한가
 *  - index.js  가 원본 JS  본문과 100% 동일한가
 *  - 새 index.html 이 (원본 - 추출본 + 태그2줄) 과 정확히 일치하는가
 * 한 글자라도 다르면 어디서 갈라지는지 출력.
 */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const bak = fs.readFileSync(path.join(root, "index.html.bak"), "utf8");
const css = fs.readFileSync(path.join(root, "index.css"), "utf8");
const js = fs.readFileSync(path.join(root, "index.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const eol = bak.includes("\r\n") ? "\r\n" : "\n";
const L = bak.split(/\r?\n/);

function firstDiff(a, b, label) {
  if (a === b) {
    console.log(`  ✅ ${label}: 완전 일치 (${a.length} bytes)`);
    return true;
  }
  // 어디서 다른지 찾기
  const min = Math.min(a.length, b.length);
  let i = 0;
  while (i < min && a[i] === b[i]) i++;
  console.log(`  ❌ ${label}: 불일치! 길이 a=${a.length} b=${b.length}, 최초 차이 위치=${i}`);
  console.log(`     a[..]: ${JSON.stringify(a.slice(Math.max(0, i - 30), i + 30))}`);
  console.log(`     b[..]: ${JSON.stringify(b.slice(Math.max(0, i - 30), i + 30))}`);
  return false;
}

let ok = true;

// --- CSS 본문: 원본 9..1870행 (1-based) = slice(8,1870)
const cssBody = L.slice(8, 1870).join(eol);
ok = firstDiff(css.replace(/\r?\n$/, ""), cssBody, "index.css ↔ 원본 CSS 본문") && ok;

// --- JS 본문: 원본 2855..23038행 = slice(2854,23038)
const jsBody = L.slice(2854, 23038).join(eol);
ok = firstDiff(js.replace(/\r?\n$/, ""), jsBody, "index.js ↔ 원본 JS 본문") && ok;

// --- 새 index.html 재구성 검증
const linkTag = '    <link rel="stylesheet" href="./index.css" />';
const scriptTag = '    <script src="./index.js"></script>';
const head = L.slice(0, 7);
const middle = L.slice(1871, 2853);
const tail = L.slice(23039);
const rebuilt = [].concat(head, [linkTag], middle, [scriptTag], tail).join(eol) + eol;
ok = firstDiff(html, rebuilt, "index.html ↔ 재구성본") && ok;

// --- 잔여 태그 검사
function noResidue(content, tag, label) {
  if (content.includes(tag)) {
    console.log(`  ❌ ${label}: '${tag}' 잔여 발견`);
    return false;
  }
  console.log(`  ✅ ${label}: '${tag}' 잔여 없음`);
  return true;
}
ok = noResidue(css, "<style", "CSS") && ok;
ok = noResidue(css, "</style", "CSS") && ok;
ok = noResidue(js, "<script", "JS") && ok;
ok = noResidue(js, "</script>", "JS") && ok;

// --- HTML 내 참조 1회씩 있는지
const cssRef = (html.match(/href="\.\/index\.css"/g) || []).length;
const jsRef = (html.match(/src="\.\/index\.js"/g) || []).length;
console.log(`  link(index.css) 참조: ${cssRef}개 / script(index.js) 참조: ${jsRef}개`);
if (cssRef !== 1 || jsRef !== 1) { console.log("  ❌ 참조 개수 비정상"); ok = false; }

// --- 로드 순서 확인 (sync-config → supabase → index.js)
const idxSync = html.indexOf("sync-config.js");
const idxSupa = html.indexOf("supabase-js");
const idxIndexJs = html.indexOf('src="./index.js"');
if (idxSync < idxSupa && idxSupa < idxIndexJs && idxSync > 0) {
  console.log("  ✅ 스크립트 로드 순서 정상: sync-config → supabase → index.js");
} else {
  console.log(`  ❌ 로드 순서 이상: sync=${idxSync} supa=${idxSupa} indexjs=${idxIndexJs}`);
  ok = false;
}

console.log(ok ? "\n[verify-split] ✅ 전체 통과 — 원본과 기능적으로 동일" : "\n[verify-split] ❌ 문제 발견");
process.exit(ok ? 0 : 1);
