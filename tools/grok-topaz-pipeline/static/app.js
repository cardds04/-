(function () {
  const $ = (id) => document.getElementById(id);

  const API_BASE = (
    typeof window !== "undefined" && window.GROK_WEB_API_BASE != null
      ? String(window.GROK_WEB_API_BASE)
      : ""
  )
    .trim()
    .replace(/\/$/, "");
  function apiUrl(path) {
    const p = path.startsWith("/") ? path : `/${path}`;
    return API_BASE ? `${API_BASE}${p}` : p;
  }
  function mediaUrl(u) {
    if (u == null || u === "") return u;
    const s = String(u);
    if (/^https?:\/\//i.test(s)) return s;
    return apiUrl(s);
  }

  const apiKeyEl = $("grok-xai-api-key");
  const maskKey = $("grok-mask-key");
  const fileInput = $("file");
  const dropzone = $("dropzone");
  const fileName = $("fileName");
  const promptEl = $("prompt");
  const durationEl = $("duration");
  const aspectEl = $("aspect");
  const resolutionEl = $("resolution");
  const runTopaz = $("runTopaz");
  const topazFf = $("topazFf");
  const topazVf = $("topazVf");
  const topazExtra = $("topazExtra");
  const topazFc = $("topazFc");
  const startBtnGrok = $("startBtnGrok");
  const startBtnTopaz = $("startBtnTopaz");
  const videoInput = $("videoFile");
  const videoDropzone = $("videoDropzone");
  const videoFileName = $("videoFileName");
  const topazFf2 = $("topazFf2");
  const topazVf2 = $("topazVf2");
  const topazExtra2 = $("topazExtra2");
  const topazFc2 = $("topazFc2");
  const useTopazPresetGrok = $("useTopazPresetGrok");
  const useTopazPreset = $("useTopazPreset");
  const topazGrokDetails = $("topazGrokDetails");
  const manualTopazGrok = $("manualTopazGrok");
  const manualTopazOnly = $("manualTopazOnly");
  const panFiles = $("panFiles");
  const panDropzone = $("panDropzone");
  const panFileNames = $("panFileNames");
  const startBtnPan = $("startBtnPan");
  const batchAspectFiles = $("batchAspectFiles");
  const batchAspectDropzone = $("batchAspectDropzone");
  const batchAspectFileNames = $("batchAspectFileNames");
  const btnBatchAspectDownload = $("btnBatchAspectDownload");
  const batchAspectRatio = $("batchAspectRatio");
  const grokImagePrompt = $("grokImagePrompt");
  const grokImageFile = $("grokImageFile");
  const grokImageDropzone = $("grokImageDropzone");
  const grokImageFileName = $("grokImageFileName");
  const grokImageFile2 = $("grokImageFile2");
  const grokImageDropzone2 = $("grokImageDropzone2");
  const grokImageFileName2 = $("grokImageFileName2");
  const grokImageAspectBase = $("grokImageAspectBase");
  const grokImageResolution = $("grokImageResolution");
  const grokImagePromptPresetIcons = $("grokImagePromptPresetIcons");
  const btnSaveGrokImagePromptPreset = $("btnSaveGrokImagePromptPreset");
  const btnClearGrokRef1 = $("btnClearGrokRef1");
  const btnClearGrokRef2 = $("btnClearGrokRef2");
  const startBtnGrokImage = $("startBtnGrokImage");
  const geminiApiKeyEl = $("gemini-api-key");
  const grokImageXaiKeyEl = $("grok-image-xai-api-key");
  const btnSaveGrokImageXaiKey = $("btnSaveGrokImageXaiKey");
  const btnSaveGeminiKey = $("btnSaveGeminiKey");
  const btnToggleImageApiKeys = $("btnToggleImageApiKeys");
  const imageApiKeysPanel = $("imageApiKeysPanel");
  const banner = $("banner");
  const statusPanel = $("statusPanel");
  const statusJobsList = $("statusJobsList");
  const statusQueueHintEl = $("statusQueueHint");
  const errorBox = $("errorBox");
  const outDir = $("outDir");
  const outputGalleryChips = $("outputGalleryChips");
  const btnBatchZip = $("btnBatchZip");
  const btnGalleryClear = $("btnGalleryClear");
  const topazQueueHint = $("topazQueueHint");

  let pollTimer = null;
  /** ② Topaz만: 같은 종류 작업 중 추가 클릭 시 순차 실행 */
  let topazOnlyQueue = [];
  /** jobId -> { kind, t } — Grok·Topaz·팬 동시 추적, 서버로 즉시 전송 후 폴링 */
  let trackedJobs = new Map();
  let currentJobKind = "grok";
  let envHasXaiKey = false;
  let grokKeyReady = false;
  let envHasGeminiKey = false;
  let geminiKeyReady = false;

  /** 하단 갤러리: 완료된 아웃풋만 (Grok/Topaz/팬 공통) */
  let outputGalleryItems = [];
  /** 동일 job_id로 갤러리 중복 추가 방지 */
  const galleryAppendedJobIds = new Set();

  const btnToggleGrokSettings = $("btnToggleGrokSettings");
  const grokSettingsPanel = $("grokSettingsPanel");
  const promptPresetIcons = $("promptPresetIcons");
  const btnSavePromptPreset = $("btnSavePromptPreset");

  const LS_PROMPT_PRESETS = "grok_prompt_presets_v1";
  const LS_IMAGE_PROMPT_PRESETS = "grok_image_prompt_presets_v1";
  const LS_SAVED_IMAGE_XAI_KEY = "grok_web_image_block_xai_key_v1";
  const LS_SAVED_IMAGE_GEMINI_KEY = "grok_web_image_block_gemini_key_v1";

  function loadPromptPresets() {
    try {
      const raw = localStorage.getItem(LS_PROMPT_PRESETS);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function savePromptPresets(list) {
    localStorage.setItem(LS_PROMPT_PRESETS, JSON.stringify(list));
  }

  function renderPresetIcons() {
    if (!promptPresetIcons) return;
    promptPresetIcons.innerHTML = "";
    const list = loadPromptPresets();
    list.forEach((p) => {
      const wrap = document.createElement("div");
      wrap.className = "prompt-preset-chip-wrap";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prompt-preset-chip";
      btn.setAttribute("aria-label", `${p.title || "프롬프트"} 불러오기`);
      btn.dataset.id = p.id;
      const titleStr = (p.title || "").trim() || "(제목 없음)";
      const glyph = (titleStr[0] || "P").toUpperCase();
      const icon = document.createElement("span");
      icon.className = "prompt-preset-chip__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = glyph;
      const cap = document.createElement("span");
      cap.className = "prompt-preset-chip__title";
      const short =
        titleStr.length > 10 ? `${titleStr.slice(0, 10)}…` : titleStr;
      cap.textContent = short;
      cap.title = titleStr;
      btn.appendChild(icon);
      btn.appendChild(cap);
      btn.addEventListener("click", () => {
        if (promptEl) promptEl.value = p.text;
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "prompt-preset-chip__remove";
      del.setAttribute("aria-label", `"${titleStr}" 저장 프롬프트 삭제`);
      del.title = "이 저장 항목 삭제";
      del.textContent = "×";
      del.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = loadPromptPresets().filter((x) => x.id !== p.id);
        savePromptPresets(next);
        renderPresetIcons();
        setError("");
      });

      wrap.appendChild(btn);
      wrap.appendChild(del);
      promptPresetIcons.appendChild(wrap);
    });
  }

  function loadImagePromptPresets() {
    try {
      const raw = localStorage.getItem(LS_IMAGE_PROMPT_PRESETS);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveImagePromptPresets(list) {
    localStorage.setItem(LS_IMAGE_PROMPT_PRESETS, JSON.stringify(list));
  }

  function renderGrokImagePresetIcons() {
    if (!grokImagePromptPresetIcons) return;
    grokImagePromptPresetIcons.innerHTML = "";
    const list = loadImagePromptPresets();
    list.forEach((p) => {
      const wrap = document.createElement("div");
      wrap.className = "prompt-preset-chip-wrap";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "prompt-preset-chip";
      btn.setAttribute("aria-label", `${p.title || "프롬프트"} 불러오기 (이미지)`);
      btn.dataset.id = p.id;
      const titleStr = (p.title || "").trim() || "(제목 없음)";
      const glyph = (titleStr[0] || "P").toUpperCase();
      const icon = document.createElement("span");
      icon.className = "prompt-preset-chip__icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = glyph;
      const cap = document.createElement("span");
      cap.className = "prompt-preset-chip__title";
      const short =
        titleStr.length > 10 ? `${titleStr.slice(0, 10)}…` : titleStr;
      cap.textContent = short;
      cap.title = titleStr;
      btn.appendChild(icon);
      btn.appendChild(cap);
      btn.addEventListener("click", () => {
        if (grokImagePrompt) grokImagePrompt.value = p.text;
      });

      const del = document.createElement("button");
      del.type = "button";
      del.className = "prompt-preset-chip__remove";
      del.setAttribute("aria-label", `"${titleStr}" 저장 프롬프트 삭제`);
      del.title = "이 저장 항목 삭제";
      del.textContent = "×";
      del.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = loadImagePromptPresets().filter((x) => x.id !== p.id);
        saveImagePromptPresets(next);
        renderGrokImagePresetIcons();
        setError("");
      });

      wrap.appendChild(btn);
      wrap.appendChild(del);
      grokImagePromptPresetIcons.appendChild(wrap);
    });
  }

  function getComputedImageAspectRatio() {
    const base = grokImageAspectBase ? grokImageAspectBase.value : "32";
    const oriEl = document.querySelector(
      'input[name="grokImageOrientation"]:checked',
    );
    const ori = oriEl ? oriEl.value : "landscape";
    const map = {
      169: { landscape: "16:9", portrait: "9:16" },
      43: { landscape: "4:3", portrait: "3:4" },
      32: { landscape: "3:2", portrait: "2:3" },
    };
    const row = map[base] || map[169];
    return ori === "portrait" ? row.portrait : row.landscape;
  }

  function syncImageResolutionForProvider() {
    if (!grokImageResolution) return;
    const provEl = document.querySelector(
      'input[name="imageProvider"]:checked',
    );
    const prov = provEl ? provEl.value : "gemini";
    const opt4k = grokImageResolution.querySelector('option[value="4k"]');
    if (!opt4k) return;
    if (prov === "xai") {
      opt4k.disabled = true;
      if (grokImageResolution.value === "4k") {
        grokImageResolution.value = "2k";
      }
    } else {
      opt4k.disabled = false;
    }
  }

  function showBanner(text, show) {
    banner.textContent = text;
    banner.hidden = !show;
  }

  function setError(msg) {
    if (msg) {
      errorBox.textContent = msg;
      errorBox.hidden = false;
    } else {
      errorBox.hidden = true;
    }
  }

  function escapeHtml(s) {
    if (s == null || s === "") return "";
    const div = document.createElement("div");
    div.textContent = String(s);
    return div.innerHTML;
  }

  function truncateFileName(name, maxLen) {
    const max = maxLen == null ? 22 : maxLen;
    if (!name || name.length <= max) return name;
    return `${name.slice(0, max - 1)}…`;
  }

  function fileChipGlyph(filename) {
    const base = String(filename || "").replace(/\.[^.]+$/, "");
    const ch = (base[0] || filename[0] || "?").toUpperCase();
    return ch;
  }

  function chipClassForOutput(it) {
    if (it.source === "pan") return "job-file-chip--pan";
    if (it.source === "grok_image") return "job-file-chip--image";
    if (it.role === "raw") return "job-file-chip--warm";
    return "job-file-chip--cool";
  }

  function gallerySortKey(it) {
    return it.isImage || it.source === "grok_image" ? 1 : 0;
  }

  /** 아웃풋만: Topaz 최종 우선, 그록만이면 raw, 팬은 각 mp4 */
  function buildOutputsForGallery(jobId, d, kind) {
    const out = [];
    if (kind === "grok_image" && d.grok_image_files && d.grok_image_files.length) {
      for (const f of d.grok_image_files) {
        const name = f.name || "image.png";
        out.push({
          id: `g-${jobId}-img-${name}`,
          job_id: jobId,
          role: "grok_image",
          image_name: name,
          url: mediaUrl(f.url),
          name,
          source: "grok_image",
          isImage: true,
        });
      }
      return out;
    }
    if (kind === "pan_photo" && d.pan_files && d.pan_files.length) {
      for (const f of d.pan_files) {
        const name = f.name || "pan.mp4";
        out.push({
          id: `g-${jobId}-pan-${name}`,
          job_id: jobId,
          role: "pan",
          pan_name: name,
          url: mediaUrl(f.url),
          name,
          source: "pan",
        });
      }
      return out;
    }
    if (kind === "topaz_only") {
      if (d.has_final) {
        out.push({
          id: `g-${jobId}-final`,
          job_id: jobId,
          role: "final",
          url: apiUrl(`/api/jobs/${jobId}/download/final`),
          name: d.final_name || "topaz_out.mp4",
          source: "topaz",
        });
      }
      return out;
    }
    if (d.has_final) {
      out.push({
        id: `g-${jobId}-final`,
        job_id: jobId,
        role: "final",
        url: apiUrl(`/api/jobs/${jobId}/download/final`),
        name: d.final_name || "out.mp4",
        source: "grok",
      });
    } else if (d.has_raw) {
      out.push({
        id: `g-${jobId}-raw`,
        job_id: jobId,
        role: "raw",
        url: apiUrl(`/api/jobs/${jobId}/download/raw`),
        name: d.raw_name || "grok.mp4",
        source: "grok",
      });
    }
    return out;
  }

  function appendGalleryIfDone(jobId, d, kind) {
    if (d.phase !== "done") return;
    if (galleryAppendedJobIds.has(jobId)) return;
    galleryAppendedJobIds.add(jobId);
    const rows = buildOutputsForGallery(jobId, d, kind);
    for (const row of rows) {
      outputGalleryItems.push(row);
    }
    renderOutputGallery();
  }

  function renderOutputGallery() {
    if (!outputGalleryChips) return;
    if (!outputGalleryItems.length) {
      outputGalleryChips.innerHTML = "";
      if (btnBatchZip) btnBatchZip.disabled = true;
      return;
    }
    if (btnBatchZip) btnBatchZip.disabled = false;
    const sorted = [...outputGalleryItems].sort(
      (a, b) => gallerySortKey(a) - gallerySortKey(b),
    );
    outputGalleryChips.innerHTML = sorted
      .map((it) => {
        const cls = chipClassForOutput(it);
        const gid = encodeURIComponent(it.id);
        if (it.isImage || it.source === "grok_image") {
          return (
            `<div class="output-gallery__tile output-gallery__tile--image">` +
            `<img class="output-gallery__thumb" src="${it.url}" alt="" loading="lazy" />` +
            `<a class="job-file-chip job-file-chip--image ${cls}" href="${it.url}" data-gallery-id="${gid}" title="${escapeHtml(it.name)}">` +
            `<span class="job-file-chip__icon" aria-hidden="true">↓</span>` +
            `<span class="job-file-chip__name">${escapeHtml(truncateFileName(it.name))}</span></a></div>`
          );
        }
        const g = fileChipGlyph(it.name);
        return (
          `<a class="job-file-chip ${cls}" href="${it.url}" data-gallery-id="${gid}" title="${escapeHtml(it.name)}">` +
          `<span class="job-file-chip__icon" aria-hidden="true">${escapeHtml(g)}</span>` +
          `<span class="job-file-chip__name">${escapeHtml(truncateFileName(it.name))}</span></a>`
        );
      })
      .join("");
  }

  /** 개별 파일 다운로드(칩 클릭) 후 목록에서 제거 — 기본 다운로드가 끝난 뒤 DOM을 갱신 */
  function removeGalleryItemById(id) {
    const before = outputGalleryItems.length;
    outputGalleryItems = outputGalleryItems.filter((it) => it.id !== id);
    if (outputGalleryItems.length !== before) {
      const jobIds = new Set(outputGalleryItems.map((it) => it.job_id));
      for (const jid of [...galleryAppendedJobIds]) {
        if (!jobIds.has(jid)) galleryAppendedJobIds.delete(jid);
      }
      renderOutputGallery();
    }
  }

  if (outputGalleryChips) {
    outputGalleryChips.addEventListener("click", (e) => {
      const a = e.target.closest("a.job-file-chip");
      if (!a || !outputGalleryChips.contains(a)) return;
      const raw = a.getAttribute("data-gallery-id");
      if (raw == null || raw === "") return;
      let id;
      try {
        id = decodeURIComponent(raw);
      } catch {
        return;
      }
      window.setTimeout(() => removeGalleryItemById(id), 0);
    });
  }

  function hasTrackedKind(k) {
    return [...trackedJobs.values()].some((m) => m.kind === k);
  }

  function hasPanRunning() {
    return hasTrackedKind("pan_photo");
  }

  /** 진행 중이어도 ① Grok는 항상 누름 (서버/XAI가 처리). Topaz 전용만 예외적으로 대기열 허용 */
  function syncButtonStates() {
    const busy = trackedJobs.size > 0;
    if (startBtnGrok) startBtnGrok.disabled = false;
    if (startBtnGrokImage) startBtnGrokImage.disabled = false;
    if (startBtnPan) startBtnPan.disabled = busy;
    if (startBtnTopaz) {
      startBtnTopaz.disabled = busy && !hasTrackedKind("topaz_only");
    }
  }

  function setBusy(_busy) {
    syncButtonStates();
  }

  function updateTopazQueueHint() {
    const n = topazOnlyQueue.length;
    const text =
      n === 0
        ? ""
        : `대기열 ${n}건 — 현재 작업이 끝나면 순서대로 실행됩니다.`;
    if (topazQueueHint) {
      if (n === 0) topazQueueHint.hidden = true;
      else {
        topazQueueHint.hidden = false;
        topazQueueHint.textContent = text;
      }
    }
    if (statusQueueHintEl) {
      if (n === 0) statusQueueHintEl.hidden = true;
      else {
        statusQueueHintEl.hidden = false;
        statusQueueHintEl.textContent = `② Topaz 전용 ${text}`;
      }
    }
  }

  if (maskKey && apiKeyEl) {
    maskKey.addEventListener("change", () => {
      apiKeyEl.type = maskKey.checked ? "password" : "text";
    });
  }

  function loadSavedImageApiKeys() {
    try {
      const x = localStorage.getItem(LS_SAVED_IMAGE_XAI_KEY);
      if (x != null && grokImageXaiKeyEl) grokImageXaiKeyEl.value = x;
      const g = localStorage.getItem(LS_SAVED_IMAGE_GEMINI_KEY);
      if (g != null && geminiApiKeyEl) geminiApiKeyEl.value = g;
    } catch {
      /* ignore */
    }
  }

  function getXaiKeyForImage() {
    const local = grokImageXaiKeyEl ? grokImageXaiKeyEl.value.trim() : "";
    if (local) return local;
    return apiKeyEl ? apiKeyEl.value.trim() : "";
  }

  function getGeminiKeyForImage() {
    return geminiApiKeyEl ? geminiApiKeyEl.value.trim() : "";
  }

  if (btnToggleImageApiKeys && imageApiKeysPanel) {
    btnToggleImageApiKeys.addEventListener("click", () => {
      imageApiKeysPanel.hidden = !imageApiKeysPanel.hidden;
      const expanded = !imageApiKeysPanel.hidden;
      btnToggleImageApiKeys.setAttribute(
        "aria-expanded",
        expanded ? "true" : "false",
      );
      btnToggleImageApiKeys.textContent = expanded
        ? "API 키 (이 블록 전용) — 접기"
        : "API 키 (이 블록 전용) — 펼치기";
    });
  }

  if (btnSaveGrokImageXaiKey && grokImageXaiKeyEl) {
    btnSaveGrokImageXaiKey.addEventListener("click", () => {
      try {
        localStorage.setItem(
          LS_SAVED_IMAGE_XAI_KEY,
          grokImageXaiKeyEl.value.trim(),
        );
        setError("");
      } catch (e) {
        setError(String(e.message || e));
      }
    });
  }
  if (btnSaveGeminiKey && geminiApiKeyEl) {
    btnSaveGeminiKey.addEventListener("click", () => {
      try {
        localStorage.setItem(
          LS_SAVED_IMAGE_GEMINI_KEY,
          geminiApiKeyEl.value.trim(),
        );
        setError("");
      } catch (e) {
        setError(String(e.message || e));
      }
    });
  }

  loadSavedImageApiKeys();

  const grokRefPreviewUrls = { 1: null, 2: null };

  function defaultClipboardImageName(mime) {
    if (mime === "image/jpeg" || mime === "image/jpg") return "clipboard.jpg";
    if (mime === "image/webp") return "clipboard.webp";
    if (mime === "image/gif") return "clipboard.gif";
    return "clipboard.png";
  }

  function syncGrokRefSlotUI(slot) {
    const input = slot === 2 ? grokImageFile2 : grokImageFile;
    const nameEl = slot === 2 ? grokImageFileName2 : grokImageFileName;
    const zone = slot === 2 ? grokImageDropzone2 : grokImageDropzone;
    const wrap = slot === 2 ? $("grokImagePreview2") : $("grokImagePreview");
    const img = slot === 2 ? $("grokImagePreviewImg2") : $("grokImagePreviewImg");
    if (grokRefPreviewUrls[slot]) {
      URL.revokeObjectURL(grokRefPreviewUrls[slot]);
      grokRefPreviewUrls[slot] = null;
    }
    const f = input && input.files && input.files[0];
    const hint = zone && zone.querySelector(".grok-ref-drop-hint");
    if (!f || !String(f.type || "").startsWith("image/")) {
      if (nameEl) nameEl.textContent = "";
      if (wrap) wrap.hidden = true;
      if (img) {
        img.removeAttribute("src");
        img.alt = "";
      }
      if (zone) zone.classList.remove("drop--has-preview");
      if (hint) hint.hidden = false;
      return;
    }
    const url = URL.createObjectURL(f);
    grokRefPreviewUrls[slot] = url;
    if (img) {
      img.src = url;
      img.alt = slot === 2 ? "참조 2 미리보기" : "참조 1 미리보기";
    }
    if (wrap) wrap.hidden = false;
    if (zone) zone.classList.add("drop--has-preview");
    if (hint) hint.hidden = true;
    const n = f.name && String(f.name).trim();
    if (nameEl) nameEl.textContent = n || defaultClipboardImageName(f.type);
  }

  function bindGrokRefDrop(zone, input, slot) {
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => syncGrokRefSlotUI(slot));
    ["dragenter", "dragover"].forEach((ev) => {
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.add("drop--active");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.remove("drop--active");
      });
    });
    zone.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      if (!f || !f.type.startsWith("image/")) return;
      const dt = new DataTransfer();
      dt.items.add(f);
      input.files = dt.files;
      syncGrokRefSlotUI(slot);
    });
  }

  function bindDrop(zone, input, nameEl, acceptPred) {
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", () => {
      const f = input.files[0];
      nameEl.textContent = f ? f.name : "";
    });
    ["dragenter", "dragover"].forEach((ev) => {
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.add("drop--active");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.remove("drop--active");
      });
    });
    zone.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      if (f && acceptPred(f)) {
        input.files = e.dataTransfer.files;
        nameEl.textContent = f.name;
      }
    });
  }

  function bindDropMulti(zone, input, nameEl, acceptPred) {
    function updateNames() {
      const files = input.files;
      if (!files || !files.length) {
        nameEl.textContent = "";
        return;
      }
      const names = [];
      for (let i = 0; i < files.length; i++) {
        if (acceptPred(files[i])) names.push(files[i].name);
      }
      if (!names.length) {
        nameEl.textContent = "";
        return;
      }
      nameEl.textContent =
        names.length === 1
          ? names[0]
          : names.length <= 3
            ? names.join(", ")
            : `${names[0]} 외 ${names.length - 1}개`;
    }
    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", updateNames);
    ["dragenter", "dragover"].forEach((ev) => {
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.add("drop--active");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      zone.addEventListener(ev, (e) => {
        e.preventDefault();
        zone.classList.remove("drop--active");
      });
    });
    zone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer.files;
      if (!dt || !dt.length) return;
      const accepted = [];
      for (let i = 0; i < dt.length; i++) {
        if (acceptPred(dt[i])) accepted.push(dt[i]);
      }
      if (!accepted.length) return;
      const out = new DataTransfer();
      accepted.forEach((f) => out.items.add(f));
      input.files = out.files;
      const names = accepted.map((f) => f.name);
      nameEl.textContent =
        names.length === 1
          ? names[0]
          : names.length <= 3
            ? names.join(", ")
            : `${names[0]} 외 ${names.length - 1}개`;
    });
  }

  if (dropzone && fileInput && fileName) {
    bindDropMulti(
      dropzone,
      fileInput,
      fileName,
      (f) => f.type.startsWith("image/"),
    );
  }

  if (grokImageDropzone && grokImageFile) {
    bindGrokRefDrop(grokImageDropzone, grokImageFile, 1);
  }
  if (grokImageDropzone2 && grokImageFile2) {
    bindGrokRefDrop(grokImageDropzone2, grokImageFile2, 2);
  }

  if (grokImageFile || grokImageFile2) {
    function clipboardImageFile(data) {
      const items = data?.items;
      if (!items) return null;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) return f;
        }
      }
      return null;
    }

    function applyGrokRefFromClipboard(file, slot) {
      const input = slot === 2 ? grokImageFile2 : grokImageFile;
      if (!input) return;
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      syncGrokRefSlotUI(slot);
    }

    let grokImageDropzoneHover = false;
    let grokImageDropzone2Hover = false;
    if (grokImageDropzone) {
      grokImageDropzone.addEventListener("mouseenter", () => {
        grokImageDropzoneHover = true;
      });
      grokImageDropzone.addEventListener("mouseleave", () => {
        grokImageDropzoneHover = false;
      });
      grokImageDropzone.addEventListener("paste", (e) => {
        const file = clipboardImageFile(e.clipboardData);
        if (!file) return;
        e.preventDefault();
        applyGrokRefFromClipboard(file, 1);
      });
    }
    if (grokImageDropzone2) {
      grokImageDropzone2.addEventListener("mouseenter", () => {
        grokImageDropzone2Hover = true;
      });
      grokImageDropzone2.addEventListener("mouseleave", () => {
        grokImageDropzone2Hover = false;
      });
      grokImageDropzone2.addEventListener("paste", (e) => {
        const file = clipboardImageFile(e.clipboardData);
        if (!file) return;
        e.preventDefault();
        applyGrokRefFromClipboard(file, 2);
      });
    }

    document.addEventListener(
      "paste",
      (e) => {
        const over2 = grokImageDropzone2Hover;
        const over1 = grokImageDropzoneHover;
        if (!over1 && !over2) return;
        const file = clipboardImageFile(e.clipboardData);
        if (!file) return;
        e.preventDefault();
        e.stopPropagation();
        applyGrokRefFromClipboard(file, over2 ? 2 : 1);
      },
      true,
    );
  }

  function clearGrokRefSlot(slot) {
    if (slot === 2) {
      if (grokImageFile2) grokImageFile2.value = "";
    } else {
      if (grokImageFile) grokImageFile.value = "";
    }
    syncGrokRefSlotUI(slot);
  }
  if (btnClearGrokRef1) {
    btnClearGrokRef1.addEventListener("click", (e) => {
      e.preventDefault();
      clearGrokRefSlot(1);
    });
  }
  if (btnClearGrokRef2) {
    btnClearGrokRef2.addEventListener("click", (e) => {
      e.preventDefault();
      clearGrokRefSlot(2);
    });
  }

  function refreshPanFileNames() {
    if (!panFiles || !panFileNames) return;
    const fs = panFiles.files;
    if (!fs || !fs.length) {
      panFileNames.textContent = "";
      return;
    }
    panFileNames.textContent = Array.from(fs)
      .map((f) => f.name)
      .join(", ");
  }

  if (panDropzone && panFiles) {
    panDropzone.addEventListener("click", () => panFiles.click());
    panFiles.addEventListener("change", refreshPanFileNames);
    ["dragenter", "dragover"].forEach((ev) => {
      panDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        panDropzone.classList.add("drop--active");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      panDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        panDropzone.classList.remove("drop--active");
      });
    });
    panDropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer?.files;
      if (!dt || !dt.length) return;
      const list = new DataTransfer();
      for (let i = 0; i < dt.length; i++) {
        const f = dt[i];
        if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp|gif|tif)$/i.test(f.name)) {
          list.items.add(f);
        }
      }
      if (list.files.length) {
        panFiles.files = list.files;
        refreshPanFileNames();
      }
    });
  }

  function refreshBatchAspectFileNames() {
    if (!batchAspectFiles || !batchAspectFileNames) return;
    const fs = batchAspectFiles.files;
    if (!fs || !fs.length) {
      batchAspectFileNames.textContent = "";
      return;
    }
    batchAspectFileNames.textContent = Array.from(fs)
      .map((f) => f.name)
      .join(", ");
  }

  if (batchAspectDropzone && batchAspectFiles) {
    batchAspectDropzone.addEventListener("click", () => batchAspectFiles.click());
    batchAspectFiles.addEventListener("change", refreshBatchAspectFileNames);
    ["dragenter", "dragover"].forEach((ev) => {
      batchAspectDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        batchAspectDropzone.classList.add("drop--active");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      batchAspectDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        batchAspectDropzone.classList.remove("drop--active");
      });
    });
    batchAspectDropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer?.files;
      if (!dt || !dt.length) return;
      const list = new DataTransfer();
      for (let i = 0; i < dt.length; i++) {
        const f = dt[i];
        if (f.type.startsWith("image/") || /\.(jpe?g|png|webp|bmp|gif|tif)$/i.test(f.name)) {
          list.items.add(f);
        }
      }
      if (list.files.length) {
        batchAspectFiles.files = list.files;
        refreshBatchAspectFileNames();
      }
    });

    function clipboardImageFilesFromData(data) {
      const items = data?.items;
      if (!items) return [];
      const out = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) out.push(f);
        }
      }
      return out;
    }

    function normalizeBatchAspectClipboardFile(file, idx) {
      const n = file.name && String(file.name).trim();
      if (n) return file;
      const mime = file.type || "image/png";
      let ext = "png";
      if (mime === "image/jpeg" || mime === "image/jpg") ext = "jpg";
      else if (mime === "image/webp") ext = "webp";
      else if (mime === "image/gif") ext = "gif";
      return new File([file], `clipboard-${idx}.${ext}`, { type: file.type || mime });
    }

    function appendBatchAspectPastedFiles(rawFiles) {
      if (!rawFiles.length) return;
      const normalized = rawFiles.map((f, i) =>
        normalizeBatchAspectClipboardFile(f, i),
      );
      const list = new DataTransfer();
      const existing = batchAspectFiles.files;
      for (let i = 0; i < existing.length; i++) {
        list.items.add(existing[i]);
      }
      for (let i = 0; i < normalized.length; i++) {
        list.items.add(normalized[i]);
      }
      batchAspectFiles.files = list.files;
      refreshBatchAspectFileNames();
    }

    function isBatchAspectPasteTargetActive() {
      try {
        if (batchAspectDropzone.matches(":hover")) return true;
      } catch {
        /* ignore */
      }
      return (
        !!document.activeElement &&
        batchAspectDropzone.contains(document.activeElement)
      );
    }

    document.addEventListener(
      "paste",
      (e) => {
        if (!isBatchAspectPasteTargetActive()) return;
        const files = clipboardImageFilesFromData(e.clipboardData);
        if (!files.length) return;
        e.preventDefault();
        e.stopPropagation();
        appendBatchAspectPastedFiles(files);
      },
      true,
    );
  }

  if (btnBatchAspectDownload && batchAspectFiles) {
    btnBatchAspectDownload.addEventListener("click", async () => {
      const fs = batchAspectFiles.files;
      if (!fs || !fs.length) {
        setError("사진을 하나 이상 선택하세요.");
        return;
      }
      setError("");
      btnBatchAspectDownload.disabled = true;
      try {
        const fd = new FormData();
        for (let i = 0; i < fs.length; i++) {
          fd.append("images", fs[i]);
        }
        fd.append("aspect", batchAspectRatio ? batchAspectRatio.value : "3:2");
        const oEl = document.querySelector(
          'input[name="batchAspectOrientation"]:checked',
        );
        fd.append("orientation", oEl ? oEl.value : "landscape");
        const res = await fetch(apiUrl("/api/batch-aspect-ratio"), {
          method: "POST",
          body: fd,
        });
        const ct = res.headers.get("Content-Type") || "";
        if (!res.ok) {
          let msg = res.statusText;
          if (ct.includes("application/json")) {
            const j = await res.json().catch(() => ({}));
            msg = j.error || msg;
          }
          throw new Error(msg);
        }
        const blob = await res.blob();
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = `batch_aspect_${Date.now()}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        btnBatchAspectDownload.disabled = false;
      }
    });
  }

  function refreshVideoFileNames() {
    if (!videoInput || !videoFileName) return;
    const fs = videoInput.files;
    if (!fs || !fs.length) {
      videoFileName.textContent = "";
      return;
    }
    const arr = Array.from(fs);
    const names = arr.map((f) => f.name).join(", ");
    videoFileName.textContent =
      arr.length === 1 ? names : `${names} (${arr.length}개)`;
  }

  function videoFileAcceptPred(f) {
    return (
      f.type.startsWith("video/") ||
      /\.(mp4|mov|mkv|m4v|avi|webm)$/i.test(f.name)
    );
  }

  if (videoDropzone && videoInput) {
    /* label이 input을 감싸므로 별도 click() 불필요 (이중 다이얼로그 방지) */
    videoInput.addEventListener("change", refreshVideoFileNames);
    ["dragenter", "dragover"].forEach((ev) => {
      videoDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        videoDropzone.classList.add("drop--active");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      videoDropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        videoDropzone.classList.remove("drop--active");
      });
    });
    videoDropzone.addEventListener("drop", (e) => {
      const dt = e.dataTransfer?.files;
      if (!dt || !dt.length) return;
      const list = new DataTransfer();
      for (let i = 0; i < dt.length; i++) {
        const f = dt[i];
        if (videoFileAcceptPred(f)) list.items.add(f);
      }
      if (list.files.length) {
        videoInput.files = list.files;
        refreshVideoFileNames();
      }
    });
  }

  function syncTopazGrokUI() {
    if (!topazGrokDetails || !runTopaz) return;
    if (!runTopaz.checked) {
      topazGrokDetails.hidden = true;
      return;
    }
    topazGrokDetails.hidden = false;
    if (useTopazPresetGrok && manualTopazGrok) {
      manualTopazGrok.hidden = useTopazPresetGrok.checked;
    }
  }

  function syncTopazOnlyUI() {
    if (!useTopazPreset || !manualTopazOnly) return;
    manualTopazOnly.hidden = useTopazPreset.checked;
  }

  if (runTopaz) {
    runTopaz.addEventListener("change", syncTopazGrokUI);
  }
  if (useTopazPresetGrok) {
    useTopazPresetGrok.addEventListener("change", syncTopazGrokUI);
  }
  if (useTopazPreset) {
    useTopazPreset.addEventListener("change", syncTopazOnlyUI);
  }
  syncTopazGrokUI();
  syncTopazOnlyUI();

  if (btnToggleGrokSettings && grokSettingsPanel) {
    btnToggleGrokSettings.addEventListener("click", () => {
      grokSettingsPanel.hidden = !grokSettingsPanel.hidden;
    });
  }

  if (btnSavePromptPreset && promptEl) {
    btnSavePromptPreset.addEventListener("click", () => {
      const text = promptEl.value.trim();
      if (!text) {
        setError("저장할 프롬프트를 먼저 입력하세요.");
        return;
      }
      const title = window.prompt("저장할 제목을 입력하세요.");
      if (title === null) return;
      const list = loadPromptPresets();
      const item = {
        id: "p" + Date.now(),
        title: (title || "").trim() || "(제목 없음)",
        text: text,
      };
      list.push(item);
      savePromptPresets(list);
      renderPresetIcons();
      setError("");
    });
  }

  renderPresetIcons();
  renderGrokImagePresetIcons();

  if (btnSaveGrokImagePromptPreset && grokImagePrompt) {
    btnSaveGrokImagePromptPreset.addEventListener("click", () => {
      const text = grokImagePrompt.value.trim();
      if (!text) {
        setError("저장할 프롬프트를 먼저 입력하세요.");
        return;
      }
      const title = window.prompt("저장할 제목을 입력하세요.");
      if (title === null) return;
      const list = loadImagePromptPresets();
      const item = {
        id: "imgp" + Date.now(),
        title: (title || "").trim() || "(제목 없음)",
        text: text,
      };
      list.push(item);
      saveImagePromptPresets(list);
      renderGrokImagePresetIcons();
      setError("");
    });
  }

  document.querySelectorAll('input[name="imageProvider"]').forEach((el) => {
    el.addEventListener("change", () => syncImageResolutionForProvider());
  });
  syncImageResolutionForProvider();

  async function checkReady() {
    try {
      const r = await fetch(apiUrl("/api/ready"));
      const d = await r.json();
      outDir.textContent = d.output_dir || "—";
      envHasXaiKey = !!d.env_has_xai_key;
      grokKeyReady = !!d.grok_key_ready;
      envHasGeminiKey = !!d.env_has_gemini_key;
      geminiKeyReady = !!d.gemini_key_ready;
      if (
        envHasXaiKey ||
        grokKeyReady ||
        envHasGeminiKey ||
        geminiKeyReady
      ) {
        showBanner("", false);
      } else {
        showBanner(
          "Grok(xAI) 또는 Gemini API 키가 없습니다. 맨 위 AI 이미지·① 「Grok 설정」·Gemini 키 칸을 채우거나 XAI_API_KEY / GEMINI_API_KEY를 설정하세요. 팬 영상·② Topaz만 쓸 때는 필요 없습니다.",
          true,
        );
      }
      setBusy(false);
    } catch {
      showBanner("서버에 연결할 수 없습니다.", true);
    }
  }

  function stopPoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function kindBadge(kind, d) {
    if (kind === "pan_photo") return "팬";
    if (kind === "topaz_only") return "Topaz";
    if (kind === "grok_image") {
      return d && d.image_provider === "gemini" ? "나노바나나2" : "Grok 이미지";
    }
    return "Grok";
  }

  function computeJobProgressPct(d, kind) {
    if (!d) return { pct: 0, show: false };
    if (kind === "pan_photo") {
      if (d.pan_total != null && d.pan_done != null && d.pan_total > 0) {
        return {
          pct: Math.min(100, (d.pan_done / d.pan_total) * 100),
          show: true,
        };
      }
      return { pct: 12, show: true };
    }
    if (typeof d.grok_progress === "number") {
      return { pct: Math.min(100, d.grok_progress), show: true };
    }
    if (d.phase === "grok_wait" && d.grok_progress == null) {
      return { pct: 8, show: true };
    }
    if (d.phase === "topaz" || d.phase === "queued") {
      return { pct: kind === "topaz_only" ? 30 : 8, show: true };
    }
    if (kind === "grok_image" && d.phase === "grok_image") {
      return { pct: 18, show: true };
    }
    return { pct: 0, show: false };
  }

  function jobSubLine(d, kind, jobId) {
    if (kind === "pan_photo") return "팬 영상 (로컬 · MoviePy)";
    if (kind === "grok_image") {
      return d && d.image_provider === "gemini"
        ? "Gemini 3.1 Flash Image (나노바나나2)"
        : "Grok Imagine (이미지)";
    }
    if (d && d.batch_stem) {
      const bi = d.batch_index;
      return typeof bi === "number"
        ? `일괄 ${bi + 1}번째: ${d.batch_stem}`
        : `일괄: ${d.batch_stem}`;
    }
    if (d.xai_request_id) return "요청 ID: " + d.xai_request_id;
    if (kind === "topaz_only") return "Topaz 전용 작업";
    if (d.phase === "queued") return "서버에서 순서 대기 중";
    return "요청 ID: " + jobId;
  }

  function renderUploadingPlaceholder(kind, imageProvider) {
    if (!statusJobsList) return;
    statusPanel.hidden = false;
    const badge =
      kind === "pan_photo"
        ? "팬"
        : kind === "topaz_only"
          ? "Topaz"
          : kind === "grok_image"
            ? imageProvider === "gemini"
              ? "나노바나나2"
              : "Grok 이미지"
            : "Grok";
    statusJobsList.innerHTML =
      `<div class="status-job-row status-job-row--uploading">` +
      `<div class="status-job-row__head">` +
      `<span class="status-job-row__badge">${escapeHtml(badge)}</span>` +
      `<span class="status-job-row__msg">업로드 중…</span>` +
      `</div>` +
      `<div class="progress status-job-row__progress"><div class="progress__bar" style="width:5%"></div></div>` +
      `</div>`;
    updateTopazQueueHint();
  }

  function renderJobsStatus(activeResults) {
    if (!statusJobsList) return;
    const rows = activeResults.filter((r) => trackedJobs.has(r.jobId));
    rows.sort((a, b) => a.meta.t - b.meta.t);

    let html = "";
    for (const row of rows) {
      const { jobId, meta, d } = row;
      const kind = meta.kind;
      const badge = kindBadge(kind, d);
      const msg = d ? d.message || "—" : "상태를 불러오는 중…";
      const { pct, show } = computeJobProgressPct(d, kind);
      const sub = d ? jobSubLine(d, kind, jobId) : "";
      const bar = show
        ? `<div class="progress status-job-row__progress"><div class="progress__bar" style="width:${pct}%"></div></div>`
        : "";
      const pctLabel =
        show && d ? `<span class="status-job-row__pct">약 ${Math.round(pct)}%</span>` : "";
      html +=
        `<div class="status-job-row" data-job-id="${escapeHtml(jobId)}">` +
        `<div class="status-job-row__head">` +
        `<span class="status-job-row__badge status-job-row__badge--${escapeHtml(kind)}">${escapeHtml(badge)}</span>` +
        `<span class="status-job-row__msg">${escapeHtml(msg)}</span>` +
        pctLabel +
        `</div>` +
        (sub ? `<p class="status-job-row__sub mono">${escapeHtml(sub)}</p>` : "") +
        bar +
        `</div>`;
    }
    statusJobsList.innerHTML = html;

    const errActive = rows.find((r) => r.d && r.d.error);
    if (errActive) setError(errActive.d.error);

    if (statusPanel) {
      statusPanel.hidden = rows.length === 0 && topazOnlyQueue.length === 0;
    }
    updateTopazQueueHint();
  }

  async function pollAllTracked() {
    if (trackedJobs.size === 0) {
      stopPoll();
      syncButtonStates();
      renderJobsStatus([]);
      return;
    }
    const entries = [...trackedJobs.entries()];
    const results = await Promise.all(
      entries.map(async ([jobId, meta]) => {
        try {
          const r = await fetch(apiUrl(`/api/jobs/${jobId}`));
          if (!r.ok) return { jobId, meta, d: null };
          const d = await r.json();
          return { jobId, meta, d };
        } catch {
          return { jobId, meta, d: null };
        }
      }),
    );

    const finished = [];
    for (const row of results) {
      if (!row.d) continue;
      if (row.d.phase === "done" || row.d.phase === "failed") {
        finished.push(row);
      }
    }
    for (const row of finished) {
      const { jobId, meta, d } = row;
      if (d.phase === "done") {
        appendGalleryIfDone(jobId, d, meta.kind);
      }
      if (d.error) setError(d.error);
      trackedJobs.delete(jobId);
      if (meta.kind === "topaz_only" && topazOnlyQueue.length > 0) {
        const nextFd = topazOnlyQueue.shift();
        updateTopazQueueHint();
        void postJob(nextFd);
      }
    }

    const activeRows = results.filter((r) => trackedJobs.has(r.jobId));
    renderJobsStatus(activeRows);

    const withData = activeRows.filter((r) => r.d).sort((a, b) => a.meta.t - b.meta.t);
    if (withData.length) {
      currentJobKind = withData[withData.length - 1].meta.kind;
    }

    if (trackedJobs.size === 0) {
      stopPoll();
      syncButtonStates();
      if (!finished.some((x) => x.d && x.d.error)) {
        setError("");
      }
    } else {
      syncButtonStates();
    }
  }

  function ensurePoll() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      void pollAllTracked();
    }, 2000);
    void pollAllTracked();
  }

  async function postPanJob(fd) {
    currentJobKind = "pan_photo";
    setError("");
    renderUploadingPlaceholder("pan_photo");

    try {
      const r = await fetch(apiUrl("/api/pan-jobs"), { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "요청 실패");
        if (statusJobsList) statusJobsList.innerHTML = "";
        if (trackedJobs.size === 0) statusPanel.hidden = true;
        syncButtonStates();
        return;
      }
      const jobId = data.job_id;
      const kind = data.kind || "pan_photo";
      trackedJobs.set(jobId, { kind, t: Date.now() });
      currentJobKind = kind;
      ensurePoll();
      syncButtonStates();
    } catch (e) {
      setError(String(e.message || e));
      if (statusJobsList) statusJobsList.innerHTML = "";
      if (trackedJobs.size === 0) statusPanel.hidden = true;
      syncButtonStates();
    }
  }

  async function postGrokImageJob(fd) {
    currentJobKind = "grok_image";
    setError("");
    const imageProv = (fd.get("image_provider") || "xai").trim();
    if (trackedJobs.size === 0) {
      renderUploadingPlaceholder("grok_image", imageProv);
    } else {
      statusPanel.hidden = false;
      updateTopazQueueHint();
    }

    try {
      const r = await fetch(apiUrl("/api/grok-image-jobs"), { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "요청 실패");
        if (trackedJobs.size === 0) {
          if (statusJobsList) statusJobsList.innerHTML = "";
          statusPanel.hidden = true;
        } else {
          void pollAllTracked();
        }
        syncButtonStates();
        return;
      }
      const jobId = data.job_id;
      const kind = data.kind || "grok_image";
      trackedJobs.set(jobId, { kind, t: Date.now() });
      currentJobKind = kind;
      ensurePoll();
      syncButtonStates();
    } catch (e) {
      setError(String(e.message || e));
      if (trackedJobs.size === 0) {
        if (statusJobsList) statusJobsList.innerHTML = "";
        statusPanel.hidden = true;
      } else {
        void pollAllTracked();
      }
      syncButtonStates();
    }
  }

  async function postBatchGrokJob(fd) {
    const kind = "grok";
    setError("");
    if (trackedJobs.size === 0) {
      renderUploadingPlaceholder(kind);
    } else {
      statusPanel.hidden = false;
      updateTopazQueueHint();
    }

    try {
      const r = await fetch(apiUrl("/api/jobs/batch-grok"), { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "요청 실패");
        if (trackedJobs.size === 0) {
          if (statusJobsList) statusJobsList.innerHTML = "";
          statusPanel.hidden = true;
        } else {
          void pollAllTracked();
        }
        syncButtonStates();
        return;
      }
      const ids = data.job_ids || [];
      if (!ids.length) {
        setError("작업이 생성되지 않았습니다.");
        if (trackedJobs.size === 0) {
          if (statusJobsList) statusJobsList.innerHTML = "";
          statusPanel.hidden = true;
        }
        syncButtonStates();
        return;
      }
      for (let i = 0; i < ids.length; i++) {
        trackedJobs.set(ids[i], { kind, t: Date.now() + i });
      }
      currentJobKind = "grok";
      ensurePoll();
      syncButtonStates();
    } catch (e) {
      setError(String(e.message || e));
      if (trackedJobs.size === 0) {
        if (statusJobsList) statusJobsList.innerHTML = "";
        statusPanel.hidden = true;
      } else {
        void pollAllTracked();
      }
      syncButtonStates();
    }
  }

  async function postJob(fd) {
    const mode = (fd.get("pipeline_mode") || "").trim();
    const kind = mode === "topaz_only" ? "topaz_only" : "grok";
    setError("");
    if (trackedJobs.size === 0) {
      renderUploadingPlaceholder(kind);
    } else {
      statusPanel.hidden = false;
      updateTopazQueueHint();
    }

    try {
      const r = await fetch(apiUrl("/api/jobs"), { method: "POST", body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(data.error || "요청 실패");
        if (trackedJobs.size === 0) {
          if (statusJobsList) statusJobsList.innerHTML = "";
          statusPanel.hidden = true;
        } else {
          void pollAllTracked();
        }
        syncButtonStates();
        return;
      }
      const jobId = data.job_id;
      trackedJobs.set(jobId, { kind, t: Date.now() });
      currentJobKind = data.kind || kind;
      ensurePoll();
      syncButtonStates();
    } catch (e) {
      setError(String(e.message || e));
      if (trackedJobs.size === 0) {
        if (statusJobsList) statusJobsList.innerHTML = "";
        statusPanel.hidden = true;
      } else {
        void pollAllTracked();
      }
      syncButtonStates();
    }
  }

  if (startBtnGrokImage && grokImagePrompt) {
    startBtnGrokImage.addEventListener("click", async () => {
      const prompt = grokImagePrompt.value.trim();
      if (!prompt) {
        setError("이미지 프롬프트를 입력하세요.");
        return;
      }
      const provEl = document.querySelector(
        'input[name="imageProvider"]:checked',
      );
      const imageProvider = provEl ? provEl.value : "gemini";
      if (imageProvider === "gemini") {
        if (!getGeminiKeyForImage() && !envHasGeminiKey) {
          setError(
            "Gemini API 키를 이 블록에 입력·저장하거나, 터미널에 GEMINI_API_KEY를 설정하세요.",
          );
          return;
        }
      } else {
        if (!grokKeyReady && !envHasXaiKey && !getXaiKeyForImage()) {
          setError(
            "이 블록 또는 ① Grok 설정에 xAI 키를 넣거나, 터미널에 XAI_API_KEY를 설정하세요.",
          );
          return;
        }
      }
      const fd = new FormData();
      fd.append("image_provider", imageProvider);
      fd.append("prompt", prompt);
      fd.append("xai_api_key", getXaiKeyForImage());
      fd.append("gemini_api_key", getGeminiKeyForImage());
      fd.append("aspect_ratio", getComputedImageAspectRatio());
      fd.append(
        "image_resolution",
        grokImageResolution ? grokImageResolution.value : "1k",
      );
      if (grokImageFile && grokImageFile.files && grokImageFile.files[0]) {
        fd.append("image", grokImageFile.files[0]);
      }
      if (grokImageFile2 && grokImageFile2.files && grokImageFile2.files[0]) {
        fd.append("image2", grokImageFile2.files[0]);
      }
      await postGrokImageJob(fd);
    });
  }

  if (startBtnGrok) {
    startBtnGrok.addEventListener("click", async () => {
      const files = fileInput.files;
      if (!files || !files.length) {
        setError("사진을 한 장 이상 선택하세요.");
        return;
      }
      const prompt = promptEl.value.trim();
      if (!prompt) {
        setError("프롬프트를 입력하세요.");
        return;
      }
      if (!grokKeyReady && !envHasXaiKey && !(apiKeyEl && apiKeyEl.value.trim())) {
        setError("Grok 설정에서 API 키를 넣거나, 터미널에 XAI_API_KEY를 설정하세요.");
        return;
      }
      /* 저장된 프리셋: 체크박스가 없거나 켜져 있으면 프리셋(요소 없으면 기본 프리셋으로 간주) */
      const grokUseSavedPreset =
        runTopaz.checked &&
        (!useTopazPresetGrok || useTopazPresetGrok.checked);
      if (runTopaz.checked) {
        if (!grokUseSavedPreset) {
          const vg = (topazVf.value || "").trim();
          const cg = (topazFc && topazFc.value ? topazFc.value : "").trim();
          if (!vg && !cg) {
            setError("프리셋을 끈 경우 Topaz에 -vf 또는 -filter_complex 중 하나를 입력하세요.");
            return;
          }
          if (vg && cg) {
            setError("-vf와 filter_complex 칸을 동시에 채우지 마세요. 하나만 쓰세요.");
            return;
          }
        }
      }

      if (hasPanRunning()) {
        setError("맨 위 팬 영상 작업이 끝난 뒤에 Grok를 실행하세요.");
        return;
      }

      if (files.length === 1) {
        const fd = new FormData();
        fd.append("pipeline_mode", "grok");
        fd.append("xai_api_key", apiKeyEl.value.trim());
        fd.append("image", files[0]);
        fd.append("prompt", prompt);
        fd.append("duration", String(parseInt(durationEl.value, 10) || 2));
        fd.append("aspect_ratio", aspectEl.value);
        fd.append("resolution", resolutionEl.value);
        fd.append("run_topaz", runTopaz.checked ? "1" : "0");
        fd.append("use_topaz_preset", grokUseSavedPreset ? "1" : "0");
        fd.append("topaz_vf", topazVf.value);
        fd.append("topaz_filter_complex", topazFc ? topazFc.value.trim() : "");
        fd.append("topaz_ffmpeg", topazFf.value.trim());
        fd.append("topaz_extra", topazExtra.value.trim());
        await postJob(fd);
        return;
      }

      const fd = new FormData();
      fd.append("xai_api_key", apiKeyEl.value.trim());
      for (let i = 0; i < files.length; i++) {
        fd.append("images", files[i]);
      }
      fd.append("prompt", prompt);
      fd.append("duration", String(parseInt(durationEl.value, 10) || 2));
      fd.append("aspect_ratio", aspectEl.value);
      fd.append("resolution", resolutionEl.value);
      fd.append("run_topaz", runTopaz.checked ? "1" : "0");
      fd.append("use_topaz_preset", grokUseSavedPreset ? "1" : "0");
      fd.append("topaz_vf", topazVf.value);
      fd.append("topaz_filter_complex", topazFc ? topazFc.value.trim() : "");
      fd.append("topaz_ffmpeg", topazFf.value.trim());
      fd.append("topaz_extra", topazExtra.value.trim());
      await postBatchGrokJob(fd);
    });
  }

  if (btnBatchZip) {
    btnBatchZip.addEventListener("click", async () => {
      if (!outputGalleryItems.length) return;
      setError("");
      try {
        const items = outputGalleryItems.map((it) => {
          const o = { job_id: it.job_id, role: it.role };
          if (it.role === "pan" && it.pan_name) o.pan_name = it.pan_name;
          if (it.role === "grok_image" && it.image_name)
            o.image_name = it.image_name;
          return o;
        });
        const r = await fetch(apiUrl("/api/batch-zip"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!r.ok) {
          const errJson = await r.json().catch(() => ({}));
          setError(errJson.error || "ZIP 만들기 실패");
          return;
        }
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "outputs_batch.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(String(e.message || e));
      }
    });
  }

  if (btnGalleryClear) {
    btnGalleryClear.addEventListener("click", () => {
      outputGalleryItems = [];
      galleryAppendedJobIds.clear();
      renderOutputGallery();
      setError("");
    });
  }

  if (startBtnPan && panFiles) {
    startBtnPan.addEventListener("click", async () => {
      if (!panFiles.files || !panFiles.files.length) {
        setError("맨 위에서 이미지를 하나 이상 선택하세요.");
        return;
      }
      const fd = new FormData();
      const modeEl = document.querySelector('input[name="panMode"]:checked');
      fd.append("pan_mode", modeEl ? modeEl.value : "lr");
      for (let i = 0; i < panFiles.files.length; i++) {
        fd.append("images", panFiles.files[i]);
      }
      await postPanJob(fd);
    });
  }

  function buildTopazOnlyFormData(videoFile) {
    const presetOn = useTopazPreset && useTopazPreset.checked;
    const vf = (topazVf2.value || "").trim();
    const fc = (topazFc2 && topazFc2.value ? topazFc2.value : "").trim();
    const fd = new FormData();
    fd.append("pipeline_mode", "topaz_only");
    fd.append("use_topaz_preset", presetOn ? "1" : "0");
    fd.append("video", videoFile);
    fd.append("topaz_vf", vf);
    fd.append("topaz_filter_complex", fc);
    fd.append("topaz_ffmpeg", topazFf2.value.trim());
    fd.append("topaz_extra", topazExtra2.value.trim());
    return fd;
  }

  if (startBtnTopaz) {
    startBtnTopaz.addEventListener("click", async () => {
      const presetOn = useTopazPreset && useTopazPreset.checked;
      const vf = (topazVf2.value || "").trim();
      const fc = (topazFc2 && topazFc2.value ? topazFc2.value : "").trim();
      if (!presetOn) {
        if (!vf && !fc) {
          setError("프리셋을 끈 경우 ②에서 Topaz -vf 또는 -filter_complex 중 하나를 입력하세요.");
          return;
        }
        if (vf && fc) {
          setError("-vf와 filter_complex 칸을 동시에 채우지 마세요.");
          return;
        }
      }
      const files = videoInput.files ? Array.from(videoInput.files) : [];
      if (!files.length) {
        setError("②에서 영상 파일을 하나 이상 선택하세요.");
        return;
      }

      if (hasPanRunning()) {
        setError("맨 위 팬 영상이 끝난 뒤에 Topaz를 실행하세요.");
        return;
      }

      const fds = files.map((f) => buildTopazOnlyFormData(f));

      if (hasTrackedKind("topaz_only")) {
        fds.forEach((fd) => topazOnlyQueue.push(fd));
        updateTopazQueueHint();
        setError("");
        return;
      }

      await postJob(fds[0]);
      for (let i = 1; i < fds.length; i++) {
        topazOnlyQueue.push(fds[i]);
      }
      updateTopazQueueHint();
    });
  }

  checkReady();
})();
