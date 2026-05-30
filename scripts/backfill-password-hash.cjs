#!/usr/bin/env node
/**
 * 기존 평문 비밀번호 → scrypt 해시 백필 (service_role, 서버 전용).
 *
 * 동작:
 *  1) company_directory 전체를 service_role 로 조회.
 *  2) password_hash 가 비어 있고 평문 password 가 있는 행만 해시 생성 후 PATCH.
 *     (password_hash 기록 + 평문 password 는 ""로 비움)
 *  3) 이미 password_hash 가 있거나, 평문도 없는 행은 건너뜀.
 *
 * 안전장치:
 *  - --dry-run (기본): 무엇을 바꿀지 출력만 하고 쓰지 않음.
 *  - --apply       : 실제 PATCH 수행.
 *
 * 선행 조건: 마이그레이션(20260530120000_company_directory_password_hash.sql)이
 *           먼저 적용되어 password_hash 컬럼이 존재해야 한다.
 *
 * 환경 변수:
 *  - SUPABASE_URL                (필수)
 *  - SUPABASE_SERVICE_ROLE_KEY   (필수)
 *
 * 실행 예:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-password-hash.cjs
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/backfill-password-hash.cjs --apply
 */
const { hashPassword, isHashedFormat } = require("../lib/customer-auth-logic.cjs");

const TABLE = "company_directory";

function norm(v) {
  return String(v == null ? "" : v).trim();
}

function getConfig() {
  const url = norm(process.env.SUPABASE_URL);
  const key = norm(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) {
    console.error("환경변수 SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
    process.exit(1);
  }
  return { url: url.replace(/\/+$/, ""), key };
}

function headers(key, extra) {
  return Object.assign(
    { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/json" },
    extra || {}
  );
}

async function fetchAll(url, key) {
  const res = await fetch(`${url}/rest/v1/${TABLE}?select=id,login_id,password,password_hash`, {
    headers: headers(key),
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`조회 실패 (${res.status}): ${t}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

async function patchRow(url, key, id, hash) {
  const res = await fetch(`${url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: headers(key, { "Content-Type": "application/json", Prefer: "return=minimal" }),
    body: JSON.stringify({ password_hash: hash, password: "" }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`업데이트 실패 id=${id} (${res.status}): ${t}`);
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const { url, key } = getConfig();

  const rows = await fetchAll(url, key);
  console.log(`총 ${rows.length}개 행 조회.`);

  let toHash = 0;
  let alreadyHashed = 0;
  let noPlain = 0;
  let done = 0;
  let failed = 0;

  for (const row of rows) {
    if (isHashedFormat(norm(row.password_hash))) {
      alreadyHashed++;
      continue;
    }
    const plain = String(row.password != null ? row.password : "");
    if (!plain) {
      noPlain++;
      continue;
    }
    toHash++;
    const label = `id=${row.id} login_id=${norm(row.login_id) || "(없음)"}`;
    if (!apply) {
      console.log(`  [dry-run] 해시 예정: ${label}`);
      continue;
    }
    try {
      await patchRow(url, key, row.id, hashPassword(plain));
      done++;
      console.log(`  ✓ 해시 완료: ${label}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ 실패: ${label} — ${e.message}`);
    }
  }

  console.log("\n── 요약 ──");
  console.log(`이미 해시됨        : ${alreadyHashed}`);
  console.log(`평문 없음(건너뜀)  : ${noPlain}`);
  console.log(`해시 대상          : ${toHash}`);
  if (apply) {
    console.log(`해시 완료          : ${done}`);
    console.log(`실패               : ${failed}`);
  } else {
    console.log("\n(dry-run) 실제 적용하려면 --apply 플래그를 붙여 다시 실행하세요.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
