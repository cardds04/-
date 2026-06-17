/* ───────────────────────────────────────────────────────────────
   이지숏폼 — 홈 화면에 앱으로 설치(PWA)
   · 안드로이드/크롬: beforeinstallprompt 잡아두고 버튼 누르면 설치창
   · 아이폰/사파리: 설치창 API 없음 → 버튼 누르면 '공유 → 홈 화면에 추가' 안내
   · 이미 설치(standalone)면 버튼 안 보임
   ─────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  // 서비스워커 등록(설치 가능 조건 + 오프라인 진입)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  var isStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (isStandalone) return; // 이미 앱으로 설치됨

  var isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  var deferred = null;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    show();
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    hide();
  });

  function injectStyle() {
    if (document.getElementById("eaPwaStyle")) return;
    var css =
      ".ea-install{position:fixed;top:calc(8px + env(safe-area-inset-top,0px));right:118px;z-index:3950;" +
      "display:none;align-items:center;gap:5px;padding:8px 12px;border-radius:9999px;cursor:pointer;-webkit-appearance:none;" +
      "border:1px solid var(--accent,#ffd700);background:var(--accent,#ffd700);color:var(--on-accent,#1a1400);" +
      "font-size:12px;font-weight:900;font-family:var(--font-body,inherit);box-shadow:0 4px 14px rgba(0,0,0,.4)}" +
      ".ea-install.on{display:inline-flex}.ea-install:active{transform:scale(.95)}" +
      ".ea-ios{position:fixed;inset:0;z-index:6100;display:none;align-items:flex-end;justify-content:center;padding:0}" +
      ".ea-ios.on{display:flex}.ea-ios-bd{position:absolute;inset:0;background:rgba(0,0,0,.6)}" +
      ".ea-ios-card{position:relative;width:100%;max-width:460px;background:var(--panel,#1b1b1b);color:var(--text,#e2e2e2);" +
      "border:1px solid var(--border,#2a2a2a);border-bottom:0;border-radius:20px 20px 0 0;padding:22px 22px calc(26px + env(safe-area-inset-bottom,0px));" +
      "font-family:var(--font-body,inherit);box-shadow:0 -20px 60px rgba(0,0,0,.5)}" +
      ".ea-ios-card h3{margin:0 0 12px;font-size:17px;font-weight:900}" +
      ".ea-ios-step{display:flex;align-items:center;gap:10px;font-size:14px;line-height:1.5;margin:9px 0}" +
      ".ea-ios-n{flex:none;width:24px;height:24px;border-radius:50%;background:var(--accent,#ffd700);color:var(--on-accent,#1a1400);" +
      "font-weight:900;font-size:13px;display:flex;align-items:center;justify-content:center}" +
      ".ea-ios-x{margin-top:16px;width:100%;padding:13px;border:none;border-radius:12px;cursor:pointer;-webkit-appearance:none;" +
      "background:var(--accent,#ffd700);color:var(--on-accent,#1a1400);font-size:15px;font-weight:900;font-family:inherit}";
    var st = document.createElement("style");
    st.id = "eaPwaStyle";
    st.textContent = css;
    document.head.appendChild(st);
  }

  var btnEl = null;
  function ensureBtn() {
    injectStyle();
    if (btnEl) return btnEl;
    btnEl = document.createElement("button");
    btnEl.type = "button";
    btnEl.className = "ea-install";
    btnEl.innerHTML = "📲 앱 설치";
    btnEl.title = "홈 화면에 앱으로 추가";
    btnEl.addEventListener("click", onClick);
    document.body.appendChild(btnEl);
    return btnEl;
  }
  var wanted = false;
  // 홈 화면(추천 레일 보임)이고 제작 마법사가 아닐 때만 — 사용자 요청: 설치 못 숨기면 홈에서만
  function isHome() {
    return !!document.querySelector(".es-cust-grid-featured") &&
      !document.querySelector(".es-wiz, .es-cl-stage, .es-length-step, .es-wiz-body");
  }
  function positionBtn() {
    if (!btnEl) return;
    var chip = document.getElementById("eaChip");
    if (chip && getComputedStyle(chip).display !== "none") btnEl.style.right = (chip.offsetWidth + 24) + "px";   // 계정칩 왼쪽
    else btnEl.style.right = "12px";
  }
  function refresh() {
    if (!wanted || !btnEl) return;
    if (isHome()) { btnEl.classList.add("on"); positionBtn(); }
    else btnEl.classList.remove("on");
  }
  function show() {
    if (document.body.classList.contains("es-locked")) {
      setTimeout(show, 400);
      return;
    }
    wanted = true;
    ensureBtn();
    refresh();
    if (!window._eaInstallTick) window._eaInstallTick = setInterval(refresh, 1200);   // 화면 이동 시 홈에서만 보이게 갱신
  }
  function hide() {
    wanted = false;
    if (btnEl) btnEl.classList.remove("on");
  }

  function onClick() {
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.then(function () {
        deferred = null;
        hide();
      });
      return;
    }
    if (isiOS) {
      showIosGuide();
      return;
    }
    // 안드로이드인데 설치창이 아직 준비 안 됐을 때
    alert("브라우저 메뉴(⋮)에서 '앱 설치' 또는 '홈 화면에 추가'를 눌러주세요.");
  }

  var iosEl = null;
  function showIosGuide() {
    injectStyle();
    if (!iosEl) {
      iosEl = document.createElement("div");
      iosEl.className = "ea-ios";
      iosEl.innerHTML =
        '<div class="ea-ios-bd" data-x="1"></div>' +
        '<div class="ea-ios-card">' +
        "<h3>📲 홈 화면에 추가하기</h3>" +
        '<div class="ea-ios-step"><span class="ea-ios-n">1</span>아래 <b>공유 버튼</b>(⬆️ 네모에 화살표)을 눌러요</div>' +
        '<div class="ea-ios-step"><span class="ea-ios-n">2</span>목록에서 <b>‘홈 화면에 추가’</b>를 선택해요</div>' +
        '<div class="ea-ios-step"><span class="ea-ios-n">3</span>오른쪽 위 <b>‘추가’</b>를 누르면 끝!</div>' +
        '<button type="button" class="ea-ios-x" data-x="1">알겠어요</button>' +
        "</div>";
      document.body.appendChild(iosEl);
      iosEl.querySelectorAll("[data-x]").forEach(function (b) {
        b.addEventListener("click", function () {
          iosEl.classList.remove("on");
        });
      });
    }
    iosEl.classList.add("on");
  }

  function boot() {
    if (document.body.classList.contains("es-locked")) {
      setTimeout(boot, 400);
      return;
    }
    if (isiOS) show(); // 아이폰은 beforeinstallprompt 가 없으니 버튼을 바로 노출
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* ───────────────────────────────────────────────────────────────
   🔄 업데이트 버튼 — 설치된 PWA 는 새로고침이 어렵고, sw.js 자체는
   배포마다 안 바뀌므로(스크립트 ?v= 만 바뀜) SW updatefound 가 안 뜬다.
   → 라이브 index.html 의 easyshorts.js?v= 를 현재 로드된 버전과 비교해
   새 버전이면 버튼을 띄우고, 누르면 캐시 비우고 최신으로 갈아끼운다.
   (설치/브라우저 모드 무관하게 항상 동작 — 위 설치 IIFE 와 별개)
   ─────────────────────────────────────────────────────────────── */
