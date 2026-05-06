#!/usr/bin/env node
/**
 * GOOGLE_DRIVE_PARENT_FOLDER_ID 바로 아래의 폴더 중
 * 이름이 `업체명 [AUTO-…]` / `업체명 [코드]` 형태인 것을 업체명만 남기도록 일괄 변경합니다.
 *
 * 기본은 드라이런(변경 안 함, 출력만)입니다.
 * 실제 이름 변경:
 *   RENAME_SUFFIX_APPLY=1 npm run drive:rename-company-suffix
 *
 * 환경 변수(기존 Cron·작가 페이지와 동일):
 *   GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON
 *   GOOGLE_DRIVE_PARENT_FOLDER_ID
 *
 * 저장소 루트의 `.env` / `.env.local` 을 읽습니다(dot 패키지 없음).
 * 값이 없으면 Fly/Vercel 환경 변수를 `.env` 로 복사하거나, 부모 폴더 ID만 인자로 줄 수 있습니다.
 *   RENAME_SUFFIX_APPLY=1 node tools/rename-drive-company-folder-suffix.cjs --parent-folder-id 폴더ID
 */
const fs = require("fs");
const path = require("path");
const {
  getDriveClient,
  getParentFolderId,
  listImmediateChildFolders,
  renameDriveItem,
} = require("../lib/google-drive-delivery.cjs");
const { sanitizeDriveName } = require("../lib/delivery-drive-logic.cjs");

/** dot 패키지 없이 KEY=VALUE 로드(이미 셸에 있는 값은 덮어쓰지 않음) */
function tryLoadRepoDotEnv() {
  const root = path.join(__dirname, "..");
  const files = [path.join(root, ".env"), path.join(root, ".env.local")];
  for (const fp of files) {
    let text;
    try {
      text = fs.readFileSync(fp, "utf8");
    } catch (_) {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const raw = /^export\s+/i.test(t) ? t.replace(/^export\s+/i, "") : t;
      const eq = raw.indexOf("=");
      if (eq <= 0) continue;
      const key = raw.slice(0, eq).trim();
      if (!key) continue;
      let val = raw.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (String(process.env[key] || "").trim() !== "") continue;
      process.env[key] = val;
    }
  }
}

function parseParentFolderIdFromArgv(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const mEq = /^--parent-folder-id=(.+)$/i.exec(a);
    if (mEq) return String(mEq[1] || "").trim();
    if (/^--parent-folder-id$/i.test(a)) return String(argv[i + 1] || "").trim();
  }
  return "";
}

/** 이름 끝의 ` […]` 한 덩어리 제거 후 정리 (예: 89밀리미터 [AUTO-ABC] → 89밀리미터) */
function targetNameWithoutBracketSuffix(folderName) {
  const s0 = String(folderName || "").trim();
  const re = /\s+\[[^\]]+]+\s*$/;
  if (!re.test(s0)) return null;
  const base = s0.replace(re, "").trim();
  const cleaned = sanitizeDriveName(base);
  if (!cleaned || cleaned === s0) return null;
  return cleaned;
}

(async () => {
  tryLoadRepoDotEnv();
  const fromArg = parseParentFolderIdFromArgv(process.argv.slice(2));
  if (fromArg) {
    process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID = fromArg;
  }

  /** 기본: 드라이런만. 실제 변경은 RENAME_SUFFIX_APPLY=1 */
  const apply = /^(1|true|yes)$/i.test(String(process.env.RENAME_SUFFIX_APPLY || "").trim());

  const parentId = getParentFolderId();
  if (!parentId) {
    const root = path.join(__dirname, "..");
    console.error("GOOGLE_DRIVE_PARENT_FOLDER_ID 가 비어 있습니다.\n");
    console.error("다음 중 하나로 설정하세요:");
    console.error(`  · ${path.join(root, ".env")} 에 GOOGLE_DRIVE_PARENT_FOLDER_ID=… (Drive URL의 /folders/ 뒤 ID)`);
    console.error("  · 셸에서 export GOOGLE_DRIVE_PARENT_FOLDER_ID=…");
    console.error(
      "  · node tools/rename-drive-company-folder-suffix.cjs --parent-folder-id <폴더ID>  (서비스 계정 JSON은 여전히 env 필요)\n"
    );
    process.exit(1);
  }

  const drive = getDriveClient();
  const children = await listImmediateChildFolders(drive, parentId);
  /** 다른 폴더가 이미 차지한 이름 (같은 레벨 충돌 방지) */
  const nameOwners = new Map();
  for (const c of children) {
    const n = String(c.name || "");
    if (!nameOwners.has(n)) nameOwners.set(n, []);
    nameOwners.get(n).push(c.id);
  }

  const planned = [];
  for (const c of children) {
    const next = targetNameWithoutBracketSuffix(c.name);
    if (!next) continue;
    const others = nameOwners.get(next);
    if (others && others.some((id) => id !== c.id)) {
      planned.push({ id: c.id, from: c.name, to: next, skip: "이미 같은 이름의 다른 폴더가 있음" });
      continue;
    }
    planned.push({ id: c.id, from: c.name, to: next, skip: "" });
  }

  const toApply = planned.filter((p) => !p.skip && p.id);
  const skipped = planned.filter((p) => p.skip);

  console.log(`── 부모 폴더: ${parentId}`);
  console.log(`── 직속 하위 폴더: ${children.length}개`);
  console.log(`── 접미사 제거 대상: ${toApply.length}개 (건너뜀 ${skipped.length}개)\n`);

  for (const row of skipped) {
    console.log(`SKIP "${row.from}" → "${row.to}": ${row.skip}`);
  }
  for (const row of toApply) {
    console.log(`${apply ? "" : "[DRY] "}"${row.from}" → "${row.to}" (${row.id.slice(0, 12)}…)`);
  }

  if (!apply) {
    console.log(
      "\n실제로 바꾸려면 RENAME_SUFFIX_APPLY=1 과 함께 다시 실행하세요. (예: RENAME_SUFFIX_APPLY=1 npm run drive:rename-company-suffix)"
    );
    return;
  }

  let ok = 0;
  let fail = 0;
  for (const row of toApply) {
    try {
      await renameDriveItem(drive, row.id, row.to);
      ok += 1;
    } catch (e) {
      fail += 1;
      console.error(`FAIL "${row.from}": ${e?.message || e}`);
    }
  }
  console.log(`\n── 완료: ${ok}건, 실패: ${fail}건`);
})().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
