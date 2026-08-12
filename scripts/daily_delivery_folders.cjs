#!/usr/bin/env node
/**
 * 매일 아침 촬영일 납품 폴더 자동 생성 (2026-08-11 사장님 지시).
 *
 * 오늘(KST) 촬영 스케줄을 읽어, 업체 마이박스 공유폴더 안에
 *   {만들폴더명}/                      예: 0701206호1  (작가 화면 표시와 동일 규칙)
 *     ├ {MMDD}{업체명}사진원본/
 *     └ {MMDD}{업체명}영상원본/        (촬영구성에 따라)
 * 트리를 만들어 둔다. 이미 있으면 재사용(마이박스 mkdir 1008 → 기존 키 반환).
 * 작가 페이지 「업체 납품 폴더 열기」는 열기만 한다 — 생성은 이 스크립트가 전담.
 *
 * 실행: node scripts/daily_delivery_folders.cjs [--date YYYY-MM-DD]
 * 전제: 로컬 릴레이(com.scpink.nwrelay, 포트 9337)가 떠 있고 크롬에 네이버 로그인 유지.
 */
const path = require("path");
const fs = require("fs");

const ROOT = path.resolve(__dirname, "..");
// .env 로드 (dotenv 없이 단순 파싱)
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const [k, ...rest] = t.split("=");
  if (!(k in process.env)) process.env[k.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
}

const { needsPhotoFolder, needsVideoFolder } = require(path.join(ROOT, "lib", "delivery-drive-logic.cjs"));

/**
 * ‼️만들폴더명은 작가 화면(photographer.html)의 buildShootFolderNameJS 와 100% 같아야 한다
 *   (작가가 화면의 「만들 폴더명」으로 폴더를 찾으므로). 서버 lib 규칙과는 실측 60건 중 10건이
 *   달라서(구·동 라벨 처리 등), photographer.html 에서 함수를 그대로 추출해 사용한다.
 *   추출 실패 = 페이지 함수가 바뀐 것 → 명확히 실패시켜 갱신을 유도한다.
 */
function loadClientFolderNameFn() {
  const html = fs.readFileSync(path.join(ROOT, "photographer.html"), "utf8");
  const constM = html.match(/const SHOOT_FOLDER_NAME_SUFFIX_MAX[^\n]*/);
  if (!constM) throw new Error("photographer.html에서 SHOOT_FOLDER_NAME_SUFFIX_MAX 를 찾지 못했습니다");
  const names = [
    "clampShootFolderSuffix",
    "detectDongHoFromPlace",
    "extractAptNameFromPrefixForFolder",
    "apartmentFolderSuffixFromPlace",
    "guDongLabelForShootFolderName",
    "buildShootFolderNameJS"
  ];
  const parts = [constM[0]];
  for (const nm of names) {
    const i = html.indexOf(`function ${nm}(`);
    if (i < 0) throw new Error(`photographer.html에서 ${nm} 함수를 찾지 못했습니다 — 스크립트 갱신 필요`);
    const j = html.indexOf("{", i);
    let depth = 0;
    let end = -1;
    for (let k = j; k < Math.min(html.length, j + 30000); k++) {
      if (html[k] === "{") depth++;
      else if (html[k] === "}") {
        depth--;
        if (depth === 0) { end = k + 1; break; }
      }
    }
    if (end < 0) throw new Error(`${nm} 함수 끝을 찾지 못했습니다`);
    parts.push(html.slice(i, end));
  }
  parts.push("const normalize = (v) => String(v || \"\").trim();");
  parts.push("return buildShootFolderNameJS;");
  // eslint-disable-next-line no-new-func
  return new Function(parts.join("\n"))();
}
const buildShootFolderNameJS = loadClientFolderNameFn();

const SB = process.env.SUPABASE_URL || "https://pidfkrxsgffoqstogmli.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RELAY = "http://localhost:9337";

function kstTodayYmd() {
  const now = new Date(Date.now() + 9 * 3600 * 1000);
  return now.toISOString().slice(0, 10);
}

async function sbJson(pathq) {
  const res = await fetch(`${SB}/rest/v1/${pathq}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function relayMkdir(folderName, parent) {
  const res = await fetch(`${RELAY}/createfolder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderName, parentFileId: parent })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.fileId) {
    throw new Error(String(data?.message || `릴레이 HTTP ${res.status}`));
  }
  return data; // {fileId, reused, webLink}
}