(function () {
  "use strict";
  // 앱 핵심 파일들의 ?v= 를 모아 '버전 지문' 으로 — 하나라도 바뀌면 새 버전으로 인식
  var FILES = ["easyshorts.js", "easyshorts.css", "easy-mobile.css", "easy-pwa.js"];
  function curSig() {
    return FILES.map(function (f) {
      var el = document.querySelector('script[src*="' + f + '"], link[href*="' + f + '"]');
      var u = el ? (el.src || el.getAttribute("href") || "") : "";
      var m = u.match(/[?&]v=(\d+)/);
      return m ? m[1] : "0";
    }).join(".");
  }
  function htmlSig(html) {
    return FILES.map(function (f) {
      var m = html.match(new RegExp(f.replace(/\./g, "\\.") + "\\?v=(\\d+)"));
      return m ? m[1] : "0";
    }).join(".");
  }
  var CUR = curSig();
  var shown = false, btn = null;

  function injectStyle() {
    if (document.getElementById("eaUpStyle")) return;
    var css =
      ".ea-update{position:fixed;left:50%;transform:translateX(-50%);top:calc(8px + env(safe-area-inset-top,0px));z-index:6300;" +
      "display:none;align-items:center;gap:7px;padding:10px 16px;border-radius:9999px;cursor:pointer;-webkit-appearance:none;border:none;" +
      "background:#ff7a3d;color:#fff;font-size:13px;font-weight:900;font-family:var(--font-body,inherit);box-shadow:0 6px 20px rgba(0,0,0,.45);" +
      "animation:eaUpPulse 1.7s ease-in-out infinite}" +
      ".ea-update.on{display:inline-flex}.ea-update:active{transform:translateX(-50%) scale(.95)}" +
      ".ea-update:disabled{opacity:.7;animation:none}" +
      "@keyframes eaUpPulse{0%,100%{box-shadow:0 6px 20px rgba(0,0,0,.45)}50%{box-shadow:0 6px 28px rgba(255,122,61,.75)}}";
    var st = document.createElement("style"); st.id = "eaUpStyle"; st.textContent = css; document.head.appendChild(st);
  }
  function ensureBtn() {
    injectStyle();
    if (btn) return btn;
    btn = document.createElement("button");
    btn.type = "button"; btn.className = "ea-update";
    btn.innerHTML = "🔄 새 버전 — 업데이트";
    btn.addEventListener("click", doUpdate);
    document.body.appendChild(btn);
    return btn;
  }
  function showBtn() { if (shown) return; shown = true; ensureBtn().classList.add("on"); }

  function doUpdate() {
    if (btn) { btn.disabled = true; btn.innerHTML = "⏳ 업데이트 중…"; }
    var fresh = function () { try { location.replace(location.pathname + "?fresh=" + Date.now()); } catch (e) { try { location.reload(); } catch (_) {} } };
    var jobs = [];
    try { if (window.caches) jobs.push(caches.keys().then(function (ks) { return Promise.all(ks.map(function (k) { return caches.delete(k); })); })); } catch (e) {}
    try { if (navigator.serviceWorker) jobs.push(navigator.serviceWorker.getRegistrations().then(function (rs) { return Promise.all(rs.map(function (r) { return r.update().catch(function () {}); })); })); } catch (e) {}
    Promise.all(jobs).then(fresh, fresh);
    setTimeout(fresh, 4000);   // 안전장치: 4초 안에 안 끝나면 그냥 갱신
  }

  function check() {
    try {
      fetch("index.html?u=" + Date.now(), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (html) {
          if (!html) return;
          if (htmlSig(html) !== CUR) showBtn();   // 어느 파일이든 버전이 바뀌면 새 버전
        })
        .catch(function () {});
    } catch (e) {}
  }
  function start() {
    if (document.body.classList.contains("es-locked")) { setTimeout(start, 600); return; }
    check();
    document.addEventListener("visibilitychange", function () { if (!document.hidden) check(); });   // 앱 다시 켤 때마다 확인
    setInterval(check, 90000);   // 90초마다
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
