/**
 * 작가 페이지: 현장 확인 이미지(사진·서명 PNG) + 네이버웍스 납품 폴더 트리
 */
const {
  derivePlaceSegmentForFolder,
  buildShootFolderName,
  needsPhotoFolder,
  needsVideoFolder,
  isActiveScheduleSource,
  findCompanyDirectoryRow,
} = require("./delivery-drive-logic.cjs");
const { sendSolapiMessage, isValidKoreanMobile } = require("./solapi-logic.cjs");
const { provisionNaverWorksCompanyDirectoryFolder } = require("./company-drive-provision.cjs");
const { randomUUID } = require("crypto");
const path = require("path");
const fs = require("fs");
const { spawnSync } = require("child_process");
const {
  resolveNaverWorksPythonBin,
  naverWorksPythonMissingHint,
} = require("./resolve-naverworks-python.cjs");
const { tryNaverWorksFolderNodeWorker } = require("./naverworks-folder-node-spawn.cjs");

function deliveryDriveSubfolderLinksFromRow(_row) {
  return {
    photo_edit_folder_web_link: "",
    photo_original_folder_web_link: "",
    video_edit_folder_web_link: "",
    video_original_folder_web_link: "",
  };
}

/** 고객·문자용: 네이버웍스 업체 공유 링크만 사용 */
function companyDeliveryShareUrlFromDirectoryRow(dirRow) {
  if (!dirRow || typeof dirRow !== "object") return "";
  return String(dirRow.naver_works_company_share_link || "").trim();
}

/** 네이버웍스: 촬영일 폴더 아래 편집·원본 하위폴더 (이름 규칙은 Google 트리와 동일) */
function ensureShootCompositionSubfoldersNaverSync(shootFolderId, composition) {
  const sf = String(shootFolderId || "").trim();
  if (!sf) {
    throw new Error("shoot_folder_id 가 없습니다.");
  }
  const wantPhoto = needsPhotoFolder(composition);
  const wantVideo = needsVideoFolder(composition);
  if (!wantPhoto && !wantVideo) {
    throw new Error("사진·영상 구성이 없어 납품 폴더를 만들 수 없습니다.");
  }
  const ro = { reuseIfExists: true };
  let photo_folder_id = null;
  let video_folder_id = null;
  let photo_original_folder_id = null;
  let video_original_folder_id = null;
  if (wantPhoto) {
    let x = runNaverWorksDriveFolderScript("사진편집완료", sf, ro);
    if (!x.ok) throw new Error(x.message || "사진편집완료 폴더 생성 실패");
    photo_folder_id = x.fileId;
    x = runNaverWorksDriveFolderScript("사진원본파일", sf, ro);
    if (!x.ok) throw new Error(x.message || "사진원본파일 폴더 생성 실패");
    photo_original_folder_id = x.fileId;
  }
  if (wantVideo) {
    let x = runNaverWorksDriveFolderScript("영상편집완료", sf, ro);
    if (!x.ok) throw new Error(x.message || "영상편집완료 폴더 생성 실패");
    video_folder_id = x.fileId;
    x = runNaverWorksDriveFolderScript("영상원본파일", sf, ro);
    if (!x.ok) throw new Error(x.message || "영상원본파일 폴더 생성 실패");
    video_original_folder_id = x.fileId;
  }
  return {
    photo_folder_id,
    video_folder_id,
    photo_original_folder_id,
    video_original_folder_id,
  };
}

/**
 * Cron·작가「폴더만들기」와 동일한 트리를 네이버웍스에만 생성.
 * @returns {object} DB upsert용 행 (__nwShootShareLink 는 호출부에서 제거 후 저장)
 */
function ensureFolderTreeForScheduleNaver(schedule, directoryRows, existing) {
  const scheduleId = String(schedule.id);
  const shootDate = String(schedule.date_key || "").trim();
  const companyName = String(schedule.company_name || "").trim();
  const companyCode = String(schedule.code || "").trim();
  const composition = String(schedule.composition || "").trim();
  const place = String(schedule.place || "").trim();

  const wantPhoto = needsPhotoFolder(composition);
  const wantVideo = needsVideoFolder(composition);
  if (!wantPhoto && !wantVideo) {
    throw new Error("사진·영상 구성이 없어 납품 폴더를 만들 수 없습니다. 관리자에게 촬영구성을 먼저 등록해주세요.");
  }

  const lookupPhone = pickCustomerPhoneFromDirectory(directoryRows, companyName, companyCode);
  const placeSegment = derivePlaceSegmentForFolder(place);
  const shootFolderName = buildShootFolderName(shootDate, place);
  if (!shootFolderName) {
    throw new Error("촬영일 또는 장소가 없어 네이버웍스 폴더 이름을 만들 수 없습니다.");
  }

  const dirRow = findCompanyDirectoryRow(directoryRows, companyName, companyCode);
  let nwParent = String(dirRow?.naver_works_company_folder_id || "").trim();
  if (!nwParent) nwParent = String(process.env.NAVER_WORKS_DRIVE_PARENT_FILE_ID || "").trim();
  if (!nwParent) {
    throw new Error(
      "해당 업체용 네이버웍스 납품 폴더가 아직 준비되지 않았습니다. company_directory 에 naver_works_company_folder_id 를 등록하거나 서버에 NAVER_WORKS_DRIVE_PARENT_FILE_ID 를 설정한 뒤 다시 시도해 주세요."
    );
  }

  const shootOut = runNaverWorksDriveFolderScript(shootFolderName, nwParent, { reuseIfExists: true });
  if (!shootOut.ok) {
    throw new Error(shootOut.message || "네이버웍스 촬영일 폴더 생성 실패");
  }
  const shootFolderId = String(shootOut.fileId || "").trim();
  if (!shootFolderId) {
    throw new Error("네이버웍스 촬영일 폴더 fileId 를 확인할 수 없습니다.");
  }

  const sub = ensureShootCompositionSubfoldersNaverSync(shootFolderId, composition);
  const companyNaverRoot = String(dirRow?.naver_works_company_folder_id || "").trim() || nwParent;
  const companyShare =
    String(dirRow?.naver_works_company_share_link || "").trim() ||
    String(existing?.company_share_link || "").trim() ||
    String(shootOut.shareLinkUrl || "").trim();

  return {
    schedule_id: scheduleId,
    company_name: companyName,
    company_code: companyCode,
    shoot_date_key: shootDate,
    composition,
    place_segment: placeSegment,
    customer_phone: normalizePhoneFromDirectory(lookupPhone),
    company_folder_id: companyNaverRoot,
    shoot_folder_id: shootFolderId,
    photo_folder_id: sub.photo_folder_id,
    video_folder_id: sub.video_folder_id,
    photo_original_folder_id: sub.photo_original_folder_id,
    video_original_folder_id: sub.video_original_folder_id,
    company_share_link: companyShare,
    delivery_drive_provider: "naver",
    photo_seen_file_ids: existing?.photo_seen_file_ids || [],
    video_seen_file_ids: existing?.video_seen_file_ids || [],
    photo_notified_at: existing?.photo_notified_at || null,
    video_notified_at: existing?.video_notified_at || null,
    folders_created_at: new Date().toISOString(),
    photographer_site_done_at: existing?.photographer_site_done_at || null,
    photographer_site_file_id: existing?.photographer_site_file_id || null,
    photographer_site_signature_url: existing?.photographer_site_signature_url || null,
    photographer_original_upload_notified_at: existing?.photographer_original_upload_notified_at || null,
    __nwShootShareLink: String(shootOut.shareLinkUrl || "").trim(),
  };
}

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim();
}

function getSupabaseServiceHeaders() {
  const url = getSupabaseUrl();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) {
    throw new Error("SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
  }
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
  };
}

