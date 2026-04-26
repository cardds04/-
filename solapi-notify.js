/**
 * 촬영 스케줄 접수 시 솔라피(SOLAPI) SMS 알림.
 *
 *  - 인로그 / 쇼픽 / 더필링 3개 사이트에서 공통으로 로드.
 *  - 접수 확인 모달에서 "확인" 누른 직후 호출됨.
 *  - 수신번호: user.phone (없으면 모달로 즉석 입력 → user.phone 에 저장 + 콜백으로 영속화)
 *  - 본문은 "[사이트명] / 날짜 / 단지명·동호수 / 안내문구" 형태로 미입금 요약과 비슷한 톤.
 *  - 발송 결과는 alert 가 아니라 콘솔 + 작은 스낵바 토스트 로 표시 (등록 성공 alert 와 충돌 방지).
 *
 *  외부에 노출되는 API (window.SolapiNotify):
 *    sendScheduleSubmitNotice({
 *      siteLabel,            // "인로그" | "쇼픽" | "더필링"
 *      schedule,             // { date, time, place, pyeong, composition, memo, paymentAmount, ... }
 *      company,              // 업체명
 *      phone,                // 1차 수신번호 후보 (보통 user.phone)
 *      onPhoneSaved,         // (newPhone) => Promise<void>  — 사용자가 모달로 입력한 번호 저장 콜백
 *    }) → Promise<{ ok, skipped, message }>
 */
