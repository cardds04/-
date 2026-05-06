/**
 * 작가 페이지: 현장 확인 이미지(사진·서명 PNG) 업로드 + Drive 업체 폴더 트리 생성 + 완료 표시
 */
const {
  derivePlaceSegmentForFolder,
  buildShootFolderName,
  needsPhotoFolder,
  needsVideoFolder,
  isActiveScheduleSource,
  findCompanyDirectoryRow,
} = require("./delivery-drive-logic.cjs");
const {
  getDriveClient,
  getParentFolderId,
  ensureFolder,
  findChildFolderByName,
  setAnyoneReaderLink,
  webViewLinkFromId,
  uploadBufferToFolder,
  isDriveQuotaBypassError,
} = require("./google-drive-delivery.cjs");
const { sendSolapiMessage, isValidKoreanMobile } = require("./solapi-logic.cjs");
const { ensureShootCompositionSubfolders } = require("./shoot-delivery-folder-layout.cjs");
const { provisionCompanyDirectoryFolder } = require("./company-drive-provision.cjs");
const { randomUUID } = require("crypto");

function deliveryDriveSubfolderLinksFromRow(row) {
  const r = row && typeof row === "object" ? row : {};
  return {
    photo_edit_folder_web_link: r.photo_folder_id ? webViewLinkFromId(r.photo_folder_id) : "",
    photo_original_folder_web_link: r.photo_original_folder_id ? webViewLinkFromId(r.photo_original_folder_id) : "",
    video_edit_folder_web_link: r.video_folder_id ? webViewLinkFromId(r.video_folder_id) : "",
    video_original_folder_web_link: r.video_original_folder_id ? webViewLinkFromId(r.video_original_folder_id) : "",
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

async function fetchDirectory(headers) {
  return supabaseJson(
    "company_directory?select=id,name,code,customer_phone,google_drive_company_folder_id,google_drive_company_share_link",
    headers
  );
}

/**
 * 작가 현장확인 완료 시 고객(업체 디렉터리·납품 state) 휴대폰으로 안내 문자.
 * @returns {Promise<'sent'|'skipped_no_phone'|'send_failed'>}
 */
async function sendPhotographerSiteConfirmToCustomer({ customerPhone, writerName, writerPhone }) {
  const to = normalizePhoneFromDirectory(customerPhone);
  if (!isValidKoreanMobile(to)) {
    return "skipped_no_phone";
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
    return "send_failed";
  }
  return "sent";
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
  const companyFolderUrl =
    String(dirRow?.google_drive_company_share_link || "").trim() ||
    (String(dirRow?.google_drive_company_folder_id || "").trim()
      ? webViewLinkFromId(String(dirRow.google_drive_company_folder_id).trim())
      : "");

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
          "업체 납품 폴더(Drive) 주소가 아직 없습니다. 관리자 폴더 연동 후 다시 시도하거나 새로고침해 주세요.",
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
  return { ok: true, kind: k, notice_sms: "sent" };
}

/**
 * 현장 확인 완료 후 — 업체·촬영일 폴더 및 사진·영상 하위 폴더 생성(Drive)
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

  const drive = getDriveClient();
  const parentFolderId = getParentFolderId();
  if (!parentFolderId) {
    return { ok: false, status: 500, message: "Google Drive 부모 폴더가 설정되지 않았습니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  st = await ensureFolderTreeForSchedule(drive, parentFolderId, schedule, directoryRows, st || {});
  await upsertDeliveryState(headers, st);
  st = await mergeShootCompositionSubfoldersIntoRow(drive, headers, schedule, st);

  return {
    ok: true,
    data: {
      shoot_folder_web_link: st.shoot_folder_id ? webViewLinkFromId(st.shoot_folder_id) : "",
      company_folder_web_link:
        String(st.company_share_link || "").trim() ||
        (st.company_folder_id ? webViewLinkFromId(st.company_folder_id) : ""),
      ...deliveryDriveSubfolderLinksFromRow(st),
    },
  };
}

/** Drive 업로드: 현장 확인 이미지는 가능하면 「원본파일」하위 폴더에 저장 */
function siteConfirmDriveParentFolderId(row, composition) {
  const comp = String(composition || "").trim();
  const wantPhoto = needsPhotoFolder(comp);
  const wantVideo = needsVideoFolder(comp);
  if (wantPhoto && row?.photo_original_folder_id) return row.photo_original_folder_id;
  if (wantPhoto && row?.photo_folder_id) return row.photo_folder_id;
  if (!wantPhoto && wantVideo && row?.video_original_folder_id) return row.video_original_folder_id;
  if (wantVideo && row?.video_folder_id) return row.video_folder_id;
  return row?.shoot_folder_id || null;
}

/**
 * Cron 과 동일한 업체·촬영일·장소 폴더 트리. 기존 state 가 있으면 사진/영상 id 등 보존.
 */
async function ensureFolderTreeForSchedule(drive, _parentFolderId, schedule, directoryRows, existing) {
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

  const dirRow = findCompanyDirectoryRow(directoryRows, companyName, companyCode);
  const companyFolderId = String(dirRow?.google_drive_company_folder_id || "").trim();
  if (!companyFolderId) {
    throw new Error(
      "해당 업체용 Google Drive 납품 폴더가 아직 준비되지 않았습니다. 신규 업체 등록 시 자동 생성되거나, 관리자 업체 폴더 생성이 완료된 뒤 다시 시도해 주세요."
    );
  }

  await setAnyoneReaderLink(drive, companyFolderId);

  const shootFolderId = await ensureFolder(drive, companyFolderId, shootFolderName);

  const sub = await ensureShootCompositionSubfolders(drive, shootFolderId, composition);

  const companyShareLink =
    String(dirRow?.google_drive_company_share_link || "").trim() || webViewLinkFromId(companyFolderId);

  return {
    schedule_id: scheduleId,
    company_name: companyName,
    company_code: companyCode,
    shoot_date_key: shootDate,
    composition,
    place_segment: placeSegment,
    customer_phone: normalizePhoneFromDirectory(lookupPhone),
    company_folder_id: companyFolderId,
    shoot_folder_id: shootFolderId,
    photo_folder_id: sub.photo_folder_id,
    video_folder_id: sub.video_folder_id,
    photo_original_folder_id: sub.photo_original_folder_id,
    video_original_folder_id: sub.video_original_folder_id,
    company_share_link: companyShareLink,
    photo_seen_file_ids: existing?.photo_seen_file_ids || [],
    video_seen_file_ids: existing?.video_seen_file_ids || [],
    photo_notified_at: existing?.photo_notified_at || null,
    video_notified_at: existing?.video_notified_at || null,
    folders_created_at: new Date().toISOString(),
    photographer_site_done_at: existing?.photographer_site_done_at || null,
    photographer_site_file_id: existing?.photographer_site_file_id || null,
    photographer_site_signature_url: existing?.photographer_site_signature_url || null,
    photographer_original_upload_notified_at: existing?.photographer_original_upload_notified_at || null,
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

/**
 * 촬영일 폴더 하위를 편집완료·원본 구조로 맞추고 DB에 id 반영
 * @returns {Promise<object>} 갱신된 row (drive state 한 행)
 */
async function mergeShootCompositionSubfoldersIntoRow(drive, headers, schedule, row) {
  if (!row?.shoot_folder_id) return row;
  const composition = String(schedule.composition || "").trim();
  const sub = await ensureShootCompositionSubfolders(drive, row.shoot_folder_id, composition);
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
 * (실제 Google Drive 자동 정리는 `delivery-drive-run` Cron · 기본 DELIVERY_ORIGINAL_RETENTION_DAYS=60 에서 수행.)
 */
const CUSTOMER_ORIGINAL_DOWNLOAD_ADVISORY_DAYS = 30;

/**
 * 작가 페이지·관리자: 원본 업로드 완료 고객 안내 문자
 * @returns {Promise<'sent'|'skipped_no_phone'|'send_failed'>}
 */
async function sendPhotographerOriginalUploadSmsToCustomer({
  customerPhone,
  writerName,
  companyDisplayName,
  folderUrl,
}) {
  const advisoryDays = CUSTOMER_ORIGINAL_DOWNLOAD_ADVISORY_DAYS;
  const to = normalizePhoneFromDirectory(customerPhone);
  if (!isValidKoreanMobile(to)) return "skipped_no_phone";
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
    return "send_failed";
  }
  return "sent";
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
    return { ok: false, status: 409, message: "이미 원본 업로드 완료 문자를 발송한 건입니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  const companyName = String(schedule.company_name || "").trim();
  const companyCode = String(schedule.code || "").trim();
  const dirRow = findCompanyDirectoryRow(directoryRows, companyName, companyCode);

  if (row?.shoot_folder_id) {
    const drive = getDriveClient();
    row = await mergeShootCompositionSubfoldersIntoRow(drive, headers, schedule, row);
  }

  const folderUrlFromRow =
    String(row?.company_share_link || "").trim() ||
    (String(row?.company_folder_id || "").trim()
      ? webViewLinkFromId(String(row.company_folder_id).trim())
      : "");
  const folderUrlFromDir =
    String(dirRow?.google_drive_company_share_link || "").trim() ||
    (String(dirRow?.google_drive_company_folder_id || "").trim()
      ? webViewLinkFromId(String(dirRow.google_drive_company_folder_id).trim())
      : "");
  const folderUrl = folderUrlFromRow || folderUrlFromDir;
  if (!folderUrl) {
    return {
      ok: false,
      status: 400,
      message:
        "업체 납품 폴더(Drive) 주소를 찾을 수 없습니다. company_directory 연동 또는 「폴더만들기」로 폴더를 준비한 뒤 다시 시도해 주세요.",
    };
  }

  const lookupPhoneDir = normalizePhoneFromDirectory(
    pickCustomerPhoneFromDirectory(directoryRows, companyName, companyCode)
  );
  const customerSmsTo = normalizePhoneFromDirectory(row?.customer_phone) || lookupPhoneDir;
  let customer_original_upload_notice_sms = "skipped_no_phone";
  try {
    customer_original_upload_notice_sms = await sendPhotographerOriginalUploadSmsToCustomer({
      customerPhone: customerSmsTo,
      writerName: writer.name,
      companyDisplayName: companyName,
      folderUrl,
    });
  } catch (err) {
    console.warn("[notifyPhotographerOriginalUploadComplete] sms", err?.message || err);
    customer_original_upload_notice_sms = "send_failed";
  }

  if (customer_original_upload_notice_sms === "skipped_no_phone") {
    return {
      ok: false,
      status: 400,
      message:
        "고객 번호가 없거나 형식에 맞지 않아 문자를 보낼 수 없습니다. 업체 디렉터리(customer_phone)를 확인해 주세요.",
      code: "needs_phone",
    };
  }
  if (customer_original_upload_notice_sms === "send_failed") {
    return {
      ok: false,
      status: 502,
      message: "문자 발송에 실패했습니다. 번호 또는 솔라피 설정(SOLAPI_* 환경 변수)을 확인 후 다시 시도해 주세요.",
    };
  }

  const doneAt = new Date().toISOString();
  const nextPhone = customerSmsTo || row?.customer_phone;
  if (row) {
    const merged = {
      ...row,
      photographer_original_upload_notified_at: doneAt,
      company_share_link: folderUrl || row.company_share_link,
      customer_phone: nextPhone,
    };
    if (!merged.company_folder_id && String(dirRow?.google_drive_company_folder_id || "").trim()) {
      merged.company_folder_id = String(dirRow.google_drive_company_folder_id).trim();
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
      company_folder_id: String(dirRow?.google_drive_company_folder_id || "").trim() || null,
      shoot_folder_id: null,
      photo_folder_id: null,
      video_folder_id: null,
      photo_original_folder_id: null,
      video_original_folder_id: null,
      company_share_link: folderUrl,
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
      company_folder_web_link: folderUrl,
    },
  };
}

function extFromMime(mimeType) {
  const m = String(mimeType || "").toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("webp")) return ".webp";
  if (m.includes("heic")) return ".heic";
  if (m.includes("gif")) return ".gif";
  return ".jpg";
}

function patchDeliveryState(headers, scheduleId, patch) {
  return supabaseJson(`shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(scheduleId)}`, headers, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
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

  const drive = getDriveClient();
  const parentFolderId = getParentFolderId();
  if (!parentFolderId) {
    return { ok: false, status: 500, message: "Google Drive 부모 폴더가 설정되지 않았습니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  let row = existing;

  let signaturePublicUrl = null;
  let fileId = null;
  if (!skipImage) {
    const mt = String(mimeType || "").toLowerCase();
    /** Supabase Storage에 먼저 올림 (개인 계정 Drive의 파일 업로드 quota 제약 회피) */
    try {
      signaturePublicUrl = await uploadShootSignatureToSupabaseStorage(String(schedule.id), buf, mt);
    } catch (err) {
      console.warn("[completePhotographerShoot] Storage 업로드 예외 → Drive 업로드 시도", err?.message || err);
    }

    if (!signaturePublicUrl) {
      if (!row?.shoot_folder_id) {
        row = await ensureFolderTreeForSchedule(drive, parentFolderId, schedule, directoryRows, existing);
        await upsertDeliveryState(headers, row);
      }
      row = await mergeShootCompositionSubfoldersIntoRow(drive, headers, schedule, row);
      const uploadParentId = siteConfirmDriveParentFolderId(row, schedule.composition);
      if (!uploadParentId) {
        return { ok: false, status: 500, message: "Drive 업로드용 폴더 정보가 없습니다." };
      }
      const safeBase = `현장확인_${Date.now()}${extFromMime(mimeType || "image/jpeg")}`;
      try {
        fileId = await uploadBufferToFolder(drive, {
          parentId: uploadParentId,
          name: safeBase,
          buffer: buf,
          mimeType: mimeType || "image/jpeg",
        });
        try {
          await setAnyoneReaderLink(drive, fileId);
        } catch (_) {}
      } catch (e) {
        if (!isDriveQuotaBypassError(e)) throw e;
        console.warn(
          "[completePhotographerShoot] Drive 현장 이미지 업로드 건너뜀·현장 확인 시각만 반영"
        );
      }
    }
  }

  const doneAt = new Date().toISOString();
  const patchRow = {
    photographer_site_done_at: doneAt,
    company_share_link: row.company_share_link || webViewLinkFromId(row.company_folder_id),
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
  if (rowNeedsSubfolderHeal(rowForResponse, schedule.composition)) {
    try {
      rowForResponse = await mergeShootCompositionSubfoldersIntoRow(drive, headers, schedule, rowForResponse);
    } catch (err) {
      console.warn("[completePhotographerShoot] 완료 후 하위폴더 재동기 실패", err?.message || err);
    }
  }

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
  try {
    customer_site_notice_sms = await sendPhotographerSiteConfirmToCustomer({
      customerPhone: customerSmsTo,
      writerName: writer.name,
      writerPhone: writer.phone,
    });
  } catch (err) {
    console.warn("[photographer-site-sms]", err?.message || err);
    customer_site_notice_sms = "send_failed";
  }

  return {
    ok: true,
    data: {
      photographer_site_done_at: doneAt,
      site_photo_file_id: fileId,
      site_photo_storage_url: signaturePublicUrl,
      company_folder_web_link:
        rowForResponse.company_share_link || webViewLinkFromId(rowForResponse.company_folder_id),
      shoot_folder_web_link: rowForResponse.shoot_folder_id ? webViewLinkFromId(rowForResponse.shoot_folder_id) : "",
      ...deliveryDriveSubfolderLinksFromRow(rowForResponse),
      /** 이미지가 Storage·Drive 어디에도 없이 완료만 된 경우(true) — 생략·quota 등 */
      drive_upload_skipped: !signaturePublicUrl && !fileId,
      omit_site_confirmation: skipImage,
      /** 고객 안내 문자: sent | skipped_no_phone | send_failed */
      customer_site_notice_sms,
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
        const driveHeal = getDriveClient();
        const parentFolderId = getParentFolderId();
        const lacksCompany = !String(st.company_folder_id || "").trim();
        const lacksShoot = !String(st.shoot_folder_id || "").trim();

        const directoryRows = await getDirectoryRowsCached();
        const dirRow = findCompanyDirectoryRow(
          directoryRows,
          String(schedule.company_name || "").trim(),
          String(schedule.code || "").trim()
        );
        const expectedCompanyId = String(dirRow?.google_drive_company_folder_id || "").trim();
        const currentCompanyId = String(st.company_folder_id || "").trim();
        const companyMismatch = Boolean(
          expectedCompanyId && currentCompanyId && currentCompanyId !== expectedCompanyId
        );
        /**
         * 현장 확인 시각만 있고 폴더 id 가 비었거나, 예전처럼 루트에 만든 업체 id 와 디렉터리가 어긋난 경우
         * 디렉터리에 등록된 업체 폴더 아래로 다시 맞춘다.
         */
        if (parentFolderId && expectedCompanyId && (lacksCompany || lacksShoot || companyMismatch)) {
          st = await ensureFolderTreeForSchedule(driveHeal, parentFolderId, schedule, directoryRows, st);
          try {
            await upsertDeliveryState(headers, st);
          } catch (upErr) {
            console.warn("[listPhotographerShootPanel] 폴더 트리 UPSERT 실패", sid, upErr?.message || upErr);
          }
        } else if (!expectedCompanyId && (lacksCompany || lacksShoot)) {
          console.warn(
            "[listPhotographerShootPanel] company_directory 에 업체 Drive 폴더 id 없음 → 링크 복구 스킵",
            sid,
            schedule.company_name
          );
        } else if (!String(st.shoot_folder_id || "").trim() && String(st.company_folder_id || "").trim()) {
          const shootFolderName = buildShootFolderName(
            String(schedule.date_key || "").trim(),
            String(schedule.place || "").trim()
          );
          if (shootFolderName) {
            const resolvedShoot = await findChildFolderByName(driveHeal, st.company_folder_id, shootFolderName);
            if (resolvedShoot) {
              st = { ...st, shoot_folder_id: resolvedShoot };
              try {
                await patchDeliveryState(headers, sid, { shoot_folder_id: resolvedShoot });
              } catch (pErr) {
                console.warn("[listPhotographerShootPanel] shoot_folder_id DB 반영 실패", sid, pErr?.message || pErr);
              }
            }
          }
        }
        if (rowNeedsSubfolderHeal(st, schedule.composition)) {
          st = await mergeShootCompositionSubfoldersIntoRow(driveHeal, headers, schedule, st);
        }
      } catch (err) {
        console.warn("[listPhotographerShootPanel] Drive 링크 복구/하위폴더", sid, err?.message || err);
      }
    } else {
      try {
        if (st.shoot_folder_id && rowNeedsSubfolderHeal(st, schedule.composition)) {
          const driveHeal = getDriveClient();
          st = await mergeShootCompositionSubfoldersIntoRow(driveHeal, headers, schedule, st);
        }
      } catch (err) {
        console.warn("[listPhotographerShootPanel] 현장확인 전 납품 폴더 동기", sid, err?.message || err);
      }
    }

    deliveryByScheduleId[sid] = {
      shoot_folder_web_link: st.shoot_folder_id ? webViewLinkFromId(st.shoot_folder_id) : "",
      company_folder_web_link:
        String(st.company_share_link || "").trim() ||
        (st.company_folder_id ? webViewLinkFromId(st.company_folder_id) : ""),
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

async function completeShootSiteAsAdmin({ scheduleId, fileBuffer, mimeType }) {
  const headers = getSupabaseServiceHeaders();

  const sid = String(scheduleId || "").trim();
  const schedule = await fetchSchedule(headers, sid);
  if (!schedule || !isActiveScheduleSource(schedule.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }

  const wantPhoto = needsPhotoFolder(schedule.composition);
  const wantVideo = needsVideoFolder(schedule.composition);
  if (!wantPhoto && !wantVideo) {
    return { ok: false, status: 400, message: "촬영구성에 사진 또는 영상이 없으면 Drive 폴더를 만들 수 없습니다." };
  }

  let existing = await fetchDeliveryState(headers, schedule.id);
  if (existing?.photographer_site_done_at) {
    return { ok: false, status: 409, message: "이미 현장 확인 처리된 건입니다." };
  }

  const drive = getDriveClient();
  const parentFolderId = getParentFolderId();
  if (!parentFolderId) {
    return { ok: false, status: 500, message: "Google Drive 부모 폴더가 설정되지 않았습니다." };
  }

  const directoryRows = await fetchDirectory(headers);
  let row = existing;

  if (!row?.shoot_folder_id) {
    row = await ensureFolderTreeForSchedule(drive, parentFolderId, schedule, directoryRows, existing);
    await upsertDeliveryState(headers, row);
  }
  row = await mergeShootCompositionSubfoldersIntoRow(drive, headers, schedule, row);

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
      console.warn("[completeShootSiteAsAdmin] Storage 업로드 예외 → Drive 시도", err?.message || err);
    }

    if (!signaturePublicUrl) {
      const uploadParentId = siteConfirmDriveParentFolderId(row, schedule.composition);
      if (!uploadParentId) {
        return { ok: false, status: 500, message: "Drive 업로드용 폴더 정보가 없습니다." };
      }
      const safeBase = `현장사진_관리자_${Date.now()}${extFromMime(mimeType || "image/jpeg")}`;
      try {
        fileId = await uploadBufferToFolder(drive, {
          parentId: uploadParentId,
          name: safeBase,
          buffer: buf,
          mimeType: mimeType || "image/jpeg",
        });
        try {
          await setAnyoneReaderLink(drive, fileId);
        } catch (_) {}
      } catch (e) {
        if (!isDriveQuotaBypassError(e)) throw e;
        console.warn("[completeShootSiteAsAdmin] Drive 현장 업로드 생략(quota)·완료 시각만 반영");
      }
    } else {
      fileId = null;
    }
  }

  const doneAt = new Date().toISOString();
  const patch = {
    photographer_site_done_at: doneAt,
    company_share_link: row.company_share_link || webViewLinkFromId(row.company_folder_id),
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
      company_folder_web_link: row.company_share_link || webViewLinkFromId(row.company_folder_id),
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

  if (String(dirRow.google_drive_company_folder_id || "").trim()) {
    const link =
      String(dirRow.google_drive_company_share_link || "").trim() ||
      webViewLinkFromId(String(dirRow.google_drive_company_folder_id).trim());
    return {
      ok: true,
      data: {
        shareLink: link,
        createdFolder: false,
        loginId: String(dirRow.login_id || "").trim() || null,
      },
    };
  }

  try {
    const out = await provisionCompanyDirectoryFolder({
      supabaseHeaders: { url: headers.url, headers: headers.headers },
      directoryRow: dirRow,
    });
    return {
      ok: true,
      data: {
        shareLink: out.shareLink,
        createdFolder: out.createdFolder,
        loginId: String(dirRow.login_id || "").trim() || null,
      },
    };
  } catch (e) {
    const msg = typeof e?.message === "string" ? e.message : "Drive 폴더를 만들지 못했습니다.";
    return { ok: false, status: 500, message: msg };
  }
}

/**
 * 관리자 메인보드: 해당 스케줄 촬영일 현장(Drive) 폴더가 없으면 생성·DB 반영.
 * `shoot_delivery_drive_state.shoot_folder_id` 가 이미 있으면 Drive 호출 없이 생략.
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

  let st = await fetchDeliveryState(headers, sid);
  if (st && String(st.shoot_folder_id || "").trim()) {
    return {
      ok: true,
      data: {
        alreadyExists: true,
        shoot_folder_web_link: st.shoot_folder_id ? webViewLinkFromId(st.shoot_folder_id) : "",
        company_folder_web_link:
          String(st.company_share_link || "").trim() ||
          (st.company_folder_id ? webViewLinkFromId(st.company_folder_id) : ""),
        ...deliveryDriveSubfolderLinksFromRow(st),
      },
    };
  }

  const drive = getDriveClient();
  const parentFolderId = getParentFolderId();
  if (!parentFolderId) {
    return { ok: false, status: 500, message: "Google Drive 부모 폴더가 설정되지 않았습니다." };
  }
  const directoryRows = await fetchDirectory(headers);
  st = await ensureFolderTreeForSchedule(drive, parentFolderId, schedule, directoryRows, st || {});
  await upsertDeliveryState(headers, st);
  st = await mergeShootCompositionSubfoldersIntoRow(drive, headers, schedule, st);

  return {
    ok: true,
    data: {
      alreadyExists: false,
      shoot_folder_web_link: st.shoot_folder_id ? webViewLinkFromId(st.shoot_folder_id) : "",
      company_folder_web_link:
        String(st.company_share_link || "").trim() ||
        (st.company_folder_id ? webViewLinkFromId(st.company_folder_id) : ""),
      ...deliveryDriveSubfolderLinksFromRow(st),
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
  provisionPhotographerCompanyDeliveryFolder,
  completeShootSiteAsAdmin,
  ensureShootDriveFoldersAsAdmin,
};
