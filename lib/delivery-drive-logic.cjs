/**
 * 촬영 납품 Drive 폴더 규칙: 구성·장소·날짜 파생 (solapi-notify 의 장소 요약과 유사 톤).
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
    const aptName = prefix.split(/\s+/).slice(-1)[0] || prefix;
    const cleaned = aptName.replace(/\s+아파트\s*$/iu, "").trim();
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

function buildCompanyRootDisplayName(companyName, companyCode) {
  const n = sanitizeDriveName(String(companyName || "").trim() || "업체미정");
  const code = String(companyCode || "").trim();
  if (code) return sanitizeDriveName(`${n} [${code}]`);
  return n;
}

/** 촬영일 아래 서브폴더명: 2026-04-23_단지·동호 */
function buildShootFolderName(shootDateYmd, placeSegment) {
  const date = String(shootDateYmd || "").trim();
  const place = sanitizeDriveName(String(placeSegment || "").trim() || "장소");
  return sanitizeDriveName(`${date}_${place}`);
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
  buildShootFolderName,
  shouldCreateFoldersToday,
  isActiveScheduleSource,
};
