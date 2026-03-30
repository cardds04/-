/* global fetch, document, window, URLSearchParams */

(function () {
  const $ = (id) => document.getElementById(id);

  window.addEventListener("error", function (ev) {
    try {
      const el = document.getElementById("status");
      if (el) {
        el.textContent = "페이지 오류: " + (ev && ev.message ? ev.message : "알 수 없음") + " (F12 콘솔 확인)";
        el.className = "status err";
      }
    } catch (_e) {}
  });

  let clips = [];
  /** 긴 경로 등으로 인덱스 폴백 시 썸네일 URL 캐시 구분 */
  let thumbRenderTick = 0;
  let grades = {};
  /** @type {Set<string>} */
  let selectedPaths = new Set();
  let anchorIndex = 0;
  let previewPath = null;
  let ctMin = 3000;
  let ctMax = 10000;
  let neutralCt = 6500;
  let expoMin = 0;
  let expoMax = 200;
  let eyedropActive = false;
  let previewTimer = null;
  /**
   * POST /api/session 지원 여부. ping이 성공했는데 post_session이 true가 아니면 옛 서버.
   * ping 실패 시에는 true로 두고 저장을 시도한다.
   */
  let serverPostSession = true;

  /** @type {object[]} */
  let undoStack = [];
  /** @type {object[]} */
  let redoStack = [];
  const MAX_UNDO = 80;

  const RANGE_IDS = [
    "rngExpo",
    "rngCt",
    "rngTint",
    "rngContrast",
    "rngHi",
    "rngSh",
    "rngWh",
    "rngHue",
    "rngBl",
    "rngTex",
    "rngClr",
    "rngDh",
    "rngVib",
    "rngSat",
  ];

  const GRADE_DEFAULTS = {
    exposure_pct: 100,
    ct_k: 6500,
    spot_mul: [1, 1, 1],
    wb_pct: 0,
    tint_pct: 0,
    contrast_pct: 100,
    saturation_pct: 100,
    highlights_pct: 0,
    shadows_pct: 0,
    whites_pct: 0,
    hue_pct: 0,
    blacks_pct: 0,
    texture_pct: 0,
    clarity_pct: 0,
    dehaze_pct: 0,
    vibrance_pct: 0,
  };

  function ensureGradeShape(path) {
    const d = grades[path];
    if (!d || typeof d !== "object") return;
    for (const [k, v] of Object.entries(GRADE_DEFAULTS)) {
      if (d[k] === undefined) d[k] = Array.isArray(v) ? [...v] : v;
    }
    if (!Array.isArray(d.spot_mul) || d.spot_mul.length !== 3) {
      d.spot_mul = [1, 1, 1];
    }
  }

  function pathToB64(p) {
    try {
      const bytes = new TextEncoder().encode(p);
      let s = "";
      for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    } catch (e) {
      return "";
    }
  }

  /** 썸네일: 인덱스만 쓰면 순서 변경 직후 서버 세션과 어긋나 캐시·표시가 꼬임 → 경로 b= 우선. */
  function thumbSrcForClip(c, idx) {
    const b = pathToB64(c.path);
    if (b && b.length <= 2400) {
      return apiUrl("api/thumb.jpg?b=" + encodeURIComponent(b));
    }
    return apiUrl("api/thumb.jpg?i=" + idx + "&r=" + thumbRenderTick);
  }

  /** `/api/...` 절대 경로는 리버스 프록시·하위 경로에서 루트로 잘못 갈 수 있어, 현재 문서 기준으로 붙인다. */
  function apiUrl(relPath) {
    const p = relPath.charAt(0) === "/" ? relPath.slice(1) : relPath;
    return new URL(p, window.location.href).href;
  }

  async function readJsonResponse(r) {
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch (_e) {
      const looksHtml = /^\s*</.test(text) || /<!DOCTYPE/i.test(text) || /<html/i.test(text);
      const hint = looksHtml
        ? "JSON 대신 HTML(404 등). 이 탭 주소가 grade_web_server가 띄운 http://127.0.0.1:포트/ 인지 확인하고, 서버를 최신 코드로 다시 실행하세요."
        : text.slice(0, 200);
      throw new Error("HTTP " + r.status + " — " + hint);
    }
  }

  function g() {
    return previewPath ? grades[previewPath] : null;
  }

  function pathsInIndexRange(i0, i1) {
    const a = Math.min(i0, i1);
    const b = Math.max(i0, i1);
    const s = new Set();
    for (let i = a; i <= b; i++) {
      if (clips[i]) s.add(clips[i].path);
    }
    return s;
  }

  function updateThumbSelectionUI() {
    document.querySelectorAll(".thumb").forEach((el) => {
      el.classList.toggle("selected", selectedPaths.has(el.dataset.path));
    });
  }

  function setStatus(msg, cls) {
    const el = $("status");
    if (!el) return;
    el.textContent = msg;
    el.className = "status " + (cls || "");
  }

  function setSaveMsg(msg, cls) {
    const el = $("saveMsg");
    if (!el) return;
    el.textContent = msg;
    el.className = "status " + (cls || "");
  }

  function syncControlsFromGrade() {
    const gr = g();
    if (!gr) return;
    const ne = $("numExpo");
    const re = $("rngExpo");
    if (ne && re) {
      ne.value = String(gr.exposure_pct);
      re.value = String(gr.exposure_pct);
      re.min = String(expoMin);
      re.max = String(expoMax);
      ne.min = String(expoMin);
      ne.max = String(expoMax);
    }
    const nc = $("numCt");
    const rc = $("rngCt");
    if (nc && rc) {
      nc.value = String(gr.ct_k);
      rc.value = String(gr.ct_k);
      rc.min = String(ctMin);
      rc.max = String(ctMax);
      nc.min = String(ctMin);
      nc.max = String(ctMax);
    }
    const pairs = [
      ["tint_pct", "rngTint", "numTint"],
      ["contrast_pct", "rngContrast", "numContrast"],
      ["highlights_pct", "rngHi", "numHi"],
      ["shadows_pct", "rngSh", "numSh"],
      ["whites_pct", "rngWh", "numWh"],
      ["hue_pct", "rngHue", "numHue"],
      ["blacks_pct", "rngBl", "numBl"],
      ["texture_pct", "rngTex", "numTex"],
      ["clarity_pct", "rngClr", "numClr"],
      ["dehaze_pct", "rngDh", "numDh"],
      ["vibrance_pct", "rngVib", "numVib"],
      ["saturation_pct", "rngSat", "numSat"],
    ];
    for (const [key, rid, nid] of pairs) {
      const vr = $(rid);
      const vn = $(nid);
      if (!vr || !vn) continue;
      const v = gr[key];
      vr.value = String(v);
      vn.value = String(v);
    }
  }

  function schedulePreview() {
    if (!previewPath) return;
    if (previewTimer) clearTimeout(previewTimer);
    previewTimer = setTimeout(refreshPreview, 100);
  }

  function clipIndexForPath(p) {
    const i = clips.findIndex((c) => c.path === p);
    return i >= 0 ? i : -1;
  }

  function previewUrl() {
    const gr = g();
    if (!gr || !previewPath) return "";
    const sm = gr.spot_mul || [1, 1, 1];
    const idx = clipIndexForPath(previewPath);
    const q = new URLSearchParams({
      e: String(gr.exposure_pct),
      ct: String(gr.ct_k),
      rr: String(sm[0]),
      gg: String(sm[1]),
      bb: String(sm[2]),
      tint: String(gr.tint_pct),
      cont: String(gr.contrast_pct),
      sat: String(gr.saturation_pct),
      hi: String(gr.highlights_pct),
      sh: String(gr.shadows_pct),
      wh: String(gr.whites_pct),
      hue: String(gr.hue_pct),
      bl: String(gr.blacks_pct),
      tex: String(gr.texture_pct),
      clr: String(gr.clarity_pct),
      dh: String(gr.dehaze_pct),
      vib: String(gr.vibrance_pct),
      wb: String(gr.wb_pct),
    });
    if (idx >= 0) q.set("i", String(idx));
    else q.set("b", pathToB64(previewPath));
    return apiUrl("api/preview.jpg?" + q.toString());
  }

  function refreshPreview() {
    const img = $("previewImg");
    if (!img) return;
    if (!previewPath) {
      img.removeAttribute("src");
      return;
    }
    img.onerror = function () {
      setStatus("미리보기 로드 실패(서버·경로·ffmpeg 확인). grade_web_server 터미널 로그를 봐 주세요.", "err");
    };
    img.onload = function () {
      img.onerror = null;
    };
    img.src = previewUrl() + "&t=" + Date.now();
  }

  function selectClip(path, index, ev) {
    const shift = !!(ev && ev.shiftKey);
    /** Windows·Linux: Ctrl, macOS 브라우저: Ctrl+클릭이 컨텍스트 메뉴라 ⌘도 토글로 인정 */
    const ctrlToggle = !!(ev && (ev.ctrlKey || ev.metaKey));
    if (!shift && !ctrlToggle && previewPath === path && selectedPaths.size === 1 && selectedPaths.has(path)) {
      return;
    }
    pushUndoBeforeMutation();
    if (shift && ctrlToggle && clips.length > 0 && anchorIndex >= 0) {
      const rangeSet = pathsInIndexRange(anchorIndex, index);
      selectedPaths = new Set([...selectedPaths, ...rangeSet]);
    } else if (shift && clips.length > 0 && anchorIndex >= 0) {
      selectedPaths = pathsInIndexRange(anchorIndex, index);
    } else if (ctrlToggle) {
      const next = new Set(selectedPaths);
      if (next.has(path)) {
        next.delete(path);
        if (next.size === 0) next.add(path);
      } else {
        next.add(path);
      }
      selectedPaths = next;
      anchorIndex = index;
    } else {
      selectedPaths = new Set([path]);
      anchorIndex = index;
    }
    previewPath = path;
    updateThumbSelectionUI();
    syncControlsFromGrade();
    refreshPreview();
  }

  function scrollThumbIntoView(path) {
    for (const el of document.querySelectorAll(".thumb")) {
      if (el.dataset.path === path) {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
        break;
      }
    }
  }

  /** @param {number} delta -1 이전, +1 다음 */
  function navigateClip(delta) {
    if (!clips.length) return;
    let idx = previewPath != null ? clipIndexForPath(previewPath) : -1;
    if (idx < 0) idx = 0;
    idx = (idx + delta + clips.length) % clips.length;
    const c = clips[idx];
    selectClip(c.path, idx, null);
    scrollThumbIntoView(c.path);
  }

  function setEyedropActive(on) {
    eyedropActive = !!on;
    $("btnEyedrop").classList.toggle("active", eyedropActive);
    $("previewImg").classList.toggle("eyedrop", eyedropActive);
    setSaveMsg(
      eyedropActive ? "미리보기에서 클릭해 스포이드. Alt+W로 끔." : "",
      eyedropActive ? "ok" : ""
    );
  }

  function toggleEyedrop() {
    setEyedropActive(!eyedropActive);
  }

  function captureSnapshot() {
    return {
      grades: JSON.parse(JSON.stringify(grades)),
      previewPath,
      selectedPaths: Array.from(selectedPaths),
      anchorIndex,
      clipsSnapshot: clips.map((c) => ({ path: c.path, name: c.name })),
    };
  }

  function restoreSnapshot(s) {
    grades = JSON.parse(JSON.stringify(s.grades));
    previewPath = s.previewPath;
    selectedPaths = new Set(s.selectedPaths);
    anchorIndex = s.anchorIndex;
    if (Array.isArray(s.clipsSnapshot)) {
      clips = s.clipsSnapshot.map((c) => ({ path: c.path, name: c.name }));
    }
    Object.keys(grades).forEach(ensureGradeShape);
    renderThumbs();
    updateThumbSelectionUI();
    syncControlsFromGrade();
    refreshPreview();
    void persistSessionOrder();
  }

  function pushUndoBeforeMutation() {
    if (!clips.length) return;
    const snap = captureSnapshot();
    const ser = JSON.stringify(snap);
    if (undoStack.length && JSON.stringify(undoStack[undoStack.length - 1]) === ser) return;
    undoStack.push(snap);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
  }

  function doUndo() {
    if (!undoStack.length) {
      setSaveMsg("취소할 변경 없음", "");
      return;
    }
    const prev = undoStack.pop();
    redoStack.push(captureSnapshot());
    restoreSnapshot(prev);
    setSaveMsg("실행 취소", "ok");
  }

  function doRedo() {
    if (!redoStack.length) {
      setSaveMsg("다시 실행할 항목 없음", "");
      return;
    }
    const next = redoStack.pop();
    undoStack.push(captureSnapshot());
    restoreSnapshot(next);
    setSaveMsg("다시 실행", "ok");
  }

  function bindRangeUndoGestures() {
    for (const id of RANGE_IDS) {
      const el = $(id);
      if (el) el.addEventListener("pointerdown", () => pushUndoBeforeMutation());
    }
  }

  async function persistSessionOrder() {
    if (!serverPostSession) {
      setSaveMsg(
        "순서·목록 저장 불가: grade_web_server를 재시작하세요. (같은 포트에 예전 Python이 떠 있으면 POST /api/session이 404입니다.)",
        "err"
      );
      return;
    }
    const order = clips.map((c) => c.path);
    try {
      const r = await fetch(apiUrl("api/session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video_files: order }),
      });
      const j = await readJsonResponse(r);
      if (!r.ok) throw new Error(j.error || String(r.status));
    } catch (e) {
      setSaveMsg("목록·순서 세션 반영 실패: " + e.message, "err");
    }
  }

  function moveClipInArray(from, to) {
    if (from === to || from < 0 || to < 0 || from >= clips.length || to >= clips.length) return;
    pushUndoBeforeMutation();
    const [item] = clips.splice(from, 1);
    let ins = to;
    if (from < to) ins = to - 1;
    clips.splice(ins, 0, item);
    anchorIndex = clipIndexForPath(previewPath);
    if (anchorIndex < 0) anchorIndex = 0;
    renderThumbs();
    updateThumbSelectionUI();
    refreshPreview();
    void persistSessionOrder();
  }

  /** 이웃과 자리 바꿈(▲▼ 버튼). previewPath 기준 한 칸. */
  function moveClipSwapNeighbor(delta) {
    if (!clips.length) {
      setSaveMsg("클립 목록이 비었습니다.", "err");
      return;
    }
    const path = previewPath || (clips[0] && clips[0].path);
    if (!path) return;
    const i = clipIndexForPath(path);
    if (i < 0) return;
    const j = i + delta;
    if (j < 0 || j >= clips.length) {
      setSaveMsg(delta < 0 ? "맨 앞 클립입니다." : "맨 뒤 클립입니다.", "");
      return;
    }
    pushUndoBeforeMutation();
    const t = clips[i];
    clips[i] = clips[j];
    clips[j] = t;
    previewPath = path;
    anchorIndex = clipIndexForPath(path);
    if (anchorIndex < 0) anchorIndex = i;
    renderThumbs();
    updateThumbSelectionUI();
    refreshPreview();
    void persistSessionOrder();
    setSaveMsg("순서 변경됨 (▲▼). 몽타주에서「웹 저장값 불러오기」.", "ok");
  }

  async function deletePaths(toRemove) {
    if (!toRemove.size) {
      setSaveMsg("삭제할 클립이 없습니다. 썸네일을 한 번 클릭해 선택하세요.", "");
      return;
    }
    pushUndoBeforeMutation();
    const idxPrev = clipIndexForPath(previewPath);
    for (const p of toRemove) delete grades[p];
    clips = clips.filter((c) => !toRemove.has(c.path));
    if (!clips.length) {
      previewPath = null;
      selectedPaths = new Set();
      anchorIndex = 0;
      renderThumbs();
      syncControlsFromGrade();
      refreshPreview();
      await persistSessionOrder();
      setStatus(
        "클립을 모두 제거했습니다. 몽타주 GUI「웹 저장값 불러오기」로 목록을 맞추세요.",
        "err"
      );
      return;
    }
    let nextPv = previewPath;
    if (!nextPv || toRemove.has(nextPv)) {
      let ni = idxPrev >= 0 ? idxPrev : 0;
      if (ni >= clips.length) ni = clips.length - 1;
      nextPv = clips[ni].path;
    }
    previewPath = nextPv;
    const kept = new Set(Array.from(selectedPaths).filter((p) => !toRemove.has(p)));
    selectedPaths = kept.size > 0 ? kept : new Set([previewPath]);
    const firstSel = Array.from(selectedPaths)[0];
    anchorIndex = clipIndexForPath(firstSel);
    if (anchorIndex < 0) anchorIndex = clipIndexForPath(previewPath);
    renderThumbs();
    updateThumbSelectionUI();
    syncControlsFromGrade();
    refreshPreview();
    await persistSessionOrder();
    setSaveMsg("클립 삭제 · 세션 저장됨 · GUI에서 불러오기", "ok");
  }

  let suppressThumbClick = false;
  /** 터치 직후 의도치 않은 mouse 이벤트 무시(ms) */
  let suppressMouseReorderUntil = 0;
  /** 순서 드래그 { fromIdx, x0, y0, dragging, el, touch } */
  let reorderState = null;

  /** Delete로 클립 삭제를 막을지: 텍스트·숫자 입력·textarea·select만 (range는 제외) */
  function isTextLikeFocused(el) {
    if (!el || el === document.body) return false;
    const tag = (el.tagName || "").toUpperCase();
    if (tag === "TEXTAREA" || tag === "SELECT") return true;
    if (tag === "INPUT") {
      const t = (el.type || "").toLowerCase();
      if (
        t === "range" ||
        t === "button" ||
        t === "checkbox" ||
        t === "radio" ||
        t === "file" ||
        t === "reset" ||
        t === "submit" ||
        t === "color" ||
        t === "hidden"
      ) {
        return false;
      }
      return true;
    }
    if (el.isContentEditable) return true;
    return isTextLikeFocused(el.parentElement);
  }

  function invokeDeleteSelection() {
    const toDel =
      selectedPaths.size > 0
        ? new Set(selectedPaths)
        : previewPath
          ? new Set([previewPath])
          : new Set();
    void deletePaths(toDel);
  }

  function reorderDragFromPoint(x, y) {
    if (!reorderState) return;
    const dx = x - reorderState.x0;
    const dy = y - reorderState.y0;
    if (!reorderState.dragging && dx * dx + dy * dy > 64) {
      reorderState.dragging = true;
      document.body.classList.add("reorder-dragging");
      if (reorderState.el) reorderState.el.classList.add("reorder-source");
    }
    if (!reorderState.dragging) return;
    document.querySelectorAll("#thumbs .thumb.reorder-target").forEach((t) => t.classList.remove("reorder-target"));
    const hit = document.elementFromPoint(x, y);
    const thumb = hit && hit.closest && hit.closest(".thumb");
    const box = $("thumbs");
    if (thumb && box && box.contains(thumb)) thumb.classList.add("reorder-target");
  }

  function reorderFinishFromPoint(x, y) {
    if (!reorderState) return;
    const st = reorderState;
    reorderState = null;
    document.body.classList.remove("reorder-dragging");
    document.querySelectorAll("#thumbs .thumb").forEach((t) =>
      t.classList.remove("reorder-source", "reorder-target")
    );
    if (!st.dragging) return;
    const hit = document.elementFromPoint(x, y);
    const thumb = hit && hit.closest && hit.closest(".thumb");
    const box = $("thumbs");
    if (!thumb || !box || !box.contains(thumb)) return;
    const toIdx = clips.findIndex((c) => c.path === thumb.dataset.path);
    if (toIdx < 0 || toIdx === st.fromIdx) return;
    suppressThumbClick = true;
    moveClipInArray(st.fromIdx, toIdx);
  }

  function onReorderMouseMove(e) {
    if (!reorderState || reorderState.touch) return;
    reorderDragFromPoint(e.clientX, e.clientY);
    if (reorderState && reorderState.dragging) e.preventDefault();
  }

  function onReorderMouseUp(e) {
    if (!reorderState || reorderState.touch) return;
    reorderFinishFromPoint(e.clientX, e.clientY);
  }

  function onReorderTouchMove(e) {
    if (!reorderState || !reorderState.touch) return;
    const t = e.touches[0];
    if (!t) return;
    reorderDragFromPoint(t.clientX, t.clientY);
    if (reorderState && reorderState.dragging) e.preventDefault();
  }

  function onReorderTouchEnd(e) {
    if (!reorderState || !reorderState.touch) return;
    const t = e.changedTouches[0];
    if (t) reorderFinishFromPoint(t.clientX, t.clientY);
    else {
      reorderState = null;
      document.body.classList.remove("reorder-dragging");
      document.querySelectorAll("#thumbs .thumb").forEach((el) =>
        el.classList.remove("reorder-source", "reorder-target")
      );
    }
  }

  function onGlobalKeydown(e) {
    const mod = e.ctrlKey || e.metaKey;

    const isDel =
      e.code === "Delete" ||
      e.code === "Backspace" ||
      e.key === "Delete" ||
      e.key === "Backspace";
    if (isDel && !mod && !e.altKey) {
      if (e.isComposing || isTextLikeFocused(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
      invokeDeleteSelection();
      return;
    }

    if (mod && e.code === "KeyZ") {
      e.preventDefault();
      e.stopPropagation();
      if (e.shiftKey) doRedo();
      else doUndo();
      return;
    }

    if (!e.altKey || e.ctrlKey || e.metaKey) return;
    const c = e.code;
    if (c !== "KeyD" && c !== "KeyS" && c !== "KeyW") return;
    e.preventDefault();
    e.stopPropagation();
    if (c === "KeyD") navigateClip(1);
    else if (c === "KeyS") navigateClip(-1);
    else toggleEyedrop();
  }

  function renderThumbs() {
    const box = $("thumbs");
    if (!box) return;
    thumbRenderTick++;
    box.innerHTML = "";
    clips.forEach((c, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "thumb" + (selectedPaths.has(c.path) ? " selected" : "");
      wrap.dataset.path = c.path;
      wrap.addEventListener("mousedown", (e) => {
        if (e.button !== 0) return;
        if (Date.now() < suppressMouseReorderUntil) return;
        e.preventDefault();
        suppressThumbClick = false;
        reorderState = {
          fromIdx: idx,
          x0: e.clientX,
          y0: e.clientY,
          dragging: false,
          el: wrap,
          touch: false,
        };
      });
      wrap.addEventListener(
        "touchstart",
        (e) => {
          if (e.touches.length !== 1) return;
          const t = e.touches[0];
          suppressMouseReorderUntil = Date.now() + 800;
          suppressThumbClick = false;
          reorderState = {
            fromIdx: idx,
            x0: t.clientX,
            y0: t.clientY,
            dragging: false,
            el: wrap,
            touch: true,
          };
        },
        { passive: true }
      );
      wrap.addEventListener("click", (ev) => {
        if (suppressThumbClick) {
          suppressThumbClick = false;
          return;
        }
        selectClip(c.path, idx, ev);
      });
      const im = document.createElement("img");
      im.src = thumbSrcForClip(c, idx);
      im.alt = "";
      im.loading = "lazy";
      im.draggable = false;
      const cap = document.createElement("span");
      cap.textContent = c.name;
      wrap.appendChild(im);
      wrap.appendChild(cap);
      box.appendChild(wrap);
    });
  }

  function applyGradeKey(key, value, syncPair) {
    selectedPaths.forEach((p) => {
      ensureGradeShape(p);
      if (grades[p]) grades[p][key] = value;
    });
    if (syncPair) {
      const r = $(syncPair[0]);
      const n = $(syncPair[1]);
      if (r) r.value = String(value);
      if (n) n.value = String(value);
    }
    schedulePreview();
  }

  function clampInt(v, lo, hi) {
    let n = parseInt(v, 10);
    if (Number.isNaN(n)) n = lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function bindPair(key, rngId, numId, lo, hi) {
    const loFn = typeof lo === "function" ? lo : () => lo;
    const hiFn = typeof hi === "function" ? hi : () => hi;
    const r = $(rngId);
    const n = $(numId);
    if (!r || !n) {
      console.warn("[grade_web] 슬라이더/숫자칸 없음:", rngId, numId);
      return;
    }
    r.addEventListener("input", () => {
      const v = clampInt(r.value, loFn(), hiFn());
      applyGradeKey(key, v, [rngId, numId]);
    });
    n.addEventListener("change", () => {
      pushUndoBeforeMutation();
      const v = clampInt(n.value, loFn(), hiFn());
      applyGradeKey(key, v, [rngId, numId]);
    });
  }

  async function loadState() {
    setStatus("불러오는 중…");
    if (location.protocol === "file:") {
      setStatus(
        "로컬 파일로 열려 있어 API를 쓸 수 없습니다. 몽타주에서「브라우저에서 편집」으로 열거나, 터미널에 나오는 http://127.0.0.1:포트/ 주소로 접속하세요.",
        "err"
      );
      return;
    }
    try {
      try {
        const pr = await fetch(apiUrl("api/ping"));
        if (pr.ok) {
          const pj = await readJsonResponse(pr);
          serverPostSession = pj.post_session === true;
        }
      } catch (_e) {
        serverPostSession = true;
      }

      const res = await fetch(apiUrl("api/state"));
      const data = await readJsonResponse(res);
      if (!res.ok) throw new Error(data.error || "HTTP " + res.status);
      clips = data.clips || [];
      grades = data.grades || {};
      ctMin = data.ct_min ?? 3000;
      ctMax = data.ct_max ?? 10000;
      neutralCt = data.neutral_ct ?? 6500;
      expoMin = data.exposure_min ?? 0;
      expoMax = data.exposure_max ?? 200;
      GRADE_DEFAULTS.ct_k = neutralCt;
      Object.keys(grades).forEach(ensureGradeShape);
      if (!clips.length) {
        setStatus("클립이 없습니다. 몽타주 GUI에서 영상을 지정한 뒤「브라우저에서 편집」을 누르세요.", "err");
        return;
      }
      undoStack = [];
      redoStack = [];
      previewPath = clips[0].path;
      selectedPaths = new Set([previewPath]);
      anchorIndex = 0;
      renderThumbs();
      syncControlsFromGrade();
      refreshPreview();
      setStatus(
        "클립 " +
          clips.length +
          "개 · 썸네일 끌어 순서 변경 · 선택 삭제/Delete · Ctrl+Z · Alt+D/S/W · Shift/Ctrl+클릭 · GUI 불러오기"
      );
      if (!serverPostSession) {
        setSaveMsg(
          "이 포트의 서버가 옛 버전이거나 예전 프로세스가 남아 있습니다. 터미널에서 grade_web_server를 Ctrl+C로 끄고 다시 실행하면 순서·목록 저장(POST)이 됩니다.",
          "err"
        );
      }
    } catch (e) {
      setStatus("불러오기 실패: " + e.message, "err");
    }
  }

  async function onPreviewClick(ev) {
    if (!eyedropActive || !previewPath) return;
    const img = $("previewImg");
    const rect = img.getBoundingClientRect();
    const dx = Math.floor(ev.clientX - rect.left);
    const dy = Math.floor(ev.clientY - rect.top);
    const dispW = Math.max(1, Math.floor(rect.width));
    const dispH = Math.max(1, Math.floor(rect.height));
    if (dx < 0 || dy < 0 || dx >= dispW || dy >= dispH) return;
    try {
      const r = await fetch(apiUrl("api/pick_rgb"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: previewPath, dx, dy, disp_w: dispW, disp_h: dispH }),
      });
      const j = await readJsonResponse(r);
      if (!r.ok) throw new Error(j.error || String(r.status));
      pushUndoBeforeMutation();
      selectedPaths.forEach((p) => {
        ensureGradeShape(p);
        if (grades[p]) {
          grades[p].spot_mul = j.spot_mul;
          grades[p].ct_k = j.kelvin;
          if (typeof j.tint_pct === "number") grades[p].tint_pct = j.tint_pct;
        }
      });
      syncControlsFromGrade();
      schedulePreview();
      setSaveMsg(
        "스포이드: ≈ " + j.kelvin + "K · 색조 " + (j.tint_pct ?? 0) + " · " + selectedPaths.size + "클립",
        "ok"
      );
    } catch (e) {
      setSaveMsg("스포이드 실패: " + e.message, "err");
    }
  }

  async function saveAll() {
    setSaveMsg("저장 중…");
    try {
      const r = await fetch(apiUrl("api/save"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ by_path: grades }),
      });
      const j = await readJsonResponse(r);
      if (!r.ok) throw new Error(j.error || String(r.status));
      setSaveMsg("저장 완료 (" + j.count + "클립). 몽타주 GUI에서「웹 저장값 불러오기」.", "ok");
    } catch (e) {
      setSaveMsg("저장 실패: " + e.message, "err");
    }
  }

  bindPair("exposure_pct", "rngExpo", "numExpo", () => expoMin, () => expoMax);
  bindPair("ct_k", "rngCt", "numCt", () => ctMin, () => ctMax);
  bindPair("tint_pct", "rngTint", "numTint", -100, 100);
  bindPair("contrast_pct", "rngContrast", "numContrast", 0, 200);
  bindPair("highlights_pct", "rngHi", "numHi", -100, 100);
  bindPair("shadows_pct", "rngSh", "numSh", -100, 100);
  bindPair("whites_pct", "rngWh", "numWh", -100, 100);
  bindPair("hue_pct", "rngHue", "numHue", -100, 100);
  bindPair("blacks_pct", "rngBl", "numBl", -100, 100);
  bindPair("texture_pct", "rngTex", "numTex", -100, 100);
  bindPair("clarity_pct", "rngClr", "numClr", -100, 100);
  bindPair("dehaze_pct", "rngDh", "numDh", -100, 100);
  bindPair("vibrance_pct", "rngVib", "numVib", -100, 100);
  bindPair("saturation_pct", "rngSat", "numSat", 0, 200);

  bindRangeUndoGestures();

  const btnEyedrop = $("btnEyedrop");
  if (btnEyedrop) btnEyedrop.addEventListener("click", () => toggleEyedrop());

  const btnResetSpot = $("btnResetSpot");
  if (btnResetSpot) {
    btnResetSpot.addEventListener("click", () => {
      pushUndoBeforeMutation();
      selectedPaths.forEach((p) => {
        ensureGradeShape(p);
        if (grades[p]) grades[p].spot_mul = [1, 1, 1];
      });
      schedulePreview();
      setSaveMsg("스포이드 초기화 (" + selectedPaths.size + "클립)", "ok");
    });
  }

  const btnSave = $("btnSave");
  if (btnSave) btnSave.addEventListener("click", saveAll);

  const previewImg = $("previewImg");
  if (previewImg) previewImg.addEventListener("click", onPreviewClick);

  window.addEventListener("keydown", onGlobalKeydown, true);
  window.addEventListener("mousemove", onReorderMouseMove, true);
  window.addEventListener("mouseup", onReorderMouseUp, true);
  window.addEventListener("touchmove", onReorderTouchMove, { capture: true, passive: false });
  window.addEventListener("touchend", onReorderTouchEnd, { capture: true, passive: false });

  const delBtn = $("btnDelClips");
  if (delBtn) {
    delBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      invokeDeleteSelection();
    });
  }

  const btnUp = $("btnOrderUp");
  if (btnUp) btnUp.addEventListener("click", () => moveClipSwapNeighbor(-1));

  const btnDown = $("btnOrderDown");
  if (btnDown) btnDown.addEventListener("click", () => moveClipSwapNeighbor(1));

  window.gradeWebDeleteClips = invokeDeleteSelection;
  window.gradeWebMoveUp = function () {
    moveClipSwapNeighbor(-1);
  };
  window.gradeWebMoveDown = function () {
    moveClipSwapNeighbor(1);
  };

  loadState();
})();
