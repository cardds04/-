/**
 * 촬영 납품 Drive 폴더 규칙: 월일+단지명·장소 요약 (Cron·작가 현장확인 동일).
 */

function onlyDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function isValidKoreanMobile(value) {
  const v = onlyDigits(value);
  return /^01[016789]\d{7,8}$/.test(v);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** YYYY-MM-DD 달력 기준 +N일 (UTC 기반 일 단위, 한국 DST 없음 가정). */
function addCalendarDaysYmd(ymd, daysToAdd) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(ymd || "").trim());
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const utcMs = Date.UTC(y, mo - 1, d) + Number(daysToAdd || 0) * 86400000;
  const t = new Date(utcMs);
  return `${t.getUTCFullYear()}-${pad2(t.getUTCMonth() + 1)}-${pad2(t.getUTCDate())}`;
}

/** Asia/Seoul 기준 오늘 YYYY-MM-DD */
function getKstYmd(now = new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const mo = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !mo || !d) return "";
  return `${y}-${mo}-${d}`;
}

function needsPhotoFolder(composition) {
  const c = String(composition || "").trim();
  if (!c) return false;
  return /사진|블로그/.test(c);
}

function needsVideoFolder(composition) {
  const c = String(composition || "").trim();
  if (!c) return false;
  return /영상/.test(c);
}

/**
 * 도로·행정 접두 제거 후 남은 문자열에서 단지명 코어 ("래미안 아파트" → 래미안).
 */
function pickApartmentCoreNameFromTrimmedPrefix(prefix) {
  const p = String(prefix || "").trim();
  const parts = p.split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  let aptName = parts[parts.length - 1];
  if (/^아파트$/iu.test(aptName) && parts.length >= 2) {
    aptName = parts[parts.length - 2];
  }
  const cleaned = String(aptName).replace(/\s+아파트\s*$/iu, "").trim();
  return cleaned || aptName;
}

/**
 * 아파트명: "N동 M호" 앞 단어(단지명). 없으면 지역·도로명 요약.
 * solapi-notify.formatPlaceForSms 와 맞춤.
 */
function derivePlaceSegmentForFolder(raw) {
  const original = String(raw || "").trim();
  if (!original) return "장소미정";
  let s = original
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/^주소\s*[:：]\s*/i, "")
    .replace(/[,，、]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aptTailRe = /(\d{1,4}동\s*\d+\s*호|[a-zA-Z]동\s*\d+\s*호)\s*$/iu;
  const aptM = s.match(aptTailRe);
  if (aptM) {
    const tail = aptM[0].replace(/\s+/g, "");
    let prefix = s.slice(0, aptM.index).trim();
    const adminOrRoadRules = [
      /^[가-힣]{2,}특별자치시\s*/u,
      /^[가-힣]{2,}특별시\s*/u,
      /^[가-힣]{2,}광역시\s*/u,
      /^[가-힣]{2,}특별자치도\s*/u,
      /^[가-힣]{2,}도\s*/u,
      /^(?:서울|부산|대구|인천|광주|대전|울산|세종)\s+/u,
      /^[가-힣]{2,}시(?=\s|[가-힣])/u,
      /^[가-힣]{2,}군\s*/u,
      /^[가-힣]{2,}구\s*/u,
      /^[가-힣]{2,}(?:읍|면)\s*/u,
      /^[가-힣]{2,}동\s*\d+(?:-\d+)?\s*(?=[가-힣a-zA-Z])/u,
      /^\d+(?:-\d+)?\s+/u,
      /^[가-힣0-9\-]{2,}길\s*\d+(?:-\d+)?\s*/u,
      /^[가-힣0-9\-]{2,}(?:로|대로)(?:\d+번길)?\s*\d+(?:-\d+)?\s*/u,
    ];
    for (let guard = 0; guard < 80; guard++) {
      let hit = false;
      for (let ri = 0; ri < adminOrRoadRules.length; ri++) {
        const next = prefix.replace(adminOrRoadRules[ri], "").trim();
        if (next !== prefix) {
          prefix = next;
          hit = true;
          break;
        }
      }
      if (!hit) break;
    }
    prefix = prefix.replace(/^[^가-힣a-zA-Z]*\s*/iu, "").trim();
    const cleaned = pickApartmentCoreNameFromTrimmedPrefix(prefix);
    const label = `${cleaned ? cleaned + " " : ""}${tail}`.trim();
    return sanitizeDriveName(label);
  }

  const landTailRe = /([가-힣0-9\-]{2,}(?:로|길|리))\s*(\d+(?:-\d+)*)\s*$/u;
  const landM = s.match(landTailRe);
  if (landM) {
    return sanitizeDriveName(`${landM[1]} ${landM[2]}`.replace(/\s+/g, " ").trim());
  }

  const short = s.length > 48 ? s.slice(0, 46) + "…" : s;
  return sanitizeDriveName(short);
}

