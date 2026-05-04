/**
 * Supabase 스케줄 + Drive 폴더 + Solapi 문자 오케스트레이션
 */
const { sendSolapiMessage } = require("./solapi-logic.cjs");
const {
  derivePlaceSegmentForFolder,
  buildCompanyRootDisplayName,
  buildShootFolderName,
  shouldCreateFoldersToday,
  needsPhotoFolder,
  needsVideoFolder,
  getKstYmd,
  isActiveScheduleSource,
  isValidKoreanMobile,
} = require("./delivery-drive-logic.cjs");
const {
  getDriveClient,
  getParentFolderId,
  ensureFolder,
  listNonFolderFileIds,
  setAnyoneReaderLink,
  webViewLinkFromId,
} = require("./google-drive-delivery.cjs");

function getSupabaseUrl() {
  return String(process.env.SUPABASE_URL || "").trim();
}

function getSupabaseReadHeaders() {
  const url = getSupabaseUrl();
  const key =
    String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim() ||
    String(process.env.SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) throw new Error("SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY 가 필요합니다.");
  return {
    url,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  };
}

function getSupabaseServiceHeaders() {
  const url = getSupabaseUrl();
  const key = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!url || !key) throw new Error("shoot_delivery_drive_state 저장을 위해 SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
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

async function patchDeliveryState(headers, scheduleId, patch) {
  await supabaseJson(`shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(scheduleId)}`, headers, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal",
    },
    body: JSON.stringify(patch),
  });
}

