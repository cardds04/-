#!/usr/bin/env node
/**
 * 모든 company_directory 행에 대해 업체 루트 Drive 폴더 생성(업체명만) + DB 에 id 저장.
 *
 *   프로젝트 루트의 `.env` 가 있으면 자동 로드합니다.
 *   셸에 이미 **비어 있지 않은** 값만 우선하고, 비어 있거나 없으면 `.env` 값을 씁니다.
 *
 *   전체:
 *     npm run delivery:provision-company-all
 *
 *   특정 업체명만 (정확히 company_directory.name 과 일치):
 *     npm run delivery:provision-company-all -- "디자인연담" "아란디자인"
 */
const fs = require("fs");
const path = require("path");

function rootEnvAbsPath() {
  return path.join(__dirname, "..", ".env");
}

/** 루트 `.env` — dotenv 패키지 없이 최소 파싱(주석·빈 줄 무시). */
function loadRootEnvDotfile() {
  const envPath = rootEnvAbsPath();
  let raw = "";
  try {
    raw = fs.readFileSync(envPath, "utf8");
  } catch (_) {
    return;
  }
  if (raw.charCodeAt(0) === 0xfeff) {
    raw = raw.slice(1);
  }
  for (let line of raw.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice(7).trim();
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!key) continue;
    /** 셸에 `export SUPABASE_URL=` 처럼 빈 값이 있으면 undefined 가 아니라 "" 이라 기존에는 .env 가 무시되었음 → 비어 있으면 파일 값으로 채움 */
    const prev = process.env[key];
    if (prev === undefined || String(prev).trim() === "") process.env[key] = val;
  }
}

loadRootEnvDotfile();

const {
  provisionCompanyDirectoryFolder,
  fetchCompanyDirectoryRowsForProvision,
} = require("../lib/company-drive-provision.cjs");
const { getDriveClient } = require("../lib/google-drive-delivery.cjs");

function getHs() {
  const url = String(process.env.SUPABASE_URL || "").trim();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    const envPath = rootEnvAbsPath();
    const exists = (() => {
      try {
        fs.accessSync(envPath, fs.constants.R_OK);
        return true;
      } catch (_) {
        return false;
      }
    })();
    console.error("SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
    if (exists) {
      console.error(
        `  → '${envPath}' 는 읽었지만, 이 두 변수가 설정되어 있지 않습니다.\n` +
          "     Supabase 대시보드 → Project Settings → API 에서 프로젝트 URL 과 service_role(secret) 을 확인한 뒤 `.env`에 넣어 주세요."
      );
      console.error("     (브라우저용 anon 키는 REST PATCH에 쓸 수 없어 이 스크립트에서는 사용하지 않습니다.)");
    } else {
      console.error(
        `  → '${envPath}' 파일이 없거나 읽을 수 없습니다.\n` +
          "     해당 경로에 `.env` 를 두거나, 터미널에서 `export SUPABASE_URL=...` `export SUPABASE_SERVICE_ROLE_KEY=...` 후 다시 실행하세요."
      );
    }
    console.error("     예시는 `.env.example`의 Supabase 블록을 참고하세요.");
    process.exit(1);
  }
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
}

const ROW_SELECT =
  "id,name,code,google_drive_company_folder_id,google_drive_company_share_link";

/**
 * @param {{ url: string, headers: Record<string, string> }} headers
 * @param {string[]} names company_directory.name 과 정확히 일치하는 문자열
 */
async function fetchDirectoryRowsByCompanyNames(headers, names) {
  const unique = [...new Set(names.map((n) => String(n || "").trim()).filter(Boolean))];
  const out = [];
  const seenIds = new Set();
  for (const name of unique) {
    const filterPath = `company_directory?name=eq.${encodeURIComponent(name)}&select=${ROW_SELECT}`;
    const rows = await fetchCompanyDirectoryRowsForProvision(headers, filterPath);
    if (!Array.isArray(rows) || rows.length === 0) {
      console.error(`[경고] '${name}' 이름인 company_directory 행이 없습니다.`);
      continue;
    }
    if (rows.length > 1) {
      console.error(`[안내] '${name}' 이(가) ${rows.length}건 — 각각 처리합니다.`);
    }
    for (const r of rows) {
      const id = String(r?.id || "").trim();
      if (id && seenIds.has(id)) continue;
      if (id) seenIds.add(id);
      out.push(r);
    }
  }
  return out;
}

(async () => {
  const h = getHs();
  let drive;
  try {
    drive = getDriveClient();
  } catch (e) {
    console.error("Drive 클라이언트 초기화 실패:", e?.message || e);
    process.exit(1);
  }
  const cliNames = process.argv.slice(2).filter((a) => a !== "--");
  let rows;
  if (cliNames.length) {
    console.error(`지정 업체 ${cliNames.length}개만 프로비저닝…`);
    rows = await fetchDirectoryRowsByCompanyNames(h, cliNames).catch((e) => {
      console.error(e?.message || e);
      process.exit(1);
    });
    if (!rows.length) {
      console.error("조건에 맞는 행이 없어 종료합니다.");
      process.exit(1);
    }
  } else {
    rows = await fetchCompanyDirectoryRowsForProvision(h).catch((e) => {
      console.error(e?.message || e);
      process.exit(1);
    });
  }
  let created = 0;
  let skipped = 0;
  let failed = 0;
  for (const row of rows) {
    const label = row?.name || row?.id || "?";
    try {
      const out = await provisionCompanyDirectoryFolder({
        supabaseHeaders: h,
        directoryRow: row,
        drive,
      });
      if (out.createdFolder) {
        console.error(`[+생성] ${label}`);
        created++;
      } else {
        console.error(`[=기존] ${label}`);
        skipped++;
      }
    } catch (e) {
      console.error(`[오류] ${label}: ${e?.message || e}`);
      failed++;
    }
  }
  console.error(`완료: 신규 ${created}, 이미있음 ${skipped}, 실패 ${failed}, 전체 ${rows.length}`);
  if (failed) process.exit(1);
})();
