/* ───────────────────────────────────────────────────────────────
   이지숏폼 (Easy Shortform) — 인스타그램 릴스 '템플릿' 방식 베타
   ───────────────────────────────────────────────────────────────
   인스타 릴스 템플릿의 핵심 동작을 그대로 베낀 구조:
     · 템플릿 = 순서가 있는 '슬롯' 목록. 각 슬롯은 고정 길이(초)를 갖고
       하나의 음악(오디오)에 맞춰져 있다.
     · 템플릿을 '사용'하면 → 각 슬롯에 사진/영상만 끌어다 넣는다.
       넣은 미디어는 슬롯 길이에 맞춰 잘려서 순서대로, 같은 음악에 싱크되어
       자동으로 한 편의 영상으로 조립된다.
     · 여러 파일을 한 번에 넣으면(자동 싱크) 순서대로 슬롯을 채운다.
     · 템플릿을 많이 만들어 두면, 다음엔 미디어만 넣어 아주 쉽게 새 영상 완성.

   self-contained IIFE — window.EasyShorts = { init, show, hide }
   grade_studio 색 토큰(--bg/--panel/--accent…) 재사용.
   ─────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const fmtT = (s) => {
    s = Math.max(0, s || 0);
    const m = Math.floor(s / 60), x = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
  };

  const ASPECTS = {
    "9:16": { w: 9, h: 16, label: "세로 9:16" },
    "1:1": { w: 1, h: 1, label: "정사각 1:1" },
    "16:9": { w: 16, h: 9, label: "가로 16:9" },
  };

  // 상태 ──────────────────────────────────────────────────────────
  const E = {
    inited: false,
    templates: [],          // [{id,name,aspect,slots:[{id,dur,label}],music:{name,dur} | null, createdAt}]
    view: "gallery",        // gallery | builder | use
    editing: null,          // 빌더에서 편집중인 템플릿 (작업본)
    editMusicBlob: null,    // 빌더에서 새로 넣은 음악 Blob (저장 시 IDB 기록)
    editMusicUrl: null,     // 빌더 음악 미리듣기 URL
    using: null,            // { template, musicUrl, fills:{slotId:{kind,url,name,dur}} }
    playing: false,
    playhead: 0,
    _clock: 0,
    _raf: null,
    _curSlot: -1,
    reelsOn: false,         // 릴스화면(UI 오버레이) 적용 여부
    reelsUrl: null,         // 릴스 UI PNG objectURL
    projects: [],           // 저장한 내 영상(결과물) 목록
    mode2: "easy",          // "easy"(간소화) | "detail"(자세한 작업장)
  };
  // 움직임 효과(Ken Burns) — 슬롯별 지정. 0→1 진행도 p 에 따라 transform 보간.
  const EFFECTS = [
    { k: "none", label: "효과 없음" },
    { k: "zoomIn", label: "확대(줌인)" },
    { k: "zoomOut", label: "축소(줌아웃)" },
    { k: "panLeft", label: "왼쪽으로 이동" },
    { k: "panRight", label: "오른쪽으로 이동" },
    { k: "panUp", label: "위로 이동" },
    { k: "panDown", label: "아래로 이동" },
    { k: "zoomInLeft", label: "확대+왼쪽" },
    { k: "zoomInRight", label: "확대+오른쪽" },
    { k: "zoomInUp", label: "확대+위" },
    { k: "zoomInDown", label: "확대+아래" },
  ];
  const FX_RANDOM_POOL = EFFECTS.filter((e) => e.k !== "none").map((e) => e.k);
  // 가장자리(검은 여백)가 어떤 p 에서도 안 보이도록 안전 범위. tx/ty 는 요소 너비/높이의 비율.
  function fxParams(fx, p) {
    p = clamp(p, 0, 1);
    const L = (a, b) => a + (b - a) * p;
    switch (fx) {
      case "zoomIn": return { s: L(1.06, 1.34), tx: 0, ty: 0 };
      case "zoomOut": return { s: L(1.34, 1.06), tx: 0, ty: 0 };
      case "panLeft": return { s: 1.3, tx: L(0.09, -0.09), ty: 0 };
      case "panRight": return { s: 1.3, tx: L(-0.09, 0.09), ty: 0 };
      case "panUp": return { s: 1.3, tx: 0, ty: L(0.09, -0.09) };
      case "panDown": return { s: 1.3, tx: 0, ty: L(-0.09, 0.09) };
      case "zoomInLeft": return { s: L(1.2, 1.42), tx: L(0.05, -0.05), ty: 0 };
      case "zoomInRight": return { s: L(1.2, 1.42), tx: L(-0.05, 0.05), ty: 0 };
      case "zoomInUp": return { s: L(1.2, 1.42), tx: 0, ty: L(0.05, -0.05) };
      case "zoomInDown": return { s: L(1.2, 1.42), tx: 0, ty: L(-0.05, 0.05) };
      default: return { s: 1.02, tx: 0, ty: 0 };
    }
  }
  function fxTransform(fx, p) {
    const { s, tx, ty } = fxParams(fx, p);
    return `scale(${s}) translate(${tx * 100}%, ${ty * 100}%)`;
  }
  // 인덱스 기반 의사난수(난수 API 없이 슬롯마다 다른 효과)
  function pseudoFx(i) { return FX_RANDOM_POOL[((i * 7 + 3) * 2654435761 >>> 0) % FX_RANDOM_POOL.length]; }
  // ── 글자(자막) 진입 효과 ──
  const TEXT_FX = [
    { k: "none", label: "없음" },
    { k: "fade", label: "페이드" },
    { k: "pop", label: "팝" },
    { k: "up", label: "위로 슬라이드" },
    { k: "down", label: "아래 슬라이드" },
    { k: "type", label: "타자기" },
  ];
  const TEXT_FX_POOL = TEXT_FX.filter((e) => e.k !== "none").map((e) => e.k);
  // tp = 자막 표시 구간 내 진행도(0..1). 앞 25% 구간에서 진입 애니메이션. {opacity, scale, dx, dy(요소높이 비율), clip(좌→우 노출 0..1)}
  function textFx(fx, tp) {
    tp = clamp(tp, 0, 1);
    const e = clamp(tp / 0.25, 0, 1);
    const ease = 1 - Math.pow(1 - e, 3);
    const back = 1 + 2.70158 * Math.pow(e - 1, 3) + 1.70158 * Math.pow(e - 1, 2);   // easeOutBack(오버슈트)
    switch (fx) {
      case "fade": return { opacity: ease, scale: 1, dx: 0, dy: 0, clip: 1 };
      case "pop": return { opacity: ease, scale: 0.4 + 0.6 * back, dx: 0, dy: 0, clip: 1 };
      case "up": return { opacity: ease, scale: 1, dx: 0, dy: (1 - ease) * 0.5, clip: 1 };
      case "down": return { opacity: ease, scale: 1, dx: 0, dy: -(1 - ease) * 0.5, clip: 1 };
      case "type": return { opacity: 1, scale: 1, dx: 0, dy: 0, clip: ease };
      default: return { opacity: 1, scale: 1, dx: 0, dy: 0, clip: 1 };
    }
  }

  const isTextSel = (id) => !!(E.using && Array.isArray(E.using.selTexts) && E.using.selTexts.includes(id));
  const selTextObjs = () => (E.using && E.using.selTexts ? E.using.texts.filter((t) => E.using.selTexts.includes(t.id)) : []);

  // IndexedDB ─────────────────────────────────────────────────────
  const DB_NAME = "easyShortsDB", STORE = "kv";
  let _dbP = null;
  function db() {
    if (_dbP) return _dbP;
    _dbP = new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return _dbP;
  }
  async function idbSet(k, v) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, "readwrite"); t.objectStore(STORE).put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
  async function idbGet(k) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, "readonly"); const rq = t.objectStore(STORE).get(k); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); }); }
  async function idbDel(k) { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, "readwrite"); t.objectStore(STORE).delete(k); t.oncomplete = res; t.onerror = () => rej(t.error); }); }

  async function saveTemplates() {
    const meta = E.templates.map((t) => ({ id: t.id, name: t.name, aspect: t.aspect, slots: t.slots, music: t.music || null, createdAt: t.createdAt }));
    try { await idbSet("templates", meta); } catch (e) { console.warn("[easyshorts] saveTemplates", e); }
  }
  async function loadTemplates() {
    try { const m = await idbGet("templates"); E.templates = Array.isArray(m) ? m : []; }
    catch (_) { E.templates = []; }
  }
  async function musicBlobUrl(templateId) {
    try { const b = await idbGet("music_" + templateId); if (b instanceof Blob) return URL.createObjectURL(b); } catch (_) {}
    return null;
  }

  // 미디어 길이 측정 ────────────────────────────────────────────────
  function mediaDuration(url, isVideo) {
    return new Promise((res) => {
      if (!isVideo) { res(0); return; }
      const v = document.createElement("video");
      v.preload = "metadata"; v.muted = true; v.src = url;
      v.onloadedmetadata = () => res(isFinite(v.duration) ? v.duration : 0);
      v.onerror = () => res(0);
    });
  }

  // 세션(작업물) 저장/복원 ─────────────────────────────────────────
  // 'session' 키에 메타(템플릿·글자·재생위치·채움목록), 'sessFill_<slotId>' 키에 미디어 Blob 저장.
  function saveFillBlob(slotId, file) { if (file instanceof Blob) idbSet("sessFill_" + slotId, file).catch(() => {}); }
  function delFillBlob(slotId) { idbDel("sessFill_" + slotId).catch(() => {}); }
  let _metaT = null;
  function scheduleSaveMeta() { if (_metaT) clearTimeout(_metaT); _metaT = setTimeout(saveMeta, 400); }
  async function saveMeta() {
    try {
      if (!E.using) { await idbDel("session"); return; }
      const u = E.using;
      const fillMeta = {};
      Object.keys(u.fills).forEach((id) => { const f = u.fills[id]; fillMeta[id] = { kind: f.kind, name: f.name, dur: f.dur }; });
      await idbSet("session", {
        view: "use", templateId: u.template.id, template: u.template,
        texts: u.texts, playhead: E.playhead, fillMeta, fillSlotIds: Object.keys(u.fills),
        musicChanged: !!u._musicChanged,
      });
    } catch (e) { console.warn("[easyshorts] saveMeta", e); }
  }
  async function clearSession() {
    if (_metaT) { clearTimeout(_metaT); _metaT = null; }
    try {
      const s = await idbGet("session");
      if (s && s.fillSlotIds) for (const id of s.fillSlotIds) { try { await idbDel("sessFill_" + id); } catch (_) {} }
      try { await idbDel("sessMusic"); } catch (_) {}
      await idbDel("session");
    } catch (_) {}
  }
  async function restoreSession() {
    try {
      const s = await idbGet("session");
      if (!s || !s.template || !Array.isArray(s.template.slots)) return false;
      let musicUrl = null;
      if (s.musicChanged) { try { const b = await idbGet("sessMusic"); if (b instanceof Blob) musicUrl = URL.createObjectURL(b); } catch (_) {} }
      if (!musicUrl && s.template.music) musicUrl = await musicBlobUrl(s.templateId);
      const fills = {};
      for (const id of (s.fillSlotIds || [])) {
        const blob = await idbGet("sessFill_" + id);
        if (!(blob instanceof Blob)) continue;
        const meta = (s.fillMeta || {})[id] || {};
        const kind = meta.kind || (/^video\//.test(blob.type) ? "video" : "image");
        fills[id] = { kind, name: meta.name || "", dur: meta.dur || 0, url: URL.createObjectURL(blob), _file: blob };
      }
      E.using = { template: s.template, musicUrl, fills, texts: Array.isArray(s.texts) ? s.texts : [], selText: null, selTexts: [], _musicChanged: !!s.musicChanged };
      E.playhead = s.playhead || 0;
      E.view = "use";
      return true;
    } catch (e) { console.warn("[easyshorts] restoreSession", e); return false; }
  }

  // ── 내 영상(저장한 결과물) ───────────────────────────────────────
  async function loadProjects() { try { const m = await idbGet("projects"); E.projects = Array.isArray(m) ? m : []; } catch (_) { E.projects = []; } }
  async function saveProjectsList() {
    const meta = E.projects.map((p) => ({ id: p.id, name: p.name, aspect: p.aspect, total: p.total, slotCount: p.slotCount, thumb: p.thumb, thumbV: p.thumbV, createdAt: p.createdAt }));
    try { await idbSet("projects", meta); } catch (e) { console.warn("[easyshorts] saveProjectsList", e); }
  }
  function drawCover(ctx, media, mw, mh, W, H) {
    if (!mw || !mh) return;
    const s = Math.max(W / mw, H / mh), dw = mw * s, dh = mh * s;
    ctx.drawImage(media, (W - dw) / 2, (H - dh) / 2, dw, dh);
  }
  function makeThumb() {
    return new Promise((res) => {
      const asp = ASPECTS[E.using.template.aspect] || ASPECTS["9:16"];
      const W = 720, H = Math.round(W * asp.h / asp.w);
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d"); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      let first = null;
      for (const s of E.using.template.slots) { if (E.using.fills[s.id]) { first = E.using.fills[s.id]; break; } }
      if (!first) { res(cv.toDataURL("image/jpeg", 0.9)); return; }
      if (first.kind === "image") {
        const im = new Image(); im.onload = () => { drawCover(ctx, im, im.naturalWidth, im.naturalHeight, W, H); res(cv.toDataURL("image/jpeg", 0.9)); };
        im.onerror = () => res(cv.toDataURL("image/jpeg", 0.9)); im.src = first.url;
      } else {
        const v = document.createElement("video"); v.muted = true; v.src = first.url;
        v.onloadeddata = () => { try { drawCover(ctx, v, v.videoWidth, v.videoHeight, W, H); } catch (_) {} res(cv.toDataURL("image/jpeg", 0.9)); };
        v.onerror = () => res(cv.toDataURL("image/jpeg", 0.9));
      }
    });
  }
  // Blob → 고화질 커버 썸네일 dataURL
  function drawBlobThumb(blob, W, H) {
    return new Promise((res) => {
      const url = URL.createObjectURL(blob);
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d"); ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
      const fin = (media, mw, mh) => { try { drawCover(ctx, media, mw, mh, W, H); } catch (_) {} const d = cv.toDataURL("image/jpeg", 0.9); try { URL.revokeObjectURL(url); } catch (_) {} res(d); };
      if (/^video\//.test(blob.type)) { const v = document.createElement("video"); v.muted = true; v.src = url; v.onloadeddata = () => fin(v, v.videoWidth, v.videoHeight); v.onerror = () => { try { URL.revokeObjectURL(url); } catch (_) {} res(null); }; }
      else { const im = new Image(); im.onload = () => fin(im, im.naturalWidth, im.naturalHeight); im.onerror = () => { try { URL.revokeObjectURL(url); } catch (_) {} res(null); }; im.src = url; }
    });
  }
  // 기존 저해상도 썸네일을 고화질로 한 번 업그레이드
  async function regenAllThumbs() {
    let changed = false;
    for (const p of E.projects) {
      if (p.thumbV === 2) continue;
      try {
        const rec = await idbGet("proj_" + p.id + "_data");
        if (rec && rec.fillSlotIds) {
          let blob = null;
          for (const sid of rec.fillSlotIds) { const b = await idbGet("proj_" + p.id + "_fill_" + sid); if (b instanceof Blob) { blob = b; break; } }
          if (blob) {
            const asp = ASPECTS[p.aspect || rec.aspect || "9:16"] || ASPECTS["9:16"];
            const d = await drawBlobThumb(blob, 720, Math.round(720 * asp.h / asp.w));
            if (d) p.thumb = d;
          }
        }
        p.thumbV = 2; changed = true;
      } catch (_) {}
    }
    if (changed) { try { await saveProjectsList(); } catch (_) {} }
  }
  async function saveCurrentProject() {
    if (!E.using) return;
    const u = E.using, id = uid();
    const fillMeta = {};
    for (const slotId of Object.keys(u.fills)) {
      const f = u.fills[slotId];
      fillMeta[slotId] = { kind: f.kind, name: f.name, dur: f.dur };
      if (f._file instanceof Blob) { try { await idbSet("proj_" + id + "_fill_" + slotId, f._file); } catch (_) {} }
    }
    let hasMusic = false;
    try {
      let b = null;
      if (u._musicChanged) b = await idbGet("sessMusic");
      else if (u.template.music) b = await idbGet("music_" + u.template.id);
      if (b instanceof Blob) { await idbSet("proj_" + id + "_music", b); hasMusic = true; }
    } catch (_) {}
    const thumb = await makeThumb();
    const d = new Date();
    const label = `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const rec = {
      id, name: (u.template.name || "내 영상") + " · " + label, aspect: u.template.aspect,
      total: totalDur(), slotCount: u.template.slots.length, thumb, createdAt: d.getTime(),
      template: u.template, texts: u.texts, fillMeta, fillSlotIds: Object.keys(u.fills),
      hasMusic, reelsOn: E.reelsOn,
    };
    try { await idbSet("proj_" + id + "_data", rec); } catch (e) { console.warn(e); }
    E.projects.unshift({ id: rec.id, name: rec.name, aspect: rec.aspect, total: rec.total, slotCount: rec.slotCount, thumb, thumbV: 2, createdAt: rec.createdAt });
    await saveProjectsList();
    alert("저장됐어요! '내 영상' 목록에서 볼 수 있어요.");
  }
  async function loadProject(id, autoplay) {
    let rec = null; try { rec = await idbGet("proj_" + id + "_data"); } catch (_) {}
    if (!rec || !rec.template) { alert("영상 데이터를 찾을 수 없어요."); return; }
    await clearSession();
    const fills = {};   // 템플릿으로 새로 시작 — 사진은 비운 채로, 내가 새로 채움(구조·음악·문구만 가져옴)
    let musicUrl = null, musicChanged = false;
    if (rec.hasMusic) { try { const b = await idbGet("proj_" + id + "_music"); if (b instanceof Blob) { musicUrl = URL.createObjectURL(b); musicChanged = true; await idbSet("sessMusic", b); } } catch (_) {} }
    E.using = { template: rec.template, musicUrl, fills, texts: Array.isArray(rec.texts) ? rec.texts : [], selText: null, selTexts: [], _musicChanged: musicChanged, _projId: id };
    E.playhead = 0;
    E.easyStep = 1; E.easyPhase = "after";
    if (typeof rec.reelsOn === "boolean") E.reelsOn = rec.reelsOn;
    setView("use"); scheduleSaveMeta();
    if (autoplay) setTimeout(() => { try { seek(0); startPlay(); } catch (_) {} }, 200);   // 바로 재생
  }
  async function deleteProject(id) {
    const p = E.projects.find((x) => x.id === id); if (!p) return;
    if (!confirm("이 영상을 삭제할까요?")) return;
    try {
      const rec = await idbGet("proj_" + id + "_data");
      if (rec && rec.fillSlotIds) for (const sid of rec.fillSlotIds) { try { await idbDel("proj_" + id + "_fill_" + sid); } catch (_) {} }
      await idbDel("proj_" + id + "_music"); await idbDel("proj_" + id + "_data");
    } catch (_) {}
    E.projects = E.projects.filter((x) => x.id !== id);
    await saveProjectsList();
    if (E.mode2 === "easy") renderEasy(); else renderGallery();
  }
  // 현재 작업 이름이 바뀌면 — 저장된 영상에서 불러온 경우 목록·기록에도 반영
  async function renameCurrentProject(name) {
    if (!E.using) return;
    const v = (name || "").trim();
    E.using.template.name = v;
    scheduleSaveMeta();
    const pid = E.using._projId; if (!pid) return;
    const p = E.projects.find((x) => x.id === pid);
    if (p) { p.name = v || "내 영상"; await saveProjectsList(); }
    try { const rec = await idbGet("proj_" + pid + "_data"); if (rec) { rec.name = v || "내 영상"; if (rec.template) rec.template.name = v; await idbSet("proj_" + pid + "_data", rec); } } catch (_) {}
  }

  // ── 만든 영상 다운로드 (캔버스 녹화 → webm) ──────────────────────
  function wrapByChar(ctx, text, maxW, out) {
    let line = "";
    for (const ch of text) { const test = line + ch; if (ctx.measureText(test).width > maxW && line) { out.push(line); line = ch; } else line = test; }
    out.push(line);
  }
  // 영상을 그리는 한 프레임 합성 (오프라인 인코딩/녹화/인라인 재생 공용)
  // st = { fills, texts, fxSpeed } — 없으면 현재 작업(E.using) 기준
  function composeFrame(ctx, W, H, t, arr, imgs, expVideo, reelsImg, st) {
    st = st || { fills: E.using.fills, texts: E.using.texts, fxSpeed: E.using.template.fxSpeed };
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    let idx = arr.findIndex((a) => t >= a.start && t < a.end); if (idx < 0) idx = arr.length - 1;
    const seg = arr[idx], f = st.fills[seg.slot.id];
    const segDur = (seg.end - seg.start) || 1, speed = st.fxSpeed || 1;
    const p = clamp((t - seg.start) / segDur * speed, 0, 1);
    // 한 컷의 미디어를 그림 — alpha=투명도, clipW=왼쪽부터 보일 너비 비율(슬라이드용)
    const drawSeg = (sg, pp, alpha, clipW, xform) => {
      const ff = st.fills[sg.slot.id]; if (!ff) return;
      let media = null, mw = 0, mh = 0;
      if (ff.kind === "image") { media = imgs[sg.slot.id]; if (media) { mw = media.naturalWidth; mh = media.naturalHeight; } }
      else { media = expVideo; mw = expVideo.videoWidth; mh = expVideo.videoHeight; }
      if (!media || !mw || !mh) return;
      const { s: sc, tx, ty } = xform || fxParams(sg.slot.fx || "none", pp);
      ctx.save();
      if (clipW != null && clipW < 1) { ctx.beginPath(); ctx.rect(0, 0, clipW * W, H); ctx.clip(); }
      if (alpha != null) ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(tx * W, ty * H);
      const cover = Math.max(W / mw, H / mh), dw = mw * cover, dh = mh * cover;
      try { ctx.drawImage(media, -dw / 2, -dh / 2, dw, dh); } catch (_) {}
      ctx.restore();
    };
    const trans = seg.slot.trans, transDur = seg.slot.transDur || 0.6;
    const prevSeg = idx > 0 ? arr[idx - 1] : null;
    const prevF = prevSeg && st.fills[prevSeg.slot.id];
    const inTrans = trans && trans !== "none" && f && f.kind === "image" && prevF && prevF.kind === "image" && (t - seg.start) < transDur;
    if (inTrans) {
      const tp = clamp((t - seg.start) / transDur, 0, 1);
      // 뒤 컷 프레이밍: 시작엔 앞 컷의 끝 프레이밍, 끝날수록 자기 효과로 보간 → 어긋남 없음
      const pe = fxParams(prevSeg.slot.fx || "none", 1), cn = fxParams(seg.slot.fx || "none", p);
      const lp = (a, b) => a + (b - a) * tp;
      const eff = { s: lp(pe.s, cn.s), tx: lp(pe.tx, cn.tx), ty: lp(pe.ty, cn.ty) };
      drawSeg(prevSeg, 1, 1, null, pe);               // 앞 컷(끝 상태 고정)
      if (trans === "wipe") drawSeg(seg, p, 1, tp, eff);   // 왼→오 슬라이드 reveal
      else drawSeg(seg, p, tp, null, eff);            // 디졸브(크로스페이드)
    } else if (f) {
      drawSeg(seg, p, null, null);
    }
    (st.texts || []).forEach((txt) => {
      if (!(t >= (txt.start || 0) && t < (txt.start || 0) + (txt.dur || 0))) return;
      const f = (txt.fx && txt.fx !== "none") ? textFx(txt.fx, (t - (txt.start || 0)) / (txt.dur || 1)) : null;
      const fontPx = Math.min(txt.size / 100 * W, txt.size * 1.6 / 100 * H);
      ctx.font = `${txt.bold ? "800" : "500"} ${fontPx}px -apple-system, "Apple SD Gothic Neo", sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = txt.color || "#fff";
      const cx = (txt.xPct || 50) / 100 * W, cy = (txt.yPct || 50) / 100 * H, maxW = (txt.width || 70) / 100 * W;
      const lines = []; (txt.text || "").split("\n").forEach((rl) => wrapByChar(ctx, rl, maxW, lines));
      const lh = fontPx * 1.2, blockH = lines.length * lh, startY = cy - (lines.length - 1) * lh / 2;
      ctx.save();
      if (f) {
        ctx.globalAlpha = clamp(f.opacity, 0, 1);
        ctx.translate(cx, cy); ctx.scale(f.scale, f.scale); ctx.translate(-cx, -cy);
        if (f.dy) ctx.translate(0, f.dy * blockH);
        if (f.clip < 1) { let mw = 0; lines.forEach((ln) => { mw = Math.max(mw, ctx.measureText(ln).width); }); ctx.beginPath(); ctx.rect(cx - mw / 2, 0, f.clip * mw, H); ctx.clip(); }
      }
      if (txt.shadow) { ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = fontPx * 0.25; ctx.shadowOffsetY = fontPx * 0.08; }
      lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lh));
      ctx.restore();
    });
    if (reelsImg && reelsImg.complete) { try { ctx.drawImage(reelsImg, 0, 0, W, H); } catch (_) {} }
  }
  function outputSize() {
    const asp = ASPECTS[E.using.template.aspect] || ASPECTS["9:16"];
    if (asp.w === asp.h) return { W: 1080, H: 1080 };
    if (asp.w > asp.h) return { W: 1920, H: 1080 };
    return { W: 1080, H: 1920 };
  }
  async function preloadExportMedia() {
    const imgs = {};
    for (const s of E.using.template.slots) {
      const f = E.using.fills[s.id];
      if (f && f.kind === "image") { const im = new Image(); im.src = f.url; try { await im.decode(); } catch (_) {} imgs[s.id] = im; }
    }
    let reelsImg = null;
    if (E.reelsOn && E.reelsUrl) { reelsImg = new Image(); reelsImg.src = E.reelsUrl; try { await reelsImg.decode(); } catch (_) {} }
    return { imgs, reelsImg };
  }
  function seekVideoTo(v, time) {
    return new Promise((res) => {
      let done = false; const ok = () => { if (done) return; done = true; v.removeEventListener("seeked", ok); res(); };
      v.addEventListener("seeked", ok);
      try { v.currentTime = Math.max(0, time); } catch (_) { ok(); }
      setTimeout(ok, 400);   // 안전장치
    });
  }
  // 음악 → 48kHz Opus 청크로 인코딩해 먹서에 추가 (페이드아웃 포함)
  async function encodeAudioInto(muxer, total, codec) {
    if (!E.using.musicUrl || typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") return false;
    let arrbuf;
    try { arrbuf = await (await fetch(E.using.musicUrl)).arrayBuffer(); } catch (_) { return false; }
    const SR = 48000, CH = 2;
    const tmpAC = new (window.AudioContext || window.webkitAudioContext)();
    let decoded; try { decoded = await tmpAC.decodeAudioData(arrbuf.slice(0)); } catch (_) { try { tmpAC.close(); } catch (e) {} return false; }
    try { tmpAC.close(); } catch (e) {}
    const frames = Math.ceil(total * SR);
    const off = new OfflineAudioContext(CH, frames, SR);
    const src = off.createBufferSource(); src.buffer = decoded;
    src.loop = decoded.duration < total;   // 짧으면 반복
    const g = off.createGain();
    const fade = Math.min(5, total);
    g.gain.setValueAtTime(1, 0);
    g.gain.setValueAtTime(1, Math.max(0, total - fade));
    g.gain.linearRampToValueAtTime(0.0001, total);   // 끝 5초 페이드아웃
    src.connect(g); g.connect(off.destination); src.start(0);
    const rendered = await off.startRendering();
    const ch0 = rendered.getChannelData(0);
    const ch1 = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : ch0;
    try { const sup = await AudioEncoder.isConfigSupported({ codec, sampleRate: SR, numberOfChannels: CH }); if (!sup || !sup.supported) return false; } catch (_) { return false; }
    const enc = new AudioEncoder({ output: (chunk, meta) => muxer.addAudioChunk(chunk, meta), error: (e) => console.warn("[audio enc]", e) });
    enc.configure({ codec, sampleRate: SR, numberOfChannels: CH, bitrate: 128000 });
    const FR = 1024;
    const interleaved = new Float32Array(FR * CH);
    for (let i = 0; i < rendered.length; i += FR) {
      const n = Math.min(FR, rendered.length - i);
      for (let j = 0; j < n; j++) { interleaved[j * CH] = ch0[i + j]; interleaved[j * CH + 1] = ch1[i + j]; }
      const ad = new AudioData({ format: "f32", sampleRate: SR, numberOfFrames: n, numberOfChannels: CH, timestamp: Math.round(i / SR * 1e6), data: interleaved.slice(0, n * CH) });
      enc.encode(ad); ad.close();
    }
    await enc.flush(); enc.close();
    return true;
  }
  // 다운로드: MP4(H.264/AAC) → 안되면 WebM(오프라인) → 안되면 녹화
  async function exportVideo() {
    if (!E.using) return;
    const { total } = slotTimes();
    if (total <= 0) { alert("내용이 없어요."); return; }
    if ((typeof VideoEncoder !== "undefined") && window.EasyMux) {
      try { if (await exportOffline("mp4")) return; } catch (e) { console.warn("[mp4] 실패", e); }
      try { if (await exportOffline("webm")) return; } catch (e) { console.warn("[webm] 실패", e); }
    }
    return exportViaRecorder();
  }
  // 오프라인(녹화 X) — WebCodecs 로 프레임 인코딩 후 직접 먹싱. 릴스 UI 오버레이는 제외(확인용).
  async function exportOffline(fmt) {
    const { arr, total } = slotTimes();
    const FPS = 30;
    const { W, H } = outputSize();
    // 영상 코덱 선택
    let vcodec, muxer, ext, vcfgExtra = {};
    if (fmt === "mp4") {
      const cands = ["avc1.640028", "avc1.4d0028", "avc1.42e01e"];
      vcodec = null;
      for (const c of cands) { try { const s = await VideoEncoder.isConfigSupported({ codec: c, width: W, height: H, avc: { format: "avc" } }); if (s && s.supported) { vcodec = c; break; } } catch (_) {} }
      if (!vcodec) return false;
      vcfgExtra = { avc: { format: "avc" } };
      muxer = new window.EasyMux.MP4Muxer(); muxer.configureVideo({ width: W, height: H, fps: FPS }); ext = "mp4";
    } else {
      const vp9 = "vp09.00.10.08";
      vcodec = "vp8"; let codecId = "V_VP8";
      try { const s = await VideoEncoder.isConfigSupported({ codec: vp9, width: W, height: H }); if (s && s.supported) { vcodec = vp9; codecId = "V_VP9"; } } catch (_) {}
      muxer = new window.EasyMux.WebMMuxer(); muxer.configureVideo({ w: W, h: H, codecId }); ext = "webm";
    }
    stopPlay();
    const btn = $("#esDownload"); const oldTxt = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "⏳ 만드는 중…"; }
    try {
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
      const { imgs } = await preloadExportMedia();   // 릴스 오버레이는 로드하지 않음
      const expVideo = document.createElement("video"); expVideo.muted = true; expVideo.playsInline = true; expVideo.preload = "auto";
      const venc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => console.warn("[video enc]", e) });
      venc.configure(Object.assign({ codec: vcodec, width: W, height: H, bitrate: 10000000, framerate: FPS }, vcfgExtra));
      // 음악 인코딩
      let hasAudio = false;
      try { hasAudio = await encodeAudioInto(muxer, total, fmt === "mp4" ? "mp4a.40.2" : "opus"); } catch (e) { console.warn("[audio]", e); }
      if (hasAudio) {
        if (fmt === "mp4") muxer.configureAudio({ sampleRate: 48000, channels: 2 });
        else muxer.configureAudio({ sampleRate: 48000, channels: 2, codecId: "A_OPUS", codecPrivate: window.EasyMux.opusHead(2, 48000, 312) });
      }
      const totalFrames = Math.max(1, Math.round(total * FPS));
      let curVidSlot = -1;
      for (let i = 0; i < totalFrames; i++) {
        const t = i / FPS;
        let idx = arr.findIndex((a) => t >= a.start && t < a.end); if (idx < 0) idx = arr.length - 1;
        const seg = arr[idx], f = E.using.fills[seg.slot.id];
        if (f && f.kind === "video") {
          if (curVidSlot !== idx) { curVidSlot = idx; if (expVideo.src !== f.url) { expVideo.src = f.url; try { await expVideo.play().catch(() => {}); expVideo.pause(); } catch (_) {} } }
          await seekVideoTo(expVideo, Math.min((t - seg.start) + (seg.slot.in || 0), (f.dur || seg.end - seg.start)));
        } else { curVidSlot = -1; }
        composeFrame(ctx, W, H, t, arr, imgs, expVideo, null);   // null → 릴스 오버레이 제외
        const vf = new VideoFrame(cv, { timestamp: Math.round(t * 1e6), duration: Math.round(1e6 / FPS) });
        venc.encode(vf, { keyFrame: i % FPS === 0 });
        vf.close();
        if (i % 15 === 0 && btn) { btn.textContent = `⏳ ${Math.round(i / totalFrames * 100)}%`; await new Promise((r) => setTimeout(r, 0)); }
      }
      await venc.flush(); venc.close();
      const blob = muxer.finalize();
      if (!blob || blob.size < 1000) throw new Error("빈 결과");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = (E.using.template.name || "easyshorts") + "." + ext;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 15000);
      return true;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldTxt || "⬇ 다운로드"; }
    }
  }
  // (폴백) 실시간 녹화 방식
  async function exportViaRecorder() {
    if (!E.using) return;
    const { arr, total } = slotTimes();
    if (total <= 0) { alert("내용이 없어요."); return; }
    if (typeof MediaRecorder === "undefined") { alert("이 브라우저는 영상 내보내기를 지원하지 않아요. Chrome 을 권장합니다."); return; }
    stopPlay();
    const btn = $("#esDownload"); const oldTxt = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "⏺ 녹화 중…"; }
    try {
      const asp = ASPECTS[E.using.template.aspect] || ASPECTS["9:16"];
      let W, H;
      if (asp.w === asp.h) { W = 1080; H = 1080; } else if (asp.w > asp.h) { W = 1920; H = 1080; } else { W = 1080; H = 1920; }
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const ctx = cv.getContext("2d");
      // 이미지 미리 로드
      const imgs = {};
      for (const s of E.using.template.slots) {
        const f = E.using.fills[s.id];
        if (f && f.kind === "image") { const im = new Image(); im.src = f.url; try { await im.decode(); } catch (_) {} imgs[s.id] = im; }
      }
      const reelsImg = null;   // 다운로드에는 릴스 UI 오버레이 제외(확인용)
      const expVideo = document.createElement("video"); expVideo.muted = true; expVideo.playsInline = true;
      const musicEl = $("#esMusic");
      // 스트림 구성
      const vstream = cv.captureStream(30);
      const tracks = [...vstream.getVideoTracks()];
      if (musicEl && E.using.musicUrl) {
        try { const ms = musicEl.captureStream ? musicEl.captureStream() : (musicEl.mozCaptureStream ? musicEl.mozCaptureStream() : null); const at = ms && ms.getAudioTracks()[0]; if (at) tracks.push(at); } catch (_) {}
      }
      const stream = new MediaStream(tracks);
      const mime = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((m) => MediaRecorder.isTypeSupported(m)) || "video/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8000000 });
      const chunks = []; rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise((r) => { rec.onstop = r; });
      const drawTexts = (t) => {
        E.using.texts.forEach((tx) => {
          if (!(t >= (tx.start || 0) && t < (tx.start || 0) + (tx.dur || 0))) return;
          const fxx = (tx.fx && tx.fx !== "none") ? textFx(tx.fx, (t - (tx.start || 0)) / (tx.dur || 1)) : null;
          const fontPx = Math.min(tx.size / 100 * W, tx.size * 1.6 / 100 * H);
          ctx.font = `${tx.bold ? "800" : "500"} ${fontPx}px -apple-system, "Apple SD Gothic Neo", sans-serif`;
          ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = tx.color || "#fff";
          const cx = (tx.xPct || 50) / 100 * W, cy = (tx.yPct || 50) / 100 * H, maxW = (tx.width || 70) / 100 * W;
          const lines = []; (tx.text || "").split("\n").forEach((rl) => wrapByChar(ctx, rl, maxW, lines));
          const lh = fontPx * 1.2, blockH = lines.length * lh, startY = cy - (lines.length - 1) * lh / 2;
          ctx.save();
          if (fxx) {
            ctx.globalAlpha = clamp(fxx.opacity, 0, 1);
            ctx.translate(cx, cy); ctx.scale(fxx.scale, fxx.scale); ctx.translate(-cx, -cy);
            if (fxx.dy) ctx.translate(0, fxx.dy * blockH);
            if (fxx.clip < 1) { let mw = 0; lines.forEach((ln) => { mw = Math.max(mw, ctx.measureText(ln).width); }); ctx.beginPath(); ctx.rect(cx - mw / 2, 0, fxx.clip * mw, H); ctx.clip(); }
          }
          if (tx.shadow) { ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = fontPx * 0.25; ctx.shadowOffsetY = fontPx * 0.08; }
          lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lh));
          ctx.restore();
        });
      };
      const drawAt = (t) => {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
        let idx = arr.findIndex((a) => t >= a.start && t < a.end); if (idx < 0) idx = arr.length - 1;
        const seg = arr[idx], f = E.using.fills[seg.slot.id];
        const segDur = (seg.end - seg.start) || 1, speed = (E.using.template.fxSpeed) || 1;
        const p = clamp((t - seg.start) / segDur * speed, 0, 1);
        const { s: sc, tx, ty } = fxParams(seg.slot.fx || "none", p);
        if (f) {
          let media = null, mw = 0, mh = 0;
          if (f.kind === "image") { media = imgs[seg.slot.id]; if (media) { mw = media.naturalWidth; mh = media.naturalHeight; } }
          else { media = expVideo; mw = expVideo.videoWidth; mh = expVideo.videoHeight; }
          if (media && mw && mh) {
            ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(tx * W, ty * H);
            const cover = Math.max(W / mw, H / mh), dw = mw * cover, dh = mh * cover;
            try { ctx.drawImage(media, -dw / 2, -dh / 2, dw, dh); } catch (_) {}
            ctx.restore();
          }
        }
        drawTexts(t);
        if (reelsImg && reelsImg.complete) { try { ctx.drawImage(reelsImg, 0, 0, W, H); } catch (_) {} }
      };
      rec.start(100);
      if (musicEl && E.using.musicUrl) { try { musicEl.currentTime = 0; musicEl.volume = 1; await musicEl.play(); } catch (_) {} }
      let curVid = -1;
      const startPerf = performance.now();
      await new Promise((resolve) => {
        const step = () => {
          const t = (performance.now() - startPerf) / 1000;
          if (t >= total) { resolve(); return; }
          let idx = arr.findIndex((a) => t >= a.start && t < a.end); if (idx < 0) idx = arr.length - 1;
          const seg = arr[idx], f = E.using.fills[seg.slot.id];
          if (f && f.kind === "video") { if (curVid !== idx) { curVid = idx; expVideo.src = f.url; try { expVideo.currentTime = 0; expVideo.play(); } catch (_) {} } }
          else if (curVid !== -1) { try { expVideo.pause(); } catch (_) {} curVid = -1; }
          if (musicEl && E.using.musicUrl) { const fade = Math.min(5, total); musicEl.volume = t > total - fade ? clamp((total - t) / fade, 0, 1) : 1; }
          drawAt(t);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      rec.stop();
      if (musicEl) { try { musicEl.pause(); musicEl.volume = 1; } catch (_) {} }
      try { expVideo.pause(); } catch (_) {}
      await stopped;
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = (E.using.template.name || "easyshorts") + ".webm";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 15000);
    } catch (e) {
      console.warn("[easyshorts] exportVideo", e); alert("녹화 중 오류가 발생했어요: " + (e && e.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldTxt || "⬇ 다운로드"; }
    }
  }

  // DOM 빌드 ──────────────────────────────────────────────────────
  function buildDom() {
    const root = document.getElementById("easyRoot");
    if (!root) return;
    root.innerHTML = `
      <div class="es-top">
        <span class="es-logo">⚡ 이지숏폼 <span class="es-beta">BETA</span></span>
        <span class="es-top-sub">템플릿에 사진·영상만 넣으면 음악에 맞춰 자동으로 한 편이 완성돼요</span>
        <span class="es-sp"></span>
        <nav class="es-nav">
          <button type="button" class="es-modebtn" data-mode2="easy" title="사진만 넣으면 자동 완성 — 쉽게 만들기">⚡ 이지숏폼</button>
          <button type="button" class="es-modebtn" data-mode2="detail" title="템플릿을 직접 만들고 자세히 편집 — 작업장">🛠 디테일숏폼</button>
          <button type="button" class="es-btn es-btn-primary" id="esNavNewTpl" title="새 영상(템플릿)을 만들어 저장">➕ 새 템플릿</button>
        </nav>
      </div>
      <div class="es-body" id="esBody"></div>
    `;
  }

  // 뷰 전환 ────────────────────────────────────────────────────────
  function setView(view) {
    stopPlay();
    try { stopInline(); } catch (_) {}
    E.view = view;
    if (view === "gallery") renderGallery();
    else if (view === "builder") renderBuilder();
    else if (view === "use") { if (E.mode2 === "easy") renderEasy(); else renderUse(); }
  }
  // 모드 전환: 이지숏폼(쉽게) ↔ 디테일숏폼(작업장). E.using 은 공유 → 내용 그대로 이어짐
  function enterMode2(m) {
    E.mode2 = m;
    try { localStorage.setItem("es_mode2", m); } catch (_) {}
    const root = document.getElementById("easyRoot");
    $$(".es-modebtn", root).forEach((b) => b.classList.toggle("active", b.dataset.mode2 === m));
    stopPlay(); try { stopInline(); } catch (_) {}
    if (E.using) setView("use");   // 작업 중이면 같은 내용으로 해당 모드 에디터 표시
    else setView("gallery");       // 작업 전이면 공유 템플릿 공간(카탈로그)
  }
  // 템플릿 선택 → 원하는 모드로 열기 (쉽게/자세히)
  function pickTemplate(id, m) {
    E.mode2 = m;
    try { localStorage.setItem("es_mode2", m); } catch (_) {}
    $$(".es-modebtn", document.getElementById("easyRoot")).forEach((b) => b.classList.toggle("active", b.dataset.mode2 === m));
    startUse(id);
  }
  // 저장된 내 영상을 원하는 모드로 똑같이 다시 만들기
  function pickProject(pid, m) {
    E.mode2 = m;
    try { localStorage.setItem("es_mode2", m); } catch (_) {}
    $$(".es-modebtn", document.getElementById("easyRoot")).forEach((b) => b.classList.toggle("active", b.dataset.mode2 === m));
    loadProject(pid);
  }

  // ── 갤러리 (내 영상 + 내 템플릿) ─────────────────────────────────
  function renderGallery() {
    const body = $("#esBody"); if (!body) return;
    if (!E.projects.length) {
      body.innerHTML = `
        <div class="es-empty">
          <div class="es-empty-ico">🎬</div>
          <div class="es-empty-title">아직 만든 영상이 없어요</div>
          <div class="es-empty-msg">
            오른쪽 위 <b>➕ 새 템플릿</b> 으로 영상을 하나 만들어 저장해 보세요.<br>
            저장한 영상은 여기 <b>내 영상</b>에 쌓이고,<br>
            ⚡쉽게 / 🛠자세히 로 똑같이 다시 만들 수 있어요.
          </div>
          <button type="button" class="es-btn es-btn-primary" id="esGoBuilder">➕ 새 템플릿 만들기</button>
        </div>`;
      $("#esGoBuilder").addEventListener("click", () => { E.using = null; E.editing = null; setView("builder"); });
      return;
    }
    // 내 영상(저장한 결과물) — 커버플로우 캐러셀
    const projCards = E.projects.map((p, i) => `
      <div class="es-cf-card" data-pid="${p.id}" data-i="${i}">
        <div class="es-cf-thumb es-asp-${(p.aspect || "9:16").replace(":", "_")}">
          ${p.thumb ? `<img src="${p.thumb}" alt="">` : ""}
          <button type="button" class="es-cf-del" title="삭제">✕</button>
          <div class="es-card-asp">${(p.total || 0).toFixed(1)}초</div>
        </div>
        <div class="es-cf-cap"><b>${esc(p.name || "내 영상")}</b><span>컷 ${p.slotCount || 0}개 · ${(p.total || 0).toFixed(1)}초</span>
          <div class="es-cf-remakes"><button type="button" class="es-cf-remake" data-m="easy">⚡ 쉽게 만들기</button><button type="button" class="es-cf-remake" data-m="detail">🛠 자세히</button></div></div>
      </div>`).join("");
    const projSection = E.projects.length ? `
      <div class="es-section-head">🎬 내 영상 <span class="es-hint">▶ 누르면 바로 재생 · 옆 카드를 누르면 가운데로</span></div>
      <div class="es-cf" id="esCf">
        <button type="button" class="es-cf-nav prev" id="esCfPrev">‹</button>
        <div class="es-cf-stage" id="esCfStage">${projCards}</div>
        <button type="button" class="es-cf-nav next" id="esCfNext">›</button>
      </div>` : "";
    body.innerHTML = `<div class="es-gallery">${projSection}</div>`;
    if (E.projects.length) {
      if (E._cfIndex == null || E._cfIndex >= E.projects.length) E._cfIndex = 0;
      $$(".es-cf-card", body).forEach((card) => {
        const i = parseInt(card.dataset.i, 10), pid = card.dataset.pid;
        card.addEventListener("click", (e) => {
          if (e.target.closest(".es-cf-del")) { stopInline(); deleteProject(pid); return; }
          const rm = e.target.closest(".es-cf-remake"); if (rm) { stopInline(); pickProject(pid, rm.dataset.m); return; }   // ⚡/🛠 똑같이 만들기
          if (i !== E._cfIndex) { stopInline(); E._cfIndex = i; layoutCoverflow(); autoplayCenter(); return; }   // 옆 카드 선택 → 가운데로 + 자동재생
          if (e.target.closest(".es-cf-canvas")) return;   // 재생 중 캔버스 클릭은 자체 처리(정지)
        });
      });
      const pv = $("#esCfPrev"), nx = $("#esCfNext");
      // 화살표로 넘기면 → 재생 중이던 영상은 꺼지고, 새로 가운데 온 영상이 자동 재생
      if (pv) pv.addEventListener("click", () => { stopInline(); E._cfIndex = Math.max(0, (E._cfIndex || 0) - 1); layoutCoverflow(); autoplayCenter(); });
      if (nx) nx.addEventListener("click", () => { stopInline(); E._cfIndex = Math.min(E.projects.length - 1, (E._cfIndex || 0) + 1); layoutCoverflow(); autoplayCenter(); });
      layoutCoverflow();
      autoplayCenter();   // 가운데(선택된) 영상 자동 재생
    }
  }
  // 가운데(선택된) 영상 자동 재생(반복)
  function autoplayCenter() {
    const stage = $("#esCfStage"); if (!stage) return;
    const card = stage.querySelector(".es-cf-card.center"); if (!card || !card.dataset.pid) return;
    playInline(card, card.dataset.pid, true);
  }
  // 커버플로우 배치 — 가운데 카드 확대, 양옆은 축소·회전
  function layoutCoverflow() {
    const stage = $("#esCfStage"); if (!stage) return;
    const cards = $$(".es-cf-card", stage);
    const center = clamp(E._cfIndex || 0, 0, cards.length - 1);
    cards.forEach((c, i) => {
      const off = i - center, abs = Math.abs(off);
      const tx = off * 300, scale = off === 0 ? 1 : Math.max(0.62, 0.8 - abs * 0.06), rot = off === 0 ? 0 : (off < 0 ? 24 : -24);
      c.style.transform = `translate(-50%, -50%) translateX(${tx}px) perspective(1000px) rotateY(${rot}deg) scale(${scale})`;
      c.style.zIndex = String(100 - abs);
      c.style.opacity = abs > 2.5 ? "0" : (off === 0 ? "1" : "0.5");
      c.style.pointerEvents = abs > 2.5 ? "none" : "auto";
      c.classList.toggle("center", off === 0);
    });
  }
  // 그 자리에서 바로 재생 (캔버스 합성 — 저장된 mp4 없이 사진·효과·글자·음악 실시간 재생)
  let _cfPlayer = null, _cfGen = 0;
  function stopInline() { _cfGen++; if (_cfPlayer) { try { _cfPlayer.stop(); } catch (_) {} _cfPlayer = null; } }   // 세대 증가 → 진행 중인 playInline도 무효화
  async function playInline(card, pid, loopMode) {
    stopInline();
    const myGen = _cfGen;   // 이 재생의 세대 — 도중에 다른 재생/정지가 시작되면 폐기
    let rec = null; try { rec = await idbGet("proj_" + pid + "_data"); } catch (_) {}
    if (!rec || !rec.template || myGen !== _cfGen) return;
    const thumb = card.querySelector(".es-cf-thumb"); if (!thumb) return;
    const slots = rec.template.slots;
    const arr = []; let acc = 0; slots.forEach((s) => { arr.push({ slot: s, start: acc, end: acc + (s.dur || 0) }); acc += (s.dur || 0); });
    const total = acc || 1;
    const urls = [], fills = {};
    for (const sid of (rec.fillSlotIds || [])) {
      const b = await idbGet("proj_" + pid + "_fill_" + sid); if (!(b instanceof Blob)) continue;
      const meta = (rec.fillMeta || {})[sid] || {};
      const kind = meta.kind || (/^video\//.test(b.type) ? "video" : "image");
      const url = URL.createObjectURL(b); urls.push(url); fills[sid] = { kind, url };
    }
    const imgs = {};
    for (const s of slots) { const f = fills[s.id]; if (f && f.kind === "image") { const im = new Image(); im.src = f.url; try { await im.decode(); } catch (_) {} imgs[s.id] = im; } }
    const st = { fills, texts: rec.texts || [], fxSpeed: rec.template.fxSpeed };
    const asp = ASPECTS[rec.template.aspect] || ASPECTS["9:16"];
    const cv = document.createElement("canvas"); cv.className = "es-cf-canvas";
    cv.width = 810; cv.height = Math.round(810 * asp.h / asp.w);
    thumb.appendChild(cv);
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    const expVideo = document.createElement("video"); expVideo.muted = true; expVideo.playsInline = true;
    let audio = null;
    if (rec.hasMusic) { try { const b = await idbGet("proj_" + pid + "_music"); if (b instanceof Blob) { const mu = URL.createObjectURL(b); urls.push(mu); audio = new Audio(mu); } } catch (_) {} }
    if (myGen !== _cfGen) { try { cv.remove(); } catch (_) {} urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} }); return; }   // 도중에 다른 재생 시작됨 → 폐기(중복 재생 방지)
    let raf = null, stopped = false, curVid = -1;
    const cleanup = () => {
      if (stopped) return; stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (audio) { try { audio.pause(); } catch (_) {} }
      try { expVideo.pause(); } catch (_) {}
      urls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (_) {} });
      try { cv.remove(); } catch (_) {}
      card.classList.remove("playing");
    };
    _cfPlayer = { stop: cleanup };
    card.classList.add("playing");
    if (audio) { try { audio.currentTime = 0; audio.volume = 1; await audio.play(); } catch (_) {} }
    if (myGen !== _cfGen) { cleanup(); return; }   // audio.play() 대기 중 다른 재생 시작됨 → 폐기
    let startPerf = performance.now();
    const loop = () => {
      if (stopped) return;
      const t = (performance.now() - startPerf) / 1000;
      if (t >= total) {
        if (loopMode) { startPerf = performance.now(); curVid = -1; if (audio) { try { audio.currentTime = 0; audio.volume = 1; audio.play(); } catch (_) {} } raf = requestAnimationFrame(loop); return; }
        cleanup(); return;
      }
      let idx = arr.findIndex((a) => t >= a.start && t < a.end); if (idx < 0) idx = arr.length - 1;
      const seg = arr[idx], f = fills[seg.slot.id];
      if (f && f.kind === "video") { if (curVid !== idx) { curVid = idx; if (expVideo.src !== f.url) expVideo.src = f.url; try { expVideo.currentTime = Math.max(0, (t - seg.start) + (seg.slot.in || 0)); expVideo.play(); } catch (_) {} } }
      else if (curVid !== -1) { try { expVideo.pause(); } catch (_) {} curVid = -1; }
      if (audio) { const fade = Math.min(5, total); audio.volume = t > total - fade ? clamp((total - t) / fade, 0, 1) : 1; }
      composeFrame(ctx, W, H, t, arr, imgs, expVideo, null, st);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    cv.addEventListener("click", (e) => { e.stopPropagation(); cleanup(); });
  }
  // 내 영상 클릭 → 크게 보기 + 다시 만들기
  function openProjectModal(pid) {
    const p = E.projects.find((x) => x.id === pid); if (!p) return;
    const root = document.getElementById("easyRoot");
    const prev = $("#esProjModal"); if (prev) prev.remove();
    const m = document.createElement("div");
    m.id = "esProjModal"; m.className = "es-modal";
    m.innerHTML = `
      <div class="es-modal-card">
        <button type="button" class="es-modal-x" id="esModalX" title="닫기">✕</button>
        <div class="es-modal-thumb es-asp-${(p.aspect || "9:16").replace(":", "_")}">
          ${p.thumb ? `<img src="${p.thumb}" alt="">` : ""}
        </div>
        <div class="es-modal-body">
          <div class="es-modal-name">${esc(p.name || "내 영상")}</div>
          <div class="es-modal-sub">컷 ${p.slotCount || 0}개 · ${(p.total || 0).toFixed(1)}초 · ${esc((ASPECTS[p.aspect] || ASPECTS["9:16"]).label)}</div>
          <div class="es-modal-actions">
            <button type="button" class="es-btn es-btn-primary" id="esModalRemake">🎬 이 구성으로 새로 만들기 (사진은 새로)</button>
            <button type="button" class="es-btn es-btn-ghost" id="esModalDel">🗑 삭제</button>
          </div>
        </div>
      </div>`;
    root.appendChild(m);
    const close = () => m.remove();
    $("#esModalX").addEventListener("click", close);
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
    $("#esModalRemake").addEventListener("click", () => { close(); loadProject(pid); });
    $("#esModalDel").addEventListener("click", () => { close(); deleteProject(pid); });
  }

  async function delTemplate(id) {
    const t = E.templates.find((x) => x.id === id);
    if (!t) return;
    if (!confirm(`템플릿 "${t.name || "제목 없음"}" 을 삭제할까요?`)) return;
    E.templates = E.templates.filter((x) => x.id !== id);
    try { await idbDel("music_" + id); } catch (_) {}
    await saveTemplates();
    renderGallery();
  }

  // ── 빌더 (새 템플릿 / 편집) ──────────────────────────────────────
  function newDraft() {
    return { id: uid(), name: "", aspect: "9:16", slots: [{ id: uid(), dur: 2, label: "" }, { id: uid(), dur: 2, label: "" }, { id: uid(), dur: 2, label: "" }], music: null, createdAt: Date.now() };
  }
  function editTemplate(id) {
    const t = E.templates.find((x) => x.id === id);
    if (!t) return;
    E.editing = JSON.parse(JSON.stringify(t));
    E.editMusicBlob = null;
    if (E.editMusicUrl) { try { URL.revokeObjectURL(E.editMusicUrl); } catch (_) {} E.editMusicUrl = null; }
    musicBlobUrl(id).then((u) => { E.editMusicUrl = u; if (E.view === "builder") { const a = $("#esMusicPreview"); if (a && u) a.src = u; } });
    setView("builder");
  }

  function renderBuilder() {
    const body = $("#esBody"); if (!body) return;
    if (!E.editing) { E.editing = newDraft(); E.editMusicBlob = null; if (E.editMusicUrl) { try { URL.revokeObjectURL(E.editMusicUrl); } catch (_) {} E.editMusicUrl = null; } }
    const t = E.editing;
    const total = t.slots.reduce((a, s) => a + (s.dur || 0), 0);
    const aspBtns = Object.keys(ASPECTS).map((k) =>
      `<button type="button" class="es-asp-btn ${t.aspect === k ? "active" : ""}" data-asp="${k}">${esc(ASPECTS[k].label)}</button>`).join("");
    body.innerHTML = `
      <div class="es-builder">
        <div class="es-builder-head">
          <input type="text" id="esTplName" class="es-name-input" placeholder="템플릿 이름 (예: 여행 브이로그 12컷)" value="${esc(t.name)}">
          <div class="es-asp-row">${aspBtns}</div>
        </div>

        <div class="es-section">
          <div class="es-section-title">🎵 음악 <span class="es-hint">슬롯들이 이 음악에 맞춰집니다</span></div>
          <div class="es-music-box" id="esMusicBox">
            <div class="es-music-info" id="esMusicInfo">${t.music ? "🎵 " + esc(t.music.name) + " · " + (t.music.dur || 0).toFixed(1) + "초" : "여기에 음악 파일을 끌어다 놓거나 선택하세요"}</div>
            <div class="es-music-acts">
              <button type="button" class="es-btn" id="esPickMusic">음악 선택</button>
              <button type="button" class="es-btn es-btn-ghost" id="esClearMusic" ${t.music ? "" : "hidden"}>비우기</button>
              <button type="button" class="es-btn es-btn-ghost" id="esAutoSlots" ${t.music ? "" : "hidden"} title="음악 길이를 슬롯 개수로 균등 분할">⟲ 음악 길이로 균등 분할</button>
            </div>
            <audio id="esMusicPreview" controls style="${t.music ? "" : "display:none"}"></audio>
            <input type="file" id="esMusicFile" accept="audio/*" hidden>
          </div>
        </div>

        <div class="es-section">
          <div class="es-section-title">🎬 장면 슬롯 <span class="es-hint">각 장면이 화면에 나오는 길이(초)</span>
            <span class="es-total-pill">총 ${total.toFixed(1)}초 · ${t.slots.length}컷</span>
          </div>
          <div class="es-slots-edit" id="esSlotsEdit"></div>
          <div class="es-slot-add-row">
            <button type="button" class="es-btn" id="esAddSlot">＋ 슬롯 추가</button>
            <span class="es-split-ctl">
              <input type="number" id="esSplitN" min="2" max="40" step="1" value="${t.slots.length}">
              <button type="button" class="es-btn es-btn-ghost" id="esSplitBtn">개로 균등 분할</button>
            </span>
          </div>
        </div>

        <div class="es-builder-foot">
          <button type="button" class="es-btn es-btn-ghost" id="esCancelTpl">취소</button>
          <button type="button" class="es-btn es-btn-primary" id="esSaveTpl">템플릿 저장</button>
        </div>
      </div>`;

    renderSlotEditors();

    // 음악 미리듣기 URL
    if (E.editMusicUrl) { const a = $("#esMusicPreview"); if (a) { a.src = E.editMusicUrl; a.style.display = ""; } }

    $$(".es-asp-btn", body).forEach((b) => b.addEventListener("click", () => { t.aspect = b.dataset.asp; renderBuilder(); }));
    $("#esTplName").addEventListener("input", (e) => { t.name = e.target.value; });
    $("#esPickMusic").addEventListener("click", () => $("#esMusicFile").click());
    $("#esMusicFile").addEventListener("change", (e) => { if (e.target.files[0]) setBuilderMusic(e.target.files[0]); });
    $("#esClearMusic").addEventListener("click", () => { t.music = null; E.editMusicBlob = null; if (E.editMusicUrl) { try { URL.revokeObjectURL(E.editMusicUrl); } catch (_) {} E.editMusicUrl = null; } renderBuilder(); });
    const autoBtn = $("#esAutoSlots"); if (autoBtn) autoBtn.addEventListener("click", () => splitByMusic());
    $("#esAddSlot").addEventListener("click", () => { t.slots.push({ id: uid(), dur: 2, label: "" }); renderBuilder(); });
    $("#esSplitBtn").addEventListener("click", () => {
      const n = clamp(parseInt($("#esSplitN").value, 10) || t.slots.length, 2, 40);
      const per = t.music && t.music.dur ? +(t.music.dur / n).toFixed(2) : 2;
      t.slots = Array.from({ length: n }, () => ({ id: uid(), dur: per, label: "" }));
      renderBuilder();
    });
    $("#esCancelTpl").addEventListener("click", () => { E.editing = null; setView("gallery"); });
    $("#esSaveTpl").addEventListener("click", saveDraft);

    // 음악 드롭존
    const mb = $("#esMusicBox");
    mb.addEventListener("dragover", (e) => { e.preventDefault(); mb.classList.add("hot"); });
    mb.addEventListener("dragleave", () => mb.classList.remove("hot"));
    mb.addEventListener("drop", (e) => { e.preventDefault(); mb.classList.remove("hot"); const f = e.dataTransfer.files[0]; if (f && /^audio\//.test(f.type)) setBuilderMusic(f); });
  }

  function renderSlotEditors() {
    const wrap = $("#esSlotsEdit"); if (!wrap || !E.editing) return;
    const t = E.editing;
    let acc = 0;
    wrap.innerHTML = t.slots.map((s, i) => {
      const start = acc; acc += (s.dur || 0);
      return `
        <div class="es-slot-edit" data-id="${s.id}">
          <span class="es-slot-num">${i + 1}</span>
          <div class="es-slot-time">${fmtT(start)}</div>
          <input type="number" class="es-slot-dur" data-id="${s.id}" min="0.3" max="30" step="0.1" value="${(s.dur || 0).toFixed(1)}">
          <span class="es-slot-unit">초</span>
          <input type="text" class="es-slot-label" data-id="${s.id}" placeholder="메모(선택)" value="${esc(s.label || "")}">
          <button type="button" class="es-slot-del" data-id="${s.id}" title="이 슬롯 삭제">×</button>
        </div>`;
    }).join("");
    $$(".es-slot-dur", wrap).forEach((inp) => inp.addEventListener("input", (e) => {
      const s = t.slots.find((x) => x.id === e.target.dataset.id); if (s) { s.dur = clamp(parseFloat(e.target.value) || 0.3, 0.3, 30); updateTotalPill(); recalcSlotTimes(); }
    }));
    $$(".es-slot-label", wrap).forEach((inp) => inp.addEventListener("input", (e) => {
      const s = t.slots.find((x) => x.id === e.target.dataset.id); if (s) s.label = e.target.value;
    }));
    $$(".es-slot-del", wrap).forEach((b) => b.addEventListener("click", (e) => {
      if (t.slots.length <= 1) return;
      t.slots = t.slots.filter((x) => x.id !== e.target.dataset.id); renderBuilder();
    }));
  }
  function recalcSlotTimes() {
    const wrap = $("#esSlotsEdit"); if (!wrap || !E.editing) return;
    let acc = 0;
    $$(".es-slot-edit", wrap).forEach((row) => {
      const s = E.editing.slots.find((x) => x.id === row.dataset.id); if (!s) return;
      const tEl = row.querySelector(".es-slot-time"); if (tEl) tEl.textContent = fmtT(acc);
      acc += (s.dur || 0);
    });
  }
  function updateTotalPill() {
    const pill = $(".es-total-pill"); if (pill && E.editing) {
      const total = E.editing.slots.reduce((a, s) => a + (s.dur || 0), 0);
      pill.textContent = `총 ${total.toFixed(1)}초 · ${E.editing.slots.length}컷`;
    }
  }
  function splitByMusic() {
    const t = E.editing; if (!t || !t.music || !t.music.dur) return;
    const n = t.slots.length || 3;
    const per = +(t.music.dur / n).toFixed(2);
    t.slots.forEach((s) => (s.dur = per));
    renderBuilder();
  }
  function setBuilderMusic(file) {
    const url = URL.createObjectURL(file);
    if (E.editMusicUrl) { try { URL.revokeObjectURL(E.editMusicUrl); } catch (_) {} }
    E.editMusicUrl = url; E.editMusicBlob = file;
    const a = document.createElement("audio"); a.preload = "metadata"; a.src = url;
    a.onloadedmetadata = () => {
      E.editing.music = { name: file.name.replace(/\.[^.]+$/, "").slice(0, 30), dur: isFinite(a.duration) ? a.duration : 0 };
      renderBuilder();
    };
    a.onerror = () => { E.editing.music = { name: file.name.slice(0, 30), dur: 0 }; renderBuilder(); };
  }
  async function saveDraft() {
    const t = E.editing; if (!t) return;
    t.name = ($("#esTplName") && $("#esTplName").value.trim()) || t.name || "제목 없음";
    if (!t.slots.length) { alert("슬롯을 최소 1개 이상 만들어 주세요."); return; }
    // 음악 Blob 저장
    if (E.editMusicBlob) { try { await idbSet("music_" + t.id, E.editMusicBlob); } catch (e) { console.warn(e); } }
    const idx = E.templates.findIndex((x) => x.id === t.id);
    const saved = { id: t.id, name: t.name, aspect: t.aspect, slots: t.slots, music: t.music || null, createdAt: t.createdAt || Date.now() };
    if (idx >= 0) E.templates[idx] = saved; else E.templates.unshift(saved);
    await saveTemplates();
    E.editing = null; E.editMusicBlob = null;
    setView("gallery");
  }

  // ── 사용 (템플릿에 미디어 끼워넣고 자동 조립) ──────────────────────
  async function startUse(id) {
    const t = E.templates.find((x) => x.id === id);
    if (!t) return;
    const musicUrl = t.music ? await musicBlobUrl(id) : null;
    await clearSession();   // 새 작업 시작 — 이전 세션 비움
    E.using = { template: JSON.parse(JSON.stringify(t)), musicUrl, fills: {}, texts: [], selText: null, selTexts: [] };
    E.playhead = 0;
    E.easyStep = 1; E.easyPhase = "after";
    setView("use");
    scheduleSaveMeta();
  }

  // ── 이지숏폼(간소화) — 템플릿 고르기 → 사진 넣기 → 문구 넣기 → 생성/다운로드 ──
  // 드롭존 연결 — 파일을 끌어다 놓으면 onFiles(미디어 파일들) 호출
  function wireDrop(el, onFiles) {
    if (!el) return;
    el.addEventListener("dragover", (e) => { e.preventDefault(); el.classList.add("hot"); });
    el.addEventListener("dragleave", () => el.classList.remove("hot"));
    el.addEventListener("drop", (e) => {
      e.preventDefault(); el.classList.remove("hot");
      const files = Array.from(e.dataTransfer.files || []).filter((f) => /^(image|video)\//.test(f.type));
      if (files.length) onFiles(files);
    });
  }
  function renderEasy() {
    const body = $("#esBody"); if (!body) return;
    if (!E.using) { renderGallery(); return; }   // 작업 전이면 공유 템플릿 공간
    // 2) 단계별 마법사 (완전 초보자용 풀스크린)
    const t = E.using.template, asp = ASPECTS[t.aspect] || ASPECTS["9:16"], n = t.slots.length;
    const total = t.slots.reduce((a, s) => a + (s.dur || 0), 0);
    const step = E.easyStep || 1;
    const filled = Object.keys(E.using.fills).length;
    const dots = [1, 2, 3].map((k) => `<span class="es-wiz-dot ${k === step ? "on" : ""} ${k < step ? "done" : ""}">${k}</span><span class="es-wiz-dlabel ${k === step ? "on" : ""}">${k === 1 ? "사진" : k === 2 ? "문구" : "완성"}</span>`).join('<span class="es-wiz-dline"></span>');
    let bodyHtml = "";
    const pairMode = t.slots.some((s) => s.aiRole);
    const afterSlots = t.slots.filter((s) => s.aiRole !== "before");
    const beforeSlots = t.slots.filter((s) => s.aiRole === "before");
    const afterFilled = afterSlots.filter((s) => E.using.fills[s.id]).length;
    const phase = E.easyPhase || "after";
    if (step === 1 && pairMode && phase === "after" && !afterFilled) {
      bodyHtml = `
        <div class="es-wiz-body">
          <div class="es-wiz-num">1</div>
          <div class="es-wiz-title">애프터(완성) 사진을 넣어주세요</div>
          <div class="es-wiz-sub">다음 단계에서 비포(철거 전)를 넣거나 AI로 생성해요</div>
          <div class="es-wiz-bigcount">총 <b>${afterSlots.length}</b>장 필요해요</div>
          <button type="button" class="es-wiz-bigbtn es-wiz-drop" id="esWizAdd">📷 여기로 끌어다 놓거나 클릭<span class="es-wiz-drop-sub">애프터 사진 ${afterSlots.length}장 한 번에</span></button>
          <input type="file" id="esBulkFile" accept="image/*,video/*" multiple hidden>
        </div>`;
    } else if (step === 1 && pairMode && phase === "after") {
      bodyHtml = `
        <div class="es-wiz-body es-wiz-photos">
          <div class="es-wiz-count">애프터 ${afterFilled} / ${afterSlots.length} 장</div>
          <div class="es-easy-strip es-fill-list" id="esFillList"></div>
          <input type="file" id="esBulkFile" accept="image/*,video/*" multiple hidden>
          <div class="es-wiz-photobtns">
            <button type="button" class="es-btn es-wiz-bigbtn2" id="esWizEdit">✎ 다시 넣기</button>
            <button type="button" class="es-btn es-btn-primary es-wiz-bigbtn2" id="esWizNext">비포 단계로 ›</button>
          </div>
        </div>`;
    } else if (step === 1 && pairMode) {   // 비포 단계 — 넣거나 생성
      bodyHtml = `
        <div class="es-wiz-body es-wiz-photos">
          <div class="es-wiz-title" style="font-size:26px">비포(철거 전) 사진을 넣거나 생성하세요</div>
          <div class="es-wiz-note">각 칸에 직접 넣거나, 🏚 생성으로 짝꿍 애프터를 참조해 만들어요</div>
          <button type="button" class="es-btn es-btn-primary es-aireco-btn" id="esGenAllBefore">🏚 비포 전체 생성 (${beforeSlots.length}컷)</button>
          <div class="es-easy-strip es-fill-list" id="esFillList"></div>
          <div class="es-wiz-photobtns">
            <button type="button" class="es-btn es-wiz-nav" id="esWizPrev">‹ 애프터</button>
            <button type="button" class="es-btn es-btn-primary es-wiz-bigbtn2" id="esWizNext">다음으로 ›</button>
          </div>
        </div>`;
    } else if (step === 1 && !filled) {
      // 사진 넣기 전 — 큰 버튼만
      bodyHtml = `
        <div class="es-wiz-body">
          <div class="es-wiz-num">1</div>
          <div class="es-wiz-title">사진이나 영상을 넣어주세요</div>
          <div class="es-wiz-sub">넣으면 음악과 자막 타이밍이 자동으로 맞춰져요</div>
          <div class="es-wiz-bigcount">총 <b>${n}</b>장 필요해요</div>
          <button type="button" class="es-wiz-bigbtn es-wiz-drop" id="esWizAdd">📷 여기로 끌어다 놓거나 클릭<span class="es-wiz-drop-sub">사진·영상 ${n}장 한 번에</span></button>
          <input type="file" id="esBulkFile" accept="image/*,video/*" multiple hidden>
        </div>`;
    } else if (step === 1) {
      // 사진 넣은 뒤 — 사진 그리드 + 그 아래 큰 버튼
      bodyHtml = `
        <div class="es-wiz-body es-wiz-photos">
          <div class="es-wiz-count">${filled} / ${n} 장</div>
          <div class="es-easy-strip es-fill-list" id="esFillList"></div>
          <input type="file" id="esBulkFile" accept="image/*,video/*" multiple hidden>
          <div class="es-wiz-photobtns">
            <button type="button" class="es-btn es-wiz-bigbtn2" id="esWizEdit">✎ 수정하기</button>
            <button type="button" class="es-btn es-btn-primary es-wiz-bigbtn2" id="esWizNext">다음으로 ›</button>
          </div>
        </div>`;
    } else if (step === 2) {
      const caps = E.using.texts;
      const capRows = caps.length
        ? caps.map((tx, i) => `
            <label class="es-slotcap">
              <span class="es-slotcap-num">${i + 1}번자리</span>
              <input type="text" class="es-slotcap-in" data-idx="${i}" value="${esc(tx.text || "")}" placeholder="${i + 1}번 자막 내용을 적어주세요">
            </label>`).join("")
        : `<div class="es-wiz-note">이 템플릿에는 자막 자리가 없어요. 그대로 다음으로 넘어가도 돼요.</div>`;
      bodyHtml = `
        <div class="es-wiz-body">
          <div class="es-wiz-num">2</div>
          <div class="es-wiz-title">들어갈 문구를 넣어주세요</div>
          <div class="es-wiz-note">자리마다 한 줄씩 적으면, 그 위치·타이밍에 자막이 나와요.${caps.length ? ` (총 ${caps.length}자리)` : ""}</div>
          ${caps.length ? `<button type="button" class="es-btn es-btn-primary es-aireco-btn" id="esAiReco" title="넣은 사진과 기존 문구를 분석해 비슷한 형태로 각 자리를 채워줍니다">✨ AI 추천 — 사진+기존 문구로 채우기</button>` : ""}
          <div class="es-slotcaps">${capRows}</div>
        </div>
        <div class="es-wiz-foot">
          <button type="button" class="es-btn es-wiz-nav" id="esWizPrev">‹ 이전</button>
          <span class="es-use-head-sp"></span>
          <button type="button" class="es-btn es-btn-primary es-wiz-nav" id="esWizNext">다음 ›</button>
        </div>`;
    } else {
      bodyHtml = `
        <div class="es-wiz-body es-wiz-done">
          <div class="es-wiz-title">완성! 미리보기로 확인하세요</div>
          <div class="es-stage" id="esStage" style="aspect-ratio:${asp.w}/${asp.h}">
            <video id="esVideo" muted playsinline></video><img id="esImgPrev" alt=""><img id="esImg" alt="">
            <div class="es-stage-empty" id="esStageEmpty">▶ 를 누르면 재생돼요</div>
            <div class="es-slot-badge" id="esSlotBadge" hidden></div>
            <div class="es-text-layer" id="esTextLayer"></div>
            <img id="esReelsOverlay" class="es-reels-overlay" alt="">
          </div>
          <div class="es-transport">
            <button type="button" class="es-btn es-btn-primary" id="esPlay">▶ 미리보기</button>
            <input type="range" id="esSeek" min="0" max="${total}" step="0.01" value="0">
            <span class="es-time" id="esTime">00:00 / ${fmtT(total)}</span>
            <label class="es-reels-toggle"><input type="checkbox" id="esReels"> 📱 릴스화면</label>
            <button type="button" class="es-btn es-btn-ghost" id="esReelsPick">UI</button>
            <input type="file" id="esReelsFile" accept="image/*" hidden>
          </div>
          <audio id="esMusic"></audio>
          <div class="es-wiz-genrow">
            <button type="button" class="es-btn es-btn-primary es-wiz-gen" id="esEasyGen">⬇ 영상 생성·다운로드</button>
            <button type="button" class="es-btn es-btn-ghost" id="esEasySave">💾 내 영상으로 저장</button>
          </div>
        </div>
        <div class="es-wiz-foot">
          <button type="button" class="es-btn es-wiz-nav" id="esWizPrev">‹ 이전</button>
        </div>`;
    }
    body.innerHTML = `
      <div class="es-wiz">
        <div class="es-wiz-top">
          <button type="button" class="es-btn es-btn-ghost" id="esEasyBack">← 다른 영상</button>
          <span class="es-use-head-sp"></span>
          <div class="es-wiz-dots">${dots}</div>
          <span class="es-use-head-sp"></span>
          <span class="es-wiz-tname">${esc(t.name || "")}</span>
        </div>
        ${bodyHtml}
      </div>`;
    $("#esEasyBack").addEventListener("click", () => { clearSession(); E.using = null; renderEasy(); });
    if (step === 1 && pairMode && phase === "after") {
      if ($("#esFillList")) renderFillSlots((s) => s.aiRole !== "before");   // 애프터(원본)만 표시
      const afterIds = afterSlots.map((s) => s.id);
      const addBtn = $("#esWizAdd"); if (addBtn) { addBtn.addEventListener("click", () => $("#esBulkFile").click()); wireDrop(addBtn, (files) => fillSlotsByIds(afterIds, files.slice(0, afterIds.length)).then(() => renderEasy())); }
      const editBtn = $("#esWizEdit"); if (editBtn) editBtn.addEventListener("click", () => $("#esBulkFile").click());
      if ($("#esBulkFile")) $("#esBulkFile").addEventListener("change", (e) => { const files = Array.from(e.target.files || []).slice(0, afterSlots.length); fillSlotsByIds(afterIds, files).then(() => renderEasy()); });
      const nx = $("#esWizNext"); if (nx) nx.addEventListener("click", () => { E.easyPhase = "before"; renderEasy(); });
    } else if (step === 1 && pairMode) {   // 비포 단계
      if ($("#esFillList")) renderFillSlots((s) => s.aiRole === "before");   // 비포만 (넣기/생성 버튼 포함)
      const ga = $("#esGenAllBefore"); if (ga) ga.addEventListener("click", async () => { ga.disabled = true; for (const s of beforeSlots) { try { await generateBeforePhoto(s.id); } catch (_) {} } ga.disabled = false; });
      $("#esWizPrev").addEventListener("click", () => { E.easyPhase = "after"; renderEasy(); });
      $("#esWizNext").addEventListener("click", () => { E.easyStep = 2; renderEasy(); });
    } else if (step === 1) {
      if ($("#esFillList")) renderFillSlots();   // 사진을 넣은 뒤에만 썸네일 영역이 있음
      const addBtn = $("#esWizAdd"); if (addBtn) { addBtn.addEventListener("click", () => $("#esBulkFile").click()); wireDrop(addBtn, (files) => bulkFill(files.slice(0, t.slots.length)).then(() => renderEasy())); }
      const editBtn = $("#esWizEdit"); if (editBtn) editBtn.addEventListener("click", () => $("#esBulkFile").click());   // 수정하기 → 다시 고르기
      $("#esBulkFile").addEventListener("change", (e) => { const files = Array.from(e.target.files || []).slice(0, E.using.template.slots.length); bulkFill(files).then(() => renderEasy()); });
      const nx = $("#esWizNext"); if (nx) nx.addEventListener("click", () => { E.easyStep = 2; renderEasy(); });
    } else if (step === 2) {
      $("#esWizPrev").addEventListener("click", () => { E.easyStep = 1; renderEasy(); });
      $("#esWizNext").addEventListener("click", () => { E.easyStep = 3; renderEasy(); });
      // 자리별 문구 입력 — 해당 번호 자막의 내용만 수정
      $$(".es-slotcap-in").forEach((inp) => {
        inp.addEventListener("input", (e) => {
          const i = parseInt(e.target.dataset.idx, 10);
          if (E.using.texts[i]) { E.using.texts[i].text = e.target.value; scheduleSaveMeta(); }
        });
        inp.addEventListener("keydown", (e) => e.stopPropagation());
      });
      { const rb = $("#esAiReco"); if (rb) rb.addEventListener("click", aiRecommendCaptions); }   // AI 추천
    } else {
      renderTexts();
      updateReelsOverlay();
      if (E.using.musicUrl) { const a = $("#esMusic"); if (a) { a.src = E.using.musicUrl; a.loop = true; } }
      $("#esWizPrev").addEventListener("click", () => { E.easyStep = 2; renderEasy(); });
      $("#esPlay").addEventListener("click", togglePlay);
      $("#esSeek").addEventListener("input", (e) => seek(parseFloat(e.target.value)));
      $("#esEasyGen").addEventListener("click", exportVideo);
      $("#esEasySave").addEventListener("click", saveCurrentProject);
      $("#esReels").addEventListener("change", async (e) => { if (e.target.checked && !E.reelsUrl) { e.target.checked = false; $("#esReelsFile").click(); return; } E.reelsOn = e.target.checked; try { await idbSet("reelsOn", E.reelsOn); } catch (_) {} updateReelsOverlay(); });
      $("#esReelsPick").addEventListener("click", () => $("#esReelsFile").click());
      $("#esReelsFile").addEventListener("change", (e) => { if (e.target.files[0]) setReelsImage(e.target.files[0]); });
      preloadFills();
      seek(0);
    }
  }

  function renderUse() {
    const body = $("#esBody"); if (!body || !E.using) { setView("gallery"); return; }
    const t = E.using.template;
    const asp = ASPECTS[t.aspect] || ASPECTS["9:16"];
    const total = t.slots.reduce((a, s) => a + (s.dur || 0), 0);
    const filled = Object.keys(E.using.fills).length;
    body.innerHTML = `
      <div class="es-use">
        <div class="es-use-subs">
          <div class="es-subs-head">
            <span>📝 자막</span>
            <button type="button" class="es-btn es-btn-ghost" id="esClearSubs" title="기존 자막 전체 삭제">🗑 비우기</button>
            <button type="button" class="es-btn" id="esAddSub" title="현재 위치에 자막 추가">＋ 자막</button>
          </div>
          <div class="es-subs-bulk">
            <textarea id="esBulkSub" rows="2" placeholder="여러 줄 붙여넣기 — 엔터(줄바꿈)마다 자막 하나로 나뉘어요"></textarea>
            <button type="button" class="es-btn es-btn-primary" id="esBulkSubAdd">↵ 줄마다 자막 추가</button>
          </div>
          <div class="es-subs-list" id="esSubList"></div>
        </div>
        <div class="es-use-left">
          <div class="es-use-head">
            <button type="button" class="es-btn es-btn-ghost" id="esUseBack">← 템플릿 목록</button>
            <input type="text" id="esUseName" class="es-use-title-input" value="${esc(t.name || "")}" placeholder="영상 이름" title="영상 이름 — 클릭해서 수정">
            <span class="es-use-meta" id="esUseMeta"></span>
            <span class="es-use-head-sp"></span>
            <button type="button" class="es-btn" id="esSaveProject" title="지금 만든 영상을 '내 영상'으로 저장">💾 저장</button>
            <button type="button" class="es-btn es-btn-primary" id="esDownload" title="만든 영상을 영상 파일(webm)로 다운로드">⬇ 다운로드</button>
          </div>
          <div class="es-stage" id="esStage" style="aspect-ratio:${asp.w}/${asp.h}">
            <video id="esVideo" muted playsinline></video>
            <img id="esImgPrev" alt="">
            <img id="esImg" alt="">
            <div class="es-stage-empty" id="esStageEmpty">슬롯에 사진·영상을 넣고 ▶ 를 누르면 자동으로 이어붙여 재생돼요</div>
            <div class="es-slot-badge" id="esSlotBadge" hidden></div>
            <div class="es-text-layer" id="esTextLayer"></div>
            <img id="esReelsOverlay" class="es-reels-overlay" alt="">
          </div>
          <div class="es-transport">
            <button type="button" class="es-btn es-btn-primary" id="esPlay">▶ 미리보기</button>
            <input type="range" id="esSeek" min="0" max="${total}" step="0.01" value="0">
            <span class="es-time" id="esTime">00:00 / ${fmtT(total)}</span>
            <button type="button" class="es-btn es-btn-ghost" id="esMusicPick" title="이 영상의 배경음악을 다른 파일로 바꿉니다">🎵 음악 변경</button>
            <input type="file" id="esMusicFile" accept="audio/*" hidden>
            <label class="es-reels-toggle" title="실제 릴스 화면처럼 보이도록 릴스 UI(PNG)를 영상 위에 씌워 봅니다"><input type="checkbox" id="esReels"> 📱 릴스화면 적용</label>
            <button type="button" class="es-btn es-btn-ghost" id="esReelsPick" title="릴스 UI PNG(투명 배경) 선택">UI 이미지</button>
            <input type="file" id="esReelsFile" accept="image/*" hidden>
            <button type="button" class="es-btn" id="esAddText" title="화면에 글자 추가 — 추가 후 드래그로 원하는 위치에 놓으세요">＋ 글자</button>
          </div>
          <div class="es-text-bar" id="esTextBar" hidden></div>
          <div class="es-text-tl es-tl-unified" id="esTextTl">
            <div class="es-tl-head"><span>🎬 타임라인</span><span class="es-hint">눈금 클릭·주황선 드래그로 위치 이동 · Space 재생/정지 · Q 앞·W 뒤 자르기 · 블록 끝 끌어 길이 조절 · 빈 칸 드래그로 선택 → Delete·Ctrl+Z</span></div>
            <div class="es-tl-stack" id="esTlStack">
              <div class="es-tl-labels">
                <div class="es-tl-rulerspacer"></div>
                <div class="es-tl-rowlabel">📝 자막</div>
                <div class="es-tl-rowlabel">🎬 영상</div>
                <div class="es-tl-rowlabel">🎵 음악</div>
                <div class="es-tl-rowlabel">🎙 음성</div>
              </div>
              <div class="es-tl-track" id="esTlTrack">
                <div class="es-tl-ruler" id="esTlRuler"></div>
                <div class="es-tl-lane" id="esTlLane"></div>
                <div class="es-tl-lane" id="esSceneLane"></div>
                <div class="es-tl-lane es-tl-audio" id="esMusicLane"></div>
                <div class="es-tl-lane es-tl-audio" id="esVoiceLane"></div>
                <div class="es-tl-playhead" id="esPlayhead"><span class="es-tl-playknob"></span></div>
              </div>
            </div>
          </div>
          <audio id="esMusic"></audio>
        </div>
        <div class="es-use-right">
          <div class="es-fill-head">
            <div class="es-fill-head-row">
              <span class="es-fill-title">장면 채우기 <b id="esFillCount">${filled}/${t.slots.length}</b></span>
              <label class="es-fxspeed" title="모든 장면의 효과 진행 속도 (느리게~빠르게)">효과속도
                <select id="esFxSpeed">
                  ${[["0.5", "0.5× 느리게"], ["0.75", "0.75×"], ["1", "1× 보통"], ["1.5", "1.5×"], ["2", "2× 빠르게"], ["3", "3× 매우빠름"]].map(([v, l]) => `<option value="${v}" ${String(t.fxSpeed || 1) === v ? "selected" : ""}>${l}</option>`).join("")}
                </select>
              </label>
            </div>
            <div class="es-fill-head-row es-fill-actions">
              <button type="button" class="es-btn" id="esFxRandom" title="모든 장면에 움직임 효과를 무작위로 적용">🎲 효과 랜덤</button>
              <button type="button" class="es-btn es-btn-ghost" id="esFxClear" title="모든 장면의 움직임 효과를 없앰(효과 없음)">🚫 효과 지우기</button>
              <button type="button" class="es-btn" id="esAddClip" title="새 클립(장면) 추가">＋ 클립</button>
              <button type="button" class="es-btn" id="esBulk" title="여러 파일을 한 번에 골라 순서대로 슬롯에 채웁니다 (인스타 자동싱크 방식)">⤵ 여러 개</button>
            </div>
            <div class="es-fill-head-row es-fill-actions">
              <button type="button" class="es-btn" id="esDurAll" title="모든 클립 길이를 같은 값으로 통일">⏱ 시간 통일</button>
              <button type="button" class="es-btn" id="esBeatFit" title="음악 비트를 분석해 클립을 비트에 맞춰 끊어줍니다">🥁 AI 리듬 맞추기</button>
              <button type="button" class="es-btn es-btn-ghost" id="esClearClips" title="모든 클립의 사진·영상 비우기">🧹 클립 비우기</button>
            </div>
            <div class="es-fill-head-row es-fill-actions">
              <div class="es-aimenu-wrap">
                <button type="button" class="es-btn es-btn-primary" id="esAiMake" title="AI로 장면을 만들어 넣어요 — 컨셉마다 다른 프롬프트">✨ AI 영상 만들기 ▾</button>
                <div class="es-aimenu" id="esAiMenu" hidden></div>
              </div>
            </div>
            <input type="file" id="esBulkFile" accept="image/*,video/*" multiple hidden>
          </div>
          <div class="es-fill-list" id="esFillList"></div>
        </div>
      </div>`;

    renderFillSlots();

    $("#esUseBack").addEventListener("click", () => { clearSession(); E.using = null; setView("gallery"); });
    { const ni = $("#esUseName"); if (ni) {
      ni.addEventListener("input", (e) => { E.using.template.name = e.target.value; scheduleSaveMeta(); });   // 작업 중 이름 반영
      ni.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") e.target.blur(); });
      ni.addEventListener("change", (e) => renameCurrentProject(e.target.value));                              // 저장된 영상이면 목록·기록도 갱신
    } }
    $("#esSaveProject").addEventListener("click", saveCurrentProject);
    $("#esDownload").addEventListener("click", exportVideo);
    $("#esPlay").addEventListener("click", togglePlay);
    $("#esSeek").addEventListener("input", (e) => seek(parseFloat(e.target.value)));
    $("#esBulk").addEventListener("click", () => $("#esBulkFile").click());
    $("#esBulkFile").addEventListener("change", (e) => bulkFill(Array.from(e.target.files || [])));
    $("#esAddText").addEventListener("click", addText);
    $("#esAddSub").addEventListener("click", addText);
    $("#esBulkSubAdd").addEventListener("click", () => { const ta = $("#esBulkSub"); if (ta) { addBulkSubs(ta.value); ta.value = ""; } });
    $("#esClearSubs").addEventListener("click", () => {
      if (!E.using.texts.length) return;
      if (!confirm(`자막 ${E.using.texts.length}개를 모두 삭제할까요?`)) return;
      pushSceneUndo();
      E.using.texts = []; E.using.selTexts = [];
      renderTexts(); renderTextBar(); scheduleSaveMeta();
    });
    $("#esAddClip").addEventListener("click", addSlotUse);
    $("#esFxRandom").addEventListener("click", () => {
      E.using.template.slots.forEach((s) => { s.fx = FX_RANDOM_POOL[Math.floor(Math.random() * FX_RANDOM_POOL.length)]; });
      renderFillSlots(); applyFrame(E.playhead); scheduleSaveMeta();
    });
    $("#esFxClear").addEventListener("click", () => {
      E.using.template.slots.forEach((s) => { s.fx = "none"; });   // 모든 장면 효과 없음
      renderFillSlots(); applyFrame(E.playhead); scheduleSaveMeta();
    });
    $("#esFxSpeed").addEventListener("change", (e) => { E.using.template.fxSpeed = parseFloat(e.target.value) || 1; applyFrame(E.playhead); scheduleSaveMeta(); });
    $("#esDurAll").addEventListener("click", () => {
      const cur = (E.using.template.slots[0] && E.using.template.slots[0].dur) || 2;
      const v = parseFloat(prompt("모든 클립 길이를 몇 초로 통일할까요?", cur.toFixed(1)));
      if (!v || v <= 0) return;
      const d = clamp(v, 0.3, 30);
      pushSceneUndo();   // 시간 통일 전 길이 저장(Ctrl+Z 되돌리기용)
      E.using.template.slots.forEach((s) => s.dur = d);
      refreshSlots();
    });
    $("#esBeatFit").addEventListener("click", beatFit);
    $("#esClearClips").addEventListener("click", () => {
      const ids = Object.keys(E.using.fills);
      if (!ids.length) return;
      if (!confirm(`모든 클립의 사진·영상(${ids.length}개)을 비울까요?`)) return;
      ids.forEach((id) => { const f = E.using.fills[id]; if (f && f.url) { try { URL.revokeObjectURL(f.url); } catch (_) {} } delFillBlob(id); });
      E.using.fills = {};
      renderFillSlots(); applyFrame(E.playhead); scheduleSaveMeta();
    });
    // AI 영상 만들기 메뉴 — 컨셉(각자 프롬프트) 리스트. 누르면 그 컨셉으로 2컷 세트 추가
    { const mk = $("#esAiMake"), menu = $("#esAiMenu");
      if (mk && menu) {
        mk.addEventListener("click", (e) => { e.stopPropagation(); if (menu.hidden) { E._editConcept = null; renderAiMenu(); } menu.hidden = !menu.hidden; });
        document.addEventListener("click", () => { menu.hidden = true; });
        menu.addEventListener("click", (e) => e.stopPropagation());
      } }
    // 릴스화면 오버레이
    $("#esReels").addEventListener("change", async (e) => {
      if (e.target.checked && !E.reelsUrl) { e.target.checked = false; $("#esReelsFile").click(); return; }
      E.reelsOn = e.target.checked; try { await idbSet("reelsOn", E.reelsOn); } catch (_) {}
      updateReelsOverlay();
    });
    $("#esReelsPick").addEventListener("click", () => $("#esReelsFile").click());
    $("#esReelsFile").addEventListener("change", (e) => { if (e.target.files[0]) setReelsImage(e.target.files[0]); });
    // 음악 변경
    $("#esMusicPick").addEventListener("click", () => $("#esMusicFile").click());
    $("#esMusicFile").addEventListener("change", (e) => { if (e.target.files[0]) setUseMusic(e.target.files[0]); });
    // 스테이지 빈 곳 클릭 → 글자 선택 해제
    $("#esStage").addEventListener("mousedown", (e) => { if (e.target.id === "esStage" || e.target.id === "esTextLayer" || e.target.tagName === "VIDEO" || e.target.tagName === "IMG") selectText(null); });
    if (E.using.musicUrl) { const a = $("#esMusic"); if (a) { a.src = E.using.musicUrl; a.loop = true; } }   // 총합보다 짧으면 반복해서 채움
    $("#esTlRuler").addEventListener("mousedown", startScrub);     // 눈금 클릭·드래그로 위치 이동
    $("#esPlayhead").addEventListener("mousedown", startScrub);     // 주황선 잡고 드래그
    $("#esTlLane").addEventListener("mousedown", onTlLaneMouseDown);
    $("#esSceneLane").addEventListener("mousedown", onSceneLaneMouseDown);
    updateUseMeta();
    resolveOverlaps();   // 예전에 겹쳐 저장된 글자 블록 정리
    renderTexts();
    renderTextTimeline();
    updateReelsOverlay();
    preloadFills();
    seek(clamp(E.playhead || 0, 0, totalDur()));   // 새로고침 복구 시 작업하던 위치에서 시작
  }
  // 릴스화면(UI PNG) 오버레이
  async function loadReels() {
    try { const b = await idbGet("reelsOverlay"); if (b instanceof Blob) E.reelsUrl = URL.createObjectURL(b); } catch (_) {}
    try { E.reelsOn = !!(await idbGet("reelsOn")); } catch (_) {}
  }
  function updateReelsOverlay() {
    const img = $("#esReelsOverlay"); if (!img) return;
    if (E.reelsOn && E.reelsUrl) { if (img._url !== E.reelsUrl) { img.src = E.reelsUrl; img._url = E.reelsUrl; } img.style.display = "block"; }
    else img.style.display = "none";
    const cb = $("#esReels"); if (cb) cb.checked = E.reelsOn;
    const pick = $("#esReelsPick"); if (pick) pick.textContent = E.reelsUrl ? "UI 이미지 변경" : "UI 이미지";
  }
  // 현재 영상의 배경음악 교체
  async function setUseMusic(file) {
    if (!E.using || !file || !/^audio\//.test(file.type)) { alert("음악(오디오) 파일을 선택하세요."); return; }
    const a = $("#esMusic");
    if (a) { try { a.pause(); } catch (_) {} }   // 이전 곡 즉시 정지
    if (E.using.musicUrl) { try { URL.revokeObjectURL(E.using.musicUrl); } catch (_) {} }
    E.using.musicUrl = URL.createObjectURL(file);
    E.using._musicChanged = true;
    if (a) {
      a.src = E.using.musicUrl; a.loop = true;
      try { a.load(); } catch (_) {}             // 새 소스 강제 로드
      if (E.playing) { try { a.currentTime = E.playhead; a.play(); } catch (_) {} }
    }
    try { await idbSet("sessMusic", file); } catch (e) { console.warn(e); }
    // 메타(이름/길이) 갱신
    const probe = document.createElement("audio"); probe.preload = "metadata"; probe.src = E.using.musicUrl;
    probe.onloadedmetadata = () => {
      E.using.template.music = { name: file.name.replace(/\.[^.]+$/, "").slice(0, 30), dur: isFinite(probe.duration) ? probe.duration : 0 };
      updateUseMeta(); scheduleSaveMeta();
    };
    probe.onerror = () => { E.using.template.music = { name: file.name.slice(0, 30), dur: 0 }; updateUseMeta(); scheduleSaveMeta(); };
    seek(E.playhead);
    updateUseMeta(); scheduleSaveMeta();
  }
  async function setReelsImage(file) {
    if (!file || !/^image\//.test(file.type)) { alert("릴스 UI 이미지(PNG 등)를 선택하세요. 가운데가 비치는 투명 PNG여야 영상이 보입니다."); return; }
    try { await idbSet("reelsOverlay", file); } catch (e) { console.warn(e); }
    if (E.reelsUrl) { try { URL.revokeObjectURL(E.reelsUrl); } catch (_) {} }
    E.reelsUrl = URL.createObjectURL(file);
    E.reelsOn = true; try { await idbSet("reelsOn", true); } catch (_) {}
    updateReelsOverlay();
  }

  // ── 사용 화면에서 클립(슬롯) 추가/시간조절/삭제 ──────────────────
  function totalDur() { return E.using ? E.using.template.slots.reduce((a, s) => a + (s.dur || 0), 0) : 0; }
  function updateUseMeta() {
    const el = $("#esUseMeta"); if (!el || !E.using) return;
    const t = E.using.template; const asp = ASPECTS[t.aspect] || ASPECTS["9:16"];
    el.textContent = `${t.slots.length}컷 · ${totalDur().toFixed(1)}초 · ${asp.label}${t.music ? " · 🎵 " + t.music.name : ""}`;
  }
  function clampTexts() {
    if (!E.using) return;
    const total = totalDur();
    E.using.texts.forEach((tx) => {
      tx.start = clamp(tx.start || 0, 0, Math.max(0, total));
      tx.dur = clamp(tx.dur || 0.3, 0.3, Math.max(0.3, total - tx.start) || 0.3);
    });
  }
  // 슬롯 변경 후 화면/재생상태 갱신 (재생위치 보존)
  function refreshSlots() {
    clampTexts();
    renderFillSlots();
    updateUseMeta();
    if (E.using.selTexts && E.using.selTexts.length) renderTextBar();
    E.playhead = clamp(E.playhead, 0, totalDur());
    applyFrame(E.playhead);
    updateTransport(E.playhead);
    renderTextTimeline();   // 전체 길이 변동 → 글자 타임라인 눈금/블록 갱신
    scheduleSaveMeta();
  }
  // 음악에서 비트(온셋) 시점 검출 — 에너지 플럭스 기반
  async function detectBeats(url) {
    const arrbuf = await (await fetch(url)).arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    const ac = new AC();
    let audio; try { audio = await ac.decodeAudioData(arrbuf.slice(0)); } finally { try { ac.close(); } catch (_) {} }
    const data = audio.getChannelData(0), sr = audio.sampleRate, hop = 512;
    const frames = Math.floor(data.length / hop);
    const energy = new Float32Array(frames);
    for (let i = 0; i < frames; i++) { let s = 0; for (let j = 0; j < hop; j++) { const v = data[i * hop + j] || 0; s += v * v; } energy[i] = s / hop; }
    const flux = new Float32Array(frames);
    for (let i = 1; i < frames; i++) { const d = energy[i] - energy[i - 1]; flux[i] = d > 0 ? d : 0; }
    const beats = [], win = 18;
    let maxS = 1e-9;
    for (let i = 1; i < frames - 1; i++) {
      let mean = 0, cnt = 0;
      for (let k = Math.max(0, i - win); k < Math.min(frames, i + win); k++) { mean += flux[k]; cnt++; }
      mean /= (cnt || 1);
      if (flux[i] > mean * 1.6 && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1]) {
        const t = i * hop / sr;
        if (!beats.length || t - beats[beats.length - 1].t > 0.28) {   // 최소 280ms 간격
          beats.push({ t, s: flux[i] });                              // s = 강세 세기
          if (flux[i] > maxS) maxS = flux[i];
        }
      }
    }
    for (const b of beats) b.s /= maxS;   // 강세 0..1 정규화
    return { beats, dur: audio.duration, energy, onset: flux, frameDur: hop / sr };
  }
  // onset 엔벨로프 자기상관으로 박자 주기(초) 추정 — IOI 중앙값보다 견고 (librosa 방식)
  function estimateBeatPeriod(onset, frameDur) {
    const n = onset.length; if (n < 8) return 0.5;
    const minBPM = 70, maxBPM = 180;
    const minLag = Math.max(1, Math.floor((60 / maxBPM) / frameDur));
    const maxLag = Math.min(n - 1, Math.ceil((60 / minBPM) / frameDur));
    let bestLag = minLag, bestVal = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let s = 0; for (let i = lag; i < n; i++) s += onset[i] * onset[i - lag];
      const bpm = 60 / (lag * frameDur);
      const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));   // 120BPM 부근 지각 가중
      s *= w;
      if (s > bestVal) { bestVal = s; bestLag = lag; }
    }
    return bestLag * frameDur;
  }
  // AI 리듬 맞추기 — 비트에 맞춰 클립 컷 시점 스냅
  async function beatFit() {
    if (!E.using) return;
    if (!E.using.musicUrl) { alert("이 템플릿에는 음악이 없어요. 먼저 음악을 넣어 주세요."); return; }
    const btn = $("#esBeatFit"); const old = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "🥁 분석 중…"; }
    try {
      const { beats, dur, energy, onset, frameDur } = await detectBeats(E.using.musicUrl);
      if (!beats || beats.length < 2) { alert("비트를 충분히 찾지 못했어요. 다른 음악으로 시도해 보세요."); return; }
      const slots = E.using.template.slots, n = slots.length;
      const span = Math.max(2, Math.min(dur, totalDur() || dur));   // 영상 길이를 음악 안에서

      // ── 1) 박자 그리드: 템포(주기 P)·위상(φ) 추정 → φ + k·P 규칙 격자 ──
      let P = estimateBeatPeriod(onset, frameDur);
      if (!(P > 0.15) || P > 2) P = 0.5;                            // 비정상값 방어
      // 위상 φ: 강세 큰 비트들이 격자선에 가장 잘 맞는 오프셋 선택
      let phase = 0, bestPh = -Infinity;
      for (let k = 0; k < 24; k++) {
        const ph = (k / 24) * P; let sc = 0;
        for (const b of beats) { const r = (((b.t - ph) % P) + P) % P; const d = Math.min(r, P - r); sc += (0.2 + b.s) * (1 - d / (P / 2)); }
        if (sc > bestPh) { bestPh = sc; phase = ph; }
      }

      // ── 2) 분할 단위 u: 격자선이 컷 수보다 넉넉하도록 비트를 1/2·1/4·1/8 박으로 세분 ──
      const avg = span / n;
      let u = P;
      while (u > avg * 1.05 && u > 0.18) u /= 2;                    // 평균 컷보다 촘촘하게
      let gridN = Math.floor((span - phase) / u);
      if (gridN < n) u = span / n;                                  // 컷이 너무 많으면 균등 폴백(비-격자)

      // 격자선 후보(0<t<span)와 각 선의 강세(가까운 onset 비트일수록 ↑)
      const grid = [];
      for (let t = phase; t < span - u * 0.5; t += u) {
        if (t <= u * 0.5) continue;
        let st = 0; for (const b of beats) { const d = Math.abs(b.t - t); if (d < u * 0.5) st = Math.max(st, b.s * (1 - d / (u * 0.5))); }
        grid.push({ t, s: st });
      }

      // ── 3) 그루브: 에너지 누적곡선으로 이상적 컷 위치(신나는 곳=촘촘) 산출 ──
      const nf = energy.length;
      const cum = new Float64Array(nf + 1);
      for (let i = 0; i < nf; i++) cum[i + 1] = cum[i] + energy[i];
      const energyAt = (t) => { let f = t / frameDur; if (f <= 0) return 0; if (f >= nf) return cum[nf]; const i = Math.floor(f); return cum[i] + (cum[i + 1] - cum[i]) * (f - i); };
      const ET = energyAt(span);
      const timeAtEnergy = (eT) => { let lo = 0, hi = span; for (let it = 0; it < 26; it++) { const mid = (lo + hi) / 2; if (energyAt(mid) < eT) lo = mid; else hi = mid; } return (lo + hi) / 2; };
      const GROOVE = 0.7;   // 0 = 균등, 1 = 완전 에너지 기반
      const ideal = [];
      for (let i = 1; i < n; i++) {
        const uniform = span * i / n;
        const eT = ET > 1e-9 ? timeAtEnergy(ET * i / n) : uniform;
        ideal.push((1 - GROOVE) * uniform + GROOVE * eT);
      }

      // ── 4) 이상 위치를 격자선에 단조 배정(앞으로만, 뒤 컷 자리 예약) → 비트 위·그루브 유지·붕괴 없음 ──
      const cuts = [0];
      if (grid.length >= n - 1) {
        let lo = 0;
        for (let i = 0; i < n - 1; i++) {
          const hi = grid.length - (n - 1 - i);                    // 남은 컷 수만큼 격자선 남겨두기
          let bi = lo, bestScore = -Infinity;
          for (let g = lo; g <= hi; g++) {
            const dist = Math.abs(grid[g].t - ideal[i]);
            const score = (0.5 + grid[g].s) - dist / u;            // 가깝고(↓dist) 강세 큰(↑s) 격자선 선호
            if (score > bestScore) { bestScore = score; bi = g; }
          }
          cuts.push(grid[bi].t); lo = bi + 1;
        }
      } else {                                                     // 격자 부족(극단적 다컷) → 이상 위치 그대로
        for (const t of ideal) cuts.push(t);
      }
      cuts.push(span);
      // 단조 증가 안전장치(이론상 불필요하나 방어)
      const minClip = Math.min(0.3, u * 0.9);
      for (let i = 1; i < cuts.length; i++) if (cuts[i] < cuts[i - 1] + minClip) cuts[i] = Math.min(span, cuts[i - 1] + minClip);
      cuts[cuts.length - 1] = span;
      pushSceneUndo();   // 리듬 맞추기 전 길이 저장(Ctrl+Z 되돌리기용)
      slots.forEach((s, i) => { s.dur = Math.max(0.2, +(cuts[i + 1] - cuts[i]).toFixed(2)); });
      refreshSlots();
      const bpm = Math.round(60 / P);
      alert(`음악 리듬에 맞춰 ${n}컷을 끊었어요. (약 ${bpm}BPM · 비트 ${beats.length}개)`);
    } catch (e) {
      console.warn("[easyshorts] beatFit", e);
      alert("리듬 분석에 실패했어요: " + (e && e.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old || "🥁 AI 리듬 맞추기"; }
    }
  }
  function addSlotUse() {
    if (!E.using) return;
    const slots = E.using.template.slots;
    const lastDur = slots.length ? (slots[slots.length - 1].dur || 2) : 2;
    slots.push({ id: uid(), dur: lastDur, label: "" });
    refreshSlots();
    // 새 클립이 보이도록 목록 맨 아래로 스크롤
    const list = $("#esFillList"); if (list) list.scrollTop = list.scrollHeight;
  }
  // ── AI 컨셉(각자 다른 프롬프트) — 추가·수정·삭제, localStorage 저장 ──
  const AI_BEFORE_PROMPT = `Transform this renovated Korean apartment interior photo into its "BEFORE renovation" state — exactly the same room before the remodeling work was done.

CRITICAL — keep IDENTICAL:
- Exact camera angle, viewpoint, perspective, framing
- Room structure: walls position, window position/size, door position, ceiling height, floor layout
- Lighting direction (sunlight from same window)

CHANGE to old/dated state:
- Walls: old beige or yellowed wallpaper (1990s Korean apartment style, faded floral or stains) or scuffed plain paint
- Floor: old worn vinyl flooring (jangpan) with yellowing/wear, or scratched aged wood
- Ceiling: visible old fluorescent panel light (방등) instead of modern recessed lights
- Furniture: empty room OR very minimal old/worn furniture (1-2 pieces max)
- Color tone: slightly dim, faded, yellow-tinted, less vibrant

Style: photorealistic photograph, NOT cartoon/illustration. A real before-photo of an old Korean apartment about to be renovated.`;
  function loadAiConcepts() {
    if (E.aiConcepts) return;
    let arr = null; try { arr = JSON.parse(localStorage.getItem("es_ai_concepts") || "null"); } catch (_) {}
    if (!Array.isArray(arr) || !arr.length) arr = [{ id: uid(), name: "🏚 비포사진", prompt: AI_BEFORE_PROMPT }];
    E.aiConcepts = arr;
  }
  function saveAiConcepts() { try { localStorage.setItem("es_ai_concepts", JSON.stringify(E.aiConcepts || [])); } catch (_) {} }
  function renderAiMenu() {
    const menu = $("#esAiMenu"); if (!menu) return;
    loadAiConcepts();
    const items = E.aiConcepts.map((c) => {
      if (E._editConcept === c.id) {
        return `<div class="es-aiconcept editing" data-id="${c.id}">
          <input class="es-aic-name" value="${esc(c.name)}" placeholder="컨셉 이름 (예: 비포사진)">
          <textarea class="es-aic-prompt" rows="4" placeholder="이 컨셉으로 생성할 때 쓸 프롬프트를 직접 적어주세요">${esc(c.prompt || "")}</textarea>
          <div class="es-aic-btns"><button type="button" class="es-btn es-btn-primary es-aic-save" data-id="${c.id}">저장</button><button type="button" class="es-btn es-btn-ghost es-aic-cancel">취소</button></div>
        </div>`;
      }
      return `<div class="es-aiconcept" data-id="${c.id}">
        <button type="button" class="es-aiconcept-pick" data-id="${c.id}" title="이 컨셉으로 2컷 세트 추가">${esc(c.name || "컨셉")}</button>
        <button type="button" class="es-aiconcept-edit" data-id="${c.id}" title="프롬프트 수정">✎</button>
        <button type="button" class="es-aiconcept-del" data-id="${c.id}" title="이 컨셉 삭제">×</button>
      </div>`;
    }).join("");
    menu.innerHTML = `<div class="es-aimenu-head">컨셉을 누르면 2컷 세트 추가 · ✎ 프롬프트 수정</div>${items}<button type="button" class="es-aiconcept-add">＋ 새 컨셉 추가</button>`;
    $$(".es-aiconcept-pick", menu).forEach((b) => b.addEventListener("click", () => {
      const c = E.aiConcepts.find((x) => x.id === b.dataset.id); if (!c) return;
      menu.hidden = true; E._editConcept = null; addBeforeAfterPair(c);
    }));
    $$(".es-aiconcept-edit", menu).forEach((b) => b.addEventListener("click", () => { E._editConcept = b.dataset.id; renderAiMenu(); }));
    $$(".es-aiconcept-del", menu).forEach((b) => b.addEventListener("click", () => {
      if (E.aiConcepts.length <= 1) { alert("컨셉은 최소 1개는 있어야 해요."); return; }
      E.aiConcepts = E.aiConcepts.filter((x) => x.id !== b.dataset.id); saveAiConcepts(); renderAiMenu();
    }));
    const addB = menu.querySelector(".es-aiconcept-add");
    if (addB) addB.addEventListener("click", () => { const c = { id: uid(), name: "새 컨셉", prompt: "" }; E.aiConcepts.push(c); saveAiConcepts(); E._editConcept = c.id; renderAiMenu(); });
    $$(".es-aic-save", menu).forEach((b) => b.addEventListener("click", () => {
      const wrap = b.closest(".es-aiconcept"); const c = E.aiConcepts.find((x) => x.id === b.dataset.id); if (!c) return;
      c.name = (wrap.querySelector(".es-aic-name").value || "컨셉").trim() || "컨셉";
      c.prompt = wrap.querySelector(".es-aic-prompt").value.trim();
      saveAiConcepts(); E._editConcept = null; renderAiMenu();
    }));
    const cancelB = menu.querySelector(".es-aic-cancel");
    if (cancelB) cancelB.addEventListener("click", () => { E._editConcept = null; renderAiMenu(); });
    $$(".es-aic-name, .es-aic-prompt", menu).forEach((el) => el.addEventListener("keydown", (e) => e.stopPropagation()));
  }
  // AI 영상 — 비포사진: 연동된 2컷 세트 추가 (1번=AI 비포, 2번=원본 애프터). concept의 프롬프트를 before 슬롯에 저장
  function addBeforeAfterPair(concept) {
    if (!E.using) return;
    const slots = E.using.template.slots;
    const lastDur = slots.length ? (slots[slots.length - 1].dur || 2.5) : 2.5;
    const pid = uid();
    const prompt = (concept && concept.prompt) || AI_BEFORE_PROMPT;
    const cname = (concept && concept.name) || "비포";
    slots.push({ id: uid(), dur: lastDur, label: "", aiPair: pid, aiRole: "before", aiPrompt: prompt, aiConcept: cname });   // 1번: AI 생성
    slots.push({ id: uid(), dur: lastDur, label: "", aiPair: pid, aiRole: "after", trans: "fade" });     // 2번: 원본 — 비포→애프터 디졸브 기본
    refreshSlots();
    const list = $("#esFillList"); if (list) list.scrollTop = list.scrollHeight;
  }
  // Grok(xAI) 이미지 생성 — 애프터(원본) 사진 + 컨셉 프롬프트로 이미지 생성
  async function grokBeforeImage(afterDataUri, xk, prompt) {
    const API_BASE = "https://sc-pink.vercel.app";
    const r = await fetch(`${API_BASE}/api/grok-xai`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "image", prompt, image: afterDataUri, xai_api_key: xk }),
    });
    let j = null; try { j = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error((j && (j.error || j.message)) || `HTTP ${r.status} — 백엔드에 Grok 이미지(action:"image") 라우트가 필요해요`);
    // b64(data URL) 우선 — 외부 URL을 브라우저가 fetch하면 CORS에 막힘
    const url = (j && j.b64_json) ? ("data:" + (j.mime_type || "image/png") + ";base64," + j.b64_json)
              : (j && (j.url || j.image_url)) || null;
    if (!url) throw new Error("이미지 응답이 비어있어요");
    if (!url.startsWith("data:")) throw new Error("이미지가 외부 URL로 와서 가져올 수 없어요(백엔드 base64 변환 필요)");   // CORS 방지
    return url;
  }
  // Gemini 폴백 — 같은 참조이미지 방식, 빠름(Grok 타임아웃 시 사용)
  async function geminiBeforeImage(afterDataUri, prompt) {
    const API_BASE = "https://sc-pink.vercel.app";
    let gk = ""; try { gk = (localStorage.getItem("studio_gemini_key") || "").trim(); } catch (_) {}
    if (!gk) throw new Error("Gemini 키도 없어요(스튜디오 탭)");
    const r = await fetch(`${API_BASE}/api/gemini-image`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, gemini_api_key: gk, apiKey: gk, images: [afterDataUri], aspect_ratio: "9:16" }),
    });
    let j = null; try { j = await r.json(); } catch (_) {}
    if (!r.ok || !j || !j.b64_json) throw new Error((j && (j.error || j.message)) || `HTTP ${r.status}`);
    return "data:" + (j.mime_type || "image/png") + ";base64," + j.b64_json;
  }
  // 비포사진 생성 — before 슬롯에서 호출. 짝(after)의 원본 사진을 참조
  async function generateBeforePhoto(beforeId) {
    if (!E.using) return;
    const slots = E.using.template.slots;
    const before = slots.find((x) => x.id === beforeId); if (!before || before.aiRole !== "before") return;
    const after = slots.find((x) => x.aiPair === before.aiPair && x.aiRole === "after");
    const af = after && E.using.fills[after.id];
    if (!af || af.kind !== "image" || !af._file) { alert("먼저 2번(원본) 칸에 애프터 사진을 넣어주세요."); return; }
    // 올인원스튜디오 비포사진과 동일하게 Gemini(Nano Banana)를 주력으로, Grok은 대체로
    let gk = "", xk = "";
    try { gk = (localStorage.getItem("studio_gemini_key") || "").trim(); xk = (localStorage.getItem("studio_xai_key") || "").trim(); } catch (_) {}
    if (!gk && !xk) { alert("Gemini 키가 필요해요. 상단 '스튜디오' 탭에서 키를 입력해 주세요. (올인원스튜디오의 비포사진도 Gemini로 만들어요)"); return; }
    const btn = document.querySelector(`.es-before-gen[data-id="${beforeId}"]`); const old = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "🏚 생성 중…"; }
    const prompt = before.aiPrompt || AI_BEFORE_PROMPT;
    try {
      const afterUri = await blobToScaledDataURL(af._file, 1024);
      let uri = null; const errs = [];
      if (gk) { try { uri = await geminiBeforeImage(afterUri, prompt); } catch (e) { errs.push("Gemini: " + (e && e.message || e)); } }   // 주력
      if (!uri && xk) { if (btn) btn.textContent = "🏚 Grok 시도…"; try { uri = await grokBeforeImage(afterUri, xk, prompt); } catch (e) { errs.push("Grok: " + (e && e.message || e)); } }   // 대체
      if (!uri) throw new Error(errs.join(" / ") || "키가 없어요");
      const blob = await (await fetch(uri)).blob();
      await fillSlot(beforeId, new File([blob], "before.png", { type: blob.type || "image/png" }));
    } catch (e) {
      alert("비포사진 생성 실패: " + (e && e.message || e) + "\n(스튜디오 탭의 키를 확인해 주세요)");
      if (btn) { btn.disabled = false; btn.textContent = old || "🏚 비포사진 생성"; }
    }
  }
  function setSlotDur(slotId, dur) {
    if (!E.using) return;
    const s = E.using.template.slots.find((x) => x.id === slotId); if (!s) return;
    s.dur = clamp(parseFloat(dur) || 0.3, 0.3, 30);
    updateUseMeta();
    E.playhead = clamp(E.playhead, 0, totalDur());
    applyFrame(E.playhead); updateTransport(E.playhead);
    // 슬롯 카드의 시작시간 라벨만 갱신
    refreshSlotTimes();
    renderTextTimeline();   // 전체 길이 변동 → 글자 타임라인 눈금/블록 갱신
    scheduleSaveMeta();
  }
  function removeSlotUse(slotId) {
    if (!E.using) return;
    const slots = E.using.template.slots;
    const s = slots.find((x) => x.id === slotId);
    const ids = [slotId];
    // 비포/애프터는 항상 세트 — 짝도 함께 삭제
    if (s && s.aiPair) { const mate = slots.find((x) => x.aiPair === s.aiPair && x.id !== slotId); if (mate) ids.push(mate.id); }
    if (slots.length - ids.length < 1) { alert("클립은 최소 1개는 있어야 해요."); return; }
    ids.forEach((id) => { const f = E.using.fills[id]; if (f && f.url) { try { URL.revokeObjectURL(f.url); } catch (_) {} } delete E.using.fills[id]; delFillBlob(id); });
    E.using.template.slots = slots.filter((x) => !ids.includes(x.id));
    refreshSlots();
  }
  function refreshSlotTimes() {
    const list = $("#esFillList"); if (!list || !E.using) return;
    let acc = 0;
    E.using.template.slots.forEach((s) => {
      const lab = list.querySelector(`.es-fill-slot[data-id="${s.id}"] .es-fill-start`);
      if (lab) lab.textContent = fmtT(acc);
      acc += (s.dur || 0);
    });
  }

  // ── 글자(텍스트) 오버레이 ────────────────────────────────────────
  function addText() {
    if (!E.using) return;
    const total = totalDur();
    const start = clamp(E.playhead, 0, Math.max(0, total - 0.1));
    const dur = clamp(Math.min(2.5, total - start || 2.5), 0.3, Math.max(0.3, total - start || 2.5));
    const tx = { id: uid(), text: "텍스트 입력", xPct: 50, yPct: 50, width: 70, size: 6, color: "#ffffff", bold: true, shadow: true, start, dur };
    pushSceneUndo();
    E.using.texts.push(tx);
    resolveOverlaps();
    renderTexts();
    selectText(tx.id);
    scheduleSaveMeta();
  }
  // 짧은 알림 토스트
  function toast(msg) {
    let t = document.getElementById("esToast");
    if (!t) { t = document.createElement("div"); t.id = "esToast"; t.className = "es-toast"; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._tm); t._tm = setTimeout(() => t.classList.remove("show"), 1300);
  }
  // 복사한 자막을 재생헤드 위치에 붙여넣기 (여러 개면 상대 간격 유지). 붙인 것 선택됨
  function pasteTexts() {
    if (!E.using || !E._textClip || !E._textClip.length) return;
    pushSceneUndo();
    const total = totalDur();
    const minStart = Math.min.apply(null, E._textClip.map((t) => t.start || 0));
    const base = clamp(E.playhead, 0, Math.max(0, total));
    const news = E._textClip.map((t) => {
      const nt = JSON.parse(JSON.stringify(t)); nt.id = uid();
      nt.start = clamp(base + ((t.start || 0) - minStart), 0, Math.max(0, total - (t.dur || 0.3)));
      return nt;
    });
    E.using.texts.push.apply(E.using.texts, news);
    resolveOverlaps();
    E.using.selTexts = news.map((t) => t.id);
    renderTexts(); renderTextBar(); scheduleSaveMeta();
  }
  // 한꺼번에 넣기 — 여러 줄을 줄마다 자막으로 나눠 시간에 고르게 배치
  function addBulkSubs(text) {
    if (!E.using) return;
    const lines = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
    if (!lines.length) { alert("자막으로 넣을 내용을 입력하세요. (엔터로 줄을 나눠요)"); return; }
    pushSceneUndo();
    const total = totalDur() || lines.length * 2.5;
    // 기존 자막의 스타일(크기·색·위치·너비·굵게·그림자)을 그대로 물려받음
    const ref = E.using.texts[0] || {};
    const style = {
      xPct: ref.xPct != null ? ref.xPct : 50,
      yPct: ref.yPct != null ? ref.yPct : 50,
      width: ref.width != null ? ref.width : 70,
      size: ref.size != null ? ref.size : 6,
      color: ref.color || "#ffffff",
      bold: ref.bold != null ? ref.bold : true,
      shadow: ref.shadow != null ? ref.shadow : true,
    };
    // 기존 자막은 지우고, 영상 길이에 맞춰 균등 배분해 처음부터 새로 생성
    const per = total / lines.length;
    E.using.texts = lines.map((ln, i) => Object.assign({ id: uid(), text: ln, start: +(i * per).toFixed(2), dur: +per.toFixed(2) }, style));
    E.using.selTexts = [];
    renderTexts(); renderTextBar(); scheduleSaveMeta();
  }
  // AI 문구 제작 — Gemini 텍스트 (스튜디오와 같은 키 공유)
  const ES_AI_SYSTEM = [
    "너는 인테리어 시공업체 대표의 시점에서 영상 자막 문구를 쓴다.",
    "· 시점: 인테리어 업체 대표가 직접 현장을 둘러보며 담담하게 회상하는 독백체.",
    "· 관계성: 미팅 당시 고객이 무심코 툭 던진 고민이나 아픔을 사장이 기억해 두었다가 공간으로 해결해 준 서사 구조.",
    "· 어조와 톤: 라디오 사연처럼 따뜻한 톤, 날것의 진정성이 느껴지는 어조, 자부심과 위로가 동시에 느껴지는 톤.",
    "· 전개: [고객의 실제 고민 멘트 인용] ➡️ [사장의 시공 철학/해결책] ➡️ [완공 후 고객의 반응과 사장의 보람] 구조로 짠다.",
    "출력 규칙: 설명·번호·따옴표·이모지 없이, 자막 문구만 한 줄에 하나씩 줄바꿈으로. 각 줄은 짧게(한 호흡).",
  ].join("\n");
  // Blob → 축소 dataURL (AI 참조용, 가벼운 페이로드)
  function blobToScaledDataURL(blob, max) {
    return new Promise((res) => {
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => {
        const m = max || 640; const sc = Math.min(1, m / Math.max(im.naturalWidth, im.naturalHeight));
        const w = Math.max(1, Math.round(im.naturalWidth * sc)), h = Math.max(1, Math.round(im.naturalHeight * sc));
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        cv.getContext("2d").drawImage(im, 0, 0, w, h);
        let d = null; try { d = cv.toDataURL("image/jpeg", 0.82); } catch (_) {}
        try { URL.revokeObjectURL(url); } catch (_) {}
        res(d);
      };
      im.onerror = () => { try { URL.revokeObjectURL(url); } catch (_) {} res(null); };
      im.src = url;
    });
  }
  async function esGeminiText(userPrompt, systemPrompt, images) {
    let key = "";
    try { key = (localStorage.getItem("studio_gemini_key") || "").trim(); } catch (_) {}
    if (!key) throw new Error("Gemini API 키가 필요해요. 상단 '스튜디오' 탭에서 키를 먼저 입력해 주세요.");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`;
    const parts = [{ text: userPrompt }];
    (images || []).forEach((d) => { const m = /^data:(.*?);base64,(.*)$/.exec(d || ""); if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } }); });
    const body = { contents: [{ role: "user", parts }] };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) throw new Error((j && j.error && j.error.message) || `HTTP ${res.status}`);
    const out = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map((p) => p.text || "").join("").trim();
    if (!out) throw new Error("빈 응답");
    return out;
  }
  async function aiMakeLines() {
    if (!E.using) return;
    const topicEl = $("#esAiTopic"); const topic = topicEl ? topicEl.value.trim() : "";
    if (!topic) { alert("주제나 꼭 들어갈 내용을 먼저 적어주세요."); return; }
    const n = E.using.template.slots.length || 7;
    const btn = $("#esAiGen"); const old = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "✨ 만드는 중…"; }
    try {
      // 넣은 사진 중 최대 3장을 참조용으로 첨부
      const imgs = [];
      for (const s of E.using.template.slots) {
        if (imgs.length >= 3) break;
        const f = E.using.fills[s.id];
        if (f && f.kind === "image" && f._file) { const d = await blobToScaledDataURL(f._file, 640); if (d) imgs.push(d); }
      }
      const refLine = imgs.length ? `\n\n첨부한 ${imgs.length}장은 이 영상에 실제로 들어갈 공간 사진이야. 사진 속 분위기·자재·공간 느낌을 참고해서 문구를 만들어줘.` : "";
      const userPrompt = `아래 주제와 '꼭 들어가야 할 내용'을 자연스럽게 녹여서, 위 스타일의 영상 자막 문구를 한 줄에 하나씩 ${Math.max(5, n)}줄 내외로 만들어줘.\n각 줄은 순서대로 자막으로 출력되니 한 줄은 짧고 담백하게.${refLine}\n\n[주제/꼭 들어갈 내용]\n${topic}`;
      const out = await esGeminiText(userPrompt, ES_AI_SYSTEM, imgs);
      const lines = out.split(/\r?\n/).map((l) => l.replace(/^\s*[\d).\-•*"']+\s*/, "").trim()).filter(Boolean);
      E.using._aiTopic = topic;
      E.using._subDraft = lines.join("\n");
      const ta = $("#esBulkSub"); if (ta) ta.value = E.using._subDraft;
    } catch (e) {
      alert("AI 문구 제작 실패: " + (e && e.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old || "✨ AI로 문구 제작"; }
    }
  }
  // AI 추천 — 넣은 사진 + 기존 자막을 분석해, 비슷한 형태로 각 자리(슬롯)를 15자 이내로 채움
  async function aiRecommendCaptions() {
    if (!E.using) return;
    const caps = E.using.texts, N = caps.length;
    if (!N) { alert("자막 자리가 없어요."); return; }
    const btn = $("#esAiReco"); const old = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "✨ 추천 만드는 중…"; }
    try {
      // 넣은 사진 최대 5장 첨부(앞 사진 분석용)
      const imgs = [];
      for (const s of E.using.template.slots) {
        if (imgs.length >= 5) break;
        const f = E.using.fills[s.id];
        if (f && f.kind === "image" && f._file) { const d = await blobToScaledDataURL(f._file, 512); if (d) imgs.push(d); }
      }
      const existing = caps.map((t, i) => `${i + 1}. ${t.text ? t.text : "(빈칸)"}`).join("\n");
      const refLine = imgs.length ? `\n\n첨부한 ${imgs.length}장은 이 영상에 실제로 들어갈 공간 사진이야. 사진의 분위기·자재·색감도 반영해줘.` : "";
      const userPrompt = `아래는 한 영상의 자막 "자리" ${N}개와 기존에 적혀 있던 문구야. 기존 문구의 말투·형태·언어(한글/영문)·길이감을 분석해서, 같은 느낌의 새 자막을 각 자리에 1개씩 정확히 ${N}줄 만들어줘.\n\n규칙:\n- 정확히 ${N}줄, 한 줄에 하나, 순서대로.\n- 각 줄은 공백 포함 15자 이내로 아주 짧게.\n- 번호·따옴표·이모지·설명 없이 문구만.${refLine}\n\n[기존 문구]\n${existing}`;
      const out = await esGeminiText(userPrompt, ES_AI_SYSTEM, imgs);
      const clean = (l) => l
        .replace(/^\s*[-•*]\s*/, "")               // 선두 불릿
        .replace(/^\s*\d+[).\.]\s*/, "")           // 선두 번호(1. / 2))
        .replace(/^["'“”]+|["'“”]+$/g, "")         // 둘러싼 따옴표
        .trim();
      const lines = out.split(/\r?\n/).map(clean).filter(Boolean);
      if (!lines.length) throw new Error("빈 응답");
      for (let i = 0; i < N; i++) { if (lines[i] != null) E.using.texts[i].text = lines[i].slice(0, 15); }   // 15자 안전 제한
      scheduleSaveMeta();
      renderEasy();   // 입력칸에 반영
    } catch (e) {
      alert("AI 추천 실패: " + (e && e.message || e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old || "✨ AI 추천"; }
    }
  }
  // 커서 위치에서 글자를 두 블록으로 분리 (앞문장=현재 블록, 뒤=새 블록으로 이어짐)
  function splitTextAtCursor(tx, inp) {
    if (!E.using) return;
    const val = inp.value;
    const pos = (inp.selectionStart != null) ? inp.selectionStart : val.length;
    const before = val.slice(0, pos);
    const after = val.slice(pos);
    tx.text = before;
    const total = totalDur();
    const newStart = clamp((tx.start || 0) + (tx.dur || 0), 0, Math.max(0, total - 0.1));
    const newTx = {
      id: uid(), text: after,
      xPct: tx.xPct, yPct: tx.yPct, width: tx.width, size: tx.size,
      color: tx.color, bold: tx.bold, shadow: tx.shadow,
      start: newStart, dur: clamp(tx.dur || 2.5, 0.3, Math.max(0.3, total - newStart) || 2.5),
    };
    const idx = E.using.texts.findIndex((x) => x.id === tx.id);
    E.using.texts.splice(idx < 0 ? E.using.texts.length : idx + 1, 0, newTx);
    E.using.selTexts = [newTx.id];
    resolveOverlaps();
    renderTexts();
    renderTextBar();
    const ni = $("#esTextInput"); if (ni) { ni.focus(); try { ni.setSelectionRange(0, 0); } catch (_) {} }
    scheduleSaveMeta();
  }
  function selectText(id) {
    if (!E.using) return;
    E.using._activeTl = "text";   // 키보드(Ctrl+A·Delete) 대상 = 글자(가사)
    E.using.selTexts = id ? [id] : [];
    // 선택한 글자가 현재 시각 글자가 되도록 재생 위치를 그 글자 구간으로 이동 → 그 글자만 보임
    if (id && !E.playing) {
      const tx = E.using.texts.find((x) => x.id === id);
      if (tx) { const tot = totalDur(); E.playhead = clamp((tx.start || 0) + Math.min(0.05, (tx.dur || 0) / 2), 0, tot); applyFrame(E.playhead); updateTransport(E.playhead); }
    }
    highlightSel();
    renderTextBar();
  }
  function highlightSel() {
    $$("#esTextLayer .es-text").forEach((el) => el.classList.toggle("sel", isTextSel(el.dataset.id)));
    $$("#esTlLane .es-tl-block").forEach((el) => el.classList.toggle("sel", isTextSel(el.dataset.id)));
    $$("#esSubList .es-sub-card").forEach((el) => el.classList.toggle("sel", isTextSel(el.dataset.id)));
  }
  // 왼쪽 자막 목록 — 시간 순으로 카드 나열
  function renderSubList() {
    const list = $("#esSubList"); if (!list || !E.using) return;
    const sorted = E.using.texts.slice().sort((a, b) => (a.start || 0) - (b.start || 0));
    if (!sorted.length) { list.innerHTML = `<div class="es-subs-empty">아직 자막이 없어요.<br><b>＋ 자막</b> 으로 추가하세요.</div>`; return; }
    list.innerHTML = sorted.map((tx, i) => {
      return `<div class="es-sub-card ${isTextSel(tx.id) ? "sel" : ""}" data-id="${tx.id}">
        <span class="es-sub-num">${i + 1}</span>
        <div class="es-sub-main">
          <input type="text" class="es-sub-input" data-id="${tx.id}" value="${esc((tx.text || "").replace(/\n/g, " "))}" placeholder="자막 입력">
          <div class="es-sub-time">${(tx.start || 0).toFixed(1)}s · ${(tx.dur || 0).toFixed(1)}초</div>
        </div>
        <button type="button" class="es-sub-x" data-id="${tx.id}" title="삭제">×</button>
      </div>`;
    }).join("");
    $$(".es-sub-card", list).forEach((card) => {
      const id = card.dataset.id;
      card.addEventListener("mousedown", (e) => { if (e.target.closest(".es-sub-x")) return; startSubDrag(e, id, !!e.target.closest(".es-sub-input")); });
      const inp = card.querySelector(".es-sub-input");
      if (inp) {
        inp.addEventListener("focus", () => selectText(id));
        inp.addEventListener("input", (e) => {
          const tx = E.using.texts.find((t) => t.id === id); if (!tx) return;
          tx.text = e.target.value;
          const el = $(`#esTextLayer .es-text[data-id="${id}"]`); if (el) el.textContent = e.target.value || " ";
          const lab = $(`#esTlLane .es-tl-block[data-id="${id}"] .es-tl-label`); if (lab) lab.textContent = "📝 " + (e.target.value || "텍스트");
          const bar = $("#esTextInput"); if (bar && E.using.selTexts.length === 1 && E.using.selTexts[0] === id) bar.value = e.target.value;
          scheduleSaveMeta();
        });
        inp.addEventListener("keydown", (e) => e.stopPropagation());
      }
      const x = card.querySelector(".es-sub-x");
      if (x) x.addEventListener("click", (e) => {
        e.stopPropagation();
        pushSceneUndo();
        E.using.texts = E.using.texts.filter((t) => t.id !== id);
        E.using.selTexts = E.using.selTexts.filter((s) => s !== id);
        renderTexts(); renderTextBar(); scheduleSaveMeta();
      });
    });
  }
  // 왼쪽 가사 목록 선택 — 클릭=단일, Shift/Ctrl=토글, 드래그=범위. 입력칸 위에서도 끌면 선택됨
  function startSubDrag(e, id, onInput) {
    if (!E.using) return;
    E.using._activeTl = "text";
    if (e.shiftKey || e.metaKey || e.ctrlKey) {   // 다중 선택 토글
      e.preventDefault();
      if (isTextSel(id)) E.using.selTexts = E.using.selTexts.filter((s) => s !== id);
      else E.using.selTexts.push(id);
      highlightSel(); renderTextBar(); return;
    }
    const sx = e.clientX, sy = e.clientY;
    const list = $("#esSubList");
    const order = E.using.texts.slice().sort((a, b) => (a.start || 0) - (b.start || 0)).map((t) => t.id);
    const anchor = order.indexOf(id);
    const cards = $$("#esSubList .es-sub-card");
    // 세로 위치(y)로 어느 카드 위인지 — gap에 와도 바로 아래 카드로(끝으로 튀지 않게)
    const idxAtY = (y) => {
      if (!cards.length) return anchor;
      if (y < cards[0].getBoundingClientRect().top) return 0;
      let idx = cards.length - 1;
      for (let i = 0; i < cards.length; i++) { if (y <= cards[i].getBoundingClientRect().bottom) { idx = i; break; } }
      return order.indexOf(cards[idx].dataset.id);
    };
    if (!onInput) { E.using.selTexts = [id]; highlightSel(); renderTextBar(); }   // 본문 클릭 → 즉시 단일선택(입력칸은 클릭 시 편집 유지)
    const preventSel = (ev) => ev.preventDefault();   // 드래그 중 글자 선택 차단
    let dragging = false;
    const move = (ev) => {
      if (!dragging) {
        if (Math.abs(ev.clientX - sx) < 5 && Math.abs(ev.clientY - sy) < 5) return;   // 클릭/드래그 구분 임계값
        dragging = true;
        if (list) list.style.userSelect = "none";
        document.addEventListener("selectstart", preventSel);
        if (document.activeElement && document.activeElement.blur) document.activeElement.blur();   // 입력 포커스 해제
        const sel = window.getSelection && window.getSelection(); if (sel && sel.removeAllRanges) sel.removeAllRanges();
      }
      ev.preventDefault();
      const cur = idxAtY(ev.clientY); if (cur < 0) return;
      E.using.selTexts = order.slice(Math.min(anchor, cur), Math.max(anchor, cur) + 1);
      highlightSel();
    };
    const up = () => {
      document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up);
      document.removeEventListener("selectstart", preventSel);
      if (list) list.style.userSelect = "";
      if (dragging) renderTextBar();
    };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }
  function renderTexts() {
    const layer = $("#esTextLayer"); if (!layer || !E.using) return;
    layer.innerHTML = "";
    E.using.texts.forEach((tx) => {
      const el = document.createElement("div");
      el.className = "es-text" + (isTextSel(tx.id) ? " sel" : "");
      el.dataset.id = tx.id;
      el.textContent = tx.text || " ";
      el.style.left = tx.xPct + "%";
      el.style.top = tx.yPct + "%";
      if (tx.width) el.style.width = tx.width + "%"; else el.style.width = "";
      el.style.fontSize = "min(" + tx.size + "cqw, " + (tx.size * 1.6) + "cqh)";
      el.style.color = tx.color;
      el.style.fontWeight = tx.bold ? "800" : "500";
      el.style.textShadow = tx.shadow ? "0 2px 8px rgba(0,0,0,0.85), 0 0 2px rgba(0,0,0,0.9)" : "none";
      el.addEventListener("mousedown", (e) => startTextDrag(e, tx, el));
      el.addEventListener("dblclick", (e) => { e.preventDefault(); selectText(tx.id); const inp = $("#esTextInput"); if (inp) { inp.focus(); inp.select(); } });
      layer.appendChild(el);
    });
    updateTextVisibility(E.playhead);
    renderTextTimeline();
    renderSubList();
  }
  // 글자 타임라인 — 각 글자를 길이(머무는 시간)만큼 블록으로 표시
  function renderTextTimeline() {
    const tl = $("#esTextTl"); if (!tl || !E.using) return;
    const total = totalDur() || 1;
    const ruler = $("#esTlRuler"), lane = $("#esTlLane");
    if (ruler) {
      const step = total > 24 ? 5 : (total > 12 ? 2 : 1);
      let ticks = "";
      for (let s = 0; s <= total + 0.001; s += step) ticks += `<span class="es-tl-tick" style="left:${(s / total) * 100}%">${fmtT(s)}</span>`;
      ruler.innerHTML = ticks;
    }
    if (!lane) return;
    lane.querySelectorAll(".es-tl-block").forEach((n) => n.remove());
    E.using.texts.forEach((tx) => {
      const el = document.createElement("div");
      el.className = "es-tl-block" + (isTextSel(tx.id) ? " sel" : "");
      el.dataset.id = tx.id;
      el.style.left = ((tx.start || 0) / total) * 100 + "%";
      el.style.width = "calc(" + Math.max(0.5, ((tx.dur || 0) / total) * 100) + "% - 1px)";   // 실제 길이 비율 + 1px 틈 → 겹침 없음
      const label = (tx.text || "").split("\n")[0] || "텍스트";
      el.innerHTML = `<span class="es-tl-label">📝 ${esc(label)}</span><span class="es-tl-resize" title="길이 조절"></span>`;
      el.addEventListener("mousedown", (e) => startTlBlockDrag(e, tx, el));
      lane.appendChild(el);
    });
    updateTlPlayhead(E.playhead);
    renderSceneTimeline();
  }
  // 장면(클립) 타임라인 — 각 클립을 길이만큼 블록으로 쌓음
  function renderSceneTimeline() {
    const lane = $("#esSceneLane"); if (!lane || !E.using) return;
    E.using.selSlots = E.using.selSlots || [];
    const total = totalDur() || 1;
    lane.querySelectorAll(".es-tl-block").forEach((n) => n.remove());
    let acc = 0;
    E.using.template.slots.forEach((s, i) => {
      const start = acc; acc += (s.dur || 0);
      const el = document.createElement("div");
      el.className = "es-tl-block es-scene-block" + (isSlotSel(s.id) ? " sel" : "");
      el.dataset.id = s.id;
      const wPct = ((s.dur || 0) / total) * 100;
      el.style.left = (start / total) * 100 + "%";
      el.style.width = "calc(" + Math.max(0.5, wPct) + "% - 1px)";   // 실제 비율 그대로 타일링(+1px 틈) → 겹침 없음
      const f = E.using.fills[s.id];
      el.innerHTML = `<span class="es-tl-label">🎬 ${i + 1}컷 · ${(s.dur || 0).toFixed(1)}s${f ? "" : " (빈칸)"}</span><span class="es-tl-resize" title="길이 조절"></span>`;
      el.addEventListener("mousedown", (e) => startSceneBlockDrag(e, s, el));
      lane.appendChild(el);
    });
    renderAudioLanes();             // 음악·음성 레인도 함께 갱신
    updateTlPlayhead(E.playhead);   // 통합 플레이헤드 위치 동기화
  }
  // 음악·음성 레인 — 음악은 전체 길이에 깔리는 한 블록(파형 시각화), 음성은 아직 비어있음
  function renderAudioLanes() {
    const mLane = $("#esMusicLane");
    if (mLane) {
      mLane.querySelectorAll(".es-tl-block").forEach((n) => n.remove());
      const mus = E.using && E.using.template && E.using.template.music;
      if (E.using && E.using.musicUrl) {
        const db = (E.using._musicDb != null) ? `${E.using._musicDb} dB` : "…";
        const name = (mus && mus.name) ? mus.name : "배경음악";
        const el = document.createElement("div");
        el.className = "es-tl-block es-music-block";
        el.style.left = "0"; el.style.width = "calc(100% - 1px)";
        el.innerHTML = `<canvas class="es-wave"></canvas><span class="es-tl-label">🎵 ${esc(name)}</span><span class="es-db-tag">${esc(db)}</span>`;
        mLane.appendChild(el);
        if (E.using._musicPeaks) drawMusicWave(el.querySelector(".es-wave"));   // 파형 그리기
        analyzeMusicDb();             // 아직 분석 전이면 측정·파형 계산 후 다시 그림
      }
    }
    const vLane = $("#esVoiceLane");
    if (vLane) vLane.querySelectorAll(".es-tl-block").forEach((n) => n.remove());   // 음성: 아직 데이터 없음(빈 레인)
  }
  // 음악 블록에 파형 그리기 — 영상 길이에 맞춰(루프 반영) 시간축 매핑
  function drawMusicWave(canvas) {
    const peaks = E.using && E.using._musicPeaks; if (!canvas || !peaks || !peaks.length) return;
    const w = canvas.offsetWidth, h = canvas.offsetHeight || 26; if (!w) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
    const span = totalDur() || 1, mdur = E.using._musicDur || span, M = peaks.length, mid = h / 2;
    ctx.fillStyle = "rgba(130,180,255,0.85)";   // 연한 파랑 파형
    for (let x = 0; x < w; x += 2) {            // 1px 막대 + 1px 간격
      const vt = (x / w) * span, st = mdur > 0 ? (vt % mdur) : vt;
      const amp = peaks[Math.min(M - 1, Math.floor((st / mdur) * M))];
      const bh = Math.max(1, amp * (h * 0.92));
      ctx.fillRect(x, mid - bh / 2, 1, bh);     // 가운데 기준 대칭 막대
    }
  }
  // 배경음악 분석 — 평균 라우드니스(dBFS) + 파형 피크. 한 번만 계산하고 캐시
  async function analyzeMusicDb() {
    if (!E.using || !E.using.musicUrl) return;
    if (E.using._musicDbUrl === E.using.musicUrl) return;   // 이미 이 곡으로 계산함
    E.using._musicDbUrl = E.using.musicUrl;                 // 중복 측정 방지
    try {
      const buf = await (await fetch(E.using.musicUrl)).arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      const ac = new AC();
      let audio; try { audio = await ac.decodeAudioData(buf.slice(0)); } finally { try { ac.close(); } catch (_) {} }
      const data = audio.getChannelData(0), n = data.length;
      // dB (RMS)
      const step = Math.max(1, Math.floor(n / 200000));
      let sum = 0, cnt = 0;
      for (let i = 0; i < n; i += step) { const v = data[i] || 0; sum += v * v; cnt++; }
      const rms = Math.sqrt(sum / (cnt || 1));
      E.using._musicDb = rms > 1e-6 ? Math.round(20 * Math.log10(rms)) : -60;
      // 파형 피크(M개 구간의 최대 진폭) — 정규화
      const M = 1000, peaks = new Float32Array(M), bucket = Math.max(1, Math.floor(n / M));
      let mx = 1e-6;
      for (let b = 0; b < M; b++) { let p = 0; const s = b * bucket, e = Math.min(n, s + bucket); for (let i = s; i < e; i++) { const v = Math.abs(data[i]); if (v > p) p = v; } peaks[b] = p; if (p > mx) mx = p; }
      for (let b = 0; b < M; b++) peaks[b] /= mx;
      E.using._musicPeaks = peaks; E.using._musicDur = audio.duration;
      renderAudioLanes();   // 측정·파형 완료 → 다시 그림
    } catch (_) { E.using._musicDbUrl = null; }   // 실패 시 다음에 재시도 가능
  }
  // 장면 블록: 본체 클릭=선택+그 시점으로 이동, Shift/Ctrl 클릭=다중선택 토글, 오른쪽 끝=길이 조절
  function startSceneBlockDrag(e, slot, el) {
    e.preventDefault(); e.stopPropagation();
    blurActive();
    E.using._activeTl = "scene";   // 키보드(Delete·Ctrl+A) 대상 = 장면 타임라인
    const isResize = e.target.classList.contains("es-tl-resize");
    if (!isResize) {
      if (e.shiftKey || e.metaKey || e.ctrlKey) {   // 다중 선택 토글
        if (isSlotSel(slot.id)) E.using.selSlots = E.using.selSlots.filter((id) => id !== slot.id);
        else E.using.selSlots.push(slot.id);
        highlightSceneSel(); return;
      }
      // 일반 클릭 → 그 장면만 선택 + 그 시점으로 이동
      E.using.selSlots = [slot.id]; highlightSceneSel();
      let acc = 0; for (const s of E.using.template.slots) { if (s.id === slot.id) break; acc += (s.dur || 0); }
      seek(acc); return;
    }
    pushSceneUndo();   // 길이 조절 전 상태 저장(되돌리기용)
    const lane = $("#esSceneLane"); const rect = lane.getBoundingClientRect();
    const total = totalDur() || 1, startX = e.clientX, origDur = slot.dur || 0.3;
    const move = (ev) => {
      const dt = ((ev.clientX - startX) / rect.width) * total;
      slot.dur = clamp(origDur + dt, 0.3, 30);
      updateUseMeta(); renderSceneTimeline();
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); refreshSlots(); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }
  // ── 장면(클립) 선택·삭제·되돌리기 ──
  const isSlotSel = (id) => !!(E.using && Array.isArray(E.using.selSlots) && E.using.selSlots.includes(id));
  function highlightSceneSel() {
    $$("#esSceneLane .es-scene-block").forEach((el) => el.classList.toggle("sel", isSlotSel(el.dataset.id)));
  }
  function pushSceneUndo() {   // 장면(슬롯) + 자막(텍스트) 함께 스냅샷 → Ctrl+Z 되돌리기
    if (!E.using) return;
    E.using._undo = E.using._undo || [];
    E.using._undo.push(JSON.stringify({ slots: E.using.template.slots, texts: E.using.texts }));
    if (E.using._undo.length > 50) E.using._undo.shift();
  }
  function sceneUndo() {
    if (!E.using || !E.using._undo || !E.using._undo.length) return;
    const snap = JSON.parse(E.using._undo.pop());
    if (snap && snap.slots) E.using.template.slots = snap.slots;
    if (snap && snap.texts) E.using.texts = snap.texts;
    E.using.selSlots = []; E.using.selTexts = [];
    refreshSlots();   // 장면 타임라인·채우기·길이
    renderTexts(); renderTextBar();   // 자막 스테이지·타임라인·리스트
  }
  function deleteSelectedScenes() {
    if (!E.using) return;
    const ids = (E.using.selSlots || []).slice();
    if (!ids.length) return;
    if (E.using.template.slots.length - ids.length < 1) { alert("장면은 최소 1개는 남겨야 해요."); return; }
    pushSceneUndo();
    E.using.template.slots = E.using.template.slots.filter((s) => !ids.includes(s.id));
    E.using.selSlots = [];
    refreshSlots();
  }
  // 장면 타임라인 빈 곳 드래그 → 여러 장면 블록 한꺼번에 선택(마퀴)
  function onSceneLaneMouseDown(e) {
    if (e.button !== 0 || !E.using) return;
    blurActive();
    E.using._activeTl = "scene";
    if (e.target.closest(".es-tl-block")) return;   // 블록 위는 블록 핸들러가 처리
    const lane = $("#esSceneLane"); const rect = lane.getBoundingClientRect();
    const total = totalDur() || 1;
    const sx = e.clientX;
    const box = document.createElement("div"); box.className = "es-tl-marquee"; lane.appendChild(box);
    let moved = false;
    const draw = (ev) => {
      const x1 = Math.min(sx, ev.clientX), x2 = Math.max(sx, ev.clientX);
      if (Math.abs(ev.clientX - sx) > 3) moved = true;
      box.style.left = (x1 - rect.left) + "px"; box.style.width = (x2 - x1) + "px";
      if (!moved) return;
      const t1 = ((x1 - rect.left) / rect.width) * total, t2 = ((x2 - rect.left) / rect.width) * total;
      let acc = 0;
      E.using.selSlots = E.using.template.slots.filter((s) => {
        const st = acc, en = acc + (s.dur || 0); acc = en;
        return st < t2 && en > t1;   // 마퀴 범위와 겹치는 장면
      }).map((s) => s.id);
      highlightSceneSel();
    };
    const up = () => {
      document.removeEventListener("mousemove", draw); document.removeEventListener("mouseup", up); box.remove();
      if (!moved) { E.using.selSlots = []; highlightSceneSel(); }   // 빈 클릭 → 선택 해제
    };
    document.addEventListener("mousemove", draw); document.addEventListener("mouseup", up);
    e.preventDefault();
  }
  // 블록이 서로 겹치지 않게 정리 — 시작순으로 보며 겹치면 뒤 블록을 앞 블록 끝으로 밀어냄
  function resolveOverlaps() {
    if (!E.using) return;
    const total = totalDur();
    const sorted = E.using.texts.slice().sort((a, b) => (a.start || 0) - (b.start || 0));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1], cur = sorted[i];
      const prevEnd = (prev.start || 0) + (prev.dur || 0);
      if ((cur.start || 0) < prevEnd - 1e-6) cur.start = clamp(prevEnd, 0, Math.max(0, total));
    }
  }
  // 길이가 바뀐 만큼 뒤(시작이 더 늦은) 블록들을 함께 밀어 겹침 방지
  function rippleAfter(refTx, delta) {
    if (!delta || !E.using) return;
    const total = totalDur();
    E.using.texts.forEach((o) => {
      if (o.id === refTx.id) return;
      if (o.start > (refTx.start || 0) + 1e-6) o.start = clamp((o.start || 0) + delta, 0, Math.max(0, total));
    });
  }
  // 입력칸 포커스 해제 — 타임라인을 만지면 키보드(Ctrl+Z·Delete)가 입력칸에 막히지 않게
  function blurActive() { const a = document.activeElement; if (a && a.tagName === "INPUT" && a.blur) a.blur(); }
  function startTlBlockDrag(e, tx, el) {
    e.preventDefault(); e.stopPropagation();
    blurActive();
    E.using._activeTl = "text";   // 키보드(Delete·Ctrl+A) 대상 = 글자 타임라인
    // Shift/Ctrl/Cmd + 클릭 → 다중 선택 토글(드래그 안 함)
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      if (isTextSel(tx.id)) E.using.selTexts = E.using.selTexts.filter((id) => id !== tx.id);
      else E.using.selTexts.push(tx.id);
      highlightSel(); renderTextBar();
      return;
    }
    if (!isTextSel(tx.id)) selectText(tx.id);   // 이미 다중 선택에 포함돼 있으면 유지
    const lane = $("#esTlLane"); const rect = lane.getBoundingClientRect();
    const total = totalDur() || 1;
    const isResize = e.target.classList.contains("es-tl-resize");
    const startX = e.clientX, origStart = tx.start || 0, origDur = tx.dur || 0.3;
    // 길이 조절이면 뒤 블록들의 원래 시작 위치 기억(같은 양만큼 밀기)
    const following = isResize ? E.using.texts.filter((o) => o.id !== tx.id && (o.start || 0) > origStart + 1e-6).map((o) => ({ o, s0: o.start || 0 })) : [];
    // ── 자석 스냅 — 다른 자막 끝/시작, 장면 컷 경계, 재생헤드, 0/끝에 달라붙음 ──
    const snapThresh = (8 / rect.width) * total;   // 8px 이내면 스냅
    const snaps = [0, total, clamp(E.playhead, 0, total)];
    E.using.texts.forEach((o) => { if (o.id !== tx.id) { snaps.push(o.start || 0); snaps.push((o.start || 0) + (o.dur || 0)); } });
    { let acc = 0; E.using.template.slots.forEach((s) => { snaps.push(acc); acc += (s.dur || 0); }); snaps.push(acc); }
    const nearest = (v) => { let best = null, bd = snapThresh; for (const pt of snaps) { const d = Math.abs(pt - v); if (d <= bd) { bd = d; best = pt; } } return best; };
    const track = $("#esTlTrack");
    let guide = null;
    if (track) { guide = document.createElement("div"); guide.className = "es-snap-guide"; track.appendChild(guide); }
    const showGuide = (sec) => { if (!guide) return; if (sec == null) { guide.style.display = "none"; } else { guide.style.display = "block"; guide.style.left = (clamp(sec, 0, total) / total * 100) + "%"; } };
    const move = (ev) => {
      const dt = ((ev.clientX - startX) / rect.width) * total;
      let snappedAt = null;
      if (isResize) {
        let nd = clamp(origDur + dt, 0.3, Math.max(0.3, total - origStart));
        const sp = nearest(origStart + nd);                       // 끝을 스냅
        if (sp != null) { nd = clamp(sp - origStart, 0.3, total - origStart); snappedAt = origStart + nd; }
        tx.dur = nd;
        const delta = tx.dur - origDur;
        following.forEach(({ o, s0 }) => { o.start = clamp(s0 + delta, 0, total); });
      } else {
        let ns = clamp(origStart + dt, 0, Math.max(0, total - (tx.dur || 0)));
        const sps = nearest(ns), spe = nearest(ns + (tx.dur || 0));   // 시작·끝 중 가까운 쪽 스냅
        if (sps != null && (spe == null || Math.abs(sps - ns) <= Math.abs(spe - (ns + (tx.dur || 0))))) { ns = sps; snappedAt = sps; }
        else if (spe != null) { ns = clamp(spe - (tx.dur || 0), 0, total - (tx.dur || 0)); snappedAt = spe; }
        tx.start = ns;
      }
      showGuide(snappedAt);
      resolveOverlaps();      // 겹치면 밀어내기
      renderTextTimeline();   // 뒤 블록 이동까지 반영
      const dEl = $("#esTextDur"); if (dEl) dEl.value = (tx.dur || 0).toFixed(1);
      updateTextVisibility(E.playhead);
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); if (guide) guide.remove(); renderTexts(); scheduleSaveMeta(); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }
  function updateTlPlayhead(time) {
    const total = totalDur() || 1;
    const x = (clamp(time, 0, total) / total) * 100 + "%";
    const p = $("#esPlayhead"); if (p) p.style.left = x;   // 두 레인을 가로지르는 단일 플레이헤드
  }
  // 눈금/플레이헤드를 클릭·드래그해 재생 위치 이동(스크럽)
  function scrubTimeFromX(clientX) {
    const track = $("#esTlTrack"); if (!track) return 0;
    const r = track.getBoundingClientRect();
    return clamp((clientX - r.left) / r.width, 0, 1) * totalDur();
  }
  // 주황선 스냅 지점 — 자막 시작·끝, 장면 컷 경계, 0/끝
  function playheadSnaps() {
    const total = totalDur(); const pts = [0, total];
    if (E.using) {
      E.using.texts.forEach((o) => { pts.push(o.start || 0); pts.push((o.start || 0) + (o.dur || 0)); });
      let acc = 0; E.using.template.slots.forEach((s) => { pts.push(acc); acc += (s.dur || 0); }); pts.push(acc);
    }
    return pts;
  }
  function startScrub(e) {
    if (e.button !== 0 || !E.using) return;
    e.preventDefault(); e.stopPropagation();
    blurActive();
    const resume = E.playing; if (resume) stopPlay();   // 드래그 중엔 정지
    const track = $("#esTlTrack"); const tw = track ? track.getBoundingClientRect().width : 1;
    const snaps = playheadSnaps();
    const snapTime = (clientX) => {
      let t = scrubTimeFromX(clientX);
      const thresh = (8 / tw) * (totalDur() || 1);   // 8px 이내면 블록에 붙음
      let best = null, bd = thresh;
      for (const pt of snaps) { const d = Math.abs(pt - t); if (d <= bd) { bd = d; best = pt; } }
      return best != null ? best : t;
    };
    seek(snapTime(e.clientX));
    const move = (ev) => seek(snapTime(ev.clientX));
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); if (resume) startPlay(); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }
  // 재생헤드 기준 영상 트림 — side:'back'=뒷부분 자르기, 'front'=앞부분 자르기. 뒤 장면은 자동으로 당겨붙음(빈공간 없음)
  function trimSlotAtPlayhead(side) {
    if (!E.using) return;
    if (E.playing) stopPlay();
    const { arr } = slotTimes();
    const idx = slotIndexAt(E.playhead);
    if (idx < 0) return;
    const seg = arr[idx], slot = seg.slot, MIN = 0.2;
    if (side === "back") {
      const newDur = clamp(E.playhead - seg.start, MIN, slot.dur || MIN);
      if ((slot.dur || 0) - newDur < 0.02) return;        // 끝에 붙어있으면 변화 없음 → 무시
      pushSceneUndo();
      slot.dur = +newDur.toFixed(3);
      refreshSlots();
      seek(seg.start + slot.dur);                         // 재생헤드 = 새 컷 끝(= 다음 컷 시작)
    } else {
      const cut = clamp(E.playhead - seg.start, 0, (slot.dur || MIN) - MIN);
      if (cut < 0.02) return;                             // 맨 앞이면 변화 없음
      pushSceneUndo();
      slot.in = +(((slot.in || 0) + cut)).toFixed(3);     // 영상 시작 오프셋 전진(잘린 앞부분 건너뜀)
      slot.dur = +((slot.dur || 0) - cut).toFixed(3);
      refreshSlots();
      seek(seg.start);                                    // 재생헤드 = 잘린 지점(= 슬롯 새 시작)
    }
  }
  // 자막 트림 — 재생헤드 기준. side:'back'=뒤(끝을 재생헤드로), 'front'=앞(시작을 재생헤드로)
  function trimTextAtPlayhead(side) {
    if (!E.using) return;
    const ph = E.playhead, MIN = 0.2;
    // 재생헤드가 들어있는 자막 (선택된 것 우선)
    let tx = E.using.texts.find((t) => isTextSel(t.id) && (t.start || 0) <= ph && ph < (t.start || 0) + (t.dur || 0));
    if (!tx) tx = E.using.texts.find((t) => (t.start || 0) <= ph && ph < (t.start || 0) + (t.dur || 0));
    if (!tx) return;
    const start = tx.start || 0;
    if (side === "back") {
      const nd = clamp(ph - start, MIN, tx.dur || MIN);
      if ((tx.dur || 0) - nd < 0.02) return;
      pushSceneUndo();
      tx.dur = +nd.toFixed(3);
    } else {
      const cut = clamp(ph - start, 0, (tx.dur || MIN) - MIN);
      if (cut < 0.02) return;
      pushSceneUndo();
      tx.start = +(start + cut).toFixed(3);
      tx.dur = +((tx.dur || 0) - cut).toFixed(3);
    }
    renderTexts(); renderTextBar(); updateTextVisibility(E.playhead); scheduleSaveMeta();
  }
  // 타임라인 빈 곳 드래그 → 여러 글자 블록 한꺼번에 선택(마퀴)
  function onTlLaneMouseDown(e) {
    if (e.button !== 0 || !E.using) return;
    blurActive();
    E.using._activeTl = "text";   // 키보드(Delete·Ctrl+A) 대상 = 글자 타임라인
    if (e.target.closest(".es-tl-block")) return;   // 블록 위는 블록 핸들러가 처리
    const lane = $("#esTlLane"); const rect = lane.getBoundingClientRect();
    const total = totalDur() || 1;
    const sx = e.clientX;
    const box = document.createElement("div"); box.className = "es-tl-marquee"; lane.appendChild(box);
    let moved = false;
    const draw = (ev) => {
      const x1 = Math.min(sx, ev.clientX), x2 = Math.max(sx, ev.clientX);
      if (Math.abs(ev.clientX - sx) > 3) moved = true;
      box.style.left = (x1 - rect.left) + "px"; box.style.width = (x2 - x1) + "px";
      if (!moved) return;
      const t1 = ((x1 - rect.left) / rect.width) * total, t2 = ((x2 - rect.left) / rect.width) * total;
      E.using.selTexts = E.using.texts.filter((tx) => (tx.start || 0) < t2 && ((tx.start || 0) + (tx.dur || 0)) > t1).map((tx) => tx.id);
      highlightSel();
    };
    const up = () => {
      document.removeEventListener("mousemove", draw); document.removeEventListener("mouseup", up); box.remove();
      if (!moved) E.using.selTexts = [];   // 빈 클릭 → 선택 해제
      renderTextBar();
    };
    document.addEventListener("mousemove", draw); document.addEventListener("mouseup", up);
    e.preventDefault();
  }
  function startTextDrag(e, tx, el) {
    e.preventDefault(); e.stopPropagation();
    selectText(tx.id);
    const stage = $("#esStage"); const rect = stage.getBoundingClientRect();
    const move = (ev) => {
      tx.xPct = clamp(((ev.clientX - rect.left) / rect.width) * 100, 0, 100);
      tx.yPct = clamp(((ev.clientY - rect.top) / rect.height) * 100, 0, 100);
      el.style.left = tx.xPct + "%"; el.style.top = tx.yPct + "%";
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); scheduleSaveMeta(); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }
  function renderTextBar() {
    const bar = $("#esTextBar"); if (!bar || !E.using) return;
    const sel = selTextObjs();
    if (!sel.length) { bar.hidden = true; bar.innerHTML = ""; return; }
    bar.hidden = false;
    const multi = sel.length > 1;
    const ref = sel[0];   // 표시 기준값(첫 선택)
    const styleRows = `
      <div class="es-text-row">
        <span class="es-tb">정렬
          <button type="button" class="es-btn es-btn-ghost es-tb-btn" id="esTextCenterX" title="가로 가운데로">⬌ 가로중앙</button>
          <button type="button" class="es-btn es-btn-ghost es-tb-btn" id="esTextCenterY" title="세로 가운데로">⬍ 세로중앙</button>
          <button type="button" class="es-btn es-btn-ghost es-tb-btn" id="esTextCenter" title="정중앙으로">⊕ 정중앙</button>
        </span>
        <label class="es-tb">크기<input type="range" id="esTextSize" min="3" max="14" step="0.5" value="${ref.size}"></label>
        <label class="es-tb">색<input type="color" id="esTextColor" value="${ref.color}"></label>
        <button type="button" class="es-btn es-btn-ghost es-tb-btn ${ref.bold ? "on" : ""}" id="esTextBold" title="굵게">B</button>
        <button type="button" class="es-btn es-btn-ghost es-tb-btn ${ref.shadow ? "on" : ""}" id="esTextShadow" title="그림자">그림자</button>
        <label class="es-tb">효과<select id="esTextFx" class="es-tb-sel">${TEXT_FX.map((e) => `<option value="${e.k}" ${(ref.fx || "none") === e.k ? "selected" : ""}>${e.label}</option>`).join("")}</select></label>
        <button type="button" class="es-btn es-btn-ghost es-tb-btn" id="esTextFxRand" title="선택한 글자에 효과 무작위로">🎲</button>
      </div>
      <div class="es-text-row">
        <label class="es-tb">글상자 너비 <input type="range" id="esTextWidth" min="20" max="100" step="1" value="${ref.width || 70}"><input type="number" id="esTextWidthN" class="es-num" min="20" max="100" step="1" value="${ref.width || 70}">%</label>
        <label class="es-tb">머무는 시간 <input type="number" id="esTextDur" class="es-num" min="0.3" max="${totalDur().toFixed(1)}" step="0.1" value="${(ref.dur || 0).toFixed(1)}">초</label>
        <button type="button" class="es-btn es-btn-ghost" id="esTextDel" title="${multi ? "선택한 글자 모두 삭제" : "이 글자 삭제"}">🗑 삭제${multi ? ` (${sel.length})` : ""}</button>
      </div>`;
    if (multi) {
      bar.innerHTML = `<div class="es-text-row"><b class="es-multi-badge">📦 글자 ${sel.length}개 선택됨 — 조절하면 모두 함께 적용</b></div>${styleRows}`;
    } else {
      bar.innerHTML = `
        <textarea id="esTextInput" class="es-text-input" rows="2" placeholder="글자 내용 — Enter: 앞 문장을 블록으로 분리 / Shift+Enter: 줄바꿈">${esc(ref.text)}</textarea>
        ${styleRows}`;
    }

    const applyAll = (fn) => { sel.forEach(fn); renderTexts(); renderTextBar(); scheduleSaveMeta(); };
    if (!multi) {
      const inp = $("#esTextInput");
      inp.addEventListener("input", (e) => { ref.text = e.target.value; const el = $(`#esTextLayer .es-text[data-id="${ref.id}"]`); if (el) el.textContent = e.target.value || " "; scheduleSaveMeta(); });
      inp.addEventListener("keydown", (e) => {
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); splitTextAtCursor(ref, e.target); }
      });
    }
    $("#esTextCenterX").addEventListener("click", () => applyAll((t) => { t.xPct = 50; }));
    $("#esTextCenterY").addEventListener("click", () => applyAll((t) => { t.yPct = 50; }));
    $("#esTextCenter").addEventListener("click", () => applyAll((t) => { t.xPct = 50; t.yPct = 50; }));
    $("#esTextSize").addEventListener("input", (e) => { const v = parseFloat(e.target.value); sel.forEach((t) => t.size = v); renderTexts(); scheduleSaveMeta(); });
    $("#esTextColor").addEventListener("input", (e) => { sel.forEach((t) => t.color = e.target.value); renderTexts(); scheduleSaveMeta(); });
    $("#esTextFx").addEventListener("change", (e) => { const v = e.target.value; sel.forEach((t) => t.fx = v); scheduleSaveMeta(); });
    $("#esTextFxRand").addEventListener("click", () => { sel.forEach((t) => t.fx = TEXT_FX_POOL[Math.floor(Math.random() * TEXT_FX_POOL.length)]); renderTextBar(); scheduleSaveMeta(); });
    $("#esTextBold").addEventListener("click", () => { const v = !ref.bold; sel.forEach((t) => t.bold = v); renderTexts(); renderTextBar(); scheduleSaveMeta(); });
    $("#esTextShadow").addEventListener("click", () => { const v = !ref.shadow; sel.forEach((t) => t.shadow = v); renderTexts(); renderTextBar(); scheduleSaveMeta(); });
    const wRange = $("#esTextWidth"), wNum = $("#esTextWidthN");
    const setW = (v) => { const w = clamp(parseFloat(v) || 70, 20, 100); wRange.value = w; wNum.value = w; sel.forEach((t) => t.width = w); renderTexts(); scheduleSaveMeta(); };
    wRange.addEventListener("input", (e) => setW(e.target.value));
    wNum.addEventListener("input", (e) => setW(e.target.value));
    // 머무는 시간 — 단일은 리플(뒤 블록 밀기), 다중은 선택 전체에 같은 길이 적용
    let _prevDur = ref.dur || 0.3;
    $("#esTextDur").addEventListener("input", (e) => {
      const nd = clamp(parseFloat(e.target.value) || 0.3, 0.3, totalDur());
      if (multi) { sel.forEach((t) => t.dur = nd); }
      else { rippleAfter(ref, nd - _prevDur); _prevDur = nd; ref.dur = nd; }
      resolveOverlaps(); renderTexts(); scheduleSaveMeta();
    });
    $("#esTextDel").addEventListener("click", () => {
      const ids = sel.map((t) => t.id);
      pushSceneUndo();
      E.using.texts = E.using.texts.filter((x) => !ids.includes(x.id));
      E.using.selTexts = []; renderTexts(); renderTextBar(); scheduleSaveMeta();
    });
  }
  // 재생 중에는 시작~머무는시간 범위에만, 편집 중(정지)에는 전부 보이게
  function updateTextVisibility(time) {
    if (!E.using) return;
    $$("#esTextLayer .es-text").forEach((el) => {
      const tx = E.using.texts.find((x) => x.id === el.dataset.id); if (!tx) return;
      const inRange = time >= (tx.start || 0) && time < (tx.start || 0) + (tx.dur || 0);
      el.style.display = inRange ? "block" : "none";   // 항상 현재 시각의 글자만 노출
      el.classList.toggle("playing", E.playing);
      // 글자 진입 효과 — 재생 중에만 적용(편집 중엔 또렷하게)
      if (inRange && E.playing && tx.fx && tx.fx !== "none") {
        const f = textFx(tx.fx, (time - (tx.start || 0)) / (tx.dur || 1));
        el.style.opacity = f.opacity;
        el.style.transform = `translate(-50%,-50%) scale(${f.scale}) translate(${f.dx * 100}%, ${f.dy * 100}%)`;
        el.style.clipPath = f.clip < 1 ? `inset(0 ${(1 - f.clip) * 100}% 0 0)` : "none";
      } else if (el._fxOn) {
        el.style.opacity = "1"; el.style.transform = "translate(-50%,-50%)"; el.style.clipPath = "none"; el._fxOn = false;
      }
      if (inRange && E.playing && tx.fx && tx.fx !== "none") el._fxOn = true;
    });
  }

  function renderFillSlots(filterFn) {
    const list = $("#esFillList"); if (!list || !E.using) return;
    const t = E.using.template;
    let acc = 0;
    list.innerHTML = t.slots.map((s, i) => {
      const start = acc; acc += (s.dur || 0);
      if (filterFn && !filterFn(s)) return "";   // 특정 역할 슬롯만 표시(마법사 비포/애프터 단계)
      const f = E.using.fills[s.id];
      const asp = ASPECTS[t.aspect] || ASPECTS["9:16"];
      let media = `<div class="es-fill-ph">＋<br>끌어다 놓기<br><span class="es-fill-ph-sub">(또는 클릭)</span></div>`;
      if (f) media = f.kind === "video" ? `<video src="${f.url}" muted preload="metadata"></video>` : `<img src="${f.url}" alt="">`;
      const roleBadge = s.aiRole === "before" ? `<span class="es-ai-badge before">✨ ${esc(s.aiConcept || "비포")}(AI)</span>` : s.aiRole === "after" ? `<span class="es-ai-badge after">📷 원본</span>` : "";
      const genRow = s.aiRole === "before" ? `<div class="es-before-row">
            <button type="button" class="es-btn es-btn-primary es-before-gen" data-id="${s.id}" title="짝꿍 원본(애프터) 사진을 참조해 비포사진을 생성">🏚 비포사진 생성</button>
            <button type="button" class="es-btn es-btn-ghost es-before-promptbtn" data-id="${s.id}" title="이 컷의 프롬프트만 수정">✎ 프롬프트</button>
            <textarea class="es-before-prompt" data-id="${s.id}" rows="4" placeholder="이 비포 컷 전용 프롬프트" hidden>${esc(s.aiPrompt || "")}</textarea>
          </div>` : "";
      return `
        <div class="es-fill-slot ${f ? "filled" : ""} ${s.aiRole ? "ai-" + s.aiRole : ""}" data-id="${s.id}">
          <div class="es-fill-thumb" style="aspect-ratio:${asp.w}/${asp.h}">${media}${roleBadge}${f ? `<button type="button" class="es-fill-x" data-id="${s.id}" title="미디어 비우기">×</button>` : ""}</div>
          ${genRow}
          <div class="es-fill-info">
            <span class="es-fill-num">${i + 1}</span>
            <span class="es-fill-start">${fmtT(start)}</span>
            <span class="es-dur-ctl">
              <button type="button" class="es-dur-btn" data-act="dec" data-id="${s.id}" title="0.5초 줄이기">−</button>
              <input type="number" class="es-dur-input" data-id="${s.id}" min="0.3" max="30" step="0.5" value="${(s.dur || 0).toFixed(1)}">
              <span class="es-fill-unit">초</span>
              <button type="button" class="es-dur-btn" data-act="inc" data-id="${s.id}" title="0.5초 늘리기">＋</button>
            </span>
            <button type="button" class="es-slot-remove" data-id="${s.id}" title="이 클립 삭제">✕컷</button>
          </div>
          <div class="es-fx-row">
            <span class="es-fx-cap">효과</span>
            <select class="es-fx-select" data-id="${s.id}">
              ${EFFECTS.map((e) => `<option value="${e.k}" ${(s.fx || "none") === e.k ? "selected" : ""}>${e.label}</option>`).join("")}
            </select>
          </div>
          <div class="es-fx-row">
            <span class="es-fx-cap" title="앞 컷에서 이 컷으로 넘어올 때 전환">전환</span>
            <select class="es-trans-select" data-id="${s.id}">
              <option value="none" ${(s.trans || "none") === "none" ? "selected" : ""}>없음</option>
              <option value="fade" ${s.trans === "fade" ? "selected" : ""}>디졸브(자연스럽게)</option>
              <option value="wipe" ${s.trans === "wipe" ? "selected" : ""}>슬라이드(좌→우)</option>
            </select>
          </div>
          <input type="file" class="es-fill-input" data-id="${s.id}" accept="image/*,video/*" hidden>
        </div>`;
    }).join("");

    $$(".es-fill-slot", list).forEach((slot) => {
      const id = slot.dataset.id;
      const input = slot.querySelector(".es-fill-input");
      slot.addEventListener("click", (e) => {
        if (e.target.closest(".es-fill-x") || e.target.closest(".es-fill-info") || e.target.closest(".es-fx-row") || e.target.closest(".es-before-row")) return;
        const f = E.using.fills[id];
        if (f) openMediaPreview(f);   // 채워진 슬롯 클릭 → 크게 보기
        else input.click();           // 빈 슬롯 클릭 → 파일 선택(드롭도 가능)
      });
      const gb = slot.querySelector(".es-before-gen"); if (gb) gb.addEventListener("click", (e) => { e.stopPropagation(); generateBeforePhoto(id); });
      const pbtn = slot.querySelector(".es-before-promptbtn"), pta = slot.querySelector(".es-before-prompt");
      if (pbtn && pta) {
        pbtn.addEventListener("click", (e) => { e.stopPropagation(); pta.hidden = !pta.hidden; if (!pta.hidden) pta.focus(); });
        pta.addEventListener("click", (e) => e.stopPropagation());
        pta.addEventListener("keydown", (e) => e.stopPropagation());
        pta.addEventListener("input", (e) => { const cur = E.using.template.slots.find((x) => x.id === id); if (cur) { cur.aiPrompt = e.target.value; scheduleSaveMeta(); } });   // 이 컷 전용 프롬프트
      }
      const fxSel = slot.querySelector(".es-fx-select");
      if (fxSel) {
        fxSel.addEventListener("click", (e) => e.stopPropagation());
        fxSel.addEventListener("change", (e) => { const cur = E.using.template.slots.find((s) => s.id === id); if (cur) { cur.fx = e.target.value; applyFrame(E.playhead); scheduleSaveMeta(); } });
      }
      const trSel = slot.querySelector(".es-trans-select");
      if (trSel) {
        trSel.addEventListener("click", (e) => e.stopPropagation());
        trSel.addEventListener("change", (e) => { const cur = E.using.template.slots.find((s) => s.id === id); if (cur) { cur.trans = e.target.value; applyFrame(E.playhead); scheduleSaveMeta(); } });
      }
      input.addEventListener("change", (e) => { if (e.target.files[0]) fillSlot(id, e.target.files[0]); });
      const x = slot.querySelector(".es-fill-x"); if (x) x.addEventListener("click", (e) => { e.stopPropagation(); clearSlot(id); });
      // 클립별 시간 조절
      const durInput = slot.querySelector(".es-dur-input");
      durInput.addEventListener("click", (e) => e.stopPropagation());
      durInput.addEventListener("change", (e) => { setSlotDur(id, e.target.value); e.target.value = (E.using.template.slots.find((s) => s.id === id).dur).toFixed(1); });
      slot.querySelectorAll(".es-dur-btn").forEach((b) => b.addEventListener("click", (e) => {
        e.stopPropagation();
        const cur = E.using.template.slots.find((s) => s.id === id); if (!cur) return;
        setSlotDur(id, (cur.dur || 0) + (b.dataset.act === "inc" ? 0.5 : -0.5));
        durInput.value = (E.using.template.slots.find((s) => s.id === id).dur).toFixed(1);
      }));
      const rm = slot.querySelector(".es-slot-remove"); if (rm) rm.addEventListener("click", (e) => { e.stopPropagation(); removeSlotUse(id); });
      slot.addEventListener("dragover", (e) => { e.preventDefault(); slot.classList.add("hot"); });
      slot.addEventListener("dragleave", () => slot.classList.remove("hot"));
      slot.addEventListener("drop", (e) => {
        e.preventDefault(); slot.classList.remove("hot");
        const files = Array.from(e.dataTransfer.files || []);
        if (!files.length) return;
        if (files.length === 1) { fillSlot(id, files[0]); return; }   // 1개 → 떨군 칸만
        const startIdx = t.slots.findIndex((x) => x.id === id);       // 여러 개 → 떨군 칸부터 아래로 좌라락
        fillSequentialFrom(startIdx < 0 ? 0 : startIdx, files);
      });
    });
    updateFillCount();
  }
  function updateFillCount() {
    const c = $("#esFillCount"); if (c && E.using) c.textContent = `${Object.keys(E.using.fills).length}/${E.using.template.slots.length}`;
  }
  // 채워진 사진·영상을 크게 보기(라이트박스)
  function openMediaPreview(fill) {
    if (!fill || !fill.url) return;
    const prev = document.getElementById("esMediaLB"); if (prev) prev.remove();
    const lb = document.createElement("div");
    lb.id = "esMediaLB"; lb.className = "es-lightbox";
    const media = fill.kind === "video"
      ? `<video src="${fill.url}" controls autoplay loop playsinline></video>`
      : `<img src="${fill.url}" alt="">`;
    lb.innerHTML = `<button type="button" class="es-lightbox-x" title="닫기 (Esc)">✕</button><div class="es-lightbox-inner">${media}</div>`;
    document.body.appendChild(lb);
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const close = () => { lb.remove(); document.removeEventListener("keydown", onKey); };
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.closest(".es-lightbox-x")) close(); });
    document.addEventListener("keydown", onKey);
  }

  async function fillSlot(slotId, file) {
    if (!E.using) return;
    const isVideo = /^video\//.test(file.type);
    const isImage = /^image\//.test(file.type);
    if (!isVideo && !isImage) { alert("사진 또는 영상 파일만 넣을 수 있어요."); return; }
    const prev = E.using.fills[slotId];
    if (prev && prev.url) { try { URL.revokeObjectURL(prev.url); } catch (_) {} }
    const url = URL.createObjectURL(file);
    const dur = isVideo ? await mediaDuration(url, true) : 0;
    E.using.fills[slotId] = { kind: isVideo ? "video" : "image", url, name: file.name, dur, _file: file };
    renderFillSlots();
    seek(E.playhead);          // 미리보기 화면 즉시 갱신
    saveFillBlob(slotId, file); scheduleSaveMeta();
  }
  function clearSlot(slotId) {
    if (!E.using) return;
    const f = E.using.fills[slotId]; if (f && f.url) { try { URL.revokeObjectURL(f.url); } catch (_) {} }
    delete E.using.fills[slotId];
    renderFillSlots();
    seek(E.playhead);
    delFillBlob(slotId); scheduleSaveMeta();
  }
  // 시작 슬롯부터 아래로 순서대로 좌라락 채움(덮어쓰기). 파일 1개면 그 슬롯만 채움.
  async function fillSequentialFrom(startIdx, files) {
    if (!E.using || !files || !files.length) return;
    const media = Array.from(files).filter((f) => /^(image|video)\//.test(f.type));
    if (!media.length) { alert("사진 또는 영상 파일만 넣을 수 있어요."); return; }
    const t = E.using.template;
    let fi = 0;
    for (let i = Math.max(0, startIdx); i < t.slots.length && fi < media.length; i++) {
      const s = t.slots[i];
      const file = media[fi++];
      const prev = E.using.fills[s.id];
      if (prev && prev.url) { try { URL.revokeObjectURL(prev.url); } catch (_) {} }  // 기존 것 덮어쓰기
      const isVideo = /^video\//.test(file.type);
      const url = URL.createObjectURL(file);
      const dur = isVideo ? await mediaDuration(url, true) : 0;
      E.using.fills[s.id] = { kind: isVideo ? "video" : "image", url, name: file.name, dur, _file: file };
      saveFillBlob(s.id, file);
    }
    renderFillSlots();
    preloadFills();
    seek(E.playhead);
    scheduleSaveMeta();
  }
  // '여러 개 한번에' 버튼: 첫 슬롯부터 위→아래로 채움
  async function bulkFill(files) {
    return fillSequentialFrom(0, files);
  }
  // 지정한 슬롯 id들만 순서대로 채움 (마법사 애프터 단계용)
  async function fillSlotsByIds(ids, files) {
    if (!E.using || !files || !files.length) return;
    const media = Array.from(files).filter((f) => /^(image|video)\//.test(f.type));
    if (!media.length) { alert("사진 또는 영상 파일만 넣을 수 있어요."); return; }
    let fi = 0;
    for (const id of ids) {
      if (fi >= media.length) break;
      const file = media[fi++];
      const prev = E.using.fills[id]; if (prev && prev.url) { try { URL.revokeObjectURL(prev.url); } catch (_) {} }
      const isVideo = /^video\//.test(file.type);
      const url = URL.createObjectURL(file);
      const dur = isVideo ? await mediaDuration(url, true) : 0;
      E.using.fills[id] = { kind: isVideo ? "video" : "image", url, name: file.name, dur, _file: file };
      saveFillBlob(id, file);
    }
    renderFillSlots(); preloadFills(); seek(E.playhead); scheduleSaveMeta();
  }

  // ── 미리보기 재생 엔진 (슬롯을 음악에 맞춰 순서대로 이어붙임) ────────
  function slotTimes() {
    const t = E.using.template; const arr = []; let acc = 0;
    t.slots.forEach((s) => { arr.push({ slot: s, start: acc, end: acc + (s.dur || 0) }); acc += (s.dur || 0); });
    return { arr, total: acc };
  }
  function slotIndexAt(time) {
    const { arr } = slotTimes();
    for (let i = 0; i < arr.length; i++) if (time >= arr[i].start && time < arr[i].end) return i;
    return arr.length ? arr.length - 1 : -1;
  }
  // 사진 미리 디코딩 — 컷 전환 시 깜빡임/점프 방지
  function preloadFills() {
    if (!E.using) return;
    E._pre = E._pre || {};
    Object.keys(E.using.fills).forEach((id) => {
      const f = E.using.fills[id];
      if (f && f.kind === "image" && f.url && !E._pre[f.url]) {
        E._pre[f.url] = new Image();
        E._pre[f.url].src = f.url;
        if (E._pre[f.url].decode) { E._pre[f.url].decode().catch(() => {}); }
      }
    });
  }
  function applyFrame(time) {
    if (!E.using) return;
    const { arr, total } = slotTimes();
    const vid = $("#esVideo"), img = $("#esImg"), empty = $("#esStageEmpty"), badge = $("#esSlotBadge");
    const idx = slotIndexAt(time);
    if (idx < 0) return;
    updateTextVisibility(time);          // 글자 노출 컷 범위 반영
    const seg = arr[idx];
    const fill = E.using.fills[seg.slot.id];
    if (badge) { badge.hidden = false; badge.textContent = `컷 ${idx + 1} / ${arr.length}`; }
    if (!fill) {                       // 빈 슬롯 — 안내 화면
      if (vid) { vid.style.display = "none"; try { vid.pause(); } catch (_) {} }
      if (img) img.style.display = "none";
      if (empty) { empty.style.display = ""; empty.textContent = `컷 ${idx + 1} 은(는) 비어 있어요`; }
      return;
    }
    if (empty) empty.style.display = "none";
    const segDur = (seg.end - seg.start) || (seg.slot.dur) || 1;
    const speed = (E.using.template && E.using.template.fxSpeed) || 1;   // 모든 장면 공통 효과 속도
    const p = clamp(((time - seg.start) / segDur) * speed, 0, 1);
    let tf = fxTransform(seg.slot.fx || "none", p);
    // 전환(앞 컷 → 이 컷) — 이미지↔이미지에서 디졸브/슬라이드
    const prevImg = $("#esImgPrev");
    const trans = seg.slot.trans, transDur = seg.slot.transDur || 0.6;
    const prevSeg = idx > 0 ? arr[idx - 1] : null;
    const prevFill = prevSeg && E.using.fills[prevSeg.slot.id];
    const inTrans = trans && trans !== "none" && fill.kind === "image" && prevFill && prevFill.kind === "image" && (time - seg.start) < transDur;
    if (prevImg) {
      if (inTrans) {
        const tp = clamp((time - seg.start) / transDur, 0, 1);
        // 시작엔 앞 컷의 끝 프레이밍에 맞추고 끝날수록 자기 효과로 → 프레임 어긋남 없음
        const pe = fxParams(prevSeg.slot.fx || "none", 1), cn = fxParams(seg.slot.fx || "none", p);
        const lp = (a, b) => a + (b - a) * tp;
        tf = `scale(${lp(pe.s, cn.s)}) translate(${lp(pe.tx, cn.tx) * 100}%, ${lp(pe.ty, cn.ty) * 100}%)`;
        prevImg.style.display = "block";
        if (prevImg._url !== prevFill.url) { prevImg.src = prevFill.url; prevImg._url = prevFill.url; }
        prevImg.style.transform = `scale(${pe.s}) translate(${pe.tx * 100}%, ${pe.ty * 100}%)`;   // 앞 컷 끝 프레이밍 고정
        if (img) { img.style.opacity = (trans === "wipe" ? 1 : tp); img.style.clipPath = (trans === "wipe" ? `inset(0 ${(1 - tp) * 100}% 0 0)` : "none"); }
      } else { prevImg.style.display = "none"; if (img) { img.style.opacity = "1"; img.style.clipPath = "none"; } }
    }
    if (fill.kind === "image") {
      if (vid) { vid.style.display = "none"; try { vid.pause(); } catch (_) {} }
      if (img) { img.style.display = "block"; if (img._url !== fill.url) { img.src = fill.url; img._url = fill.url; } img.style.transform = tf; }
    } else {
      if (img) img.style.display = "none";
      if (vid) {
        vid.style.display = "block";
        if (vid._url !== fill.url) { vid.src = fill.url; vid._url = fill.url; }
        vid.style.transform = tf;
        const local = clamp((time - seg.start) + (seg.slot.in || 0), 0, Math.max(0, (fill.dur || seg.slot.dur)));
        if (E.playing) { if (vid.paused) { try { vid.play(); } catch (_) {} } if (Math.abs(vid.currentTime - local) > 0.35) vid.currentTime = local; }
        else { try { vid.pause(); } catch (_) {} vid.currentTime = local; }
      }
    }
  }
  function updateTransport(time) {
    const { total } = slotTimes();
    const seek = $("#esSeek"), tm = $("#esTime");
    if (seek) { seek.max = total; seek.value = Math.min(time, total); }
    if (tm) tm.textContent = `${fmtT(time)} / ${fmtT(total)}`;
    updateTlPlayhead(time);
  }
  // 배경음악 — 마지막 5초 무조건 페이드아웃
  const FADE_OUT = 5;
  function updateMusicVolume(time) {
    const mus = $("#esMusic"); if (!mus) return;
    const total = totalDur();
    const fade = Math.min(FADE_OUT, total || FADE_OUT);
    mus.volume = (total > 0 && time > total - fade) ? clamp((total - time) / fade, 0, 1) : 1;
  }
  function seek(time) {
    if (!E.using) return;
    const { total } = slotTimes();
    E.playhead = clamp(time, 0, total);
    E._curSlot = slotIndexAt(E.playhead);
    applyFrame(E.playhead);
    updateTransport(E.playhead);
    const mus = $("#esMusic"); if (mus && E.using.musicUrl) { try { mus.currentTime = Math.min(E.playhead, mus.duration || E.playhead); } catch (_) {} }
    updateMusicVolume(E.playhead);
    if (!E.playing) scheduleSaveMeta();   // 수동 이동 위치 저장(재생 중 매 프레임 저장은 피함)
  }
  function togglePlay() { E.playing ? stopPlay() : startPlay(); }
  function startPlay() {
    if (!E.using) return;
    const { total } = slotTimes();
    if (total <= 0) return;
    if (E.playhead >= total - 0.02) seek(0);
    E.playing = true;
    const pb = $("#esPlay"); if (pb) pb.textContent = "⏸ 일시정지";
    const mus = $("#esMusic");
    if (mus && E.using.musicUrl) { try { mus.currentTime = E.playhead; updateMusicVolume(E.playhead); mus.play(); } catch (_) {} }
    E._clock = performance.now() - E.playhead * 1000;
    const loop = () => {
      if (!E.playing) return;
      const t = (performance.now() - E._clock) / 1000;
      if (t >= total) { seek(total); stopPlay(); return; }
      E.playhead = t;
      const idx = slotIndexAt(t);
      if (idx !== E._curSlot) { E._curSlot = idx; }
      applyFrame(t);
      updateTransport(t);
      updateMusicVolume(t);
      E._raf = requestAnimationFrame(loop);
    };
    E._raf = requestAnimationFrame(loop);
  }
  function stopPlay() {
    E.playing = false;
    if (E._raf) { cancelAnimationFrame(E._raf); E._raf = null; }
    const pb = $("#esPlay"); if (pb) pb.textContent = "▶ 미리보기";
    const vid = $("#esVideo"); if (vid) { try { vid.pause(); } catch (_) {} }
    const mus = $("#esMusic"); if (mus) { try { mus.pause(); } catch (_) {} }
    updateTextVisibility(E.playhead);   // 정지 후 모든 글자 다시 보이게(편집용)
    scheduleSaveMeta();                 // 멈춘 위치 저장
  }

  // ── 라이프사이클 ────────────────────────────────────────────────
  function init() {
    if (E.inited) return;
    const root = document.getElementById("easyRoot");
    if (!root) return;
    buildDom();
    E.inited = true;
    $$(".es-modebtn", root).forEach((b) => b.addEventListener("click", () => enterMode2(b.dataset.mode2)));
    { const nb = $("#esNavNewTpl", root); if (nb) nb.addEventListener("click", () => { E.using = null; E.editing = null; setView("builder"); }); }
    try { const m = localStorage.getItem("es_mode2"); if (m === "easy" || m === "detail") E.mode2 = m; } catch (_) {}
    // Ctrl/Cmd+A = 전체 선택, Delete = 선택 삭제, Ctrl/Cmd+Z = 되돌리기 (사용 화면 한정)
    // 마지막으로 만진 타임라인(_activeTl: 'scene' 장면 / 'text' 글자)을 대상으로 동작
    document.addEventListener("keydown", (e) => {
      if (!document.body.classList.contains("mode-easy") || E.view !== "use" || !E.using) return;
      const tag = (e.target.tagName || "");
      const subInput = (e.target.classList && e.target.classList.contains("es-sub-input")) ? e.target : null;
      // 자막 복사/붙여넣기 — 입력칸 포커스보다 먼저 처리 (선택한 자막 대상)
      if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "C")) {
        if (subInput && subInput.selectionStart !== subInput.selectionEnd) return;   // 입력칸에서 글자선택 복사는 기본동작 양보
        if (E.using.selTexts && E.using.selTexts.length) { e.preventDefault(); E._textClip = selTextObjs().map((t) => JSON.parse(JSON.stringify(t))); toast(`자막 ${E._textClip.length}개 복사됨 — Ctrl+V로 붙여넣기`); }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
        if (E._textClip && E._textClip.length) { e.preventDefault(); if (subInput) subInput.blur(); pasteTexts(); toast(`자막 ${E._textClip.length}개 붙여넣음`); }
        return;
      }
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " || e.code === "Space") { e.preventDefault(); togglePlay(); return; }   // 스페이스바 = 재생/정지
      // 트림: W = 재생헤드 뒷부분 자르기, Q = 앞부분 자르기. 마지막에 만진 타임라인(자막/영상) 대상
      if (!e.ctrlKey && !e.metaKey && !e.altKey && E.mode2 === "detail" && (e.key === "w" || e.key === "W" || e.key === "q" || e.key === "Q")) {
        e.preventDefault();
        const side = (e.key === "w" || e.key === "W") ? "back" : "front";
        if (E.using._activeTl === "text") trimTextAtPlayhead(side);   // 자막 트림
        else trimSlotAtPlayhead(side);                                // 영상(장면) 트림
        return;
      }
      const scene = E.using._activeTl === "scene";
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z") && !e.shiftKey) {
        e.preventDefault();
        sceneUndo();   // 장면 타임라인 되돌리기(삭제·길이조절·리듬맞추기 등)
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        if (scene) {
          E.using.selSlots = E.using.template.slots.map((s) => s.id);
          highlightSceneSel();
        } else {
          E.using.selTexts = E.using.texts.map((t) => t.id);
          highlightSel(); renderTextBar();
        }
      } else if ((e.key === "Delete" || e.key === "Backspace")) {
        if (scene && (E.using.selSlots || []).length) {
          e.preventDefault(); deleteSelectedScenes();
        } else if (E.using.selTexts.length) {
          e.preventDefault();
          const ids = E.using.selTexts.slice();
          pushSceneUndo();
          E.using.texts = E.using.texts.filter((t) => !ids.includes(t.id));
          E.using.selTexts = []; renderTexts(); renderTextBar(); scheduleSaveMeta();
        }
      }
    });
    // 창 크기 변경 시 음악 파형 다시 그리기(폭 변동 대응)
    window.addEventListener("resize", () => { const c = $("#esMusicLane .es-wave"); if (c) drawMusicWave(c); });
    loadTemplates().then(async () => {
      await loadReels();
      await loadProjects();
      try { await regenAllThumbs(); } catch (_) {}   // 기존 썸네일 고화질 업그레이드(1회)
      await restoreSession();   // 새로고침해도 작업하던 내용 복구
      E._loaded = true;
      enterMode2(E.mode2);
    });
  }
  function show() { init(); if (E._loaded) enterMode2(E.mode2); }
  function hide() { stopPlay(); }

  window.EasyShorts = { init, show, hide };
})();
