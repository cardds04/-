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

function parseBackfillShootRange() {
  const from = String(process.env.DELIVERY_BACKFILL_SHOOT_FROM || "").trim();
  const to = String(process.env.DELIVERY_BACKFILL_SHOOT_TO || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return null;
  return { from, to };
}

function minIsoDate(a, b) {
  const x = String(a || "").trim();
  const y = String(b || "").trim();
  if (!y) return x;
  if (!x) return y;
  return x.localeCompare(y) <= 0 ? x : y;
}

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
    backfill_shoot_range: null,
  };

  let minShoot = String(process.env.DELIVERY_MIN_SHOOT_DATE || "2026-04-28").trim();
  const backfillRange = parseBackfillShootRange();
  if (backfillRange) {
    minShoot = minIsoDate(minShoot, backfillRange.from);
    stats.backfill_shoot_range = `${backfillRange.from}..${backfillRange.to}`;
    log(`[delivery] 일회성 촬영일 백필 활성: ${stats.backfill_shoot_range} (촬영 다음날 조건 무시, 취소 제외 건만)`);
  }

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

    /** 기본 끔: 작가 페이지「촬영완료」로 폴더를 만드는 흐름이 우선. `1`로 켜면 기존처럼 촬영 다음날 Cron 이 폴더 생성. */
    const autoNextDayFolders = /^(1|true|yes)$/i.test(
      String(process.env.DELIVERY_AUTO_NEXT_DAY_FOLDERS || "").trim()
    );

    const inBackfillShootRange = Boolean(
      backfillRange && /^\d{4}-\d{2}-\d{2}$/.test(shootDate) && shootDate >= backfillRange.from && shootDate <= backfillRange.to
    );

    try {
      let row = stateById.get(scheduleId) || null;

      const needsInitialFolders =
        ((eligibleFolderDay && autoNextDayFolders) || inBackfillShootRange) &&
        !(row?.folders_created_at && row?.shoot_folder_id);

      if (needsInitialFolders) {
        const backfillMark = inBackfillShootRange && !eligibleFolderDay ? "백필 " : "";
        log(`[delivery] ${backfillMark}폴더 생성: ${companyDisplay} / ${shootFolderName}`);

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
          const skipSms = /^(1|true|yes)$/i.test(String(process.env.DELIVERY_SKIP_SMS || "").trim());
          if (!skipSms && !isValidKoreanMobile(phone)) {
            stats.skipped.push({ schedule_id: scheduleId, kind: "photo", reason: "invalid_phone" });
          } else if (!skipSms) {
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
          const skipSms = /^(1|true|yes)$/i.test(String(process.env.DELIVERY_SKIP_SMS || "").trim());
          const phoneFinal =
            normalizePhoneFromDirectory(row.customer_phone) || normalizePhoneFromDirectory(lookupPhone);
          if (!skipSms && !isValidKoreanMobile(phoneFinal)) {
            stats.skipped.push({ schedule_id: scheduleId, kind: "video", reason: "invalid_phone" });
          } else if (!skipSms) {
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

/**
 * 폴더가 실제로 만들어지기 전, 조건만 계산해 확인용으로 반환 (Drive·문자 없음).
 */
async function previewDeliveryDriveFolders() {
  let minShoot = String(process.env.DELIVERY_MIN_SHOOT_DATE || "2026-04-28").trim();
  const maxLag = Math.max(0, parseInt(String(process.env.DELIVERY_FOLDER_MAX_LAG_DAYS || "120"), 10) || 120);
  const todayKst = getKstYmd();
  const backfillRange = parseBackfillShootRange();
  if (backfillRange) {
    minShoot = minIsoDate(minShoot, backfillRange.from);
  }

  const readH = getSupabaseReadHeaders();
  const writeH = getSupabaseServiceHeaders();

  const [schedules, stateRows] = await Promise.all([
    supabaseJson(
      `schedules?select=id,company_name,code,date_key,place,composition,source&date_key=gte.${encodeURIComponent(minShoot)}&order=date_key.asc`,
      readH
    ),
    supabaseJson("shoot_delivery_drive_state?select=schedule_id,folders_created_at,shoot_folder_id", writeH),
  ]);

  const stateById = new Map();
  for (const row of Array.isArray(stateRows) ? stateRows : []) {
    if (row?.schedule_id) stateById.set(String(row.schedule_id), row);
  }

  const scheduleList = (Array.isArray(schedules) ? schedules : []).filter((s) => isActiveScheduleSource(s?.source));

  const items = [];
  for (const s of scheduleList) {
    const scheduleId = String(s?.id || "").trim();
    const shootDate = String(s?.date_key || "").trim();
    const companyName = String(s?.company_name || "").trim();
    const companyCode = String(s?.code || "").trim();
    const composition = String(s?.composition || "").trim();
    const place = String(s?.place || "").trim();

    const wantPhoto = needsPhotoFolder(composition);
    const wantVideo = needsVideoFolder(composition);
    const placeSegment = derivePlaceSegmentForFolder(place);
    const shootFolderName = buildShootFolderName(shootDate, placeSegment);
    const companyDisplay = buildCompanyRootDisplayName(companyName, companyCode);

    const eligible = shouldCreateFoldersToday({
      shootDateYmd: shootDate,
      todayKstYmd: todayKst,
      maxLagDays: maxLag,
    });

    const inBackfillShootRange = Boolean(
      backfillRange && /^\d{4}-\d{2}-\d{2}$/.test(shootDate) && shootDate >= backfillRange.from && shootDate <= backfillRange.to
    );

    const st = scheduleId ? stateById.get(scheduleId) : null;
    const hasFoldersInDb = Boolean(st?.folders_created_at && st?.shoot_folder_id);

    const allowCreateTimeline = eligible || inBackfillShootRange;

    const wouldCreate =
      allowCreateTimeline &&
      !hasFoldersInDb &&
      Boolean(scheduleId && shootDate && companyName && composition && (wantPhoto || wantVideo));

    let skipReason = "";
    if (!wouldCreate) {
      if (!scheduleId) skipReason = "schedule_id 없음";
      else if (!shootDate) skipReason = "촬영일 없음";
      else if (!companyName) skipReason = "업체명 없음";
      else if (!composition) skipReason = "촬영구성 없음 (자동 폴더 대상 아님)";
      else if (!wantPhoto && !wantVideo) skipReason = "사진·영상 폴더 규칙에 해당 안 함";
      else if (hasFoldersInDb) skipReason = "이미 DB에 폴더 생성 기록 있음";
      else if (!eligible && !inBackfillShootRange)
        skipReason = `촬영 다음날(KST)부터 생성. 오늘=${todayKst}, 촬영일=${shootDate} (또는 ${maxLag}일 상한 초과)`;
      else skipReason = "?";
    }

    items.push({
      schedule_id: scheduleId,
      company_display: companyDisplay,
      shoot_date: shootDate,
      composition,
      shoot_folder_name: shootFolderName,
      today_kst: todayKst,
      eligible_folder_window: eligible,
      in_backfill_shoot_range: inBackfillShootRange,
      folder_already_in_supabase: hasFoldersInDb,
      would_create_on_next_job: wouldCreate,
      skip_reason: wouldCreate ? "" : skipReason || "?",
    });
  }

  const wouldNow = items.filter((i) => i.would_create_on_next_job);
  return {
    today_kst: todayKst,
    min_shoot_date: minShoot,
    max_lag_days: maxLag,
    backfill_shoot_range: backfillRange ? `${backfillRange.from}..${backfillRange.to}` : null,
    active_schedule_count: scheduleList.length,
    would_create_count: wouldNow.length,
    would_create: wouldNow,
    all: items,
  };
}

/**
 * 관리 대시보드에서 수동: 사진 또는 영상 납품 안내 문자 1통 + 해당 notified 시각 기록.
 * Cron·Drive 파일 존재 여부와 무관하게 동작 (운영자가 업로드를 확인했다고 보고 발송).
 * @param {{ scheduleId: string, kind: 'photo'|'video' }} opts
 */
async function sendDashboardDeliverySms({ scheduleId, kind }) {
  const sid = String(scheduleId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(sid)) {
    return { ok: false, status: 400, message: "스케줄 ID가 올바르지 않습니다." };
  }
  const k = String(kind || "").trim().toLowerCase();
  if (k !== "photo" && k !== "video") {
    return { ok: false, status: 400, message: "kind는 photo 또는 video여야 합니다." };
  }

  const readH = getSupabaseReadHeaders();
  const writeH = getSupabaseServiceHeaders();

  const [schedules, directoryRows, stateRows] = await Promise.all([
    supabaseJson(
      `schedules?id=eq.${encodeURIComponent(sid)}&select=id,company_name,code,composition,source&limit=1`,
      readH
    ),
    supabaseJson("company_directory?select=name,code,customer_phone", readH),
    supabaseJson(
      `shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(sid)}&select=*&limit=1`,
      writeH
    ),
  ]);

  const sch = Array.isArray(schedules) ? schedules[0] : null;
  if (!sch || !isActiveScheduleSource(sch?.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }

  const companyName = String(sch.company_name || "").trim();
  const companyCode = String(sch.code || "").trim();
  const composition = String(sch.composition || "").trim();
  const wantPhoto = needsPhotoFolder(composition);
  const wantVideo = needsVideoFolder(composition);

  if (k === "photo" && !wantPhoto) {
    return { ok: false, status: 400, message: "이 스케줄에는 사진 납품 항목이 없습니다." };
  }
  if (k === "video" && !wantVideo) {
    return { ok: false, status: 400, message: "이 스케줄에는 영상 납품 항목이 없습니다." };
  }

  const row = Array.isArray(stateRows) ? stateRows[0] || null : null;
  if (!row) {
    return {
      ok: false,
      status: 400,
      message: "납품 상태가 없습니다. 먼저 현장 완료 등으로 업체 폴더가 연결되어 있어야 합니다.",
    };
  }

  const link =
    String(row.company_share_link || "").trim() ||
    (row.company_folder_id ? webViewLinkFromId(row.company_folder_id) : "");

  if (!link) {
    return { ok: false, status: 400, message: "업체 폴더 링크를 찾을 수 없습니다. Drive 폴더 생성 후 다시 시도하세요." };
  }

  if (k === "photo" && row.photo_notified_at) {
    return { ok: false, status: 409, message: "이미 사진 납품 안내 문자가 발송된 건입니다." };
  }
  if (k === "video" && row.video_notified_at) {
    return { ok: false, status: 409, message: "이미 영상 납품 안내 문자가 발송된 건입니다." };
  }

  const directory = Array.isArray(directoryRows) ? directoryRows : [];
  const lookupPhone = pickCustomerPhoneFromDirectory(directory, companyName, companyCode);
  const phone =
    normalizePhoneFromDirectory(row.customer_phone) || normalizePhoneFromDirectory(lookupPhone);
  if (!isValidKoreanMobile(phone)) {
    return {
      ok: false,
      status: 400,
      message: "유효한 고객 휴대폰 번호가 없습니다. company_directory 또는 납품 상태의 연락처를 확인하세요.",
    };
  }

  const payload =
    k === "photo"
      ? {
          text: `[${companyName}] 촬영 사진 편집이 완료되었습니다.\n납품 폴더(업체 폴더): ${link}`,
          subject: "촬영 사진 납품 안내",
        }
      : {
          text: `[${companyName}] 촬영 영상 편집이 완료되었습니다.\n납품 폴더(업체 폴더): ${link}`,
          subject: "촬영 영상 납품 안내",
        };

  const sms = await sendSolapiMessage({
    to: phone,
    text: payload.text,
    subject: payload.subject,
    type: "LMS",
  });
  if (!sms.ok) {
    return {
      ok: false,
      status: 502,
      message: typeof sms.message === "string" ? sms.message : "문자 발송에 실패했습니다.",
    };
  }

  const notifiedAt = new Date().toISOString();
  const patchBody = {
    customer_phone: phone,
    company_share_link: link,
    ...(k === "photo"
      ? { photo_notified_at: notifiedAt }
      : { video_notified_at: notifiedAt }),
  };
  await patchDeliveryState(writeH, sid, patchBody);

  return {
    ok: true,
    data: {
      kind: k,
      notified_at: notifiedAt,
      photo_notified_at: k === "photo" ? notifiedAt : row.photo_notified_at || null,
      video_notified_at: k === "video" ? notifiedAt : row.video_notified_at || null,
    },
  };
}

module.exports = { runDeliveryDriveJob, previewDeliveryDriveFolders, sendDashboardDeliverySms };