/** 작가 「열기」가 그 촬영일 폴더로 바로 가도록 딥링크를 저장(shoot_delivery_drive_state). */
async function saveShootFolderLink(scheduleId, row, folderName, shoot) {
  const body = {
    schedule_id: scheduleId,
    company_name: row.company_name || "",
    company_code: row.code || "",
    shoot_date_key: row.date_key,
    composition: row.composition || "",
    shoot_folder_id: shoot.fileId,
    shoot_folder_web_link: shoot.webLink || "",
    updated_at: new Date().toISOString()
  };
  const res = await fetch(`${SB}/rest/v1/shoot_delivery_drive_state?on_conflict=schedule_id`, {
    method: "POST",
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify([body])
  });
  if (!res.ok) throw new Error(`딥링크 저장 실패 ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

/** 신규 업체: 공유폴더에 업체 폴더 생성 + 공유링크(편집허용) 발급 + 업체정보관리에 저장. */
async function provisionCompanyFolder(companyName, directoryId) {
  const res = await fetch(`${RELAY}/provisioncompany`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !data.shareLink) {
    throw new Error(String(data?.message || `릴레이 HTTP ${res.status}`));
  }
  if (directoryId) {
    const patch = await fetch(`${SB}/rest/v1/company_directory?id=eq.${encodeURIComponent(directoryId)}`, {
      method: "PATCH",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify({
        naver_works_company_folder_id: data.folderId,
        naver_works_company_share_link: data.shareLink,
        updated_at: new Date().toISOString()
      })
    });
    const rows = await patch.json().catch(() => []);
    if (!patch.ok || !Array.isArray(rows) || !rows.length) {
      throw new Error(`폴더연결 주소 저장 실패 (${patch.status})`);
    }
  }
  return data;
}

/** 소급 연결용 — 이미 있는 폴더를 찾아 딥링크만 얻는다(생성 안 함). */
async function relayFind(folderName, parent, mmdd) {
  const res = await fetch(`${RELAY}/findfolder`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderName, parentFileId: parent, mmdd })
  });
  return res.json().catch(() => ({ ok: false, message: `릴레이 HTTP ${res.status}` }));
}

/** --link-only: 폴더를 만들지 않고, 기간 내 스케줄의 기존 폴더를 찾아 딥링크만 저장(소급). */
async function runLinkOnly(days) {
  const today = kstTodayYmd();
  const from = new Date(new Date(`${today}T00:00:00Z`).getTime() - days * 86400000).toISOString().slice(0, 10);
  console.log(`[link-only] ${from} ~ ${today} 스케줄의 기존 폴더 딥링크 소급 연결`);
  const rows = await sbJson(
    `schedules?date_key=gte.${from}&date_key=lte.${today}&source=eq.active&select=id,company_name,code,writer_name,date_key,time_key,place,composition&order=date_key.asc,time_key.asc`
  );
  const directory = await sbJson(`company_directory?select=name,code,naver_works_company_share_link&limit=2000`);
  const norm = (v) => String(v || "").trim();
  const linkByName = new Map(directory.map((d) => [norm(d.name), norm(d.naver_works_company_share_link)]));
  const linkByCode = new Map(directory.filter((d) => norm(d.code)).map((d) => [norm(d.code), norm(d.naver_works_company_share_link)]));
  const existing = await sbJson(`shoot_delivery_drive_state?select=schedule_id,shoot_folder_web_link&limit=5000`);
  const haveLink = new Set(existing.filter((e) => norm(e.shoot_folder_web_link)).map((e) => e.schedule_id));

  // 날짜별·작가별 순번(작가 화면 규칙)
  const timeMin = (t) => { const m = /(\d{1,2}):(\d{2})/.exec(String(t || "")); return m ? Number(m[1]) * 60 + Number(m[2]) : 9999; };
  const slotById = new Map();
  const grouped = new Map();
  for (const r of rows) {
    const k = `${r.date_key}|${norm(r.writer_name) || "작가미정"}`;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k).push(r);
  }
  for (const list of grouped.values()) {
    list.sort((a, b) => timeMin(a.time_key) - timeMin(b.time_key) || norm(a.place).localeCompare(norm(b.place), "ko") || norm(a.company_name).localeCompare(norm(b.company_name), "ko"));
    list.forEach((r, i) => slotById.set(r.id, i + 1));
  }

  let linked = 0, skipped = 0;
  const misses = [];
  for (const r of rows) {
    if (haveLink.has(r.id)) { skipped++; continue; }
    const share = linkByCode.get(norm(r.code)) || linkByName.get(norm(r.company_name)) || "";
    if (!share) { misses.push(`${r.date_key} ${r.company_name}: 폴더연결 주소 없음`); continue; }
    const mmdd2 = r.date_key.replace(/-/g, "").slice(4, 8);
    const want = buildShootFolderNameJS(r.date_key, r.place, slotById.get(r.id) || 1);
    try {
      const found = await relayFind(want, share, mmdd2);
      if (!found.ok || !found.webLink) {
        misses.push(`${r.date_key} ${r.company_name}: ${found.ambiguous ? `후보 ${found.ambiguous.length}개(${found.ambiguous.slice(0, 3).join(",")})` : found.message || "못 찾음"}`);
        continue;
      }
      await saveShootFolderLink(r.id, r, found.name, { fileId: found.fileId, webLink: found.webLink });
      linked++;
      console.log(`  🔗 ${r.date_key} ${r.company_name} → ${found.name}${found.how === "mmdd" ? " (날짜로 매칭)" : ""}`);
    } catch (e) {
      misses.push(`${r.date_key} ${r.company_name}: ${e.message}`);
    }
  }
  console.log(`\n[link-only] 새로 연결 ${linked}건 · 이미 연결됨 ${skipped}건 · 미해결 ${misses.length}건`);
  misses.slice(0, 40).forEach((m) => console.log(`  · ${m}`));
}

async function main() {
  const argDate = (process.argv.find((a, i) => process.argv[i - 1] === "--date") || "").trim();
  const linkOnlyArg = process.argv.find((a, i) => process.argv[i - 1] === "--link-only");
  const dateKey = /^\d{4}-\d{2}-\d{2}$/.test(argDate) ? argDate : kstTodayYmd();
  const mmdd = dateKey.replace(/-/g, "").slice(4, 8);
  if (process.argv.includes("--link-only")) {
    const days = Number(linkOnlyArg) > 0 ? Number(linkOnlyArg) : 15;
    // 릴레이 확인
    try {
      const h = await (await fetch(`${RELAY}/health`)).json();
      if (!h.ok) throw new Error("health not ok");
    } catch (e) {
      console.error(`❌ 로컬 릴레이(9337) 응답 없음: ${e.message}`);
      process.exit(2);
    }
    await runLinkOnly(days);
    return;
  }
  console.log(`[daily-folders] 대상 촬영일: ${dateKey}`);

  // 릴레이 헬스 먼저 — 죽어 있으면 명확히 알림
  try {
    const h = await (await fetch(`${RELAY}/health`)).json();
    if (!h.ok) throw new Error("health not ok");
    if (!h.cookie_valid) console.log("⚠️ 마이박스 쿠키가 유효하지 않아 보입니다(크롬 네이버 로그인 확인 필요) — 일단 시도합니다.");
  } catch (e) {
    console.error(`❌ 로컬 릴레이(9337)가 응답하지 않습니다: ${e.message}`);
    console.error("   → launchctl kickstart -k gui/$(id -u)/com.scpink.nwrelay 로 재기동 후 다시 실행");
    process.exit(2);
  }

  const rows = await sbJson(
    `schedules?date_key=eq.${dateKey}&source=eq.active&select=id,company_name,code,writer_name,time_key,place,composition&order=time_key.asc`
  );
  if (!rows.length) {
    console.log("오늘 촬영 스케줄이 없습니다. 종료.");
    return;
  }
  // ‼️순번은 작가 화면과 동일하게 「그 작가의 당일 목록에서 시간순 n번째」다
  //   (photographer.html: rows = getMySchedules() → 시간→장소→업체 정렬 후 i+1).
  //   아침 10시 이후 작가 배정이 바뀌면 순번이 어긋날 수 있음 — 그 경우 작가 화면의
  //   「만들 폴더명」과 다른 이름의 폴더가 이미 있으니 작가가 이름으로 찾으면 된다.
  const norm = (v) => String(v || "").trim();
  const timeMin = (t) => {
    const m = /(\d{1,2}):(\d{2})/.exec(String(t || ""));
    return m ? Number(m[1]) * 60 + Number(m[2]) : 9999;
  };
  const byWriter = new Map();
  for (const r of rows) {
    const w = norm(r.writer_name) || "작가미정";
    if (!byWriter.has(w)) byWriter.set(w, []);
    byWriter.get(w).push(r);
  }
  const slotById = new Map();
  for (const list of byWriter.values()) {
    list.sort((a, b) => {
      const t = timeMin(a.time_key) - timeMin(b.time_key);
      if (t) return t;
      const p = norm(a.place).localeCompare(norm(b.place), "ko");
      if (p) return p;
      return norm(a.company_name).localeCompare(norm(b.company_name), "ko");
    });
    list.forEach((r, i) => slotById.set(r.id, i + 1));
  }
  rows.sort((a, b) => timeMin(a.time_key) - timeMin(b.time_key));

  const directory = await sbJson(`company_directory?select=id,name,code,naver_works_company_share_link&limit=2000`);
  const linkByName = new Map(directory.map((d) => [norm(d.name), norm(d.naver_works_company_share_link)]));
  const linkByCode = new Map(directory.filter((d) => norm(d.code)).map((d) => [norm(d.code), norm(d.naver_works_company_share_link)]));
  const dirByName = new Map(directory.map((d) => [norm(d.name), d]));
  const dirByCode = new Map(directory.filter((d) => norm(d.code)).map((d) => [norm(d.code), d]));

  let okCount = 0;
  const failures = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const company = norm(r.company_name);
    const label = `${r.time_key} ${company}`;
    let shareLink = linkByCode.get(norm(r.code)) || linkByName.get(company) || "";
    if (!shareLink) {
      // 신규 업체 — 공유폴더에 업체 폴더를 만들고 편집허용 공유링크를 발급해 저장한다.
      const dirRow = dirByCode.get(norm(r.code)) || dirByName.get(company);
      if (!dirRow?.id) {
        failures.push(`${label}: 업체정보관리에 업체가 없음(등록 필요)`);
        continue;
      }
      try {
        const prov = await provisionCompanyFolder(company, dirRow.id);
        shareLink = prov.shareLink;
        linkByName.set(company, shareLink);
        if (norm(r.code)) linkByCode.set(norm(r.code), shareLink);
        console.log(`🆕 ${company} 업체 폴더 ${prov.reused ? "재사용" : "생성"} + 공유링크 발급${prov.editable ? "(편집허용)" : "(⚠️편집허용 실패)"} → 폴더연결 주소 저장`);
      } catch (e) {
        failures.push(`${label}: 업체 폴더 자동 발급 실패 — ${e.message}`);
        continue;
      }
    }
    const daySlot = slotById.get(r.id) || 1;
    const folderName = buildShootFolderNameJS(dateKey, r.place, daySlot);
    const compForName = company.replace(/[\/\\:*?"<>|]/g, "").trim();
    try {
      const shoot = await relayMkdir(folderName, shareLink);
      const subs = [];
      const wantPhoto = needsPhotoFolder(r.composition);
      const wantVideo = needsVideoFolder(r.composition);
      if (wantPhoto || !wantVideo) {
        await relayMkdir(`${mmdd}${compForName}사진원본`, shoot.fileId);
        subs.push("사진원본");
      }
      if (wantVideo) {
        await relayMkdir(`${mmdd}${compForName}영상원본`, shoot.fileId);
        subs.push("영상원본");
      }
      let linkNote = "";
      try {
        await saveShootFolderLink(r.id, { ...r, date_key: dateKey }, folderName, shoot);
        linkNote = shoot.webLink ? " · 링크저장" : " · ⚠️딥링크 계산 실패(상위 폴더로 열림)";
      } catch (e) {
        linkNote = ` · ⚠️링크저장 실패(${e.message})`;
      }
      okCount++;
      console.log(`✅ ${label} → ${folderName} (${shoot.reused ? "기존 재사용" : "새로 생성"}) + ${subs.join("·")}${linkNote}`);
    } catch (e) {
      failures.push(`${label}: ${e.message}`);
    }
  }
  console.log(`\n[daily-folders] 완료 — 성공 ${okCount}/${rows.length}건`);
  if (failures.length) {
    console.log("실패 목록:");
    failures.forEach((f) => console.log(`  ❌ ${f}`));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("[daily-folders] 치명적 오류:", e?.message || e);
  process.exit(1);
});