async function runDeliveryDriveJob(log = console.log.bind(console)) {
  const stats = {
    candidates: 0,
    foldersCreated: 0,
    photoSms: 0,
    videoSms: 0,
    skipped: [],
    errors: [],
  };

  const minShoot = String(process.env.DELIVERY_MIN_SHOOT_DATE || "2026-04-28").trim();
  const maxLag = Math.max(0, parseInt(String(process.env.DELIVERY_FOLDER_MAX_LAG_DAYS || "120"), 10) || 120);
  const todayKst = getKstYmd();

  const readH = getSupabaseReadHeaders();
  const writeH = getSupabaseServiceHeaders();

  let drive = null;
  let parentFolderId = "";
  try {
    drive = getDriveClient();
    parentFolderId = getParentFolderId();
    if (!parentFolderId) throw new Error("GOOGLE_DRIVE_PARENT_FOLDER_ID 가 설정되지 않았습니다.");
  } catch (e) {
    stats.errors.push(String(e.message || e));
    return stats;
  }

  const [schedules, directory, stateRows] = await Promise.all([
    supabaseJson(`schedules?select=id,company_name,code,date_key,place,composition,source&date_key=gte.${encodeURIComponent(
      minShoot
    )}&order=date_key.asc`, readH),
    supabaseJson("company_directory?select=name,code,customer_phone", readH),
    supabaseJson("shoot_delivery_drive_state?select=*", writeH),
  ]);

  const stateById = new Map();
  for (const row of Array.isArray(stateRows) ? stateRows : []) {
    if (row?.schedule_id) stateById.set(String(row.schedule_id), row);
  }

  const scheduleList = (Array.isArray(schedules) ? schedules : []).filter((s) => isActiveScheduleSource(s?.source));
  stats.candidates = scheduleList.length;

  for (const s of scheduleList) {
    const scheduleId = String(s?.id || "").trim();
    const shootDate = String(s?.date_key || "").trim();
    const companyName = String(s?.company_name || "").trim();
    const companyCode = String(s?.code || "").trim();
    const composition = String(s?.composition || "").trim();
    const place = String(s?.place || "").trim();

    if (!scheduleId || !shootDate || !companyName || !composition) continue;
    const wantPhoto = needsPhotoFolder(composition);
    const wantVideo = needsVideoFolder(composition);
    if (!wantPhoto && !wantVideo) continue;

    const lookupPhone = pickCustomerPhoneFromDirectory(directory, companyName, companyCode);
    const placeSegment = derivePlaceSegmentForFolder(place);
    const companyDisplay = buildCompanyRootDisplayName(companyName, companyCode);
    const shootFolderName = buildShootFolderName(shootDate, placeSegment);

    const eligibleFolderDay = shouldCreateFoldersToday({
      shootDateYmd: shootDate,
      todayKstYmd: todayKst,
      maxLagDays: maxLag,
    });

    try {
      let row = stateById.get(scheduleId) || null;

      const needsInitialFolders = eligibleFolderDay && !(row?.folders_created_at && row?.shoot_folder_id);

      if (needsInitialFolders) {
        log(`[delivery] 폴더 생성: ${companyDisplay} / ${shootFolderName}`);

        const companyFolderId = await ensureFolder(drive, parentFolderId, companyDisplay);
        await setAnyoneReaderLink(drive, companyFolderId);

        const shootFolderId = await ensureFolder(drive, companyFolderId, shootFolderName);

        let photoFolderId = null;
        let videoFolderId = null;
        if (wantPhoto) photoFolderId = await ensureFolder(drive, shootFolderId, "사진");
        if (wantVideo) videoFolderId = await ensureFolder(drive, shootFolderId, "영상");

        const companyShareLink = webViewLinkFromId(companyFolderId);

        row = {
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
          photo_seen_file_ids: row?.photo_seen_file_ids || [],
          video_seen_file_ids: row?.video_seen_file_ids || [],
          photo_notified_at: row?.photo_notified_at || null,
          video_notified_at: row?.video_notified_at || null,
          folders_created_at: new Date().toISOString(),
        };

        await upsertDeliveryState(writeH, row);
        stateById.set(scheduleId, row);
        stats.foldersCreated += 1;
      }

      row = stateById.get(scheduleId);
      if (!row?.shoot_folder_id) continue;

      const link =
        row.company_share_link ||
        (row.company_folder_id ? webViewLinkFromId(row.company_folder_id) : "");

      /** @type {string} */
      const phone =
        normalizePhoneFromDirectory(row.customer_phone) || normalizePhoneFromDirectory(lookupPhone);

      // ── 사진 완료 (첫 업로드 1회) ──
      if (wantPhoto && row.photo_folder_id && !row.photo_notified_at) {
        const ids = await listNonFolderFileIds(drive, row.photo_folder_id);
        if (ids.length) await patchDeliveryState(writeH, scheduleId, { photo_seen_file_ids: ids });

        if (ids.length > 0) {
          if (!isValidKoreanMobile(phone)) {
            stats.skipped.push({ schedule_id: scheduleId, kind: "photo", reason: "invalid_phone" });
          } else {
            const text = `[${companyName}] 촬영 사진 편집이 완료되었습니다.\n납품 폴더(업체 폴더): ${link}`;
            const sms = await sendSolapiMessage({
              to: phone,
              text,
              subject: "촬영 사진 납품 안내",
              type: "LMS",
            });
            if (!sms.ok) stats.errors.push(`${scheduleId} photo sms: ${sms.message}`);
            else stats.photoSms += 1;

            const notifiedAt = new Date().toISOString();
            await patchDeliveryState(writeH, scheduleId, {
              photo_notified_at: notifiedAt,
              customer_phone: phone,
              company_share_link: link,
            });
            const merged = stateById.get(scheduleId) || row;
            merged.photo_notified_at = notifiedAt;
            merged.customer_phone = phone;
            merged.company_share_link = link;
            stateById.set(scheduleId, merged);
          }
        }
      }

      row = stateById.get(scheduleId);
      // ── 영상 완료 (첫 업로드 1회) ──
      if (wantVideo && row?.video_folder_id && !row?.video_notified_at) {
        const ids = await listNonFolderFileIds(drive, row.video_folder_id);
        if (ids.length) await patchDeliveryState(writeH, scheduleId, { video_seen_file_ids: ids });

        if (ids.length > 0) {
          const phoneFinal =
            normalizePhoneFromDirectory(row.customer_phone) || normalizePhoneFromDirectory(lookupPhone);
          if (!isValidKoreanMobile(phoneFinal)) {
            stats.skipped.push({ schedule_id: scheduleId, kind: "video", reason: "invalid_phone" });
          } else {
            const text = `[${companyName}] 촬영 영상 편집이 완료되었습니다.\n납품 폴더(업체 폴더): ${link}`;
            const sms = await sendSolapiMessage({
              to: phoneFinal,
              text,
              subject: "촬영 영상 납품 안내",
              type: "LMS",
            });
            if (!sms.ok) stats.errors.push(`${scheduleId} video sms: ${sms.message}`);
            else stats.videoSms += 1;

            const vn = new Date().toISOString();
            await patchDeliveryState(writeH, scheduleId, {
              video_notified_at: vn,
              customer_phone: phoneFinal,
              company_share_link: link,
            });
            const merged = stateById.get(scheduleId) || row;
            merged.video_notified_at = vn;
            merged.customer_phone = phoneFinal;
            merged.company_share_link = link;
            stateById.set(scheduleId, merged);
          }
        }
      }
    } catch (e) {
      stats.errors.push(`${scheduleId}: ${e.message || e}`);
    }
  }

  return stats;
}

module.exports = { runDeliveryDriveJob };