(function () {
  if (window.SolapiNotify) return;

  const SOLAPI_ENDPOINT = "/api/solapi-send";
  const ADMIN_NOTIFY_PHONE = "01028692443";
  const ACCOUNT_LINE = "계좌번호 : 농협 3021511169151 김진영";
  const TAIL_NOTICE =
    "입금자명은 사업자명으로 반드시 입금바랍니다.\n" +
    "촬영전 미입금시 스케줄이 자동취소될수있습니다.\n" +
    "스케줄시간조정이 필요할 경우 저희가 연락드리겠습니다.";

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

  /** "YYYY-MM-DD" 기준 N일 뒤의 ISO 날짜 반환. 촬영본 전송예정일 계산용. */
  function isoDatePlusDays(baseIso, daysToAdd) {
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(baseIso || "").trim());
    if (!m) return "";
    const t = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    t.setDate(t.getDate() + Number(daysToAdd || 0));
    return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
  }

  /** "2026-04-30" → "4/30(목)" 형태로 짧게 표기 (미입금 요약과 비슷한 톤). */
  function formatShortDateLabel(dateStr) {
    const s = String(dateStr || "").trim();
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
    if (!m) return s;
    const year = Number(m[1]);
    const month = Number(m[2]);
    const day = Number(m[3]);
    const dt = new Date(year, month - 1, day);
    const wd = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()] || "";
    return `${month}/${day}${wd ? `(${wd})` : ""}`;
  }

  /** 시간이 "시간상관없음" 이면 그대로, "HH:00" 이면 "오전/오후 H시" 또는 "HH시" 형태로. */
  function formatShortTimeLabel(timeStr, timePreference) {
    const s = String(timeStr || "").trim();
    if (!s || s === "시간상관없음" || timePreference === "any" || timePreference === "other") {
      return "시간미정";
    }
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(s);
    if (!m) return s;
    return `${pad2(Number(m[1]))}:${pad2(Number(m[2]))}`;
  }

  /**
   * 주소 문자열에서 단지명 + 동호수만 짧게. 예)
   *  "서울 송파구 잠실동 잠실주공아파트 102동 305호" → "잠실주공아파트 102동 305호"
   *  "성남시 분당구 정자로 38" → "정자로 38"
   *  매칭 실패 시 원문을 80자 이내로 자르기.
   */
  function formatPlaceForSms(raw) {
    const original = String(raw || "").trim();
    if (!original) return "-";
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
      // "잠실주공아파트" 류의 단지명만 남기기 (공백 포함된 첫 토큰)
      const aptName = prefix.split(/\s+/).slice(-1)[0] || prefix;
      const cleaned = aptName.replace(/\s+아파트\s*$/iu, "").trim();
      return `${cleaned ? cleaned + " " : ""}${tail}`.trim();
    }

    const landTailRe = /([가-힣0-9\-]{2,}(?:로|길|리))\s*(\d+(?:-\d+)*)\s*$/u;
    const landM = s.match(landTailRe);
    if (landM) {
      return `${landM[1]} ${landM[2]}`.replace(/\s+/g, " ").trim();
    }

    return s.length > 80 ? s.slice(0, 78) + "…" : s;
  }

  function formatAmountText(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return "";
    return `${n.toLocaleString("ko-KR")}원`;
  }

  function buildSmsText({ siteLabel, schedule, company }) {
    const label = String(siteLabel || "").trim();
    const isShopick = label === "쇼픽";
    const dateLabel = formatShortDateLabel(schedule?.date);
    const timeLabel = formatShortTimeLabel(schedule?.time, schedule?.timePreference);
    const placeLabel = formatPlaceForSms(schedule?.place);
    const composition = String(schedule?.composition || "").trim();
    const amountLabel = formatAmountText(schedule?.paymentAmount);
    const lines = [
      `[${label}] 촬영 접수 완료`,
      `날짜 : ${dateLabel} (날짜확정)`,
    ];
    if (timeLabel) {
      const isUndecided = timeLabel === "시간미정";
      lines.push(isUndecided ? `희망시간 : ${timeLabel}` : `희망시간 : ${timeLabel} (확정아님)`);
    }
    lines.push(`장소 : ${placeLabel}`);
    if (composition) lines.push(`구성 : ${composition}`);
    // 쇼픽은 금액/계좌/입금 안내를 모두 생략 — 결제는 별도 흐름이므로 문자 본문 단순화
    if (!isShopick) {
      if (amountLabel) {
        lines.push(`결제예정 : ${amountLabel}`);
        const baseAmount = Number(schedule?.paymentAmount);
        if (Number.isFinite(baseAmount) && baseAmount > 0) {
          // 세금계산서 발행 시 부가세 10% 포함 금액
          const taxIncluded = Math.round(baseAmount * 1.1);
          lines.push(`(세금계산서 발행시 ${taxIncluded.toLocaleString("ko-KR")}원)`);
        }
      }
      lines.push(ACCOUNT_LINE);
    }
    // 촬영본 전송예정일 = 촬영일 + 10일 — 인로그/쇼픽/더필링 공통
    const deliveryIso = isoDatePlusDays(schedule?.date, 10);
    if (deliveryIso) {
      const deliveryLabel = formatShortDateLabel(deliveryIso);
      lines.push(`촬영본 전송예정일 : ${deliveryLabel}`);
      lines.push("(작업 기한은 최대 10일이나, 완료되는 즉시 신속히 전달해 드리겠습니다.)");
    }
    if (!isShopick) {
      lines.push("", TAIL_NOTICE);
    }
    return lines.join("\n");
  }

  /**
   * EUC-KR(CP949) 기준 대략적 바이트 길이 추정.
   * 한글 1자 = 2 bytes, ASCII 1자 = 1 byte, 그 외 = 2 bytes.
   * 솔라피 SMS 한도(90 bytes) 체크용.
   */
  function estimateEucKrBytes(str) {
    const s = String(str || "");
    let total = 0;
    for (let i = 0; i < s.length; i++) {
      total += s.charCodeAt(i) > 0x7f ? 2 : 1;
    }
    return total;
  }

  /** 주어진 본문 바이트가 한도를 넘으면 끝부분을 잘라 "…" 으로 마무리. */
  function truncateToBytes(str, maxBytes) {
    const s = String(str || "");
    if (estimateEucKrBytes(s) <= maxBytes) return s;
    let acc = "";
    let used = 0;
    const ellipsisBytes = 2; // "…" 1자 (2 bytes)
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      const chBytes = ch.charCodeAt(0) > 0x7f ? 2 : 1;
      if (used + chBytes + ellipsisBytes > maxBytes) break;
      acc += ch;
      used += chBytes;
    }
    return acc + "…";
  }

  /**
   * 관리자 확인용 단문(SMS) 본문 — 업체명 / 주소 / 촬영형태만.
   * 솔라피 SMS 한도(90 bytes) 안에 들어가도록 주소를 우선 절단.
   */
  function buildAdminShortSmsText({ company, schedule }) {
    const companyLabel = String(company || "").trim() || "(업체명없음)";
    const dateLabel = formatShortDateLabel(schedule?.date) || "-";
    const placeRaw = formatPlaceForSms(schedule?.place);
    const composition = String(schedule?.composition || "").trim() || "-";
    const header = `[${companyLabel}]`;
    const dateLine = `촬영일: ${dateLabel}`;
    const compLine = `촬영: ${composition}`;
    const fixedBytes =
      estimateEucKrBytes(header) +
      1 + // \n
      estimateEucKrBytes(dateLine) +
      1 + // \n
      estimateEucKrBytes("주소: ") +
      1 + // \n
      estimateEucKrBytes(compLine);
    const SMS_LIMIT = 88; // 90 bytes 한도에 약간 여유
    const placeBudget = Math.max(10, SMS_LIMIT - fixedBytes);
    const placeShort = truncateToBytes(placeRaw, placeBudget);
    return `${header}\n${dateLine}\n주소: ${placeShort}\n${compLine}`;
  }

  /**
   * 관리자(고정번호)에게 확인용 단문 SMS 별도 발송. 실패해도 사용자 흐름엔 영향 없음.
   */
  async function sendAdminShortNotice({ company, schedule }) {
    try {
      const text = buildAdminShortSmsText({ company, schedule });
      await postSolapiSend({ to: ADMIN_NOTIFY_PHONE, text, type: "SMS" });
    } catch (error) {
      console.warn("[SolapiNotify] admin notify failed", error);
    }
  }

  /** 작은 토스트 (몇 초 후 사라짐) — alert 와 충돌 방지. */
  function showToast(message, type) {
    try {
      const id = "solapi-notify-toast";
      let el = document.getElementById(id);
      if (!el) {
        el = document.createElement("div");
        el.id = id;
        Object.assign(el.style, {
          position: "fixed",
          bottom: "24px",
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "92vw",
          padding: "12px 18px",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
          zIndex: "9999",
          color: "#fff",
          background: "#1f2940",
          opacity: "0",
          transition: "opacity 0.2s",
          pointerEvents: "none",
          whiteSpace: "pre-line",
          textAlign: "center",
          lineHeight: "1.4",
        });
        document.body.appendChild(el);
      }
      el.style.background = type === "error" ? "#b91c1c" : "#1f2940";
      el.textContent = message;
      el.style.opacity = "1";
      clearTimeout(el.__hideTimer);
      el.__hideTimer = setTimeout(() => {
        el.style.opacity = "0";
      }, 4200);
    } catch (_) {
      // 토스트 실패 시 무시
    }
  }

  /**
   * 모달로 전화번호 입력 받기.
   * 등록 완료(Promise<string>) / 취소(Promise<null>).
   */
  function promptPhoneNumber(siteLabel) {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(15,18,30,0.55)",
        zIndex: "10000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      });

      const card = document.createElement("div");
      Object.assign(card.style, {
        background: "#fff",
        color: "#1f2940",
        borderRadius: "14px",
        padding: "22px 22px 18px",
        width: "100%",
        maxWidth: "360px",
        boxShadow: "0 18px 48px rgba(0,0,0,0.22)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
      });
      card.innerHTML = `
        <div style="font-size:16px;font-weight:800;margin-bottom:6px;">
          [${String(siteLabel || "")}] 알림 문자 수신번호
        </div>
        <div style="font-size:13px;line-height:1.55;color:#4a5878;margin-bottom:14px;">
          고객 정보에 등록된 전화번호가 없습니다.<br/>
          접수 확인 문자를 받으실 휴대폰 번호를 입력해주세요.<br/>
          <span style="color:#6b7a99;">(다음 접수부터는 자동으로 사용됩니다.)</span>
        </div>
        <input
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          placeholder="010-1234-5678"
          style="width:100%;padding:11px 12px;border:1px solid #cbd2dd;border-radius:9px;
                 font-size:15px;letter-spacing:0.02em;outline:none;box-sizing:border-box;"
        />
        <div style="font-size:12px;color:#b91c1c;min-height:18px;margin-top:6px;"></div>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button type="button" data-role="cancel"
            style="flex:1;padding:11px 0;border:1px solid #cbd2dd;border-radius:9px;
                   background:#fff;color:#1f2940;font-weight:700;cursor:pointer;font-size:14px;">
            건너뛰기
          </button>
          <button type="button" data-role="ok"
            style="flex:1;padding:11px 0;border:0;border-radius:9px;
                   background:#466ba9;color:#fff;font-weight:800;cursor:pointer;font-size:14px;">
            저장하고 발송
          </button>
        </div>
      `;
      overlay.appendChild(card);
      document.body.appendChild(overlay);

      const inputEl = card.querySelector("input");
      const errorEl = card.querySelector("div[style*='color:#b91c1c']");
      const okBtn = card.querySelector("button[data-role='ok']");
      const cancelBtn = card.querySelector("button[data-role='cancel']");
      setTimeout(() => inputEl.focus(), 30);

      function cleanup() {
        try {
          document.body.removeChild(overlay);
        } catch (_) {}
      }
      function handleOk() {
        const raw = inputEl.value;
        const digits = onlyDigits(raw);
        if (!isValidKoreanMobile(digits)) {
          errorEl.textContent = "올바른 휴대폰 번호 형식이 아닙니다.";
          inputEl.focus();
          return;
        }
        cleanup();
        resolve(digits);
      }
      function handleCancel() {
        cleanup();
        resolve(null);
      }

      okBtn.addEventListener("click", handleOk);
      cancelBtn.addEventListener("click", handleCancel);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) handleCancel();
      });
      inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          handleOk();
        } else if (e.key === "Escape") {
          e.preventDefault();
          handleCancel();
        }
      });
    });
  }

  async function postSolapiSend(payload) {
    const response = await fetch(SOLAPI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let body = null;
    try {
      body = await response.json();
    } catch (_) {
      body = null;
    }
    if (!response.ok || !body || body.ok === false) {
      const msg = (body && body.message) || `발송 실패 (${response.status})`;
      const err = new Error(msg);
      err.status = response.status;
      throw err;
    }
    return body;
  }

  async function sendScheduleSubmitNotice(opts) {
    const siteLabel = String(opts?.siteLabel || "").trim();
    const schedule = opts?.schedule || {};
    const company = String(opts?.company || "").trim();
    const initialPhone = onlyDigits(opts?.phone);
    const onPhoneSaved = typeof opts?.onPhoneSaved === "function" ? opts.onPhoneSaved : null;

    let toPhone = initialPhone;
    let phoneJustEntered = false;

    // 관리자(01028692443) 확인용 단문은 고객 문자 성공 여부와 무관하게 항상 시도.
    sendAdminShortNotice({ company, schedule });

    if (!isValidKoreanMobile(toPhone)) {
      const entered = await promptPhoneNumber(siteLabel);
      if (!entered) {
        showToast(
          "수신번호가 없어 알림 문자를 보내지 않았습니다.\n(스케줄 등록은 정상 처리되었습니다.)",
          "error"
        );
        return { ok: false, skipped: true, message: "no phone" };
      }
      toPhone = entered;
      phoneJustEntered = true;
    }

    const text = buildSmsText({ siteLabel, schedule, company });
    const subject = `[${siteLabel}] 촬영 접수 확인`;

    try {
      await postSolapiSend({ to: toPhone, text, subject });
      if (phoneJustEntered && onPhoneSaved) {
        try {
          await onPhoneSaved(toPhone);
        } catch (saveErr) {
          console.warn("[SolapiNotify] phone save failed", saveErr);
        }
      }
      showToast(`알림 문자가 발송되었습니다. (${toPhone})`);
      return { ok: true, skipped: false };
    } catch (error) {
      console.error("[SolapiNotify] send failed", error);
      showToast(
        `알림 문자 발송 실패: ${error?.message || "오류"}\n(스케줄 등록은 정상 처리되었습니다.)`,
        "error"
      );
      return { ok: false, skipped: false, message: error?.message || "send failed" };
    }
  }

  window.SolapiNotify = {
    sendScheduleSubmitNotice,
    _internal: { buildSmsText, formatPlaceForSms, formatShortDateLabel, isValidKoreanMobile },
  };
})();
