/* ───────────────────────────────────────────────────────────────
   이지숏폼 고객 회원가입/로그인 (프론트)
   · 홈(둘러보기)은 공개 · 제작(생성)은 로그인 필요 → 회원가입 유도
   · 별도 테이블 easy_users (서버 /api/easy-auth, scrypt 해시·세션토큰)
   · window.EasyAuth.requireLogin(cb): 로그인돼 있으면 cb 실행, 아니면 모달 띄우고
     로그인 성공 후 cb 실행. 반환값으로 즉시 진행 여부 판단 가능.
   ─────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var API = "https://sc-pink.vercel.app/api/easy-auth";
  var LS_KEY = "easy_auth_v1";

  var state = loadState();
  var pendingCb = null;

  function loadState() {
    try { var s = JSON.parse(localStorage.getItem(LS_KEY) || "null"); return (s && s.token && s.user) ? s : null; }
    catch (_) { return null; }
  }
  function saveState(s) {
    state = s;
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (_) {}
    renderChip();
  }
  function clearState() {
    state = null;
    try { localStorage.removeItem(LS_KEY); } catch (_) {}
    renderChip();
  }
  function isLoggedIn() { return !!(state && state.token && state.user); }
  function currentUser() { return state && state.user; }
  function getToken() { return state && state.token; }

  async function callAuth(action, payload) {
    var r = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ action: action }, payload || {})),
    });
    return r.json();
  }

  // ── 스타일 1회 주입 ────────────────────────────────────────────
  function injectStyle() {
    if (document.getElementById("eaStyle")) return;
    var css = `
    .ea-chip{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:12px;z-index:4000;
      display:inline-flex;align-items:center;gap:6px;max-width:46vw;
      padding:8px 13px;border-radius:9999px;cursor:pointer;-webkit-appearance:none;
      border:1px solid var(--border,#2a2a2a);background:rgba(20,20,20,.82);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
      color:var(--text,#e2e2e2);font-size:12.5px;font-weight:800;font-family:var(--font-body,inherit);
      box-shadow:0 4px 16px rgba(0,0,0,.35)}
    .ea-chip:active{transform:scale(.95)}
    .ea-chip.on{border-color:var(--accent,#ffd700)}
    .ea-chip .ea-chip-nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:30vw}
    .ea-chip-dot{width:7px;height:7px;border-radius:50%;background:var(--accent,#ffd700);flex:none}
    .ea-modal{position:fixed;inset:0;z-index:6000;display:none;align-items:center;justify-content:center;
      padding:24px calc(20px + env(safe-area-inset-right,0)) calc(20px + env(safe-area-inset-bottom,0)) calc(20px + env(safe-area-inset-left,0))}
    .ea-modal.open{display:flex}
    .ea-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.62)}
    .ea-card{position:relative;width:100%;max-width:380px;border-radius:20px;overflow:hidden;
      background:var(--panel,#1b1b1b);border:1px solid var(--border,#2a2a2a);
      box-shadow:0 24px 70px rgba(0,0,0,.6);padding:26px 22px 22px;color:var(--text,#e2e2e2);
      font-family:var(--font-body,inherit);max-height:90vh;overflow-y:auto}
    .ea-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border-radius:50%;cursor:pointer;-webkit-appearance:none;
      border:1px solid var(--border,#2a2a2a);background:rgba(255,255,255,.06);color:var(--text,#fff);font-size:15px;line-height:1}
    .ea-logo{font-size:20px;font-weight:900;letter-spacing:.01em}
    .ea-sub{font-size:12.5px;color:var(--text-dim,#999);margin:5px 0 18px}
    .ea-tabs{display:flex;gap:6px;margin-bottom:16px}
    .ea-tab{flex:1;padding:10px;border-radius:11px;cursor:pointer;-webkit-appearance:none;
      border:1px solid var(--border,#2a2a2a);background:transparent;color:var(--text-dim,#999);font-size:14px;font-weight:800;font-family:inherit}
    .ea-tab.on{background:var(--accent,#ffd700);color:var(--on-accent,#1a1400);border-color:var(--accent,#ffd700)}
    .ea-form{display:flex;flex-direction:column;gap:10px}
    .ea-in{width:100%;box-sizing:border-box;padding:13px 14px;border-radius:11px;font-size:16px;font-family:inherit;
      border:1px solid var(--border,#2a2a2a);background:var(--bg,#131313);color:var(--text,#e2e2e2);outline:none}
    .ea-in:focus{border-color:var(--accent,#ffd700)}
    .ea-in[hidden]{display:none}
    .ea-msg{min-height:17px;font-size:12.5px;font-weight:700;margin:2px 0 0}
    .ea-msg.err{color:var(--err,#ff5540)}
    .ea-msg.ok{color:var(--ok,#ffd700)}
    .ea-submit{margin-top:6px;padding:14px;border-radius:12px;cursor:pointer;-webkit-appearance:none;border:none;
      background:var(--accent,#ffd700);color:var(--on-accent,#1a1400);font-size:15px;font-weight:900;font-family:inherit}
    .ea-submit:active{transform:scale(.99)}
    .ea-submit[disabled]{opacity:.6;cursor:default}
    .ea-foot{margin-top:14px;font-size:11.5px;color:var(--text-dim,#999);text-align:center;line-height:1.5}`;
    var st = document.createElement("style");
    st.id = "eaStyle";
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── 계정 칩(상단 우측) ─────────────────────────────────────────
  function renderChip() {
    injectStyle();
    var chip = document.getElementById("eaChip");
    if (!chip) {
      chip = document.createElement("button");
      chip.type = "button";
      chip.id = "eaChip";
      chip.className = "ea-chip";
      document.body.appendChild(chip);
      chip.addEventListener("click", function () {
        if (isLoggedIn()) {
          if (confirm((currentUser().name || "회원") + "님 — 로그아웃 할까요?")) logout();
        } else {
          openModal(null);
        }
      });
    }
    if (isLoggedIn()) {
      chip.classList.add("on");
      chip.innerHTML = '<span class="ea-chip-dot"></span><span class="ea-chip-nm">' +
        esc(currentUser().name || "회원") + "</span>";
      chip.title = "로그아웃";
    } else {
      chip.classList.remove("on");
      chip.innerHTML = "👤 로그인 / 가입";
      chip.title = "로그인하고 숏폼 만들기";
    }
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ── 로그인/회원가입 모달 ───────────────────────────────────────
  var modalEl = null;
  function buildModal() {
    injectStyle();
    var m = document.createElement("div");
    m.className = "ea-modal";
    m.id = "eaModal";
    m.innerHTML = `
      <div class="ea-backdrop" data-close="1"></div>
      <div class="ea-card">
        <button type="button" class="ea-x" data-close="1" aria-label="닫기">✕</button>
        <div class="ea-logo">⚡ 이지숏폼</div>
        <div class="ea-sub" id="eaSub">로그인하고 내 숏폼을 만들어 보세요</div>
        <div class="ea-tabs">
          <button type="button" class="ea-tab on" data-tab="login">로그인</button>
          <button type="button" class="ea-tab" data-tab="signup">회원가입</button>
        </div>
        <form class="ea-form" id="eaForm" autocomplete="on">
          <input class="ea-in" id="eaName" placeholder="이름 또는 상호" hidden autocomplete="name">
          <input class="ea-in" id="eaId" placeholder="아이디 또는 이메일" autocomplete="username" inputmode="email">
          <input class="ea-in" id="eaPw" type="password" placeholder="비밀번호 (6자 이상)" autocomplete="current-password">
          <input class="ea-in" id="eaPhone" placeholder="연락처(선택)" hidden autocomplete="tel" inputmode="tel">
          <div class="ea-msg" id="eaMsg"></div>
          <button type="submit" class="ea-submit" id="eaSubmit">로그인</button>
        </form>
        <div class="ea-foot">가입은 무료예요. 만든 영상은 이 브라우저에 저장돼요.</div>
      </div>`;
    document.body.appendChild(m);

    var tab = "login";
    var $ = function (id) { return m.querySelector(id); };
    var nameI = $("#eaName"), idI = $("#eaId"), pwI = $("#eaPw"), phoneI = $("#eaPhone");
    var msg = $("#eaMsg"), submit = $("#eaSubmit"), sub = $("#eaSub");

    function setTab(t) {
      tab = t;
      m.querySelectorAll(".ea-tab").forEach(function (b) { b.classList.toggle("on", b.dataset.tab === t); });
      var signup = t === "signup";
      nameI.hidden = !signup;
      phoneI.hidden = !signup;
      pwI.setAttribute("autocomplete", signup ? "new-password" : "current-password");
      submit.textContent = signup ? "가입하고 시작" : "로그인";
      sub.textContent = signup ? "가입하면 바로 숏폼을 만들 수 있어요" : "로그인하고 내 숏폼을 만들어 보세요";
      msg.textContent = "";
      msg.className = "ea-msg";
    }

    m.querySelectorAll(".ea-tab").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.dataset.tab); });
    });
    m.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { closeModal(); });
    });
    // 입력칸 키 입력이 앱 단축키로 새지 않도록
    [nameI, idI, pwI, phoneI].forEach(function (el) {
      el.addEventListener("keydown", function (e) { e.stopPropagation(); });
    });

    $("#eaForm").addEventListener("submit", async function (e) {
      e.preventDefault();
      var loginId = idI.value.trim(), password = pwI.value;
      if (!loginId || !password) { showMsg("아이디와 비밀번호를 입력해주세요.", "err"); return; }
      submit.disabled = true;
      var oldTxt = submit.textContent;
      submit.textContent = tab === "signup" ? "가입 중…" : "로그인 중…";
      showMsg("", "");
      try {
        var payload = { loginId: loginId, password: password };
        if (tab === "signup") { payload.name = nameI.value.trim(); payload.phone = phoneI.value.trim(); }
        var res = await callAuth(tab, payload);
        if (res && res.ok && res.token && res.user) {
          saveState({ token: res.token, user: res.user });
          showMsg("✓ " + (tab === "signup" ? "가입 완료!" : "로그인 완료!"), "ok");
          var cb = pendingCb; pendingCb = null;
          setTimeout(function () { closeModal(); if (typeof cb === "function") { try { cb(); } catch (_) {} } }, 350);
        } else {
          showMsg((res && res.message) || "다시 시도해주세요.", "err");
          submit.disabled = false; submit.textContent = oldTxt;
        }
      } catch (err) {
        showMsg("연결에 실패했어요. 잠시 후 다시 시도해주세요.", "err");
        submit.disabled = false; submit.textContent = oldTxt;
      }
    });

    function showMsg(t, cls) { msg.textContent = t; msg.className = "ea-msg" + (cls ? " " + cls : ""); }

    m._setTab = setTab;
    m._reset = function () {
      pwI.value = ""; msg.textContent = ""; msg.className = "ea-msg";
      submit.disabled = false;
    };
    return m;
  }

  function openModal(cb, startTab) {
    pendingCb = cb || null;
    if (!modalEl) modalEl = buildModal();
    modalEl._setTab(startTab || (isLoggedIn() ? "login" : "signup"));
    modalEl._reset();
    modalEl.classList.add("open");
    setTimeout(function () { var id = modalEl.querySelector("#eaId"); if (id && !id.value) id.focus(); }, 120);
  }
  function closeModal() {
    if (modalEl) modalEl.classList.remove("open");
    pendingCb = null;
  }

  // 로그인돼 있으면 true(호출자가 그대로 진행). 아니면 모달 띄우고 false 반환 →
  // 로그인 성공 후 cb 가 실행돼 원래 동작을 이어감. (로그인 상태에선 cb 호출 안 함 = 재귀 방지)
  function requireLogin(cb) {
    if (isLoggedIn()) return true;
    openModal(cb, "signup");
    return false;
  }

  function logout() { clearState(); }

  window.EasyAuth = {
    isLoggedIn: isLoggedIn,
    currentUser: currentUser,
    getToken: getToken,
    requireLogin: requireLogin,
    openModal: openModal,
    logout: logout,
  };

  // 칩은 앱이 #easyRoot 를 채운 뒤 떠도 되도록, 약간 지연 후 렌더(잠금 화면 제외).
  function boot() {
    if (document.body.classList.contains("es-locked")) { setTimeout(boot, 300); return; }
    renderChip();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
