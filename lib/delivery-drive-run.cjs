/**
 * Supabase 스케줄 + 네이버웍스 납품 폴더 · Solapi 문자 오케스트레이션
 * (편집완료 자동 문자는 과거처럼 Google Drive 파일 존재 감지에 의존하지 않으며, 필요 시 관리 화면 수동 발송을 사용합니다.)
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
  findCompanyDirectoryRow,
} = require("./delivery-drive-logic.cjs");
const {
  ensureFolderTreeForScheduleNaver,
  mergeShootCompositionSubfoldersIntoRowNaver,
} = require("./photographer-shoot-logic.cjs");

function parseBackfillShootRange() {
  const from = String(process.env.DELIVERY_BACKFILL_SHOOT_FROM || "").trim();
  const to = String(process.env.DELIVERY_BACKFILL_SHOOT_TO || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return null;
  return { from, to };
}

/** 백필 창에 들어가도, 미래 촬영일은 초기 폴더 자동 생성 제외(일정만 등록된 상태에서 선생성 방지) */
function isInBackfillShootRangeStrict(backfillRange, shootDateYmd, todayKstYmd) {
  return Boolean(
    backfillRange &&
      /^\d{4}-\d{2}-\d{2}$/.test(shootDateYmd) &&
      shootDateYmd >= backfillRange.from &&
      shootDateYmd <= backfillRange.to &&
      shootDateYmd <= todayKstYmd
  );
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

function pickCompanyDirectoryRow(directoryRows, companyName, companyCode) {
  const name = String(companyName || "").trim();
  const code = String(companyCode || "").trim();
  const rows = Array.isArray(directoryRows) ? directoryRows : [];
  const nameMatches = rows.filter((r) => String(r?.name || "").trim() === name);
  if (nameMatches.length === 1) return nameMatches[0] || null;
  if (name && code) {
    const hn = nameMatches.find((r) => String(r?.code || "").trim() === code);
    if (hn) return hn;
    const hc = rows.filter((r) => String(r?.code || "").trim() === code);
    if (hc.length === 1) return hc[0] || null;
  }
  return null;
}

/** 편집완료 안내 문자에는 Google Drive 공유 URL 을 넣지 않음(Naver Works 로 통일). */
function looksLikeGoogleDriveShareUrl(raw) {
  return /^https?:\/\/(?:drive\.google\.com|docs\.google\.com)\b/i.test(String(raw || "").trim());
}

/**
 * company_directory 의 네이버웍스 공유 링크 우선,
 * 없을 때만 shoot 상태 등 레거시 company_share_link 중 Drive 가 아닌 URL.
 */
function resolveDeliverySmsNaverWorksFolderUrl(directoryRow, stateCompanyShareFallback) {
  const nwFromDir = String(directoryRow?.naver_works_company_share_link || "").trim();
  if (nwFromDir) return nwFromDir;
  const stateLink = String(stateCompanyShareFallback || "").trim();
  if (stateLink && !looksLikeGoogleDriveShareUrl(stateLink)) return stateLink;
  return "";
}

/** company_directory.site_type → 납품 문자 인사에 쓰는 브랜드명 */
function siteTypeToDeliverySmsBrand(siteTypeSlug) {
  const st = String(siteTypeSlug || "").trim().toLowerCase();
  if (st === "shopick") return "쇼픽";
  if (st === "thefeeling") return "더필링";
  return "인로그";
}

function pad2(n) {
  return String(Number(n) || 0).padStart(2, "0");
}

/** YYYY-MM-DD → 편집완료 문자용 MMDD (예: 0429) */
function formatShootDateCompactMmdd(shootDateYmd) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(shootDateYmd || "").trim());
  if (!m) return "";
  return `${pad2(m[2])}${pad2(m[3])}`;
}

