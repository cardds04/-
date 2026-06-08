/* ───────────────────────────────────────────────────────────────
   이지숏폼 standalone 부트
   · 비밀번호 게이트(간단)  · easy 모드 고정 + 디테일 UI 숨김
   · 첫 실행 시 easy-seed.json 업로드로 템플릿 주입  · API키 상속
   ─────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  // ===== 설정 =====================================================
  // 비밀번호를 바꾸려면 아래 한 줄만 수정하세요.
  const PASSWORD = "6315";
  const UNLOCK_KEY = "easy_unlocked_v1";
  // ================================================================

  const $ = (s) => document.querySelector(s);
  const DB_NAME = "easyShortsDB", STORE = "kv";

  function db() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function idbGet(k) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, "readonly"); const rq = t.objectStore(STORE).get(k); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
  async function idbSet(k, v) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, "readwrite"); t.objectStore(STORE).put(v, k); t.oncomplete = () => res(); t.onerror = () => rej(t.error); }); }

  function b64ToBlob(b64, type) {
    const bin = atob(b64 || "");
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: type || "application/octet-stream" });
  }

  // ── 앱 시작 ─────────────────────────────────────────────────────
  function launchApp() {
    try { localStorage.setItem("es_mode2", "easy"); } catch (_) {}
    document.body.classList.remove("es-locked");
    if (window.EasyShorts && typeof window.EasyShorts.init === "function") {
      try { window.EasyShorts.init(); } catch (e) { console.error("[easy-boot] init", e); }
      // 혹시 detail 로 남아있으면 강제 easy
      setTimeout(() => { try { if (window.EasyShorts.show) window.EasyShorts.show(); } catch (_) {} }, 60);
    } else {
      console.error("[easy-boot] EasyShorts 로드 실패");
    }
  }

  // ── seed 화면 ───────────────────────────────────────────────────
  async function hasTemplates() {
    try { const t = await idbGet("templates"); return Array.isArray(t) && t.length > 0; } catch (_) { return false; }
  }

  function showSeed() {
    const seed = $("#easySeed"); if (seed) seed.hidden = false;
    const msg = $("#easySeedMsg");
    const fileIn = $("#easySeedFile");
    const skip = $("#easySeedSkip");

    if (fileIn) fileIn.addEventListener("change", async () => {
      const f = fileIn.files && fileIn.files[0]; if (!f) return;
      msg.textContent = "불러오는 중…"; msg.className = "easy-seed-msg";
      try {
        const text = await f.text();
        const data = JSON.parse(text);
        if (!data || !data.kv) throw new Error("올바른 easy-seed.json 이 아닙니다.");
        let n = 0, tpl = 0;
        for (const k of Object.keys(data.kv)) {
          const v = data.kv[k];
          if (v && v.__blob) { await idbSet(k, b64ToBlob(v.b64, v.type)); }
          else { await idbSet(k, v); if (k === "templates" && Array.isArray(v)) tpl = v.length; }
          n++;
        }
        if (data.ls) {
          for (const k of Object.keys(data.ls)) { try { localStorage.setItem(k, data.ls[k]); } catch (_) {} }
        }
        msg.textContent = `✓ 템플릿 ${tpl}개 불러옴 — 시작합니다`; msg.className = "easy-seed-msg ok";
        setTimeout(() => { if (seed) seed.hidden = true; launchApp(); }, 700);
      } catch (e) {
        msg.textContent = "✗ " + (e && e.message || "불러오기 실패"); msg.className = "easy-seed-msg err";
      }
    });

    if (skip) skip.addEventListener("click", () => { if (seed) seed.hidden = true; launchApp(); });
  }

  // ── 비밀번호 통과 후 ────────────────────────────────────────────
  async function afterUnlock() {
    const gate = $("#easyGate"); if (gate) gate.hidden = true;
    // 템플릿은 서버(/api/easy-templates)에서 실시간으로 받아옴 → 바로 시작.
    launchApp();
  }

  // ── 게이트 ─────────────────────────────────────────────────────
  function initGate() {
    const gate = $("#easyGate");
    const pw = $("#easyGatePw");
    const btn = $("#easyGateBtn");
    const msg = $("#easyGateMsg");

    let unlocked = false;
    try { unlocked = localStorage.getItem(UNLOCK_KEY) === "1"; } catch (_) {}
    if (unlocked) { afterUnlock(); return; }

    function tryUnlock() {
      const val = (pw && pw.value || "").trim();
      if (val === PASSWORD) {
        try { localStorage.setItem(UNLOCK_KEY, "1"); } catch (_) {}
        afterUnlock();
      } else {
        if (msg) { msg.textContent = "비밀번호가 올바르지 않습니다"; msg.className = "easy-gate-msg err"; }
        if (pw) { pw.value = ""; pw.focus(); }
      }
    }
    if (btn) btn.addEventListener("click", tryUnlock);
    if (pw) pw.addEventListener("keydown", (e) => { if (e.key === "Enter") tryUnlock(); });
    setTimeout(() => { if (pw) pw.focus(); }, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initGate);
  else initGate();
})();
