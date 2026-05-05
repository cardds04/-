/**
 * 작가 페이지: 현장 확인 이미지(사진·서명 PNG) 업로드 + Drive 업체 폴더 트리 생성 + 완료 표시
 */
const {
  derivePlaceSegmentForFolder,
  buildCompanyRootDisplayName,
  buildShootFolderName,
  needsPhotoFolder,
  needsVideoFolder,
  isActiveScheduleSource,
} = require("./delivery-drive-logic.cjs");
const {
  getDriveClient,
  getParentFolderId,
  ensureFolder,
  setAnyoneReaderLink,
  webViewLinkFromId,
  uploadBufferToFolder,
  isDriveQuotaBypassError,
} = require("./google-drive-delivery.cjs");
const { sendSolapiMessage, isValidKoreanMobile } = require("./solapi-logic.cjs");

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

function namesMatch(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
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
  return supabaseJson("company_directory?select=name,code,customer_phone", headers);
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

/** Drive 업로드: 「현장」 폴더는 만들지 않고 기존 사진·영상 납품 폴더(없으면 촬영 루트)에 저장 */
function siteConfirmDriveParentFolderId(row, composition) {
  const comp = String(composition || "").trim();
  const wantPhoto = needsPhotoFolder(comp);
  const wantVideo = needsVideoFolder(comp);
  if (wantPhoto && row?.photo_folder_id) return row.photo_folder_id;
  if (wantVideo && row?.video_folder_id) return row.video_folder_id;
  return row?.shoot_folder_id || null;
}

/**
 * Cron 과 동일한 업체·촬영일·장소 폴더 트리. 기존 state 가 있으면 사진/영상 id 등 보존.
 */
async function ensureFolderTreeForSchedule(drive, parentFolderId, schedule, directoryRows, existing) {
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
  const companyDisplay = buildCompanyRootDisplayName(companyName, companyCode);
  const shootFolderName = buildShootFolderName(shootDate, placeSegment);

  const companyFolderId = await ensureFolder(drive, parentFolderId, companyDisplay);
  await setAnyoneReaderLink(drive, companyFolderId);

  const shootFolderId = await ensureFolder(drive, companyFolderId, shootFolderName);

  let photoFolderId = null;
  let videoFolderId = null;
  if (wantPhoto) photoFolderId = await ensureFolder(drive, shootFolderId, "사진");
  if (wantVideo) videoFolderId = await ensureFolder(drive, shootFolderId, "영상");

  const companyShareLink = webViewLinkFromId(companyFolderId);

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
    photo_folder_id: photoFolderId,
    video_folder_id: videoFolderId,
    company_share_link: companyShareLink,
    photo_seen_file_ids: existing?.photo_seen_file_ids || [],
    video_seen_file_ids: existing?.video_seen_file_ids || [],
    photo_notified_at: existing?.photo_notified_at || null,
    video_notified_at: existing?.video_notified_at || null,
    folders_created_at: new Date().toISOString(),
    photographer_site_done_at: existing?.photographer_site_done_at || null,
    photographer_site_file_id: existing?.photographer_site_file_id || null,
    photographer_site_signature_url: existing?.photographer_site_signature_url || null,
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

  if (!row?.shoot_folder_id) {
    row = await ensureFolderTreeForSchedule(drive, parentFolderId, schedule, directoryRows, existing);
    await upsertDeliveryState(headers, row);
  }

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

  await patchDeliveryState(headers, String(schedule.id), patchRow);

  const lookupPhoneDir = normalizePhoneFromDirectory(
    pickCustomerPhoneFromDirectory(
      directoryRows,
      String(schedule.company_name || "").trim(),
      String(schedule.code || "").trim()
    )
  );
  const customerSmsTo =
    normalizePhoneFromDirectory(row.customer_phone) || lookupPhoneDir;
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
      company_folder_web_link: row.company_share_link || webViewLinkFromId(row.company_folder_id),
      /** 이미지가 Storage·Drive 어디에도 없이 완료만 된 경우(true) — 생략·quota 등 */
      drive_upload_skipped: !signaturePublicUrl && !fileId,
      omit_site_confirmation: skipImage,
      /** 고객 안내 문자: sent | skipped_no_phone | send_failed */
      customer_site_notice_sms,
    },
  };
}

/**
 * @returns {Promise<string[]>} photographer_site_done_at 가 있는 스케줄 id (요청 목록·작가 소유만)
 */
async function listPhotographerShootDone({ writerLoginId, writerPassword, scheduleIds }) {
  const headers = getSupabaseServiceHeaders();
  const writer = await verifyWriter(headers, writerLoginId, writerPassword);
  if (!writer) return [];

  const ids = Array.isArray(scheduleIds) ? scheduleIds.map((x) => String(x || "").trim()).filter(Boolean) : [];
  const out = [];

  for (const sid of ids) {
    if (!/^[0-9a-f-]{36}$/i.test(sid)) continue;
    const schedule = await fetchSchedule(headers, sid);
    if (!schedule || !isActiveScheduleSource(schedule.source)) continue;
    if (!namesMatch(schedule.writer_name, writer.name)) continue;
    const st = await fetchDeliveryState(headers, sid);
    if (st?.photographer_site_done_at) out.push(sid);
  }

  return out;
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

  await patchDeliveryState(headers, String(schedule.id), patch);

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

module.exports = {
  completePhotographerShoot,
  listPhotographerShootDone,
  completeShootSiteAsAdmin,
};