async function supabaseJson(path, headers, init = {}) {
  const r = await fetch(`${headers.url}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers.headers, ...init.headers },
    cache: "no-store",
  });
  let body = null;
  try {
    body = await r.json();
  } catch (_) {}
  if (!r.ok) {
    const msg = typeof body?.message === "string" ? body.message : JSON.stringify(body || {});
    throw new Error(`Supabase ${path} (${r.status}): ${msg}`);
  }
  return body;
}

function normalizePhoneFromDirectory(value) {
  const d = String(value || "").replace(/[^\d]/g, "");
  if (!d) return "";
  if (d.startsWith("82") && d.length >= 11) return `0${d.slice(2)}`;
  return d;
}

function pickCustomerPhoneFromDirectory(directoryRows, companyName, companyCode) {
  const name = String(companyName || "").trim();
  const code = String(companyCode || "").trim();
  const rows = Array.isArray(directoryRows) ? directoryRows : [];
  const nameMatches = rows.filter((r) => String(r?.name || "").trim() === name);

  const withPhone = (r) => normalizePhoneFromDirectory(r?.customer_phone);

  if (nameMatches.length === 1) {
    const p = withPhone(nameMatches[0]);
    return p || "";
  }
  if (name && code) {
    const hn = nameMatches.find((r) => String(r?.code || "").trim() === code);
    if (hn) return withPhone(hn) || "";
    const hc = rows.filter((r) => String(r?.code || "").trim() === code);
    if (hc.length === 1) return withPhone(hc[0]) || "";
  }
  return "";
}

async function upsertDeliveryState(headers, row) {
  await supabaseJson("shoot_delivery_drive_state?on_conflict=schedule_id", headers, {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify([row]),
  });
}

/**
 * 원본폴더 컬럼 마이그레이션 전·스키마 불일치로 전체 UPSERT 가 실패할 때 PATCH 로 최소 저장
 */
async function persistShootDeliverySubfolderMerge(headers, scheduleId, next) {
  const sid = String(scheduleId || next?.schedule_id || "").trim();
  if (!sid || !next || typeof next !== "object") return;
  try {
    await upsertDeliveryState(headers, next);
    return;
  } catch (err) {
    console.warn("[persistShootDeliverySubfolderMerge] upsert 실패 → PATCH 폴백", err?.message || err);
  }
  try {
    await patchDeliveryState(headers, sid, {
      photo_folder_id: next.photo_folder_id ?? null,
      video_folder_id: next.video_folder_id ?? null,
    });
  } catch (err) {
    console.warn("[persistShootDeliverySubfolderMerge] photo/video folder PATCH 실패", err?.message || err);
  }
  try {
    await patchDeliveryState(headers, sid, {
      photo_original_folder_id: next.photo_original_folder_id ?? null,
      video_original_folder_id: next.video_original_folder_id ?? null,
    });
  } catch (err) {
    console.warn(
      "[persistShootDeliverySubfolderMerge] 원본폴더 PATCH 실패(마이그레이션 필요할 수 있음)",
      err?.message || err
    );
  }
}

/** schedules.writer_name ↔ writers.name 공백·전각·괄호 별칭 등으로 어긋나도 매칭 */
function normalizeWriterDisplayName(value) {
  let s = String(value ?? "");
  try {
    if (typeof s.normalize === "function") s = s.normalize("NFKC");
  } catch (_) {}
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/\s+/g, " ").trim();
  s = s.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  return s.toLowerCase();
}

function namesMatch(a, b) {
  return normalizeWriterDisplayName(a) === normalizeWriterDisplayName(b);
}

async function verifyWriter(headers, loginId, password) {
  const id = String(loginId || "").trim();
  const pw = String(password || "");
  if (!id || !pw) return null;
  const rows = await supabaseJson(
    `writers?login_id=eq.${encodeURIComponent(id)}&select=name,login_id,password,phone&limit=1`,
    headers
  );
  const w = Array.isArray(rows) ? rows[0] : null;
  if (!w || String(w.password) !== pw) return null;
  return {
    name: String(w.name || "").trim(),
    loginId: String(w.login_id || "").trim(),
    phone: normalizePhoneFromDirectory(w?.phone),
  };
}

async function fetchSchedule(headers, scheduleId) {
  const sid = String(scheduleId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(sid)) return null;
  const rows = await supabaseJson(
    `schedules?id=eq.${encodeURIComponent(sid)}&select=id,company_name,code,writer_name,date_key,place,composition,source&limit=1`,
    headers
  );
  const s = Array.isArray(rows) ? rows[0] : null;
  return s || null;
}

async function fetchDeliveryState(headers, scheduleId) {
  const rows = await supabaseJson(
    `shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(scheduleId)}&select=*&limit=1`,
    headers
  );
  return Array.isArray(rows) ? rows[0] || null : null;
}

/** 클라가 보내는 schedule_id(하이픈 유무 등) 차이 보정 후 첫 매칭 행 */
function shootDeliveryScheduleIdLookupVariants(scheduleId) {
  const raw = String(scheduleId || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  const out = [];
  if (!raw || raw.length > 96) return out;
  const lower = raw.toLowerCase();
  const unhyphen = lower.replace(/-/g, "");
  out.push(raw, lower);
  if (/^[0-9a-f]{32}$/.test(unhyphen)) {
    const dashed = `${unhyphen.slice(0, 8)}-${unhyphen.slice(8, 12)}-${unhyphen.slice(12, 16)}-${unhyphen.slice(16, 20)}-${unhyphen.slice(20, 32)}`;
    out.push(unhyphen, dashed);
  }
  return [...new Set(out)];
}

async function fetchDeliveryStateFirstMatch(headers, scheduleIdCandidate) {
  for (const v of shootDeliveryScheduleIdLookupVariants(scheduleIdCandidate)) {
    const row = await fetchDeliveryState(headers, v);
    if (row) return row;
  }
  return null;
}

async function fetchDirectory(headers) {
  return supabaseJson(
    "company_directory?select=*",
    headers
  );
}

/**
 * 작가 현장확인 완료 시 고객(업체 디렉터리·납품 state) 휴대폰으로 안내 문자.
 * @returns {Promise<{ result: "sent" | "skipped_no_phone" | "send_failed", deferred: boolean, recordAtIso: string | null }>}
 */
async function sendPhotographerSiteConfirmToCustomer({ customerPhone, writerName, writerPhone }) {
  const to = normalizePhoneFromDirectory(customerPhone);
  if (!isValidKoreanMobile(to)) {
    return { result: "skipped_no_phone", deferred: false, recordAtIso: null };
  }
  const name = String(writerName || "").trim() || "작가";
  const wp = normalizePhoneFromDirectory(writerPhone);
  const wpOk = wp && isValidKoreanMobile(wp);
  const text = wpOk
    ? `${name}작가(${wp})현장도착완료 작가가 체크 시 자동발송되는 문자입니다`
    : `${name}작가 현장도착완료 작가가 체크 시 자동발송되는 문자입니다`;
  const sms = await sendSolapiMessage({ to, text: text.trim() });
  if (!sms.ok) {
    console.warn("[photographer-site-sms] 솔라피 발송 실패", sms.message || sms);
    return { result: "send_failed", deferred: false, recordAtIso: null };
  }
  return {
    result: "sent",
    deferred: !!sms.deferredToQuietHoursMorning,
    recordAtIso: sms.recordAtIso || null,
  };
}

/**
 * 현장 확인 전·원본 업로드 전 고객 안내 문자 (작가 수동 버튼)
 * @param {{ writerLoginId: string, writerPassword: string, scheduleId: string, kind: 'pre_site'|'pre_original' }} opts
 */
async function notifyPhotographerPreCustomerSms({ writerLoginId, writerPassword, scheduleId, kind }) {
  const k = String(kind || "").trim().toLowerCase();
  if (k !== "pre_site" && k !== "pre_original") {
    return { ok: false, status: 400, message: "kind는 pre_site 또는 pre_original 입니다." };
  }
  const headers = getSupabaseServiceHeaders();
  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) {
    return { ok: false, status: 401, message: "작가 로그인 정보가 올바르지 않습니다." };
  }
  const schedule = await fetchSchedule(headers, scheduleId);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }
  if (!namesMatch(schedule.writer_name, writer.name)) {
    return { ok: false, status: 403, message: "본인에게 배정된 스케줄만 처리할 수 있습니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  const lookupPhone = normalizePhoneFromDirectory(
    pickCustomerPhoneFromDirectory(
      directoryRows,
      String(schedule.company_name || "").trim(),
      String(schedule.code || "").trim()
    )
  );
  if (!isValidKoreanMobile(lookupPhone)) {
    return {
      ok: false,
      status: 400,
      message: "고객 연락처(디렉터리)가 없거나 형식이 맞지 않아 문자를 보낼 수 없습니다.",
    };
  }

  const companyName = String(schedule.company_name || "").trim() || "고객";
  const dirRow = findCompanyDirectoryRow(
    directoryRows,
    String(schedule.company_name || "").trim(),
    String(schedule.code || "").trim()
  );
  const companyFolderUrl = companyDeliveryShareUrlFromDirectoryRow(dirRow);

  let text = "";
  if (k === "pre_site") {
    text = [
      `${writer.name} 작가입니다.`,
      `${companyName} 촬영 일정 안내입니다.`,
      `촬영일·장소·현장 확인 일정을 참고해 주시기 바랍니다.`,
      `(작가 페이지에서 보내는 현장 확인 전 안내 문자입니다.)`,
    ].join("\n");
  } else {
    if (!companyFolderUrl) {
      return {
        ok: false,
        status: 400,
        message:
          "업체 납품 폴더 공유 주소가 아직 없습니다. 관리자 납품 폴더 연동 후 다시 시도하거나 새로고침해 주세요.",
      };
    }
    text = [
      `${writer.name} 작가입니다.`,
      `원본 파일은 아래 업체 납품 폴더에 올려 주시기 바랍니다.`,
      companyFolderUrl,
      `폴더 안에서 촬영일·사진원본·사진편집 등 구분에 맞는 위치를 이용해 주세요.`,
      `(작가 페이지에서 보내는 원본 업로드 전 안내 문자입니다.)`,
    ].join("\n");
  }

  const sms = await sendSolapiMessage({ to: lookupPhone, text: text.trim() });
  if (!sms.ok) {
    return { ok: false, status: 502, message: typeof sms.message === "string" ? sms.message : "문자 발송 실패" };
  }
  return {
    ok: true,
    kind: k,
    notice_sms: "sent",
    sms_deferred_quiet_hours: !!sms.deferredToQuietHoursMorning,
    sms_scheduled_iso: sms.scheduledDate || null,
  };
}

/**
 * 현장 확인 완료 후 — 네이버웍스에 업체 하위·촬영일·편집/원본 폴더 생성
 */
async function ensurePhotographerDriveFolders({ writerLoginId, writerPassword, scheduleId }) {
  const headers = getSupabaseServiceHeaders();
  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) {
    return { ok: false, status: 401, message: "작가 로그인 정보가 올바르지 않습니다." };
  }
  const schedule = await fetchSchedule(headers, scheduleId);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }
  if (!namesMatch(schedule.writer_name, writer.name)) {
    return { ok: false, status: 403, message: "본인에게 배정된 스케줄만 처리할 수 있습니다." };
  }

  const wantPhoto = needsPhotoFolder(schedule.composition);
  const wantVideo = needsVideoFolder(schedule.composition);
  if (!wantPhoto && !wantVideo) {
    return { ok: false, status: 400, message: "촬영구성에 사진·영상이 없으면 납품 폴더를 만들 수 없습니다." };
  }

  let st = await fetchDeliveryState(headers, scheduleId);
  const directoryRows = await fetchDirectory(headers);
  let built;
  try {
    built = ensureFolderTreeForScheduleNaver(schedule, directoryRows, st || {});
  } catch (err) {
    return { ok: false, status: 502, message: typeof err?.message === "string" ? err.message : String(err || "실패") };
  }
  const shootShareExtra = String(built.__nwShootShareLink || "").trim();
  const { __nwShootShareLink, ...persistRow } = built;
  await upsertDeliveryState(headers, persistRow);
  const mergedSt = await mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, persistRow);
  const stOut = mergedSt || persistRow;
  const companyShow = String(stOut.company_share_link || "").trim();
  const shootShow = shootShareExtra || companyShow;

  return {
    ok: true,
    data: {
      shoot_folder_web_link: shootShow,
      company_folder_web_link: companyShow,
      ...deliveryDriveSubfolderLinksFromRow(stOut),
    },
  };
}

function resolveCreateFolderPyPathPhotographer() {
  const tries = [path.join(__dirname, "..", "create_folder.py"), path.join(process.cwd(), "create_folder.py")];
  for (const p of tries) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {
      //
    }
  }
  return "";
}

function parseCreateFolderPyStdoutPhotographer(rawOut) {
  const t = String(rawOut || "").trim();
  if (!t) return null;
  try {
    return JSON.parse(t);
  } catch (_) {
    return null;
  }
}

function resolveNaverWorksScriptPath() {
  const tries = [
    path.join(__dirname, "..", "scripts", "naverworks_drive_create_folder.py"),
    path.join(process.cwd(), "scripts", "naverworks_drive_create_folder.py"),
  ];
  for (const p of tries) {
    try {
      if (fs.existsSync(p)) return p;
    } catch (_) {
      //
    }
  }
  return tries[0];
}

/** 네이버웍스 폴더: 루트 create_folder.py 우선(공유 링크·공용 sharedrives 동일 처리), 없으면 scripts/naverworks_drive_create_folder.py
 * @param {{ reuseIfExists?: boolean }} [opts]
 */
function runNaverWorksDriveFolderScript(folderName, parentFileId, opts = {}) {
  const reuse = Boolean(opts && opts.reuseIfExists);
  const extraArgs = reuse ? ["--reuse-if-exists"] : [];
  const createPy = resolveCreateFolderPyPathPhotographer();
  const pid = String(parentFileId || "").trim();
  const fname = String(folderName || "").trim();
  const bin = resolveNaverWorksPythonBin();

  const nodeTry = tryNaverWorksFolderNodeWorker({
    folderName: fname,
    parentFileId: pid,
    reuseIfExists: reuse,
  });
  if (nodeTry) return nodeTry;

  if (createPy) {
    const repoRoot = path.dirname(createPy);
    const r = spawnSync(bin, [createPy, "--folder-name", fname, "--parent-file-id", pid, ...extraArgs], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
      env: process.env,
      cwd: repoRoot,
    });
    if (r.error) {
      const code = r.error.code;
      if (code === "ENOENT") {
        const fb = tryNaverWorksFolderNodeWorker(
          { folderName: fname, parentFileId: pid, reuseIfExists: reuse },
          { force: true }
        );
        if (fb) return fb;
        return { ok: false, message: naverWorksPythonMissingHint() };
      }
      return { ok: false, message: r.error.message || String(r.error) };
    }
    const stderr = typeof r.stderr === "string" ? r.stderr.trim() : "";
    const rawOut = typeof r.stdout === "string" ? r.stdout.trim() : "";
    const parsed = parseCreateFolderPyStdoutPhotographer(rawOut);
    if (!parsed || typeof parsed !== "object") {
      return { ok: false, message: stderr || rawOut.slice(0, 500) || "create_folder.py JSON 파싱 실패" };
    }
    const fid = String(parsed.folderId || parsed.fileId || "").trim();
    const sl = parsed.shareLinkUrl != null ? String(parsed.shareLinkUrl).trim() : "";
    if (fid) {
      return { ok: true, fileId: fid, shareLinkUrl: sl || undefined, response: parsed };
    }
    return { ok: false, message: String(parsed.message || stderr || "네이버웍스 폴더 생성 실패"), response: parsed };
  }

  const script = resolveNaverWorksScriptPath();
  if (!fs.existsSync(script)) {
    return { ok: false, message: `네이버웍스 스크립트를 찾을 수 없습니다: ${script}` };
  }
  const repoRoot = path.join(path.dirname(script), "..");
  const r = spawnSync(bin, [script, "--folder-name", fname, "--parent-file-id", pid, ...extraArgs], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: process.env,
    cwd: repoRoot,
  });
  if (r.error) {
    const code = r.error.code;
    if (code === "ENOENT") {
      const fb = tryNaverWorksFolderNodeWorker(
        { folderName: fname, parentFileId: pid, reuseIfExists: reuse },
        { force: true }
      );
      if (fb) return fb;
      return { ok: false, message: naverWorksPythonMissingHint() };
    }
    return { ok: false, message: r.error.message || String(r.error) };
  }
  const stderr = typeof r.stderr === "string" ? r.stderr.trim() : "";
  const rawOut = typeof r.stdout === "string" ? r.stdout.trim() : "";
  if (!rawOut) {
    return {
      ok: false,
      message: stderr || `네이버웍스 스크립트가 출력을 만들지 않았습니다 (exit ${r.status}).`,
    };
  }
  let parsed;
  try {
    parsed = JSON.parse(rawOut.split("\n").filter(Boolean).pop() || "{}");
  } catch (_) {
    return { ok: false, message: stderr || rawOut.slice(0, 500) };
  }
  if (!parsed || typeof parsed !== "object") {
    return { ok: false, message: "스크립트 응답 JSON을 해석할 수 없습니다." };
  }
  if (parsed.ok) return parsed;
  return { ok: false, message: String(parsed.message || "네이버웍스 폴더 생성 실패"), response: parsed.response };
}

/**
 * 네이버웍스(NAVER WORKS) Drive — 동일 촬영일 폴더 이름 규칙으로 상위 폴더 아래 생성 (Python JWT).
 * 부모: 업체 루트(naver_works_company_folder_id) 우선, 없으면 NAVER_WORKS_DRIVE_PARENT_FILE_ID(공통).
 */
async function createNaverWorksFolderForPhotographer({ writerLoginId, writerPassword, scheduleId }) {
  const headers = getSupabaseServiceHeaders();
  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) {
    return { ok: false, status: 401, message: "작가 로그인 정보가 올바르지 않습니다." };
  }
  const schedule = await fetchSchedule(headers, scheduleId);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }
  if (!namesMatch(schedule.writer_name, writer.name)) {
    return { ok: false, status: 403, message: "본인에게 배정된 스케줄만 처리할 수 있습니다." };
  }
  const directoryRows = await fetchDirectory(headers);
  const dirRow = findCompanyDirectoryRow(
    directoryRows,
    String(schedule.company_name || "").trim(),
    String(schedule.code || "").trim()
  );
  let parentFileId = String(dirRow?.naver_works_company_folder_id || "").trim();
  if (!parentFileId) {
    parentFileId = String(process.env.NAVER_WORKS_DRIVE_PARENT_FILE_ID || "").trim();
  }
  if (!parentFileId) {
    return {
      ok: false,
      status: 500,
      message:
        "네이버웍스 상위 폴더가 없습니다. 맥에서 전체 업체 폴더 생성(npm run delivery:provision-company-all-naver) 후 다시 시도하거나, 공통 NAVER_WORKS_DRIVE_PARENT_FILE_ID 를 서버에 설정하세요.",
    };
  }
  const shootDate = String(schedule.date_key || "").trim();
  const place = String(schedule.place || "").trim();
  const folderName = buildShootFolderName(shootDate, place);
  if (!folderName) {
    return { ok: false, status: 400, message: "촬영일 또는 장소가 없어 네이버웍스 폴더 이름을 만들 수 없습니다." };
  }

  const out = runNaverWorksDriveFolderScript(folderName, parentFileId, { reuseIfExists: true });
  if (!out.ok) {
    return { ok: false, status: 502, message: out.message || "네이버웍스 연동 실패" };
  }
  return {
    ok: true,
    data: {
      folderName,
      fileId: out.fileId || "",
      shareLinkUrl: out.shareLinkUrl || "",
      naverWorksResponse: out.response || null,
    },
  };
}

function rowNeedsSubfolderHeal(row, composition) {
  const comp = String(composition || "").trim();
  const wf = needsPhotoFolder(comp);
  const wv = needsVideoFolder(comp);
  if (!row?.shoot_folder_id) return false;
  if (wf && (!row.photo_folder_id || !row.photo_original_folder_id)) return true;
  if (wv && (!row.video_folder_id || !row.video_original_folder_id)) return true;
  return false;
}

async function mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, row) {
  if (!row?.shoot_folder_id) return row;
  if (!rowNeedsSubfolderHeal(row, schedule.composition)) return row;
  const composition = String(schedule.composition || "").trim();
  let sub;
  try {
    sub = ensureShootCompositionSubfoldersNaverSync(row.shoot_folder_id, composition);
  } catch (e) {
    console.warn("[mergeShootCompositionSubfoldersIntoRowNaver]", e?.message || e);
    return row;
  }
  const next = {
    ...row,
    photo_folder_id: sub.photo_folder_id,
    video_folder_id: sub.video_folder_id,
    photo_original_folder_id: sub.photo_original_folder_id,
    video_original_folder_id: sub.video_original_folder_id,
  };
  const changed =
    row.photo_folder_id !== next.photo_folder_id ||
    row.video_folder_id !== next.video_folder_id ||
    row.photo_original_folder_id !== next.photo_original_folder_id ||
    row.video_original_folder_id !== next.video_original_folder_id;
  if (changed) {
    await persistShootDeliverySubfolderMerge(headers, schedule.id, next);
    return next;
  }
  return next;
}

/**
 * 원본 업로드 완료 문자: 고객에게는 **이 일수 이내 다운로드**를 안내함.
 * (구 예전 설정으로 Google Drive 원본폴더 정리 크론이 켜져 있을 경우에 한해 `delivery-drive-run`에서 별도 정리 가능.)
 */
const CUSTOMER_ORIGINAL_DOWNLOAD_ADVISORY_DAYS = 30;

/**
 * 작가 페이지·관리자: 원본 업로드 완료 고객 안내 문자
 * @returns {Promise<{ result: "sent" | "skipped_no_phone" | "send_failed", deferred: boolean, recordAtIso: string | null }>}
 */
async function sendPhotographerOriginalUploadSmsToCustomer({
  customerPhone,
  writerName,
  companyDisplayName,
  folderUrl,
}) {
  const advisoryDays = CUSTOMER_ORIGINAL_DOWNLOAD_ADVISORY_DAYS;
  const to = normalizePhoneFromDirectory(customerPhone);
  if (!isValidKoreanMobile(to)) return { result: "skipped_no_phone", deferred: false, recordAtIso: null };
  const wn = String(writerName || "").trim() || "작가";
  const cn = String(companyDisplayName || "").trim() || "고객";
  const link = String(folderUrl || "").trim();
  const head = `${wn}작가님이 ${cn} 촬영 원본 파일을 업로드 완료하였습니다.`;
  const mid =
    link && /^https?:\/\//i.test(link)
      ? `해당 파일은 아래 폴더 주소에서 확인하실 수 있습니다.\n${link}`
      : "해당 파일은 업체 공유 폴더에서 확인하실 수 있습니다.";
  const tail = "촬영본 편집이 완료되면 안내 문자를 추가로 보내드립니다.";
  const editAndFolderNote =
    link && /^https?:\/\//i.test(link)
      ? "편집본 또한 위 링크를 통해 확인하실 수 있습니다."
      : "편집본 또한 동일 업체 공유 폴더에서 확인하실 수 있습니다.";
  const retentionNote = [
    `이 폴더는 ${cn} 폴더로 계속 사용될 예정입니다.`,
    `촬영 원본은 용량 이슈로 정리될 수 있어, ${advisoryDays}일 이내 다운로드를 권장드립니다.`,
  ].join(" ");
  const text = [head, mid, tail, [editAndFolderNote, retentionNote].join("\n")].join("\n\n").trim();
  const sms = await sendSolapiMessage({ to, text });
  if (!sms.ok) {
    console.warn("[photographer-original-upload-sms] 솔라피 실패", sms.message || sms);
    return { result: "send_failed", deferred: false, recordAtIso: null };
  }
  return {
    result: "sent",
    deferred: !!sms.deferredToQuietHoursMorning,
    recordAtIso: sms.recordAtIso || null,
  };
}

/**
 * @returns {{ ok: true, data: object } | { ok: false, status: number, message: string }}
 */
async function notifyPhotographerOriginalUploadComplete({ writerLoginId, writerPassword, scheduleId }) {
  const headers = getSupabaseServiceHeaders();
  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) {
    return { ok: false, status: 401, message: "작가 로그인 정보가 올바르지 않습니다." };
  }
  const schedule = await fetchSchedule(headers, scheduleId);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }
  if (!namesMatch(schedule.writer_name, writer.name)) {
    return { ok: false, status: 403, message: "본인에게 배정된 스케줄만 처리할 수 있습니다." };
  }
  let row = await fetchDeliveryState(headers, schedule.id);
  if (row?.photographer_original_upload_notified_at) {
    return { ok: false, status: 409, message: "이미 원본 업로드 완료로 처리된 건입니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  const companyName = String(schedule.company_name || "").trim();
  const companyCode = String(schedule.code || "").trim();
  const dirRow = findCompanyDirectoryRow(directoryRows, companyName, companyCode);

  if (row?.shoot_folder_id) {
    row = await mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, row);
  }

  const folderUrlFromRow = String(row?.company_share_link || "").trim();
  const folderUrlFromDir = companyDeliveryShareUrlFromDirectoryRow(dirRow);
  const folderUrl = folderUrlFromRow || folderUrlFromDir;

  const lookupPhoneDir = normalizePhoneFromDirectory(
    pickCustomerPhoneFromDirectory(directoryRows, companyName, companyCode)
  );
  const customerSmsTo = normalizePhoneFromDirectory(row?.customer_phone) || lookupPhoneDir;
  // 원본 업로드 시 고객 문자 발송 제거 — 업로드 완료 시각만 기록.
  // (편집 완료 안내는 사진·영상 모두 끝났을 때 대시보드에서 1통 발송.)
  const smsOut = {
    customer_original_upload_notice_sms: "skipped_disabled",
    smsDeferredQuietHours: false,
    recordAtIso: null,
  };

  const { customer_original_upload_notice_sms, smsDeferredQuietHours } = smsOut;

  const doneAt = new Date().toISOString();
  const nextPhone = customerSmsTo || row?.customer_phone;
  if (row) {
    const merged = {
      ...row,
      photographer_original_upload_notified_at: doneAt,
      company_share_link: String(folderUrl || row.company_share_link || "").trim() || row.company_share_link,
      customer_phone: nextPhone,
    };
    if (!merged.company_folder_id) {
      const nwId = String(dirRow?.naver_works_company_folder_id || "").trim();
      merged.company_folder_id = nwId || merged.company_folder_id;
    }
    await upsertDeliveryState(headers, merged);
  } else {
    const place = String(schedule.place || "").trim();
    await upsertDeliveryState(headers, {
      schedule_id: String(schedule.id),
      company_name: companyName,
      company_code: companyCode,
      shoot_date_key: String(schedule.date_key || "").trim(),
      composition: String(schedule.composition || "").trim(),
      place_segment: derivePlaceSegmentForFolder(place),
      customer_phone: nextPhone || "",
      company_folder_id: String(dirRow?.naver_works_company_folder_id || "").trim() || null,
      delivery_drive_provider: folderUrl ? "naver" : "",
      shoot_folder_id: null,
      photo_folder_id: null,
      video_folder_id: null,
      photo_original_folder_id: null,
      video_original_folder_id: null,
      company_share_link: folderUrl || null,
      photo_seen_file_ids: [],
      video_seen_file_ids: [],
      photographer_site_done_at: null,
      photographer_site_file_id: null,
      photographer_site_signature_url: null,
      photographer_original_upload_notified_at: doneAt,
    });
  }

  return {
    ok: true,
    data: {
      photographer_original_upload_notified_at: doneAt,
      customer_original_upload_notice_sms,
      sms_deferred_quiet_hours: smsDeferredQuietHours,
      company_folder_web_link: folderUrl || "",
    },
  };
}

/**
 * 메인 보드 관리자: 「원」수동 완료 — 납품 URL·문자 없이도 `photographer_original_upload_notified_at` 기록
 * @returns {{ ok: true, data: object } | { ok: false, status: number, message: string }}
 */
async function markPhotographerOriginalUploadManualAsAdmin({ scheduleId }) {
  const raw = String(scheduleId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(raw)) {
    return { ok: false, status: 400, message: "스케줄 ID가 올바르지 않습니다." };
  }
  const headers = getSupabaseServiceHeaders();
  const schedule = await fetchSchedule(headers, raw);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }
  const canonSid = String(schedule.id || "").trim();
  let row = await fetchDeliveryState(headers, canonSid);
  if (String(row?.photographer_original_upload_notified_at || "").trim()) {
    return { ok: false, status: 409, message: "이미 원본 업로드 완료로 표시된 건입니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  const companyName = String(schedule.company_name || "").trim();
  const companyCode = String(schedule.code || "").trim();
  const dirRow = findCompanyDirectoryRow(directoryRows, companyName, companyCode);
  const folderUrlFromDir = companyDeliveryShareUrlFromDirectoryRow(dirRow);
  const folderUrlRow = row ? String(row.company_share_link || "").trim() : "";
  const folderUrlMerged = folderUrlRow || folderUrlFromDir || "";
  const doneAt = new Date().toISOString();
  const lookupPhoneDir = normalizePhoneFromDirectory(pickCustomerPhoneFromDirectory(directoryRows, companyName, companyCode));
  const nextPhone = normalizePhoneFromDirectory(row?.customer_phone) || lookupPhoneDir || "";

  if (row) {
    const merged = {
      ...row,
      photographer_original_upload_notified_at: doneAt,
      company_share_link: folderUrlMerged || String(row.company_share_link || "").trim() || "",
    };
    if (!merged.company_folder_id) {
      const nwId = String(dirRow?.naver_works_company_folder_id || "").trim();
      merged.company_folder_id = nwId || merged.company_folder_id;
    }
    if (folderUrlMerged && !String(merged.delivery_drive_provider || "").trim()) merged.delivery_drive_provider = "naver";
    merged.customer_phone = nextPhone || merged.customer_phone || "";
    await upsertDeliveryState(headers, merged);
  } else {
    const place = String(schedule.place || "").trim();
    await upsertDeliveryState(headers, {
      schedule_id: canonSid,
      company_name: companyName,
      company_code: companyCode,
      shoot_date_key: String(schedule.date_key || "").trim(),
      composition: String(schedule.composition || "").trim(),
      place_segment: derivePlaceSegmentForFolder(place),
      customer_phone: nextPhone,
      company_folder_id: String(dirRow?.naver_works_company_folder_id || "").trim() || null,
      delivery_drive_provider: folderUrlMerged ? "naver" : "",
      shoot_folder_id: null,
      photo_folder_id: null,
      video_folder_id: null,
      photo_original_folder_id: null,
      video_original_folder_id: null,
      company_share_link: folderUrlMerged || null,
      photo_seen_file_ids: [],
      video_seen_file_ids: [],
      photographer_site_done_at: null,
      photographer_site_file_id: null,
      photographer_site_signature_url: null,
      photographer_original_upload_notified_at: doneAt,
    });
  }

  return { ok: true, data: { photographer_original_upload_notified_at: doneAt } };
}

function patchDeliveryState(headers, scheduleId, patch) {
  return supabaseJson(`shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(scheduleId)}`, headers, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

/**
 * 대시보드 「납품 완료 로그」행 되돌리기 — 해당 완료 시각만 DB 에서 제거(스케줄 대기 목록에 다시 표시).
 * @param {{ scheduleId: string, kind: "photo"|"video"|"site"|"original" }} input
 */
async function revertDashboardDeliveryLogEventAsAdmin(input) {
  const sidInput = String(input?.scheduleId || "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
  if (
    !sidInput ||
    sidInput.length > 96 ||
    /[\s"'<>\\/%]/.test(sidInput)
  ) {
    return { ok: false, status: 400, message: "스케줄 ID가 유효하지 않습니다." };
  }
  const looksUuidish =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sidInput) ||
    /^[0-9a-f]{32}$/i.test(sidInput.replace(/-/g, ""));
  if (!looksUuidish) {
    return { ok: false, status: 400, message: "스케줄 ID가 유효하지 않습니다." };
  }
  const kRaw = String(input?.kind || "").trim().toLowerCase();
  const allowed = new Set(["photo", "video", "site", "original"]);
  if (!allowed.has(kRaw)) {
    return { ok: false, status: 400, message: "되돌릴 항목 종류가 올바르지 않습니다." };
  }
  /** @type {{ url: string, headers: Record<string, string> }} */
  let headers;
  try {
    headers = getSupabaseServiceHeaders();
  } catch (err) {
    return { ok: false, status: 500, message: err?.message || "서버 설정 오류입니다." };
  }
  const row = await fetchDeliveryStateFirstMatch(headers, sidInput);
  if (!row) {
    return { ok: false, status: 404, message: "납품 상태 행을 찾을 수 없습니다." };
  }
  const sid = String(row.schedule_id || "").trim() || sidInput;

  /** @type {Record<string, unknown>} */
  let patch = {};
  if (kRaw === "photo") {
    if (!row.photo_notified_at) return { ok: true, data: { cleared: false, kind: kRaw } };
    patch = { photo_notified_at: null };
  } else if (kRaw === "video") {
    if (!row.video_notified_at) return { ok: true, data: { cleared: false, kind: kRaw } };
    patch = { video_notified_at: null };
  } else if (kRaw === "site") {
    if (!row.photographer_site_done_at) return { ok: true, data: { cleared: false, kind: kRaw } };
    patch = {
      photographer_site_done_at: null,
      photographer_site_file_id: null,
      photographer_site_signature_url: null,
    };
  } else if (kRaw === "original") {
    if (!row.photographer_original_upload_notified_at) {
      return { ok: true, data: { cleared: false, kind: kRaw } };
    }
    patch = { photographer_original_upload_notified_at: null };
  }

  await patchDeliveryState(headers, sid, patch);
  return { ok: true, data: { cleared: true, kind: kRaw } };
}

/**
 * PATCH 는 대상 행이 없으면 0건이어도 오류 없이 넘어갈 수 있음 → 현장 확인 시각 등이 DB에 안 남는 경우 발생.
 * photographer_site_done_at 을 패치할 때 반영 검증 후, 없으면 fullRow 와 패치를 합쳐 UPSERT.
 */
async function patchDeliveryStateWithUpsertFallback(headers, scheduleId, patch, fullRowForUpsert) {
  await patchDeliveryState(headers, scheduleId, patch);
  let after = await fetchDeliveryState(headers, scheduleId);
  const patchingDone =
    patch && typeof patch === "object" && String(patch.photographer_site_done_at || "").trim() !== "";
  if (!patchingDone) return after;
  if (after && String(after.photographer_site_done_at || "").trim() !== "") return after;
  const base =
    fullRowForUpsert && typeof fullRowForUpsert === "object" ? { ...fullRowForUpsert } : {};
  delete base.created_at;
  delete base.updated_at;
  const merged = {
    ...base,
    schedule_id: String(scheduleId),
    ...patch,
  };
  console.warn(
    "[shoot-delivery] photographer_site_done_at PATCH 미반영 → UPSERT 재시도",
    String(scheduleId).slice(0, 8)
  );
  await upsertDeliveryState(headers, merged);
  after = await fetchDeliveryState(headers, scheduleId);
  return after;
}

/** 작가 현장 확인 이미지 → Supabase Storage (공개 버킷, Drive quota 무관) */
function extShootSignatureFromMime(mimeType) {
  const m = String(mimeType || "").toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  return ".png";
}

async function uploadShootSignatureToSupabaseStorage(scheduleId, buffer, mimeType) {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!base || !key) return null;
  const bucket = "shoot-site-signatures";
  const sid = String(scheduleId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(sid) || !Buffer.isBuffer(buffer) || buffer.length === 0) return null;

  const ext = extShootSignatureFromMime(mimeType);
  const ct =
    ext === ".jpg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
  const stamp = Date.now();
  const fileLeaf = `site_confirm_${stamp}${ext}`;
  const pathSegmentsEncoded = `${encodeURIComponent(sid)}/${encodeURIComponent(fileLeaf)}`;

  const putUrl = `${base}/storage/v1/object/${bucket}/${pathSegmentsEncoded}`;
  const res = await fetch(putUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": ct,
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.warn("[shoot-storage] 업로드 실패", res.status, txt.slice(0, 400));
    return null;
  }
  return `${base}/storage/v1/object/public/${bucket}/${pathSegmentsEncoded}`;
}

/** shoot_delivery_drive_state 행이 없을 때 현장확인 UPSERT용 최소 행(업체 디렉터리 링크 반영) */
function buildMinimalShootDeliveryState(schedule, directoryRows) {
  const companyName = String(schedule.company_name || "").trim();
  const companyCode = String(schedule.code || "").trim();
  const place = String(schedule.place || "").trim();
  const dirRow = findCompanyDirectoryRow(directoryRows, companyName, companyCode);
  const nwId = String(dirRow?.naver_works_company_folder_id || "").trim();
  const companyFolderId = nwId || null;
  const companyShare = companyDeliveryShareUrlFromDirectoryRow(dirRow) || "";
  const phone = normalizePhoneFromDirectory(
    pickCustomerPhoneFromDirectory(directoryRows, companyName, companyCode)
  );
  return {
    schedule_id: String(schedule.id),
    company_name: companyName,
    company_code: companyCode,
    shoot_date_key: String(schedule.date_key || "").trim(),
    composition: String(schedule.composition || "").trim(),
    place_segment: derivePlaceSegmentForFolder(place),
    customer_phone: phone,
    company_folder_id: companyFolderId,
    shoot_folder_id: null,
    photo_folder_id: null,
    video_folder_id: null,
    photo_original_folder_id: null,
    video_original_folder_id: null,
    company_share_link: companyShare || null,
    delivery_drive_provider: nwId ? "naver" : "naver",
    photo_seen_file_ids: [],
    video_seen_file_ids: [],
  };
}

/**
 * @returns {{ ok: true, data: object } | { ok: false, status: number, message: string }}
 */
async function completePhotographerShoot({
  writerLoginId,
  writerPassword,
  scheduleId,
  fileBuffer,
  mimeType,
  omitSiteConfirmationImage = false,
}) {
  const headers = getSupabaseServiceHeaders();

  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) {
    return { ok: false, status: 401, message: "작가 로그인 정보가 올바르지 않습니다." };
  }

  const schedule = await fetchSchedule(headers, scheduleId);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }

  if (!namesMatch(schedule.writer_name, writer.name)) {
    return { ok: false, status: 403, message: "본인에게 배정된 스케줄만 완료할 수 있습니다." };
  }

  const skipImage = Boolean(omitSiteConfirmationImage);
  const buf = fileBuffer;
  if (!skipImage) {
    if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) {
      return { ok: false, status: 400, message: "현장 확인 이미지 파일이 필요합니다." };
    }
    if (buf.length > 12 * 1024 * 1024) {
      return { ok: false, status: 400, message: "파일 크기는 12MB 이하여야 합니다." };
    }
    const mt = String(mimeType || "").toLowerCase();
    if (mt && !mt.startsWith("image/")) {
      return { ok: false, status: 400, message: "이미지 파일만 첨부할 수 있습니다." };
    }
  }

  let existing = await fetchDeliveryState(headers, schedule.id);
  if (existing?.photographer_site_done_at) {
    return { ok: false, status: 409, message: "이미 현장 확인 처리된 건입니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  let row = existing;
  if (!row) {
    row = buildMinimalShootDeliveryState(schedule, directoryRows);
  }

  const dirRowForShare = findCompanyDirectoryRow(
    directoryRows,
    String(schedule.company_name || "").trim(),
    String(schedule.code || "").trim()
  );
  const shareFromDirectory = companyDeliveryShareUrlFromDirectoryRow(dirRowForShare);

  let signaturePublicUrl = null;
  let fileId = null;
  if (!skipImage) {
    const mt = String(mimeType || "").toLowerCase();
    /** Supabase Storage에 먼저 올림 — 현장확인에서는 Drive 폴더를 새로 만들지 않음 */
    try {
      signaturePublicUrl = await uploadShootSignatureToSupabaseStorage(String(schedule.id), buf, mt);
    } catch (err) {
      console.warn("[completePhotographerShoot] Storage 업로드 실패", err?.message || err);
    }

    if (!signaturePublicUrl) {
      if (row?.shoot_folder_id) {
        try {
          row = await mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, row);
        } catch (mergeErr) {
          console.warn("[completePhotographerShoot] 네이버 하위폴더 동기 생략", mergeErr?.message || mergeErr);
        }
      }
      console.warn(
        "[completePhotographerShoot] 현장 확인 이미지는 Supabase Storage 업로드를 권장합니다. 업로드 실패 시 「폴더만들기」 후 재시도하세요."
      );
    }
  }

  const doneAt = new Date().toISOString();
  const shareForPatch =
    String(row?.company_share_link || "").trim() ||
    shareFromDirectory ||
    "";

  const patchRow = {
    photographer_site_done_at: doneAt,
    company_share_link: shareForPatch,
  };
  if (signaturePublicUrl) {
    patchRow.photographer_site_signature_url = signaturePublicUrl;
    patchRow.photographer_site_file_id = null;
  } else if (fileId) {
    patchRow.photographer_site_file_id = fileId;
  }

  let rowForResponse = await patchDeliveryStateWithUpsertFallback(
    headers,
    String(schedule.id),
    patchRow,
    row
  );
  if (!rowForResponse?.photographer_site_done_at) {
    return {
      ok: false,
      status: 500,
      message:
        "현장 확인 상태를 서버(DB)에 저장하지 못했습니다. 다른 기기에서도 보이려면 저장이 필요합니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.",
    };
  }
  rowForResponse = {
    ...row,
    ...rowForResponse,
    photo_folder_id: rowForResponse.photo_folder_id || row.photo_folder_id,
    video_folder_id: rowForResponse.video_folder_id || row.video_folder_id,
    photo_original_folder_id: rowForResponse.photo_original_folder_id || row.photo_original_folder_id,
    video_original_folder_id: rowForResponse.video_original_folder_id || row.video_original_folder_id,
    company_share_link: rowForResponse.company_share_link || row.company_share_link,
  };

  const lookupPhoneDir = normalizePhoneFromDirectory(
    pickCustomerPhoneFromDirectory(
      directoryRows,
      String(schedule.company_name || "").trim(),
      String(schedule.code || "").trim()
    )
  );
  const customerSmsTo =
    normalizePhoneFromDirectory(rowForResponse.customer_phone || row.customer_phone) || lookupPhoneDir;
  let customer_site_notice_sms = "skipped_no_phone";
  let customer_site_notice_sms_deferred = false;
  try {
    const siteSms = await sendPhotographerSiteConfirmToCustomer({
      customerPhone: customerSmsTo,
      writerName: writer.name,
      writerPhone: writer.phone,
    });
    customer_site_notice_sms = siteSms.result;
    customer_site_notice_sms_deferred = !!siteSms.deferred;
  } catch (err) {
    console.warn("[photographer-site-sms]", err?.message || err);
    customer_site_notice_sms = "send_failed";
    customer_site_notice_sms_deferred = false;
  }

  const companyWL =
    String(rowForResponse?.company_share_link || "").trim() ||
    shareFromDirectory ||
    "";
  const shootWL = companyWL;

  return {
    ok: true,
    data: {
      photographer_site_done_at: doneAt,
      site_photo_file_id: fileId,
      site_photo_storage_url: signaturePublicUrl,
      company_folder_web_link: companyWL,
      shoot_folder_web_link: shootWL,
      ...deliveryDriveSubfolderLinksFromRow(rowForResponse),
      /** 이미지가 Storage·Drive 어디에도 없이 완료만 된 경우(true) — 생략·quota 등 */
      drive_upload_skipped: !signaturePublicUrl && !fileId,
      omit_site_confirmation: skipImage,
      /** 고객 안내 문자: sent | skipped_no_phone | send_failed */
      customer_site_notice_sms,
      sms_deferred_quiet_hours: customer_site_notice_sms_deferred,
    },
  };
}

/** @typedef {{ shoot_folder_web_link: string, company_folder_web_link: string, photo_edit_folder_web_link: string, photo_original_folder_web_link: string, video_edit_folder_web_link: string, video_original_folder_web_link: string, photographer_original_upload_notified_at: string|null }} PhotographerShootDeliveryInfo */

/**
 * 현장 확인 완료 스케줄 id 목록 + Drive 링크(작가 UI용)
 */
async function listPhotographerShootPanel({ writerLoginId, writerPassword, scheduleIds }) {
  const headers = getSupabaseServiceHeaders();
  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) {
    return { doneScheduleIds: [], deliveryByScheduleId: {} };
  }

  const ids = Array.isArray(scheduleIds) ? scheduleIds.map((x) => String(x || "").trim()).filter(Boolean) : [];
  const doneScheduleIds = [];
  /** @type {Record<string, PhotographerShootDeliveryInfo>} */
  const deliveryByScheduleId = {};

  /** ensureFolderTree 를 위해 (루프당 fetch 방지) */
  let directoryRowsForHeal = null;
  const getDirectoryRowsCached = async () => {
    if (!directoryRowsForHeal) directoryRowsForHeal = await fetchDirectory(headers);
    return directoryRowsForHeal;
  };

  for (const raw of ids) {
    const sid = String(raw || "").trim().toLowerCase();
    if (!/^[0-9a-f-]{36}$/.test(sid)) continue;
    const schedule = await fetchSchedule(headers, sid);
    if (!schedule || !isActiveScheduleSource(schedule.source)) continue;
    if (!namesMatch(schedule.writer_name, writer.name)) continue;
    let st = await fetchDeliveryState(headers, sid);
    if (!st) continue;

    if (st.photographer_site_done_at) {
      doneScheduleIds.push(sid);
      try {
        const directoryRows = await getDirectoryRowsCached();
        const dirRow = findCompanyDirectoryRow(
          directoryRows,
          String(schedule.company_name || "").trim(),
          String(schedule.code || "").trim()
        );
        const lacksCompany = !String(st.company_folder_id || "").trim();
        const lacksShoot = !String(st.shoot_folder_id || "").trim();
        const naverHeal =
          Boolean(String(dirRow?.naver_works_company_folder_id || "").trim()) ||
          Boolean(String(process.env.NAVER_WORKS_DRIVE_PARENT_FILE_ID || "").trim());
        const nwCompany = String(dirRow?.naver_works_company_folder_id || "").trim();

        if (naverHeal) {
          const isNaverStored = String(st.delivery_drive_provider || "").toLowerCase() === "naver";
          const companyMismatchNaver = Boolean(
            nwCompany && String(st.company_folder_id || "").trim() && String(st.company_folder_id) !== nwCompany
          );
          const needsNaverTree =
            lacksCompany ||
            lacksShoot ||
            !verifyStoredShootFolderMatchesScheduleNaver(st, schedule) ||
            (isNaverStored && companyMismatchNaver);
          if (needsNaverTree) {
            try {
              const built = ensureFolderTreeForScheduleNaver(schedule, directoryRows, st);
              const { __nwShootShareLink, ...persistRow } = built;
              st = persistRow;
              await upsertDeliveryState(headers, st);
            } catch (eN) {
              console.warn("[listPhotographerShootPanel] 네이버 폴더 트리", sid, eN?.message || eN);
            }
          }
          if (rowNeedsSubfolderHeal(st, schedule.composition)) {
            st = await mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, st);
          }
        } else {
          console.warn(
            "[listPhotographerShootPanel] 네이버웍스 업체 폴더 또는 NAVER_WORKS_DRIVE_PARENT_FILE_ID 없음 → 링크 복구 스킵",
            sid,
            schedule.company_name
          );
        }
      } catch (err) {
        console.warn("[listPhotographerShootPanel] Drive 링크 복구/하위폴더", sid, err?.message || err);
      }
    } else {
      try {
        if (st.shoot_folder_id && rowNeedsSubfolderHeal(st, schedule.composition)) {
          st = await mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, st);
        }
      } catch (err) {
        console.warn("[listPhotographerShootPanel] 현장확인 전 납품 폴더 동기", sid, err?.message || err);
      }
    }

    const companyW = String(st.company_share_link || "").trim();
    const shootW = companyW;

    deliveryByScheduleId[sid] = {
      shoot_folder_web_link: shootW,
      company_folder_web_link: companyW,
      ...deliveryDriveSubfolderLinksFromRow(st),
      photographer_original_upload_notified_at:
        typeof st?.photographer_original_upload_notified_at === "string"
          ? st.photographer_original_upload_notified_at
          : null,
    };
  }

  return { doneScheduleIds, deliveryByScheduleId };
}

async function listPhotographerShootDone(opts) {
  const { doneScheduleIds } = await listPhotographerShootPanel(opts);
  return doneScheduleIds;
}

async function completeShootSiteAsAdmin({ scheduleId, fileBuffer, mimeType, skipFolderProvisioning }) {
  const headers = getSupabaseServiceHeaders();

  const sid = String(scheduleId || "").trim();
  const schedule = await fetchSchedule(headers, sid);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }

  const wantPhoto = needsPhotoFolder(schedule.composition);
  const wantVideo = needsVideoFolder(schedule.composition);

  let existing = await fetchDeliveryState(headers, schedule.id);
  if (existing?.photographer_site_done_at) {
    return { ok: false, status: 409, message: "이미 현장 확인 처리된 건입니다." };
  }

  let row = existing || {};

  // skipFolderProvisioning=true: 폴더 자동 생성 skip (전체스케줄 대시보드의 「촬영완료」 버튼 전용)
  // — Naver Works token refresh 실패 등으로 차단되지 않도록 폴더 작업을 모두 우회한다.
  if (!skipFolderProvisioning) {
    if (!wantPhoto && !wantVideo) {
      return { ok: false, status: 400, message: "촬영구성에 사진 또는 영상이 없으면 납품 폴더를 만들 수 없습니다." };
    }
    const directoryRows = await fetchDirectory(headers);
    if (!row.shoot_folder_id) {
      let built;
      try {
        built = ensureFolderTreeForScheduleNaver(schedule, directoryRows, existing || {});
      } catch (e) {
        return { ok: false, status: 502, message: typeof e?.message === "string" ? e.message : String(e || "실패") };
      }
      const { __nwShootShareLink, ...persistRow } = built;
      await upsertDeliveryState(headers, persistRow);
      row = persistRow;
    }
    row = await mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, row);
  }

  let signaturePublicUrl = null;
  let fileId = existing?.photographer_site_file_id || null;
  const buf = fileBuffer;

  if (buf && Buffer.isBuffer(buf) && buf.length > 0) {
    if (buf.length > 12 * 1024 * 1024) {
      return { ok: false, status: 400, message: "파일 크기는 12MB 이하여야 합니다." };
    }
    const mt = String(mimeType || "").toLowerCase();
    if (mt && !mt.startsWith("image/")) {
      return { ok: false, status: 400, message: "이미지 파일만 첨부할 수 있습니다." };
    }

    try {
      signaturePublicUrl = await uploadShootSignatureToSupabaseStorage(String(schedule.id), buf, mt);
    } catch (err) {
      console.warn("[completeShootSiteAsAdmin] Storage 업로드 실패", err?.message || err);
    }

    if (!signaturePublicUrl) {
      console.warn("[completeShootSiteAsAdmin] 현장 이미지는 Supabase Storage 업로드만 지원합니다.");
    } else {
      fileId = null;
    }
  }

  const doneAt = new Date().toISOString();
  const companyLink = String(row.company_share_link || "").trim();
  const patch = {
    photographer_site_done_at: doneAt,
    company_share_link: companyLink,
  };
  if (signaturePublicUrl) {
    patch.photographer_site_signature_url = signaturePublicUrl;
    patch.photographer_site_file_id = null;
  } else if (fileId) {
    patch.photographer_site_file_id = fileId;
  }

  const verified = await patchDeliveryStateWithUpsertFallback(headers, String(schedule.id), patch, row);
  if (!verified?.photographer_site_done_at) {
    return {
      ok: false,
      status: 500,
      message:
        "현장 확인 상태를 서버(DB)에 저장하지 못했습니다. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.",
    };
  }

  const hadImageAttempt = !!(buf && Buffer.isBuffer(buf) && buf.length > 0);

  return {
    ok: true,
    data: {
      photographer_site_done_at: doneAt,
      site_photo_file_id: signaturePublicUrl ? null : fileId,
      site_photo_storage_url: signaturePublicUrl,
      company_folder_web_link: companyLink,
      drive_upload_skipped: hadImageAttempt && !signaturePublicUrl && !fileId,
    },
  };
}

function deriveCompanyLoginIdBase(displayName) {
  let s = String(displayName || "").trim();
  try {
    if (typeof s.normalize === "function") s = s.normalize("NFKC");
  } catch (_) {}
  s = s.replace(/\([^)]*\)/g, "");
  s = s.replace(/디자인/gi, "").replace(/인테리어/gi, "");
  s = s.replace(/\s+/g, "").trim();
  return s || "업체";
}

// 자동 생성된 테스트 패턴만 차단 (실제 업체명과 충돌 안 나게 좁게).
// 잘못된 매칭이 의심되면 여기 패턴을 살펴보고 빼면 됨.
const TEST_COMPANY_NAME_PATTERNS = [
  /^QA업체\d*$/i, // QA업체, QA업체1773157303241
  /^E2E_COMPANY_\d+$/i, // E2E_COMPANY_501856
  /^테스트업체\d*$/i, // 테스트업체, 테스트업체56293587
  /^테스트\d*$/i, // 테스트, 테스트2, 테스트71
  /^test\d*$/i, // test, test123
  /^1234$/, // 1234 exactly
];

function isTestPatternCompanyName(name) {
  const s = String(name || "").trim();
  if (!s) return false;
  return TEST_COMPANY_NAME_PATTERNS.some((re) => re.test(s));
}

async function isCompanyLoginIdTakenByOther(headers, loginId, excludeDirectoryId) {
  const id = String(loginId || "").trim();
  if (!id) return true;
  const rows = await supabaseJson(
    `company_directory?login_id=eq.${encodeURIComponent(id)}&select=id&limit=10`,
    headers
  );
  const arr = Array.isArray(rows) ? rows : [];
  const ex = String(excludeDirectoryId || "").trim();
  if (!ex) return arr.length > 0;
  return arr.some((r) => String(r?.id || "").trim() !== ex);
}

async function allocateUniqueLoginIdForNewCompany(headers, base) {
  let candidate = base;
  for (let i = 0; i < 48; i++) {
    if (!(await isCompanyLoginIdTakenByOther(headers, candidate, null))) return candidate;
    const suffix = randomUUID().replace(/-/g, "").slice(0, 8);
    candidate = `${base}_${suffix}`;
  }
  throw new Error("업체 로그인 아이디를 만들 수 없습니다. 잠시 후 다시 시도해 주세요.");
}

async function allocateUniqueLoginIdForExistingCompany(headers, base, directoryId) {
  const idPart = String(directoryId || "").replace(/-/g, "").slice(0, 12);
  let candidate = base;
  if (!(await isCompanyLoginIdTakenByOther(headers, candidate, directoryId))) return candidate;
  candidate = `${base}_${idPart}`;
  if (!(await isCompanyLoginIdTakenByOther(headers, candidate, directoryId))) return candidate;
  return allocateUniqueLoginIdForNewCompany(headers, base);
}

/**
 * 업체 디렉터리에 Drive 루트가 없으면 생성. 행이 없으면 INSERT, 로그인 없으면 아이디·비번(1234) 부여.
 * @returns {Promise<{ ok: true, data: object } | { ok: false, status: number, message: string }>}
 */
async function provisionPhotographerCompanyDeliveryFolder({ writerLoginId, writerPassword, scheduleId }) {
  const headers = getSupabaseServiceHeaders();
  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) {
    return { ok: false, status: 401, message: "작가 로그인 정보가 올바르지 않습니다." };
  }
  const schedule = await fetchSchedule(headers, scheduleId);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }
  if (!namesMatch(schedule.writer_name, writer.name)) {
    return { ok: false, status: 403, message: "본인에게 배정된 스케줄만 처리할 수 있습니다." };
  }

  const companyName = String(schedule.company_name || "").trim();
  const companyCode = String(schedule.code || "").trim();
  let directoryRows = await fetchDirectory(headers);
  let dirRow = findCompanyDirectoryRow(directoryRows, companyName, companyCode);

  if (!dirRow) {
    if (isTestPatternCompanyName(companyName)) {
      return {
        ok: false,
        status: 400,
        message: `테스트 패턴 업체명("${companyName}")은 자동 등록되지 않습니다. 운영용 업체명으로 스케줄을 정리해 주세요.`,
      };
    }
    const base = deriveCompanyLoginIdBase(companyName);
    const loginId = await allocateUniqueLoginIdForNewCompany(headers, base);
    const inserted = await supabaseJson("company_directory?select=*", headers, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        name: companyName,
        code: companyCode,
        phone: "",
        login_id: loginId,
        password: "1234",
        site_type: "inlog",
        customer_phone: "",
      }),
    });
    const row = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!row?.id) {
      return { ok: false, status: 500, message: "업체 정보를 등록했으나 응답을 확인하지 못했습니다." };
    }
    dirRow = row;
  } else {
    const noLogin = !String(dirRow.login_id || "").trim() || !String(dirRow.password || "").trim();
    if (noLogin) {
      const base = deriveCompanyLoginIdBase(companyName || dirRow.name);
      const loginId = await allocateUniqueLoginIdForExistingCompany(headers, base, dirRow.id);
      await supabaseJson(`company_directory?id=eq.${encodeURIComponent(dirRow.id)}`, headers, {
        method: "PATCH",
        body: JSON.stringify({ login_id: loginId, password: "1234" }),
      });
      dirRow = { ...dirRow, login_id: loginId, password: "1234" };
    }
  }

  const refreshed = await supabaseJson(
    `company_directory?id=eq.${encodeURIComponent(dirRow.id)}&select=*&limit=1`,
    headers
  );
  dirRow = Array.isArray(refreshed) ? refreshed[0] : refreshed;
  if (!dirRow?.id) {
    return { ok: false, status: 500, message: "업체 디렉터리를 다시 불러오지 못했습니다." };
  }

  const naverFidEarly = String(dirRow.naver_works_company_folder_id || "").trim();
  const naverLinkEarly = String(dirRow.naver_works_company_share_link || "").trim();
  if (naverLinkEarly) {
    return {
      ok: true,
      data: {
        shareLink: naverLinkEarly,
        createdFolder: false,
        loginId: String(dirRow.login_id || "").trim() || null,
        deliveryProvider: "naver",
      },
    };
  }

  const naverParent = String(
    process.env.NAVER_WORKS_DRIVE_PARENT_FILE_ID || process.env.NAVER_WORKS_PARENT_FILE_ID || ""
  ).trim();
  if (naverParent) {
    try {
      const out = await provisionNaverWorksCompanyDirectoryFolder({
        supabaseHeaders: { url: headers.url, headers: headers.headers },
        directoryRow: dirRow,
      });
      return {
        ok: true,
        data: {
          shareLink: out.shareLink,
          createdFolder: out.createdFolder,
          loginId: String(dirRow.login_id || "").trim() || null,
          deliveryProvider: "naver",
        },
      };
    } catch (e) {
      const msg = typeof e?.message === "string" ? e.message : "네이버웍스 납품 폴더를 만들지 못했습니다.";
      return { ok: false, status: 500, message: msg };
    }
  }

  return {
    ok: false,
    status: 500,
    message:
      "네이버웍스 업체 폴더를 준비할 수 없습니다. 서버 NAVER_WORKS_DRIVE_PARENT_FILE_ID·클라이언트 설정을 확인해 주세요.",
  };
}

function verifyStoredShootFolderMatchesScheduleNaver(st, schedule) {
  const fid = String(st?.shoot_folder_id || "").trim();
  if (!fid) return false;
  if (String(st.delivery_drive_provider || "").toLowerCase() !== "naver") return false;
  const sk = String(st.shoot_date_key || "").trim();
  const pk = String(st.place_segment || "").trim();
  const expSk = String(schedule.date_key || "").trim();
  const expPk = derivePlaceSegmentForFolder(schedule.place);
  return sk === expSk && pk === expPk;
}

/**
 * 관리자 메인보드: 해당 스케줄 납품(네이버웍스) 현장 폴더가 없으면 생성·DB 반영.
 * DB 에 shoot_folder_id 가 있어도 일정·장소와 맞을 때만 "이미 있음" 처리.
 */
async function ensureShootDriveFoldersAsAdmin({ scheduleId }) {
  const headers = getSupabaseServiceHeaders();
  const sid = String(scheduleId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(sid)) {
    return { ok: false, status: 400, message: "스케줄 식별자가 올바르지 않습니다." };
  }
  const schedule = await fetchSchedule(headers, sid);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }
  const wantPhoto = needsPhotoFolder(schedule.composition);
  const wantVideo = needsVideoFolder(schedule.composition);
  if (!wantPhoto && !wantVideo) {
    return { ok: false, status: 400, message: "촬영구성에 사진·영상이 없으면 납품 폴더를 만들 수 없습니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  let st = await fetchDeliveryState(headers, sid);

  if (st && String(st.shoot_folder_id || "").trim()) {
    if (verifyStoredShootFolderMatchesScheduleNaver(st, schedule)) {
      const company = String(st.company_share_link || "").trim() || "";
      return {
        ok: true,
        data: {
          alreadyExists: true,
          shoot_folder_web_link: company,
          company_folder_web_link: company,
          ...deliveryDriveSubfolderLinksFromRow(st),
        },
      };
    }
  }

  let built;
  try {
    built = ensureFolderTreeForScheduleNaver(schedule, directoryRows, st || {});
  } catch (e) {
    return { ok: false, status: 502, message: typeof e?.message === "string" ? e.message : String(e || "실패") };
  }
  const shootShareExtra = String(built.__nwShootShareLink || "").trim();
  const { __nwShootShareLink, ...persistRow } = built;
  await upsertDeliveryState(headers, persistRow);
  const merged = await mergeShootCompositionSubfoldersIntoRowNaver(headers, schedule, persistRow);
  const stOut = merged || persistRow;
  const companyShow = String(stOut.company_share_link || "").trim() || "";

  return {
    ok: true,
    data: {
      alreadyExists: false,
      shoot_folder_web_link: shootShareExtra || companyShow,
      company_folder_web_link: companyShow,
      ...deliveryDriveSubfolderLinksFromRow(stOut),
    },
  };
}

module.exports = {
  completePhotographerShoot,
  listPhotographerShootDone,
  listPhotographerShootPanel,
  notifyPhotographerOriginalUploadComplete,
  notifyPhotographerPreCustomerSms,
  ensurePhotographerDriveFolders,
  createNaverWorksFolderForPhotographer,
  provisionPhotographerCompanyDeliveryFolder,
  completeShootSiteAsAdmin,
  ensureShootDriveFoldersAsAdmin,
  ensureFolderTreeForScheduleNaver,
  mergeShootCompositionSubfoldersIntoRowNaver,
  markPhotographerOriginalUploadManualAsAdmin,
  revertDashboardDeliveryLogEventAsAdmin,
};