/**
 * 사진·영상 납품 편집 완료 안내 문자
 * @param {{ directoryRows?: any[], companyName: string, companyCode: string, kind: 'photo'|'video', shootDateYmd: string, rawPlace?: string, companyFolderUrl?: string }} opts
 * 문자에 넣는 링크는 **업체 루트 공유 URL**만 사용(사진/영상 편집완료 하위폴더 URL 제외).
 *
 * 사진·영상이 모두 완료된 시점에만 1통 보내며 "촬영본 편집완료" 로 통일.
 * (사진만/영상만 업체도 동일 표현.)
 * 형식 예: 「쇼픽알림」 / 「0429현장 촬영본 편집완료」 / URL 단독 줄
 */
function buildDeliveryCompletionSmsText(opts) {
  const directoryRows = opts?.directoryRows || [];
  const companyName = String(opts?.companyName || "").trim();
  const companyCode = String(opts?.companyCode || "").trim();
  const shootDateYmd = String(opts?.shootDateYmd || "").trim();
  const companyFromCaller = String(opts?.companyFolderUrl || "").trim();

  const dirRow = pickCompanyDirectoryRow(directoryRows, companyName, companyCode);
  const brand = siteTypeToDeliverySmsBrand(dirRow?.site_type || dirRow?.siteType || "");

  const folderUrl = resolveDeliverySmsNaverWorksFolderUrl(dirRow, companyFromCaller);

  const mmdd = formatShootDateCompactMmdd(shootDateYmd);
  const siteLine = mmdd ? `${mmdd}현장` : "현장";

  const lines = [`${brand}알림`, `${siteLine} 촬영본 편집완료`];
  if (folderUrl) lines.push(folderUrl);
  return lines.join("\n");
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

/**
 * photo_notified_at / video_notified_at 가 비어 있을 때만 시각 설정 — 동시 요청 중복 문자 차단.
 * @returns {Promise<boolean>} 업데이트된 행이 있으면 true
 */
async function patchDeliveryNotifyClaim(headers, scheduleId, kind, notifiedIso) {
  const sid = String(scheduleId || "").trim();
  const k = kind === "video" ? "video" : "photo";
  const col = k === "video" ? "video_notified_at" : "photo_notified_at";
  const iso = String(notifiedIso || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(sid) || !iso) return false;
  const path = `shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(sid)}&${col}=is.null`;
  const r = await fetch(`${headers.url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      ...headers.headers,
      Prefer: "return=representation",
    },
    body: JSON.stringify({ [col]: iso }),
    cache: "no-store",
  });
  let body = [];
  try {
    body = await r.json();
  } catch (_) {}
  if (!r.ok) {
    const msg = typeof body?.message === "string" ? body.message : JSON.stringify(body || {});
    throw new Error(`납품 발송 선점 실패 (${r.status}): ${msg}`);
  }
  return Array.isArray(body) ? body.length > 0 : Boolean(body && typeof body === "object");
}

/** 문자 API 실패 시 선점만 되돌림 */
async function revertDeliveryNotifyClaim(headers, scheduleId, kind, notifiedIso) {
  const sid = String(scheduleId || "").trim();
  const k = kind === "video" ? "video" : "photo";
  const col = k === "video" ? "video_notified_at" : "photo_notified_at";
  const iso = String(notifiedIso || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(sid) || !iso) return;
  const path = `shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(
    sid
  )}&${col}=eq.${encodeURIComponent(iso)}`;
  try {
    await supabaseJson(path, headers, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ [col]: null }),
    });
  } catch (e) {
    console.warn("[sendDashboardDeliverySms] 문자 실패 후 선점 롤백 실패", e?.message || e);
  }
}

const MS_PER_DAY = 86400000;

/**
 * DB에 기록된 「사진원본파일」「영상원본파일」폴더의 직접 자식 파일만 정리 (편집완료 폴더는 건드리지 않음).
 * 하위 폴더 안의 파일은 검사하지 않음.
 *
 * DELIVERY_ORIGINAL_PURGE_ENABLED=1 이고 아래 플래그가 켜진 경우에만 실행.
 * DELIVERY_ORIGINAL_PURGE_GOOGLE_DRIVE=1 — Google Drive 레거시 원본폴더만 대상으로 함(네이버 납품 전환 후 기본값 꺼짐).
 * DELIVERY_ORIGINAL_RETENTION_DAYS — 기본 60(createdTime). 고객 문자「30일 이내 권장」과 불일치 허용(운영 버퍼).
 * DELIVERY_ORIGINAL_PURGE_HARD_DELETE=1 — 휴지통이 아니라 영구 삭제(복구 불가).
 */
async function purgeOriginalFoldersOlderThanRetention(writeHeaders, log) {
  let g;
  try {
    g = require("./google-drive-delivery.cjs");
  } catch (e) {
    log(`[원본폴더 보존] Google Drive 모듈 로드 실패: ${e?.message || e}`);
    return { skipped: true, reason: String(e.message || e) };
  }
  let drive;
  try {
    drive = g.getDriveClient();
  } catch (e) {
    log(`[원본폴더 보존] Drive 클라이언트 초기화 실패(Google 미사용·환경 미설정): ${e?.message || e}`);
    return { skipped: true, reason: String(e.message || e) };
  }

  const { listNonFolderFilesWithCreated, trashDriveFile, deleteDriveFilePermanently } = g;
  const days = Math.max(1, parseInt(String(process.env.DELIVERY_ORIGINAL_RETENTION_DAYS || "60"), 10) || 60);
  const hard = /^(1|true|yes)$/i.test(String(process.env.DELIVERY_ORIGINAL_PURGE_HARD_DELETE || "").trim());
  const cutoffMs = Date.now() - days * MS_PER_DAY;

  const stateRows = await supabaseJson(
    "shoot_delivery_drive_state?select=photo_original_folder_id,video_original_folder_id",
    writeHeaders
  );

  /** 동일 폴더 ID는 스케줄 여러 행에 중복 가능 → 한 번만 스캔 */
  const folderIds = new Set();
  for (const row of Array.isArray(stateRows) ? stateRows : []) {
    const p = String(row?.photo_original_folder_id || "").trim();
    const v = String(row?.video_original_folder_id || "").trim();
    if (p) folderIds.add(p);
    if (v) folderIds.add(v);
  }

  let foldersVisited = 0;
  let filesExamined = 0;
  let filesPurged = 0;

  for (const folderId of folderIds) {
    foldersVisited += 1;
    let listed = [];
    try {
      listed = await listNonFolderFilesWithCreated(drive, folderId);
    } catch (e) {
      log(`[원본폴더 보존] 목록 실패 folder=${folderId}: ${e?.message || e}`);
      continue;
    }
    for (const f of listed) {
      filesExamined += 1;
      const t = new Date(f.createdTime).getTime();
      if (!Number.isFinite(t) || t >= cutoffMs) continue;
      try {
        if (hard) {
          await deleteDriveFilePermanently(drive, f.id);
        } else {
          await trashDriveFile(drive, f.id);
        }
        filesPurged += 1;
        log(
          `[원본폴더 보존] ${hard ? "영구삭제" : "휴지통"} name=${String(f.name || "").slice(0, 80)} id=${f.id} folder=${folderId}`
        );
      } catch (e) {
        log(`[원본폴더 보존] 처리 실패 file=${f.id}: ${e?.message || e}`);
      }
    }
  }

  log(`[원본폴더 보존] 요약: 폴더 ${foldersVisited}개 검사, 파일 ${filesExamined}개 확인, ${filesPurged}건 정리 (${days}일 초과)`);

  return {
    retentionDays: days,
    foldersVisited,
    filesExamined,
    filesPurged,
    hardDelete: hard,
  };
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
    originalRetention: null,
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

  const [schedules, directory, stateRows] = await Promise.all([
    supabaseJson(`schedules?select=id,company_name,code,date_key,place,composition,source&date_key=gte.${encodeURIComponent(
      minShoot
    )}&order=date_key.asc`, readH),
    supabaseJson(
      "company_directory?select=name,code,customer_phone,site_type,naver_works_company_folder_id,naver_works_company_share_link",
      readH
    ),
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
    const shootFolderName = buildShootFolderName(shootDate, place);
    const dirRowCron = findCompanyDirectoryRow(directory, companyName, companyCode);
    const nwParentAvail =
      String(dirRowCron?.naver_works_company_folder_id || "").trim() ||
      String(process.env.NAVER_WORKS_DRIVE_PARENT_FILE_ID || "").trim();

    const eligibleFolderDay = shouldCreateFoldersToday({
      shootDateYmd: shootDate,
      todayKstYmd: todayKst,
      maxLagDays: maxLag,
    });

    /** 기본 끔: 작가 페이지「촬영완료」로 폴더를 만드는 흐름이 우선. `1`로 켜면 기존처럼 촬영 다음날 Cron 이 폴더 생성. */
    const autoNextDayFolders = /^(1|true|yes)$/i.test(
      String(process.env.DELIVERY_AUTO_NEXT_DAY_FOLDERS || "").trim()
    );

    const inBackfillShootRange = isInBackfillShootRangeStrict(backfillRange, shootDate, todayKst);

    try {
      let row = stateById.get(scheduleId) || null;

      const needsInitialFolders =
        ((eligibleFolderDay && autoNextDayFolders) || inBackfillShootRange) &&
        !(row?.folders_created_at && row?.shoot_folder_id);

      if (needsInitialFolders) {
        const backfillMark = inBackfillShootRange && !eligibleFolderDay ? "백필 " : "";
        if (!nwParentAvail) {
          log(
            `[delivery] ${backfillMark}네이버웍스 업체/부모 폴더 미등록 → 촬영일 폴더 생성 생략: ${companyName} / ${shootFolderName}`
          );
        } else {
          log(`[delivery] ${backfillMark}네이버웍스 폴더 생성: ${companyName} / ${shootFolderName}`);
          try {
            const built = ensureFolderTreeForScheduleNaver(s, directory, row || {});
            const { __nwShootShareLink: _discard, ...persistRow } = built;
            await upsertDeliveryState(writeH, persistRow);
            const merged = await mergeShootCompositionSubfoldersIntoRowNaver(writeH, s, persistRow);
            row = merged;
            stateById.set(scheduleId, merged);
            stats.foldersCreated += 1;
          } catch (e) {
            stats.errors.push(`${scheduleId} 네이버웍스 폴더 생성: ${e.message || e}`);
          }
        }
      }

      row = stateById.get(scheduleId);
      if (!row?.shoot_folder_id) continue;

      try {
        const mergedHeal = await mergeShootCompositionSubfoldersIntoRowNaver(writeH, s, row);
        stateById.set(scheduleId, mergedHeal);
      } catch (e) {
        stats.errors.push(`${scheduleId} 폴더구조 동기화: ${e.message || e}`);
      }
    } catch (e) {
      stats.errors.push(`${scheduleId}: ${e.message || e}`);
    }
  }

  if (
    /^(1|true|yes)$/i.test(String(process.env.DELIVERY_ORIGINAL_PURGE_ENABLED || "").trim()) &&
    /^(1|true|yes)$/i.test(String(process.env.DELIVERY_ORIGINAL_PURGE_GOOGLE_DRIVE || "").trim())
  ) {
    try {
      stats.originalRetention = await purgeOriginalFoldersOlderThanRetention(writeH, log);
    } catch (e) {
      stats.errors.push(`원본폴더 보존 정리: ${e.message || e}`);
      stats.originalRetention = { error: String(e.message || e) };
    }
  }

  return stats;
}

/**
 * 폴더가 실제로 만들어지기 전, 조건만 계산해 확인용으로 반환 (네이버웍스 CLI·문자 없음).
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

  const [schedules, stateRows, directoryRows] = await Promise.all([
    supabaseJson(
      `schedules?select=id,company_name,code,date_key,place,composition,source&date_key=gte.${encodeURIComponent(minShoot)}&order=date_key.asc`,
      readH
    ),
    supabaseJson("shoot_delivery_drive_state?select=schedule_id,folders_created_at,shoot_folder_id", writeH),
    supabaseJson(
      "company_directory?select=name,code,naver_works_company_folder_id,naver_works_company_share_link",
      readH
    ),
  ]);

  const directory = Array.isArray(directoryRows) ? directoryRows : [];

  const stateById = new Map();
  for (const row of Array.isArray(stateRows) ? stateRows : []) {
    if (row?.schedule_id) stateById.set(String(row.schedule_id), row);
  }

  const scheduleList = (Array.isArray(schedules) ? schedules : []).filter((s) => isActiveScheduleSource(s?.source));

  const autoNextDayFolders = /^(1|true|yes)$/i.test(
    String(process.env.DELIVERY_AUTO_NEXT_DAY_FOLDERS || "").trim()
  );

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
    const shootFolderName = buildShootFolderName(shootDate, place);
    const companyDisplay = buildCompanyRootDisplayName(companyName, companyCode);

    const dirRowPrev = findCompanyDirectoryRow(directory, companyName, companyCode);
    const hasCompanyNaverRoot =
      Boolean(String(dirRowPrev?.naver_works_company_folder_id || "").trim()) ||
      Boolean(String(process.env.NAVER_WORKS_DRIVE_PARENT_FILE_ID || "").trim());

    const eligible = shouldCreateFoldersToday({
      shootDateYmd: shootDate,
      todayKstYmd: todayKst,
      maxLagDays: maxLag,
    });

    const inBackfillShootRange = isInBackfillShootRangeStrict(backfillRange, shootDate, todayKst);
    const st = stateById.get(scheduleId) || null;
    const hasFoldersInDb = Boolean(st?.folders_created_at && st?.shoot_folder_id);

    const allowCreateTimeline = (eligible && autoNextDayFolders) || inBackfillShootRange;

    const wouldCreate =
      allowCreateTimeline &&
      !hasFoldersInDb &&
      hasCompanyNaverRoot &&
      Boolean(scheduleId && shootDate && companyName && composition && (wantPhoto || wantVideo));

    let skipReason = "";
    if (!wouldCreate) {
      if (!scheduleId) skipReason = "schedule_id 없음";
      else if (!shootDate) skipReason = "촬영일 없음";
      else if (!companyName) skipReason = "업체명 없음";
      else if (!composition) skipReason = "촬영구성 없음 (자동 폴더 대상 아님)";
      else if (!wantPhoto && !wantVideo) skipReason = "사진·영상 폴더 규칙에 해당 안 함";
      else if (hasFoldersInDb) skipReason = "이미 DB에 폴더 생성 기록 있음";
      else if (!hasCompanyNaverRoot) skipReason = "네이버웍스 업체/부모 폴더 미등록(company_directory 또는 NAVER_WORKS_DRIVE_PARENT_FILE_ID)";
      else if (!autoNextDayFolders && !inBackfillShootRange)
        skipReason = `DELIVERY_AUTO_NEXT_DAY_FOLDERS 가 꺼져 있어 크론이 촬영일 폴더를 자동 만들지 않습니다. (백필 범위 밖)`;
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
      company_naver_registered: hasCompanyNaverRoot,
      auto_next_day_folders_enabled: autoNextDayFolders,
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
 * Cron·파일 존재 여부와 무관하게 동작 (운영자가 업로드를 확인했다고 보고 발송).
 * @param {{ scheduleId: string, kind: 'photo'|'video', customerPhoneOverride?: string }} opts
 */
async function sendDashboardDeliverySms({ scheduleId, kind, customerPhoneOverride }) {
  const rawScheduleId = String(scheduleId || "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(rawScheduleId)) {
    return { ok: false, status: 400, message: "스케줄 ID가 올바르지 않습니다." };
  }
  const k = String(kind || "").trim().toLowerCase();
  if (k !== "photo" && k !== "video") {
    return { ok: false, status: 400, message: "kind는 photo 또는 video여야 합니다." };
  }

  const readH = getSupabaseReadHeaders();
  const writeH = getSupabaseServiceHeaders();

  const [schedules, directoryRows] = await Promise.all([
    supabaseJson(
      `schedules?id=eq.${encodeURIComponent(rawScheduleId)}&select=id,company_name,code,composition,source,date_key,place&limit=1`,
      readH
    ),
    supabaseJson(
      "company_directory?select=name,code,customer_phone,site_type,naver_works_company_folder_id,naver_works_company_share_link",
      readH
    ),
  ]);

  const directory = Array.isArray(directoryRows) ? directoryRows : [];

  const sch = Array.isArray(schedules) ? schedules[0] : null;
  if (!sch || !isActiveScheduleSource(sch?.source)) {
    return { ok: false, status: 404, message: "스케줄을 찾을 수 없습니다." };
  }

  const canonSid = String(sch.id || "").trim();

  let stateRows = await supabaseJson(
    `shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(canonSid)}&select=*&limit=1`,
    writeH
  );

  const companyName = String(sch.company_name || "").trim();
  const companyCode = String(sch.code || "").trim();
  const composition = String(sch.composition || "").trim();
  const shootDateYmd = String(sch.date_key || "").trim();
  const rawPlace = String(sch.place || "").trim();
  const wantPhoto = needsPhotoFolder(composition);
  const wantVideo = needsVideoFolder(composition);

  if (k === "photo" && !wantPhoto) {
    return { ok: false, status: 400, message: "이 스케줄에는 사진 납품 항목이 없습니다." };
  }
  if (k === "video" && !wantVideo) {
    return { ok: false, status: 400, message: "이 스케줄에는 영상 납품 항목이 없습니다." };
  }

  let row = Array.isArray(stateRows) ? stateRows[0] || null : null;

  const dirRowSms = pickCompanyDirectoryRow(directory, companyName, companyCode);
  /** 링크 없어도 수동 발송 진행 — 본문에서 폴더 줄만 생략(buildDeliveryCompletionSmsText) */
  let link =
    resolveDeliverySmsNaverWorksFolderUrl(dirRowSms, row ? String(row.company_share_link || "") : "") || "";

  if (!row) {
    const nwId = String(dirRowSms?.naver_works_company_folder_id || "").trim();
    const phoneGuess =
      normalizePhoneFromDirectory(pickCustomerPhoneFromDirectory(directory, companyName, companyCode)) || "";
    await upsertDeliveryState(writeH, {
      schedule_id: canonSid,
      company_name: companyName,
      company_code: companyCode,
      shoot_date_key: shootDateYmd,
      composition,
      place_segment: derivePlaceSegmentForFolder(rawPlace),
      customer_phone: phoneGuess,
      company_folder_id: nwId || null,
      delivery_drive_provider: "naver",
      shoot_folder_id: null,
      photo_folder_id: null,
      video_folder_id: null,
      company_share_link: link,
      photo_seen_file_ids: [],
      video_seen_file_ids: [],
    });
    stateRows = await supabaseJson(
      `shoot_delivery_drive_state?schedule_id=eq.${encodeURIComponent(canonSid)}&select=*&limit=1`,
      writeH
    );
    row = Array.isArray(stateRows) ? stateRows[0] || null : null;
    if (!row) {
      return {
        ok: false,
        status: 500,
        message: "납품 상태를 준비하는 데 실패했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
  }

  if (k === "photo" && row.photo_notified_at) {
    return { ok: false, status: 409, message: "이미 사진 납품 완료 처리된 건입니다." };
  }
  if (k === "video" && row.video_notified_at) {
    return { ok: false, status: 409, message: "이미 영상 납품 완료 처리된 건입니다." };
  }

  // 사진+영상 둘 다 필요한 업체는 *마지막* 항목 완료 시에만 문자 1통.
  // 첫 항목 클릭 시점에는 notified_at 만 기록하고 문자는 보내지 않음.
  const bothNeeded = wantPhoto && wantVideo;
  const otherAlreadyDone = bothNeeded
    ? (k === "photo" ? !!row.video_notified_at : !!row.photo_notified_at)
    : true; // 사진만/영상만 업체는 항상 문자 발송 진행.
  const shouldSendSms = bothNeeded ? otherAlreadyDone : true;

  const lookupPhone = pickCustomerPhoneFromDirectory(directory, companyName, companyCode);
  const fromOverride = normalizePhoneFromDirectory(customerPhoneOverride);
  const fromRow = normalizePhoneFromDirectory(row.customer_phone) || normalizePhoneFromDirectory(lookupPhone);
  const wantedOverride =
    typeof customerPhoneOverride === "string" && String(customerPhoneOverride).trim() !== "";

  /** 문자 발송 단계가 아니면(=사진+영상 중 첫 번째 클릭) phone 검증 skip — 번호 없는 업체도
   *  첫 항목은 그냥 완료 처리만 한다. 둘 다 완료되는 시점에야 phone 검증 + SMS. */
  if (shouldSendSms) {
    if (wantedOverride) {
      if (!isValidKoreanMobile(fromOverride)) {
        return {
          ok: false,
          status: 400,
          code: "bad_phone",
          message: "입력한 휴대폰 번호 형식이 올바르지 않습니다. 예: 01012345678",
        };
      }
    }
    const phoneCheck = wantedOverride ? fromOverride : fromRow;
    if (!isValidKoreanMobile(phoneCheck)) {
      return {
        ok: false,
        status: 400,
        code: "needs_phone",
        message:
          "고객 휴대폰 번호가 없거나 형식에 맞지 않습니다.\n번호를 입력한 뒤 다시 진행해 주세요. (예: 01012345678)",
      };
    }
  }

  const phone = wantedOverride ? fromOverride : fromRow;

  const sendRef = new Date();
  const notifiedAt = sendRef.toISOString();
  let claimed = false;
  try {
    claimed = await patchDeliveryNotifyClaim(writeH, canonSid, k, notifiedAt);
  } catch (e) {
    return {
      ok: false,
      status: 500,
      message: typeof e?.message === "string" ? e.message : "처리에 실패했습니다.",
    };
  }
  if (!claimed) {
    return {
      ok: false,
      status: 409,
      message:
        k === "video"
          ? "이미 영상 납품 완료 처리된 건입니다."
          : "이미 사진 납품 완료 처리된 건입니다.",
    };
  }

  // 문자 발송 단계가 아니면 여기서 종료 — notified_at 만 기록한 상태로 return.
  if (!shouldSendSms) {
    await patchDeliveryState(writeH, canonSid, {
      company_share_link: link,
    });
    return {
      ok: true,
      data: {
        kind: k,
        notified_at: notifiedAt,
        photo_notified_at: k === "photo" ? notifiedAt : row.photo_notified_at || null,
        video_notified_at: k === "video" ? notifiedAt : row.video_notified_at || null,
        sms_sent: false,
        sms_waiting_other_kind: true,
        sms_deferred_quiet_hours: false,
        sms_scheduled_iso: null,
      },
    };
  }

  const text = buildDeliveryCompletionSmsText({
    directoryRows: directory,
    companyName,
    companyCode,
    kind: k,
    shootDateYmd,
    rawPlace,
    companyFolderUrl: link,
  });
  /** 대시보드 수동 발송: 예약(scheduledDate) 없이 즉시 전송 — 솔라피 1010(scheduledDate) 회피 */
  const sms = await sendSolapiMessage({
    to: phone,
    text,
    referenceDate: sendRef,
  });
  if (!sms.ok) {
    await revertDeliveryNotifyClaim(writeH, canonSid, k, notifiedAt);
    return {
      ok: false,
      status: 502,
      message: typeof sms.message === "string" ? sms.message : "문자 발송에 실패했습니다.",
    };
  }

  await patchDeliveryState(writeH, canonSid, {
    customer_phone: phone,
    company_share_link: link,
  });

  return {
    ok: true,
    data: {
      kind: k,
      notified_at: notifiedAt,
      photo_notified_at: k === "photo" ? notifiedAt : row.photo_notified_at || null,
      video_notified_at: k === "video" ? notifiedAt : row.video_notified_at || null,
      sms_sent: true,
      sms_deferred_quiet_hours: !!sms.deferredToQuietHoursMorning,
      sms_scheduled_iso: sms.scheduledDate || null,
    },
  };
}

module.exports = { runDeliveryDriveJob, previewDeliveryDriveFolders, sendDashboardDeliverySms };