function sanitizeDriveName(name) {
  return String(name || "")
    .replace(/[\\/]/g, "·")
    .replace(/["<>|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

/** Drive 업체 루트 폴더명 — 업체명만 사용(코드·AUTO 접미사 미포함). */
function buildCompanyRootDisplayName(companyName, _companyCode) {
  return sanitizeDriveName(String(companyName || "").trim() || "업체미정");
}

/** YYYY-MM-DD → MMDD (촬영 폴더명 앞자리) */
function ymdToMmdd(shootDateYmd) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(shootDateYmd || "").trim());
  if (!m) return "";
  return `${pad2(Number(m[2]))}${pad2(Number(m[3]))}`;
}

/**
 * 현장·납품 촬영 하위 폴더용 짧은 장소명 (아파트 단지명 위주, 동·호 제외).
 */
function deriveShootFolderCompactPlaceLabel(raw) {
  const original = String(raw || "").trim();
  if (!original) return "장소미정";
  let s = original
    .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, " ")
    .replace(/^주소\s*[:：]\s*/i, "")
    .replace(/[,，、]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const aptTailRe = /(\d{1,4}동\s*\d+\s*호|[a-zA-Z]동\s*\d+\s*호)\s*$/iu;
  const aptM = s.match(aptTailRe);
  if (aptM) {
    let prefix = s.slice(0, aptM.index).trim();
    const adminOrRoadRules = [
      /^[가-힣]{2,}특별자치시\s*/u,
      /^[가-힣]{2,}특별시\s*/u,
      /^[가-힣]{2,}광역시\s*/u,
      /^[가-힣]{2,}특별자치도\s*/u,
      /^[가-힣]{2,}도\s*/u,
      /^(?:서울|부산|대구|인천|광주|대전|울산|세종)\s+/u,
      /^[가-힣]{2,}시(?=\s|[가-힣])/u,
      /^[가-힣]{2,}군\s*/u,
      /^[가-힣]{2,}구\s*/u,
      /^[가-힣]{2,}(?:읍|면)\s*/u,
      /^[가-힣]{2,}동\s*\d+(?:-\d+)?\s*(?=[가-힣a-zA-Z])/u,
      /^\d+(?:-\d+)?\s+/u,
      /^[가-힣0-9\-]{2,}길\s*\d+(?:-\d+)?\s*/u,
      /^[가-힣0-9\-]{2,}(?:로|대로)(?:\d+번길)?\s*\d+(?:-\d+)?\s*/u,
    ];
    for (let guard = 0; guard < 80; guard++) {
      let hit = false;
      for (let ri = 0; ri < adminOrRoadRules.length; ri++) {
        const next = prefix.replace(adminOrRoadRules[ri], "").trim();
        if (next !== prefix) {
          prefix = next;
          hit = true;
          break;
        }
      }
      if (!hit) break;
    }
    prefix = prefix.replace(/^[^가-힣a-zA-Z]*\s*/iu, "").trim();
    const cleanedCore = pickApartmentCoreNameFromTrimmedPrefix(prefix);
    const core = sanitizeDriveName(cleanedCore || "단지");
    return core || "단지";
  }

  const landTailRe = /([가-힣0-9\-]{2,}(?:로|길|리))\s*(\d+(?:-\d+)*)\s*$/u;
  const landM = s.match(landTailRe);
  if (landM) {
    return sanitizeDriveName(`${landM[1]} ${landM[2]}`.replace(/\s+/g, " ").trim()) || "장소";
  }

  const collapsed = s.replace(/\s+/g, "");
  const short = collapsed.length > 32 ? `${collapsed.slice(0, 30)}…` : collapsed;
  return sanitizeDriveName(short) || "장소";
}

/** 촬영일 아래 서브폴더명: 예) 0505래미안 (MMDD + 단지명 한글 6자 이하).
 *  사용자 정책: ① 날짜(MMDD) 외 숫자 전면 금지 ② 한글 suffix 6자 컷.
 *  옛 규칙은 "06011271", "0601미사강변효성해링턴플레이스엔에이…" 같은 더러운 이름을 만들었음. */
function buildShootFolderName(shootDateYmd, rawPlace) {
  const mmdd = ymdToMmdd(shootDateYmd);
  const placeTailRaw = deriveShootFolderCompactPlaceLabel(rawPlace);
  // 숫자·공백·금지문자 제거 후 6자 컷.
  const cleanPlaceTail = (raw) => {
    return String(raw || "")
      .replace(/[\/\\:*?"<>|]/g, "")
      .replace(/[\d]/g, "")
      .replace(/\s+/g, "")
      .trim()
      .slice(0, 6);
  };
  let placeTail = cleanPlaceTail(placeTailRaw);
  if (!placeTail) {
    // 숫자만 있던 경우(예: "1271") fallback: 더 일반적인 segment 도 시도.
    const alt = cleanPlaceTail(derivePlaceSegmentForFolder(rawPlace));
    placeTail = alt || "장소미정";
  }
  if (!mmdd) {
    return sanitizeDriveName(`${String(shootDateYmd || "").trim()}_${placeTail}`);
  }
  return sanitizeDriveName(`${mmdd}${placeTail}`);
}

function shouldCreateFoldersToday({ shootDateYmd, todayKstYmd, maxLagDays }) {
  const due = addCalendarDaysYmd(shootDateYmd, 1);
  if (!due || !todayKstYmd) return false;
  if (todayKstYmd < due) return false;
  if (maxLagDays > 0) {
    const cap = addCalendarDaysYmd(shootDateYmd, maxLagDays);
    if (cap && todayKstYmd > cap) return false;
  }
  return true;
}

const EXCLUDED_SOURCES = new Set(["hold", "refund", "deleted"]);

function isActiveScheduleSource(source) {
  const s = String(source || "").trim().toLowerCase();
  return !EXCLUDED_SOURCES.has(s);
}

/**
 * 스케줄·Cron·작가 UI와 동일 규칙으로 company_directory 한 행을 고른다.
 * (업체명 단일 매칭 → 코드까지 일치 또는 코드 단일 매칭)
 */
function findCompanyDirectoryRow(directoryRows, companyName, companyCode) {
  const name = String(companyName || "").trim();
  const code = String(companyCode || "").trim();
  const rows = Array.isArray(directoryRows) ? directoryRows : [];
  const nameMatches = rows.filter((r) => String(r?.name || "").trim() === name);

  if (nameMatches.length === 1) {
    return nameMatches[0] || null;
  }
  if (name && code) {
    const hn = nameMatches.find((r) => String(r?.code || "").trim() === code);
    if (hn) return hn;
    const hc = rows.filter((r) => String(r?.code || "").trim() === code);
    if (hc.length === 1) return hc[0] || null;
  }
  return null;
}

module.exports = {
  onlyDigits,
  isValidKoreanMobile,
  addCalendarDaysYmd,
  getKstYmd,
  needsPhotoFolder,
  needsVideoFolder,
  derivePlaceSegmentForFolder,
  sanitizeDriveName,
  buildCompanyRootDisplayName,
  deriveShootFolderCompactPlaceLabel,
  buildShootFolderName,
  shouldCreateFoldersToday,
  isActiveScheduleSource,
  findCompanyDirectoryRow,
};
