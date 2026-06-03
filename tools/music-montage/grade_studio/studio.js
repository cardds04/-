/* ════════════════════════════════════════════════════════════════
   AI 스튜디오 — 대본 / 나레이션 / 영상 생성 + 3트랙 타임라인
   · 대본: Gemini 직접 호출(generativelanguage)
   · 나레이션: sc-pink.vercel.app/api/gemini-tts (CORS open)
   · 영상: sc-pink.vercel.app/api/grok-xai (video_start/video_poll, 참조이미지)
   self-contained — grade 앱(app.js)과 분리. window.Studio = {init, show, hide}
   ════════════════════════════════════════════════════════════════ */
(() => {
  "use strict";
  const API_BASE = "https://sc-pink.vercel.app";
  const GEMINI_TEXT_MODEL = "gemini-2.5-flash";
  const LS = {
    gkey: "studio_gemini_key", xkey: "studio_xai_key",
    scripts: "studio_scripts_v1",
  };
  const $ = (sel, root = document) => root.querySelector(sel);
  const studioMode = () => document.body.classList.contains("mode-studio");
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const S = {
    inited: false,
    scripts: [],        // {id, name, text}
    narrations: [],     // {id, name, scriptId, url, blob, dur, gender}
    subtitles: [],      // {id, name, dur, cues:[{text,start,dur}]}  (나레이션과 싱크)
    videos: [],         // {id, name, url, blob, dur, prompt}  (AI 생성 영상)
    clips: [],          // {id, name, url, dur}                (불러온/드롭한 기존 영상·사진)
    music: [],          // {id, name, url, blob, dur}          (불러온 음악 파일)
    timeline: { video: [], audio: [], script: [], music: [] },  // blocks {id, assetId, kind, name, start, dur, syncTo}
    chat: [],           // 대본 모달 대화 [{role, text}]
    refImageDataUri: null,
    baseBg: null,        // 선택한 기본 배경(dataURI) — 모든 장면 일관성 참조
    pxPerSec: 36,
    playhead: 0, playing: false, _raf: 0, _wall: 0, _ph0: 0,
    curVideoBlock: null, curAudioBlock: null, curMusicBlock: null,
    aspect: "9:16",   // 기본 세로형
    sel: null,   // 마지막 선택 블록 {track, id}
    selSet: [],  // 타임라인 다중 선택 [{track, id}, ...] — 드래그(마퀴) 선택
    fileSel: [], // 파일함 다중 선택 [{kind, id}, ...]
    fill: true, panX: 50,   // 화면맞추기(cover) 기본 ON — 가로 소스를 세로로 채워 자름 + 좌우 이동
  };

  function showBusy(msg) { const b = $("#stBusy"); if (!b) return; const m = $("#stBusyMsg"); if (m) m.textContent = msg || "생성 중…"; b.hidden = false; }
  function hideBusy() { const b = $("#stBusy"); if (b) b.hidden = true; }
  function gkey() { return ($("#stGeminiKey")?.value || "").trim(); }
  function xkey() { return ($("#stXaiKey")?.value || "").trim(); }

  // ── 마크업 ───────────────────────────────────────────────────
  function buildDom() {
    const root = document.getElementById("studioRoot");
    if (!root) return;
    root.innerHTML = `
      <div class="studio-top">
        <span class="skey">🔑 Gemini <input type="password" id="stGeminiKey" placeholder="API 키" autocomplete="off" /></span>
        <span class="skey">🔑 xAI <input type="password" id="stXaiKey" placeholder="영상용(선택)" autocomplete="off" /></span>
        <span class="staspect">최종본 화면비
          <button class="asp-btn" data-asp="16:9">가로 16:9</button>
          <button class="asp-btn active" data-asp="9:16">세로 9:16</button>
        </span>
        <button class="asp-btn active" id="stFitFill" title="영상을 화면에 꽉 채움(좌우 잘림). 다시 누르면 전체 보기">↔ 화면맞추기</button>
        <span class="st-pan" id="stPanWrap" hidden>좌 <input type="range" id="stPan" min="0" max="100" value="50" /> 우</span>
        <span class="sp"></span>
        <button class="btn" id="stLoadVideo">📂 기존 영상 불러오기</button>
        <input type="file" id="stVideoFile" accept="video/*" multiple hidden />
      </div>
      <div class="studio-main">
        <div class="studio-left" id="stLeft">
          <div class="left-head">
            <span class="left-head-title">파일함 · 영상·사진·음성·음악·자막</span>
            <span class="left-head-actions">
              <span id="stFileSelCount" class="file-sel-count" hidden></span>
              <button type="button" class="btn btn-ghost" id="stFileSelAll" title="전체 선택 (Ctrl/Cmd+A)">전체선택</button>
              <button type="button" class="btn btn-ghost" id="stFileClear" title="파일함 비우기 — 전체 삭제 (Ctrl+Z 로 복구)">비우기</button>
            </span>
          </div>
          <div class="left-list" id="stLeftList"></div>
        </div>
        <div class="studio-stage" id="stStage">
          <div class="st-canvas" id="stCanvas">
            <video id="stProgram" playsinline></video>
            <img id="stProgramImg" alt="" />
            <div id="stSubtitle" class="st-subtitle" hidden></div>
          </div>
          <div class="stage-empty" id="stStageEmpty">영상 파일을 여기로 끌어다 놓거나, 왼쪽 목록·자산을 클릭하면 미리보기됩니다.<br/>아래 트랙에 끌어다 놓아 편집하세요.</div>
        </div>
        <div class="studio-panel">
          <div class="studio-subtabs">
            <button class="studio-subtab active" data-pane="script">📝 대본+나레이션</button>
            <button class="studio-subtab" data-pane="video">🎬 AI 영상</button>
          </div>
          <!-- 대본+나레이션 -->
          <div class="studio-pane active" data-pane="script">
            <button class="big-start" id="stAiScript">
              <span class="bs-emoji">✨</span>
              <span class="bs-title">AI로 대본과 자막·음성 생성</span>
              <span class="bs-sub">주제만 정하면 컨셉·대본·자막·음성까지 한 번에</span>
            </button>
            <button class="link-btn" id="stManualToggle">✍️ 또는 직접 작성하기</button>
            <div id="stManualBox" hidden>
              <textarea id="stScriptText" placeholder="대본을 직접 입력하세요."></textarea>
              <div class="pane-actions"><button class="btn" id="stSaveScript">💾 대본 저장</button></div>
            </div>
            <div class="asset-shelf">
              <span class="shelf-title">만든 결과물 (대본·음성·자막)</span>
              <div class="asset-grid" id="stScriptGrid"></div>
            </div>
          </div>
          <!-- AI 영상 -->
          <div class="studio-pane" data-pane="video">
            <button class="big-start video-start" id="stAiVideo">
              <span class="bs-emoji">🎬</span>
              <span class="bs-title">AI 영상 만들기</span>
              <span class="bs-sub">대본을 분석해 장면별로 필요한 영상을 제안해요</span>
            </button>
            <div class="asset-shelf">
              <span class="shelf-title">생성된 영상</span>
              <div class="asset-grid" id="stVideoGrid"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="studio-timeline">
        <div class="timeline-head">
          <button class="btn btn-ghost" id="stPlay" title="재생/정지 (Space)">▶</button>
          <span class="tl-time" id="stTime">00:00 / 00:00</span>
          <span style="font-size:11px;color:var(--text-dim)">아이콘·영상을 트랙의 원하는 위치에 끌어다 놓으세요. 자막을 영상 위에 놓으면 그 영상 길이에 맞춰집니다.</span>
          <span class="tl-zoom"><button class="btn btn-ghost" id="stZoomOut">−</button><button class="btn btn-ghost" id="stZoomIn">＋</button></span>
        </div>
        <div class="tl-body">
          <div class="tl-labels">
            <div class="tl-label-ruler"></div>
            <div class="track-label">📝 자막</div>
            <div class="track-label">🎬 영상</div>
            <div class="track-label">🔊 음성</div>
            <div class="track-label">🎵 음악</div>
          </div>
          <div class="tl-scroll" id="stTlScroll">
            <div class="tl-inner" id="stTlInner">
              <div class="tl-ruler" id="stRuler"></div>
              <div class="track-lane script" data-track="script"></div>
              <div class="track-lane video" data-track="video"></div>
              <div class="track-lane audio" data-track="audio"></div>
              <div class="track-lane music" data-track="music"></div>
              <div class="tl-playhead" id="stPlayhead"></div>
            </div>
          </div>
        </div>
        <audio id="stAudio"></audio>
        <audio id="stMusic" loop></audio>
      </div>

      <!-- 생성 중 오버레이 -->
      <div id="stBusy" class="st-busy" hidden title="클릭하면 닫혀요">
        <div class="st-busy-box">
          <div class="st-spinner"></div>
          <div class="st-busy-msg" id="stBusyMsg">생성 중…</div>
          <div class="st-busy-sub">수십 초 정도 걸려요. 잠시만 기다려 주세요.</div>
          <div class="st-busy-sub" style="opacity:0.7">화면을 누르면 닫힙니다 (진행 중인 작업은 계속돼요)</div>
        </div>
      </div>

      <!-- 대본 AI 마법사 -->
      <div class="studio-modal" id="stScriptModal">
        <div class="studio-modal-card wizard">
          <div class="studio-modal-head">
            <span>✨ AI 대본 만들기</span>
            <span class="wiz-dots" id="wizDots"></span>
            <button class="btn btn-ghost" data-close>✕</button>
          </div>
          <div class="studio-modal-body">
            <!-- 1) 사진/영상 첨부 -->
            <div class="wiz-step" data-step="1">
              <h3 class="wiz-h">먼저 사진이나 영상을 첨부해주세요 <span class="muted">(선택)</span></h3>
              <p class="pane-hint">시공한 공간의 사진·영상을 올리면, 다음 단계에서 그 사진을 보고 어울리는 주제를 추천해 드려요.</p>
              <div class="photo-drop-zone" id="wizRefDrop">
                <div class="pdz-inner">
                  <div class="pdz-ico">📷</div>
                  <div class="pdz-msg">사진·영상을 여기로 끌어다 놓으세요 <span class="muted">(여러 개 가능)</span></div>
                  <button type="button" class="btn" id="wizRefPick">또는 파일 선택</button>
                </div>
                <input type="file" id="wizRef" accept="image/*,video/*" multiple hidden />
              </div>
              <div class="ref-thumbs" id="wizRefThumbs"></div>
            </div>
            <!-- 2) 주제 (첨부 사진 기반 추천) -->
            <div class="wiz-step" data-step="2" hidden>
              <h3 class="wiz-h">어떤 영상을 만드실건가요?</h3>
              <p class="pane-hint">첨부한 사진을 보고 어울리는 주제를 추천해 드려요. 마음에 드는 걸 고르거나 직접 적으세요.</p>
              <button class="big-start" id="wizTopicSuggest">
                <span class="bs-emoji">💡</span>
                <span class="bs-title">사진 보고 주제 추천받기</span>
                <span class="bs-sub">첨부한 사진을 분석해 어울리는 주제를 제안해요</span>
              </button>
              <button class="link-btn" id="wizManualTopicToggle">✍️ 또는 직접 작성하기</button>
              <input type="text" id="wizTopic" placeholder="예) 30평 아파트 전체 리모델링 시공 완료" hidden />
              <div class="chip-row" id="wizTopicChips"></div>
              <button class="btn btn-ghost" id="wizTopicMore" hidden>🔄 다른 주제 보기</button>
              <div class="studio-status" id="wizStatus1"></div>
            </div>
            <!-- 3) 스타일 입력 → 대본 생성 -->
            <div class="wiz-step" data-step="3" hidden>
              <div class="wiz-topicbar" id="wizTopicBar3"></div>
              <h3 class="wiz-h">다음은 대본을 만들 예정입니다</h3>
              <p class="pane-hint">어떤 스타일로 설명할지 알려주세요.</p>
              <div class="wiz-example">예시) “우드톤의 주방을 소개하는 영상을 만들거야”</div>
              <textarea id="wizStyle" placeholder="예) 우드톤의 주방을 소개하는 영상을 만들거야"></textarea>
              <button class="big-start" id="wizGenScript">
                <span class="bs-emoji">📝</span>
                <span class="bs-title">대본 생성하기</span>
                <span class="bs-sub">알려준 스타일로 AI가 대본을 써드려요</span>
              </button>
              <div class="studio-status" id="wizStatus3"></div>
            </div>
            <!-- 4) 대본 확인/수정 → 자막·나레이션 생성 -->
            <div class="wiz-step" data-step="4" hidden>
              <h3 class="wiz-h">대본이 생성되었어요</h3>
              <p class="pane-hint">대본을 확인하고 고쳐야 할 점이 있으면 알려주시거나, 직접 고쳐주세요.</p>
              <div class="studio-status" id="wizStatus4"></div>
              <textarea id="wizScript" class="script-doc" placeholder="생성된 대본이 여기 표시됩니다."></textarea>
              <div class="revise-box">
                <label class="revise-label">✏️ 고쳐야 할 점 — 어떻게 바꿀까요?</label>
                <div class="chip-row" id="wizReviseChips"></div>
                <div class="revise-row">
                  <input type="text" id="wizRevisePrompt" placeholder="예) 더 짧고 친근하게 / 가격을 강조 / 전문가 톤으로" />
                  <button class="btn btn-primary" id="wizReviseBtn">🔄 적용 후 재생성</button>
                </div>
              </div>
              <div class="tone-section">
                <label class="revise-label">🎙️ 나레이션 스타일 — 골라보고 ▶로 미리들어보세요</label>
                <div class="tone-grid" id="wizToneGrid"></div>
                <div class="studio-status" id="wizToneStatus"></div>
              </div>
              <button class="big-start narration-go" id="wizNarration">
                <span class="bs-emoji">🎬</span>
                <span class="bs-title">자막과 나레이션 생성</span>
                <span class="bs-sub">음성·자막을 만들어 편집 화면 0초에 자동으로 넣어요</span>
              </button>
            </div>
            <!-- 5) 자막별 사진/영상 -->
            <div class="wiz-step" data-step="5" hidden>
              <h3 class="wiz-h">각 자막에 맞는 사진이나 영상이 필요합니다</h3>
              <p class="pane-hint">자막별로 사진·영상을 넣거나, 「🎬 AI 영상」으로 생성하세요. 다 넣으면 영상이 완성돼요.</p>
              <div class="studio-status" id="wizShotStatus"></div>
              <button class="btn btn-primary" id="wizGenImgAll" hidden>🖼 전체 장면 이미지 자동 생성</button>
              <div class="shot-list" id="wizShots"></div>
              <button class="big-start" id="wizFinish">
                <span class="bs-emoji">✅</span>
                <span class="bs-title">완료 — 편집 화면으로</span>
                <span class="bs-sub">타임라인에서 미세 조정하고 내보내세요</span>
              </button>
            </div>
          </div>
          <div class="studio-modal-foot">
            <button class="btn btn-ghost" id="wizBack" hidden>← 이전</button>
            <span style="flex:1"></span>
            <button class="btn btn-primary" id="wizNext">다음 →</button>
            <button class="btn btn-ghost" id="wizUse" hidden>대본만 저장</button>
          </div>
        </div>
      </div>

      <!-- 영상 AI 모달 -->
      <div class="studio-modal" id="stVideoModal">
        <div class="studio-modal-card">
          <div class="studio-modal-head"><span>🎬 영상 만들기</span><button class="btn btn-ghost" data-close>✕</button></div>
          <div class="studio-modal-body">
            <label>생성 엔진</label>
            <select id="stVideoProvider">
              <option value="grok">Grok (xAI) — 참조이미지 지원</option>
              <option value="gemini">Gemini (Veo) — 추후</option>
              <option value="fal">fal.ai — 추후</option>
            </select>
            <label>프롬프트</label>
            <textarea id="stVideoPrompt" placeholder="예) 따뜻한 햇살이 드는 거실을 천천히 패닝하는 영상"></textarea>
            <label>참조 이미지 (선택)</label>
            <input type="file" id="stRefImage" accept="image/*" />
            <img class="ref-thumb" id="stRefThumb" hidden alt="" />
            <div class="studio-status" id="stVideoStatus"></div>
          </div>
          <div class="studio-modal-foot">
            <button class="btn btn-primary" id="stVideoGen">생성</button>
          </div>
        </div>
      </div>

      <!-- 프로젝트(대본+음성+자막) 상세 -->
      <div class="studio-modal" id="stDetailModal">
        <div class="studio-modal-card wizard">
          <div class="studio-modal-head"><span id="stDetailTitle">결과물</span><button class="btn btn-ghost" data-close>✕</button></div>
          <div class="studio-modal-body">
            <div class="detail-meta" id="stDetailMeta"></div>
            <audio id="stDetailAudio" controls style="width:100%;display:none"></audio>
            <label>대본</label>
            <div class="script-doc" id="stDetailScript" style="white-space:pre-wrap"></div>
          </div>
        </div>
      </div>

      <!-- AI 영상 분석 -->
      <div class="studio-modal" id="stAnalyzeModal">
        <div class="studio-modal-card wizard" style="width:min(900px,96vw)">
          <div class="studio-modal-head"><span>🎬 AI 영상 만들기 — 대본 분석</span><button class="btn btn-ghost" data-close>✕</button></div>
          <div class="studio-modal-body">
            <div id="anaPick">
              <h3 class="wiz-h">어떤 대본의 영상을 만들까요?</h3>
              <p class="pane-hint">먼저 만든 대본을 고르면, 문장별로 어떤 영상이 필요한지 분석해 제안해 드려요.</p>
              <div class="concept-list" id="anaProjects"></div>
            </div>
            <div id="anaResult" hidden>
              <div class="ana-top">
                <div class="studio-status" id="anaStatus"></div>
                <div class="ana-top-btns">
                  <button class="btn btn-primary" id="anaGenImgAll" hidden>🖼 전체 장면 이미지 생성</button>
                  <button class="btn" id="anaGenAll" hidden>🎬 전부 AI 영상</button>
                </div>
              </div>
              <div class="ana-bible" id="anaBible" hidden>
                <div class="ana-bible-head">🎨 통일 배경 · 스타일 가이드 <span class="muted">(모든 컷에 일관 적용)</span></div>
                <div class="ana-bible-body" id="anaBibleBody"></div>
              </div>
              <div class="ana-bg" id="anaBg" hidden>
                <div class="ana-bg-head">🖼 기본 배경 고르기 <span class="muted">(고른 배경을 모든 장면의 참조 사진으로 적용해 일관성 유지)</span>
                  <button class="btn btn-sm" id="anaBgGen">🎨 배경 3개 제안</button>
                </div>
                <div class="ana-bg-grid" id="anaBgGrid"></div>
              </div>
              <div class="shot-list" id="anaShots"></div>
            </div>
          </div>
          <div class="studio-modal-foot">
            <button class="btn btn-ghost" id="anaBack" hidden>← 다른 대본</button>
          </div>
        </div>
      </div>`;
  }

  // ── 초기화 ───────────────────────────────────────────────────
  function init() {
    if (S.inited) return;
    const root = document.getElementById("studioRoot");
    if (!root) return;
    buildDom();
    S.inited = true;

    // 키 복원
    $("#stGeminiKey").value = localStorage.getItem(LS.gkey) || "";
    $("#stXaiKey").value = localStorage.getItem(LS.xkey) || "";
    $("#stGeminiKey").addEventListener("change", (e) => localStorage.setItem(LS.gkey, e.target.value.trim()));
    $("#stXaiKey").addEventListener("change", (e) => localStorage.setItem(LS.xkey, e.target.value.trim()));

    // 대본 복원
    try { S.scripts = JSON.parse(localStorage.getItem(LS.scripts) || "[]"); } catch (_) { S.scripts = []; }

    // 서브탭
    root.querySelectorAll(".studio-subtab").forEach((b) => {
      b.addEventListener("click", () => {
        root.querySelectorAll(".studio-subtab").forEach((x) => x.classList.toggle("active", x === b));
        root.querySelectorAll(".studio-pane").forEach((p) => p.classList.toggle("active", p.dataset.pane === b.dataset.pane));
      });
    });

    // 대본
    $("#stSaveScript").addEventListener("click", saveScriptFromText);
    $("#stManualToggle").addEventListener("click", () => {
      const box = $("#stManualBox"); box.hidden = !box.hidden;
    });
    $("#stAiScript").addEventListener("click", openWizard);
    $("#wizNext").addEventListener("click", wizNext);
    $("#wizBack").addEventListener("click", wizBack);
    $("#wizUse").addEventListener("click", wizUse);
    $("#wizNarration").addEventListener("click", wizMakeNarration);
    $("#wizTopicSuggest").addEventListener("click", wizSuggestTopics);
    $("#wizTopicMore").addEventListener("click", wizSuggestTopics);
    $("#wizManualTopicToggle").addEventListener("click", () => {
      const inp = $("#wizTopic"); inp.hidden = false; inp.focus();
    });
    $("#wizRef").addEventListener("change", wizOnRef);
    $("#wizRefPick").addEventListener("click", () => $("#wizRef").click());
    const dz = $("#wizRefDrop");
    dz.addEventListener("dragover", (e) => { if (Array.from(e.dataTransfer.types || []).includes("Files")) { e.preventDefault(); dz.classList.add("drop-hot"); } });
    dz.addEventListener("dragleave", (e) => { if (e.target === dz) dz.classList.remove("drop-hot"); });
    dz.addEventListener("drop", (e) => {
      const fs = Array.from(e.dataTransfer.files || []).filter((x) => /^(image|video)\//.test(x.type));
      if (fs.length) { e.preventDefault(); e.stopPropagation(); dz.classList.remove("drop-hot"); fs.forEach(setRefFromFile); }
    });
    $("#wizGenScript").addEventListener("click", wizGenScript);
    $("#wizGenImgAll").addEventListener("click", wizGenAllImages);
    $("#wizFinish").addEventListener("click", wizFinish);
    $("#wizReviseBtn").addEventListener("click", () => wizRevise($("#wizRevisePrompt").value.trim()));
    renderReviseChips();
    loadTones();
    // AI 영상 — 대본 분석 워크플로우
    $("#stAiVideo").addEventListener("click", openAnalyze);
    $("#anaBack").addEventListener("click", openAnalyze);
    $("#anaGenAll").addEventListener("click", genAllShots);
    $("#anaGenImgAll").addEventListener("click", genAllImages);
    $("#anaBgGen").addEventListener("click", proposeBackgrounds);
    $("#stVideoGen").addEventListener("click", genVideo);
    $("#stRefImage").addEventListener("change", onRefImage);
    // 기존 영상
    $("#stLoadVideo").addEventListener("click", () => $("#stVideoFile").click());
    $("#stVideoFile").addEventListener("change", onLoadVideo);
    // 화면비
    root.querySelectorAll(".asp-btn[data-asp]").forEach((b) => b.addEventListener("click", () => {
      S.aspect = b.dataset.asp;
      root.querySelectorAll(".asp-btn[data-asp]").forEach((x) => x.classList.toggle("active", x === b));
      fitCanvas();
    }));
    window.addEventListener("resize", () => { if (document.body.classList.contains("mode-studio")) fitCanvas(); });
    // 화면맞추기(채우기) + 좌우 이동
    $("#stFitFill").addEventListener("click", () => { S.fill = !S.fill; applyCanvasFit(); });
    $("#stPan").addEventListener("input", (e) => { S.panX = +e.target.value; applyCanvasFit(); });
    // 줌
    $("#stZoomIn").addEventListener("click", () => { S.pxPerSec = Math.min(120, S.pxPerSec * 1.3); renderTimeline(); });
    $("#stZoomOut").addEventListener("click", () => { S.pxPerSec = Math.max(8, S.pxPerSec / 1.3); renderTimeline(); });
    // 재생 / 시킹 — 눈금자를 클릭하거나 드래그하면 플레이헤드가 따라 움직임 (스크럽)
    $("#stPlay").addEventListener("click", togglePlay);
    const rulerScrub = (e) => {
      const ruler = $("#stRuler"); const rect = ruler.getBoundingClientRect();
      const wasPlaying = S.playing; if (wasPlaying) pause();
      const to = (ev) => seek(Math.max(0, (ev.clientX - rect.left) / S.pxPerSec));
      to(e);
      const up = () => { document.removeEventListener("mousemove", to); document.removeEventListener("mouseup", up); };
      document.addEventListener("mousemove", to); document.addEventListener("mouseup", up);
      e.preventDefault();
    };
    $("#stRuler").addEventListener("mousedown", rulerScrub);
    $("#stPlayhead").addEventListener("mousedown", rulerScrub);
    document.addEventListener("keydown", (e) => {
      if (!document.body.classList.contains("mode-studio")) return;
      const t = e.target.tagName;
      if (t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
      // 실행 취소 (Ctrl/Cmd+Z) — 입력칸 밖에서 타임라인/파일함 편집을 되돌림
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.code === "KeyZ" || e.key === "z" || e.key === "Z")) {
        e.preventDefault(); undo(); return;
      }
      // 전체 선택 (Ctrl/Cmd+A) — 파일함 모든 항목 선택
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyA" || e.key === "a" || e.key === "A")) {
        e.preventDefault(); selectAllFiles(); return;
      }
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
      else if (e.code === "KeyQ") { e.preventDefault(); trimVideo("front"); }
      else if (e.code === "KeyW") { e.preventDefault(); trimVideo("back"); }
      else if (e.code === "Delete" || e.code === "Backspace") {
        e.preventDefault();
        if (S.fileSel.length) deleteFileSelected();   // 파일함 선택이 있으면 그쪽 우선
        else deleteSelected();
      }
    });
    // 생성중 오버레이 — 클릭하면 닫힘 (안전장치)
    $("#stBusy").addEventListener("click", hideBusy);
    // 모달 닫기
    root.querySelectorAll(".studio-modal [data-close]").forEach((b) =>
      b.addEventListener("click", (e) => e.target.closest(".studio-modal").classList.remove("open")));
    root.querySelectorAll(".studio-modal").forEach((m) =>
      m.addEventListener("click", (e) => { if (e.target === m) m.classList.remove("open"); }));

    // 트랙 드롭 (내부 자산 카드). 파일 드롭은 모듈 로드 시점의 capture 핸들러가 처리.
    root.querySelectorAll(".track-lane").forEach(setupLaneDrop);

    // 타임라인 빈 공간 드래그 → 여러 유닛 한꺼번에 선택 (마퀴)
    setupMarquee();
    // 파일함 드래그 선택 + 전체선택/비우기 버튼
    setupFileMarquee();
    const btnSelAll = $("#stFileSelAll"); if (btnSelAll) btnSelAll.addEventListener("click", selectAllFiles);
    const btnClear = $("#stFileClear"); if (btnClear) btnClear.addEventListener("click", clearFileBox);

    // 파일함(왼쪽) — 모든 파일을 끌어다 넣을 수 있게 하이라이트
    const leftBox = $("#stLeft");
    if (leftBox) {
      leftBox.addEventListener("dragover", (e) => { if (Array.from(e.dataTransfer.types || []).includes("Files")) { e.preventDefault(); leftBox.classList.add("drop-hot"); } });
      leftBox.addEventListener("dragleave", (e) => { if (!leftBox.contains(e.relatedTarget)) leftBox.classList.remove("drop-hot"); });
      leftBox.addEventListener("drop", () => leftBox.classList.remove("drop-hot"));
    }

    // 복원 전 초기 렌더가 빈 상태를 저장하지 않도록 가드
    _restoring = true;
    renderScripts(); renderVideos(); renderClips(); renderTimeline();

    // 작업 자동 복원 (이전에 진행하던 내용) — 끝나면 _restoring 해제
    restoreProject().catch((e) => { console.warn("[studio] 복원 실패", e); _restoring = false; });

    // 나갈 때 마지막 상태 저장
    window.addEventListener("pagehide", () => { try { saveProject(); } catch (_) {} });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") { try { saveProject(); } catch (_) {} }
    });
  }

  function show() { init(); setTimeout(fitCanvas, 30); }
  function hide() {}
  function fitCanvas() {
    const stage = $("#stStage"), c = $("#stCanvas");
    if (!stage || !c) return;
    const [aw, ah] = S.aspect === "9:16" ? [9, 16] : [16, 9];
    const W = stage.clientWidth || 640, H = stage.clientHeight || 360;
    let w = W, h = w * ah / aw;
    if (h > H) { h = H; w = h * aw / ah; }
    c.style.width = Math.floor(w) + "px";
    c.style.height = Math.floor(h) + "px";
    applyCanvasFit();
  }
  function applyCanvasFit() {
    const v = $("#stProgram"); if (!v) return;
    v.classList.toggle("fill", S.fill);
    v.style.objectPosition = S.fill ? `${S.panX}% center` : "center";
    const im = $("#stProgramImg");
    if (im) { im.classList.toggle("fill", S.fill); im.style.objectPosition = S.fill ? `${S.panX}% center` : "center"; }
    const btn = $("#stFitFill"); if (btn) btn.classList.toggle("active", S.fill);
    const pw = $("#stPanWrap"); if (pw) pw.hidden = !S.fill;
    const pan = $("#stPan"); if (pan) pan.value = S.panX;
    scheduleSave();
  }

  // ── 자동 저장/복원 (IndexedDB) — 작업 도중 나가도 다시 이어서 ────
  const IDB_DB = "gradeStudioDB", IDB_STORE = "kv", PROJECT_KEY = "project_v1";
  let _idbP = null;
  function idb() {
    if (_idbP) return _idbP;
    _idbP = new Promise((res, rej) => {
      let req; try { req = indexedDB.open(IDB_DB, 1); } catch (e) { rej(e); return; }
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE); };
      req.onsuccess = () => res(req.result);
      req.onerror = () => rej(req.error);
    });
    return _idbP;
  }
  function idbSet(key, val) { return idb().then((db) => new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, "readwrite"); tx.objectStore(IDB_STORE).put(val, key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); })); }
  function idbGet(key) { return idb().then((db) => new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, "readonly"); const r = tx.objectStore(IDB_STORE).get(key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); }
  function idbDel(key) { return idb().then((db) => new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, "readwrite"); tx.objectStore(IDB_STORE).delete(key); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); })); }
  function idbKeys() { return idb().then((db) => new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, "readonly"); const r = tx.objectStore(IDB_STORE).getAllKeys(); r.onsuccess = () => res(r.result || []); r.onerror = () => rej(r.error); })); }

  let _saveTimer = 0, _restoring = false;
  function scheduleSave() { if (_restoring || !S.inited) return; clearTimeout(_saveTimer); _saveTimer = setTimeout(saveProject, 700); }
  function blobFromUrl(url) { return fetch(url).then((r) => r.blob()).catch(() => null); }
  async function saveProject() {
    if (_restoring) return;
    try {
      const referenced = new Set();
      // 미디어 blob 저장 (한 번만; _stored 로 중복 방지)
      for (const n of S.narrations) {
        const k = "blob_" + n.id; referenced.add(k);
        if (n.blob && !n._stored) { try { await idbSet(k, n.blob); n._stored = true; } catch (_) {} }
      }
      for (const c of S.clips) {
        if (c.isImage) continue;                 // 이미지(dataURI)는 JSON 으로 보관
        const k = "blob_" + c.id; referenced.add(k);
        if (!c._stored && typeof c.url === "string" && c.url.startsWith("blob:")) {
          const b = await blobFromUrl(c.url); if (b) { try { await idbSet(k, b); c._stored = true; } catch (_) {} }
        }
      }
      for (const m of S.music) {
        const k = "blob_" + m.id; referenced.add(k);
        if (!m._stored && typeof m.url === "string" && m.url.startsWith("blob:")) {
          const b = await blobFromUrl(m.url); if (b) { try { await idbSet(k, b); m._stored = true; } catch (_) {} }
        }
      }
      const state = {
        v: 1, ts: Date.now(),
        aspect: S.aspect, fill: S.fill, panX: S.panX,
        scripts: S.scripts,
        narrations: S.narrations.map((n) => ({ id: n.id, projectId: n.projectId, name: n.name, dur: n.dur, gender: n.gender, cues: n.cues })),
        subtitles: S.subtitles.map((s) => ({ id: s.id, name: s.name, dur: s.dur, cues: s.cues })),
        videos: S.videos.map((v) => ({ id: v.id, name: v.name, dur: v.dur, prompt: v.prompt || "", url: v.url, panX: v.panX })),
        clips: S.clips.map((c) => ({ id: c.id, name: c.name, dur: c.dur, isImage: !!c.isImage, url: c.isImage ? c.url : null, panX: c.panX })),
        music: S.music.map((m) => ({ id: m.id, name: m.name, dur: m.dur })),
        timeline: S.timeline,
      };
      await idbSet(PROJECT_KEY, state);
      // 더 이상 참조 안 되는 blob 정리
      try { const keys = await idbKeys(); for (const k of keys) { if (typeof k === "string" && k.startsWith("blob_") && !referenced.has(k)) await idbDel(k); } } catch (_) {}
    } catch (_) { /* 저장 실패는 조용히 무시 */ }
  }
  async function restoreProject() {
    try {
      let state = null;
      try { state = await idbGet(PROJECT_KEY); } catch (_) { return; }
      if (!state) return;
      S.aspect = state.aspect || "9:16";
      S.fill = state.fill !== false;
      S.panX = (typeof state.panX === "number") ? state.panX : 50;
      if (Array.isArray(state.scripts)) S.scripts = state.scripts;
      // 나레이션 — 저장된 blob → object URL 재생성
      const nars = [];
      for (const n of (state.narrations || [])) {
        let blob = null, url = null;
        try { blob = await idbGet("blob_" + n.id); } catch (_) {}
        if (blob) url = URL.createObjectURL(blob);
        nars.push({ ...n, blob: blob || null, url, _stored: !!blob });
      }
      S.narrations = nars;
      S.videos = (state.videos || []).map((v) => ({ ...v }));
      // 클립 — 이미지(dataURI)는 그대로, 업로드 영상은 blob → object URL
      const clips = [];
      for (const c of (state.clips || [])) {
        if (c.isImage) { if (c.url) clips.push({ ...c, _stored: false }); continue; }
        let url = c.url || null, b = null;
        try { b = await idbGet("blob_" + c.id); } catch (_) {}
        if (b) url = URL.createObjectURL(b);
        if (url) clips.push({ ...c, url, _stored: !!b });
      }
      S.clips = clips;
      // 음악 — 저장된 blob → object URL 재생성
      const music = [];
      for (const m of (state.music || [])) {
        let b = null; try { b = await idbGet("blob_" + m.id); } catch (_) {}
        if (b) music.push({ ...m, url: URL.createObjectURL(b), blob: b, _stored: true });
      }
      S.music = music;
      if (Array.isArray(state.subtitles)) S.subtitles = state.subtitles.map((s) => ({ ...s }));
      if (state.timeline && state.timeline.video) { S.timeline = state.timeline; if (!Array.isArray(S.timeline.music)) S.timeline.music = []; }
      // UI 반영
      const root = document.getElementById("studioRoot");
      if (root) root.querySelectorAll(".asp-btn[data-asp]").forEach((x) => x.classList.toggle("active", x.dataset.asp === S.aspect));
      renderScripts(); renderVideos(); renderClips(); renderSubtitles(); renderNarrations(); renderTimeline();
      fitCanvas();
      const cnt = S.timeline.video.length + S.timeline.audio.length + S.timeline.script.length + (S.timeline.music ? S.timeline.music.length : 0);
      if (cnt) console.log(`[studio] 작업 복원됨 — 블록 ${cnt}개`);
    } catch (_) { /* 복원 실패 시 빈 상태로 시작 */ }
    finally { _restoring = false; }
  }

  // ── 대본 ─────────────────────────────────────────────────────
  function persistScripts() {
    // 참조이미지(dataURI)는 용량이 커 localStorage 에 넣지 않음 (세션 메모리에만 유지)
    try { localStorage.setItem(LS.scripts, JSON.stringify(S.scripts.map((s) => ({ id: s.id, name: s.name, text: s.text, topic: s.topic || "", concept: s.concept || "", toneName: s.toneName || "" })))); }
    catch (_) {}
  }
  function saveScriptFromText() {
    const text = $("#stScriptText").value.trim();
    if (!text) return alert("대본 내용이 비어 있습니다.");
    const name = text.replace(/\s+/g, " ").slice(0, 18) || "대본";
    S.scripts.unshift({ id: uid(), name, text });
    persistScripts(); renderScripts();
  }
  // 대본·음성·자막을 하나의 번들 아이콘으로 (음성 있으면 🎬, 없으면 📝)
  function renderScripts() {
    const grid = $("#stScriptGrid"); if (!grid) return;
    grid.innerHTML = "";
    S.scripts.forEach((p) => {
      const hasN = !!p.narrationId;
      const c = document.createElement("div");
      c.className = "asset-card"; c.draggable = true;
      c.dataset.assetId = hasN ? p.narrationId : p.id;
      c.dataset.kind = hasN ? "audio" : "script";
      c.innerHTML = `<span class="asset-x" title="삭제">×</span>
        <div><span class="asset-ico">${hasN ? "🎬" : "📝"}</span> <span class="asset-name"></span></div>
        <div class="asset-sub">${p.text.length}자 · ${hasN ? "🔊자막포함" : "음성없음"}</div>`;
      c.querySelector(".asset-name").textContent = p.name;
      c.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", JSON.stringify({ assetId: c.dataset.assetId, kind: c.dataset.kind })));
      c.addEventListener("click", (e) => { if (e.target.classList.contains("asset-x")) return; openProjectDetail(p); });
      c.querySelector(".asset-x").addEventListener("click", (e) => {
        e.stopPropagation();
        S.scripts = S.scripts.filter((x) => x.id !== p.id);
        if (p.narrationId) S.narrations = S.narrations.filter((n) => n.id !== p.narrationId);
        persistScripts(); renderScripts();
      });
      grid.appendChild(c);
    });
    renderClips();
    scheduleSave();
  }
  function openProjectDetail(p) {
    const n = p.narrationId ? S.narrations.find((x) => x.id === p.narrationId) : null;
    $("#stDetailTitle").textContent = p.name;
    const meta = [];
    if (p.topic) meta.push(`<div><b>주제</b> ${esc(p.topic)}</div>`);
    if (p.concept) meta.push(`<div><b>컨셉</b> ${esc(p.concept)}</div>`);
    if (p.toneName) meta.push(`<div><b>나레이션 스타일</b> ${esc(p.toneName)}</div>`);
    if (n) meta.push(`<div><b>음성</b> ${(n.dur || 0).toFixed(1)}초 · ${n.gender === "male" ? "남성" : "여성"} · 자막 ${n.cues.length}개</div>`);
    $("#stDetailMeta").innerHTML = meta.join("") || "<div class='pane-hint'>아직 정보가 없어요.</div>";
    $("#stDetailScript").textContent = p.text;
    const ap = $("#stDetailAudio");
    if (n) { ap.src = n.url; ap.style.display = "block"; } else { ap.removeAttribute("src"); ap.style.display = "none"; }
    $("#stDetailModal").classList.add("open");
  }

  // ── Gemini 텍스트 헬퍼 ───────────────────────────────────────
  async function geminiText(userPrompt, systemPrompt, imageDataUri) {
    const key = gkey();
    if (!key) throw new Error("상단에 Gemini API 키를 먼저 입력하세요");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const parts = [{ text: userPrompt }];
    const imgs = Array.isArray(imageDataUri) ? imageDataUri : (imageDataUri ? [imageDataUri] : []);
    imgs.forEach((d) => { const m = /^data:(.*?);base64,(.*)$/.exec(d); if (m) parts.push({ inlineData: { mimeType: m[1], data: m[2] } }); });
    const body = { contents: [{ role: "user", parts }] };
    if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) throw new Error(j?.error?.message || `HTTP ${res.status}`);
    const out = (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
    if (!out) throw new Error("빈 응답");
    return out;
  }
  function parseLines(text, max) {
    return text.split(/\r?\n/).map((l) => l.replace(/^\s*[\d).\-•*]+\s*/, "").trim())
      .filter(Boolean).slice(0, max || 99);
  }

  // ── 주제 풀 (AI 없이 내장) — 인테리어 시공업자 홍보 시점 ──────
  const TOPIC_POOL = (() => {
    const TYPES = ["30평 아파트", "24평 아파트", "18평 아파트", "구축 아파트", "신축 빌라", "단독주택", "전원주택", "상가", "사무실", "원룸", "오피스텔", "카페"];
    const SPACES = ["거실", "주방", "욕실", "안방", "현관", "드레스룸", "아이방", "베란다·발코니", "서재", "다용도실", "주방+거실", "복도"];
    const ANGLES = ["비포 & 애프터", "완공 공간 투어", "시공 과정 타임랩스", "디테일 클로즈업", "고객 후기 영상", "이렇게 바뀌었어요", "시공 포인트 3가지", "맞춤 수납 아이디어", "조명으로 분위기 바꾸기", "작은 평수 넓어 보이게"];
    const out = [];
    TYPES.forEach((t) => ANGLES.forEach((a) => out.push(`${t} ${a}`)));        // 120
    SPACES.forEach((s) => ANGLES.slice(0, 6).forEach((a) => out.push(`${s} ${a}`))); // 72
    [
      "철거부터 완공까지, 한 달의 기록", "예산별 인테리어 가성비 비교", "하자 없는 마감, 디테일이 다릅니다",
      "시공 전 꼭 확인할 체크리스트", "곰팡이·누수 잡은 욕실 리모델링", "오래된 집이 호텔처럼", "반려동물과 사는 집 시공기",
      "좁은 현관 수납 200% 활용", "주방 동선 싹 바꾼 리모델링", "전세집도 가능한 부분 시공",
    ].forEach((x) => out.push(x));
    return out;
  })();
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ── 대본 AI 마법사 ───────────────────────────────────────────
  let TONES = [];          // /tts_tones.json 의 tones
  let PREVIEW_TEXT = "안녕하세요, 인테리어 전문가 땡땡이입니다. 오늘 소개해 드릴 곳은요,";
  let _previewAudio = null;
  const WIZ = { step: 1, topic: "", refImages: [], refVideos: [], style: "", topicPool: [], topicIdx: 0, tone: null };

  async function loadTones() {
    try {
      const j = await (await fetch("/tts_tones.json")).json();
      TONES = j.tones || []; if (j.previewText) PREVIEW_TEXT = j.previewText;
    } catch (_) { TONES = []; }
    renderToneGrid();
  }
  function renderToneGrid() {
    const grid = $("#wizToneGrid"); if (!grid) return;
    grid.innerHTML = "";
    TONES.forEach((t) => {
      const card = document.createElement("div");
      card.className = "tone-card" + (WIZ.tone && WIZ.tone.id === t.id ? " sel" : "");
      card.innerHTML = `<button class="tone-play" title="미리듣기">▶</button><span class="tone-name"></span>`;
      card.querySelector(".tone-name").textContent = t.name;
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("tone-play")) return;
        WIZ.tone = t;
        grid.querySelectorAll(".tone-card.sel").forEach((x) => x.classList.remove("sel"));
        card.classList.add("sel");
        $("#wizToneStatus").textContent = `선택됨: ${t.name}`;
      });
      card.querySelector(".tone-play").addEventListener("click", (e) => { e.stopPropagation(); playTone(t, e.target); });
      grid.appendChild(card);
    });
  }
  async function playTone(tone, btn) {
    const st = $("#wizToneStatus");
    const url = `/tts_samples/tone_${tone.id}.wav`;
    if (_previewAudio) { try { _previewAudio.pause(); } catch (_) {} }
    // 캐시 확인
    let exists = false;
    try { exists = (await fetch(url, { method: "HEAD" })).ok; } catch (_) {}
    if (!exists) {
      const key = gkey();
      if (!key) { st.textContent = "미리듣기는 상단 Gemini 키가 필요해요 (한 번 생성 후 저장됩니다)"; return; }
      btn.textContent = "⏳"; st.textContent = `${tone.name} 샘플 생성 중…`;
      try {
        const res = await fetch(`${API_BASE}/api/gemini-tts`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script: PREVIEW_TEXT, voiceGender: tone.gender, styleHint: tone.style, apiKey: key }),
        });
        const j = await res.json();
        if (!res.ok || !j.audioBase64) throw new Error(j.message || "생성 실패");
        await fetch("/api/tts_sample", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: tone.id, audioBase64: j.audioBase64 }) });
        st.textContent = `${tone.name} 재생 중`;
      } catch (e) { btn.textContent = "▶"; st.textContent = "실패: " + e.message; return; }
      btn.textContent = "▶";
    } else { st.textContent = `${tone.name} 재생 중`; }
    _previewAudio = new Audio(url + "?t=" + Date.now()); _previewAudio.play().catch(() => {});
  }
  function openWizard() {
    WIZ.step = 1; WIZ.topic = ""; WIZ.refImages = []; WIZ.refVideos = []; WIZ.style = "";
    WIZ.topicPool = []; WIZ.topicIdx = 0; WIZ.tone = null;
    renderToneGrid(); $("#wizToneStatus") && ($("#wizToneStatus").textContent = "");
    $("#wizTopic").value = ""; $("#wizTopic").hidden = true; $("#wizTopicChips").innerHTML = ""; $("#wizStatus1").textContent = "";
    $("#wizTopicMore").hidden = true;
    $("#wizRefThumbs").innerHTML = ""; $("#wizRefDrop").classList.remove("has-img"); $("#wizRef").value = ""; $("#wizScript").value = "";
    $("#wizStyle").value = ""; $("#wizStatus3").textContent = ""; $("#wizStatus4").textContent = "";
    $("#wizShots").innerHTML = ""; $("#wizShotStatus").textContent = ""; $("#wizGenImgAll").hidden = true;
    gotoStep(1);
    $("#stScriptModal").classList.add("open");
  }
  function updateTopicBars() {
    const html = WIZ.topic ? `🎯 선택한 주제: <b>${esc(WIZ.topic)}</b>` : "";
    const el = $("#wizTopicBar3"); if (el) el.innerHTML = html;
  }
  function gotoStep(n) {
    WIZ.step = n;
    document.querySelectorAll("#stScriptModal .wiz-step").forEach((el) => { el.hidden = (+el.dataset.step !== n); });
    $("#wizBack").hidden = (n === 1);
    $("#wizNext").hidden = (n >= 3);          // 3·4·5 단계는 각자의 큰 버튼으로 진행
    $("#wizUse").hidden = (n !== 4);          // 대본 단계에서만 '대본만 저장' 허용
    if (n === 3) updateTopicBars();
    // 진행 점 (5단계)
    const dots = [1, 2, 3, 4, 5].map((i) => `<span class="wiz-dot${i === n ? " on" : ""}${i < n ? " done" : ""}"></span>`).join("");
    $("#wizDots").innerHTML = dots;
  }
  function wizBack() { if (WIZ.step > 1) gotoStep(WIZ.step - 1); }
  async function wizNext() {
    if (WIZ.step === 1) {
      gotoStep(2);
      // 사진이 있으면 자동으로 사진 기반 추천 시작 (아직 추천 전이면)
      if (WIZ.refImages.length && !$("#wizTopicChips").children.length) wizSuggestTopics();
    } else if (WIZ.step === 2) {
      WIZ.topic = ($("#wizTopic").value.trim()) || WIZ.topic;
      if (!WIZ.topic) { $("#wizStatus1").textContent = "주제를 추천받아 고르거나, 직접 작성하기로 입력하세요."; return; }
      gotoStep(3);
    }
  }
  // 스텝3: 스타일 확정 → 대본 생성 → 스텝4
  async function wizGenScript() {
    WIZ.style = $("#wizStyle").value.trim();
    if (!WIZ.style) { $("#wizStatus3").textContent = "어떤 스타일로 설명할지 적어주세요."; return; }
    gotoStep(4);
    await genScript();
  }
  // 사진이 있으면 AI가 사진을 보고 주제 추천, 없으면 내장 풀에서 추천
  async function wizSuggestTopics() {
    if (WIZ.refImages.length) { await genTopicsFromPhotos(); return; }
    if (!WIZ.topicPool.length) { WIZ.topicPool = shuffle(TOPIC_POOL); WIZ.topicIdx = 0; }
    else { WIZ.topicIdx = (WIZ.topicIdx + 6) % WIZ.topicPool.length; }
    const topics = [];
    for (let i = 0; i < 6; i++) topics.push(WIZ.topicPool[(WIZ.topicIdx + i) % WIZ.topicPool.length]);
    renderTopicCards(topics);
    $("#wizStatus1").textContent = "마음에 드는 주제를 누르거나, 「🔄 다른 주제」로 다른 걸 보세요. (사진을 첨부하면 사진 기반 추천도 가능)";
  }
  // 첨부 사진을 분석해 어울리는 주제 6개 추천
  async function genTopicsFromPhotos() {
    const st = $("#wizStatus1");
    st.textContent = "사진을 보고 주제를 추천하는 중…"; $("#wizTopicMore").hidden = true;
    $("#wizTopicSuggest").disabled = true; showBusy("💡 사진 분석 후 주제 추천 중…");
    try {
      const out = await geminiText(
        `인테리어 시공업자가 시공을 끝낸 뒤 홍보용 세로형 숏폼 영상을 만들려고 해. 첨부된 시공 공간 사진 ${WIZ.refImages.length}장을 보고, 이 공간을 홍보할 영상 주제 6개를 추천해줘. 사진에 실제로 보이는 공간·자재·색감·분위기를 근거로 구체적으로. 각 줄에 주제 하나씩, 번호·기호 없이.`,
        "너는 인테리어 홍보 영상 기획자야. 한국어로, 첨부 사진을 근거로 구체적인 주제를 제안해.",
        WIZ.refImages);
      const topics = parseLines(out, 6);
      if (!topics.length) throw new Error("추천 결과가 비었어요");
      renderTopicCards(topics);
      $("#wizTopicMore").hidden = false;
      st.textContent = "마음에 드는 주제를 누르거나, 「🔄 다른 주제」로 다시 추천받으세요.";
    } catch (e) { st.textContent = "추천 실패: " + e.message + " (직접 작성하기로 입력해도 돼요)"; }
    finally { $("#wizTopicSuggest").disabled = false; hideBusy(); }
  }
  function renderTopicCards(topics) {
    const box = $("#wizTopicChips"); const st = $("#wizStatus1");
    box.innerHTML = "";
    topics.forEach((t, i) => {
      const card = document.createElement("button");
      card.className = "topic-card";
      card.innerHTML = `<span class="tc-num">${i + 1}</span><span class="tc-text"></span><span class="tc-go">→</span>`;
      card.querySelector(".tc-text").textContent = t;
      card.addEventListener("click", () => {
        WIZ.topic = t; $("#wizTopic").value = t;
        box.querySelectorAll(".topic-card.sel").forEach((x) => x.classList.remove("sel"));
        card.classList.add("sel");
        st.textContent = `선택됨 ✓ "${t}" — 「다음」을 누르세요.`;
      });
      box.appendChild(card);
    });
    $("#wizTopicMore").hidden = false;
  }
  function wizOnRef(e) { Array.from(e.target.files || []).forEach(setRefFromFile); }
  function setRefFromFile(f) {
    if (!f) return;
    if (/^image\//.test(f.type)) {
      const r = new FileReader();
      r.onload = () => { WIZ.refImages.push(r.result); renderRefThumbs(); };
      r.readAsDataURL(f);
    } else if (/^video\//.test(f.type)) {
      // 첨부 영상 → 편집용 클립(S.clips)으로 등록, 썸네일 목록에도 표시
      addClip(f, { silent: true }).then((clip) => { if (clip) { WIZ.refVideos.push({ id: clip.id, name: clip.name, url: clip.url }); renderRefThumbs(); } });
    }
  }
  function renderRefThumbs() {
    const box = $("#wizRefThumbs"); if (!box) return;
    box.innerHTML = "";
    WIZ.refImages.forEach((src, i) => {
      const w = document.createElement("div");
      w.className = "ref-thumb-item";
      w.innerHTML = `<img src="${src}" alt=""><span class="rt-x" title="삭제">×</span>`;
      w.querySelector(".rt-x").addEventListener("click", () => { WIZ.refImages.splice(i, 1); renderRefThumbs(); });
      box.appendChild(w);
    });
    WIZ.refVideos.forEach((v, i) => {
      const w = document.createElement("div");
      w.className = "ref-thumb-item ref-thumb-vid";
      w.innerHTML = `<video src="${v.url}" muted></video><span class="rt-tag">🎬</span><span class="rt-x" title="삭제">×</span>`;
      w.querySelector(".rt-x").addEventListener("click", () => {
        S.clips = S.clips.filter((x) => x.id !== v.id); renderClips();
        WIZ.refVideos.splice(i, 1); renderRefThumbs();
      });
      box.appendChild(w);
    });
    $("#wizRefDrop").classList.toggle("has-img", (WIZ.refImages.length + WIZ.refVideos.length) > 0);
  }
  async function genScript() {
    const ta = $("#wizScript"); const st = $("#wizStatus4");
    ta.value = ""; st.textContent = "대본 생성 중…"; showBusy("📝 대본 생성 중…");
    try {
      const styleLine = WIZ.style ? `\n원하는 스타일/설명 방향: "${WIZ.style}"` : "";
      const out = await geminiText(
        `인테리어 시공업자가 시공을 끝낸 공간을 홍보하는 세로형(9:16) 숏폼 영상이야.\n주제: "${WIZ.topic}"${styleLine}${WIZ.refImages.length ? `\n첨부된 사진 ${WIZ.refImages.length}장(시공 공간)을 참고해줘.` : ""}\n이 영상에 어울리는 한국어 나레이션 대본을 작성해줘. 시공 품질·디테일·신뢰감이 드러나고 잠재 고객의 문의로 이어지도록. 30초 내외, 자연스럽게 읽히는 문장으로. 설명·머리말 없이 대본 본문만.`,
        "너는 인테리어 시공업체의 홍보 영상 전문 대본 작가야.",
        WIZ.refImages);
      ta.value = out;
      st.textContent = "대본이 생성되었어요. 확인하고 고칠 점을 적거나 직접 수정한 뒤, 아래 「자막과 나레이션 생성」을 눌러주세요.";
      renderReviseChips();
    } catch (e) { st.textContent = "실패: " + e.message; }
    finally { hideBusy(); }
  }
  function renderReviseChips() {
    const box = $("#wizReviseChips"); if (!box || box.dataset.done) return;
    box.dataset.done = "1";
    ["더 짧게", "더 친근하게", "더 전문적으로", "감성적으로", "핵심만 간단히", "시공 디테일 강조"].forEach((t) => {
      const c = document.createElement("button"); c.className = "topic-chip"; c.textContent = t;
      c.addEventListener("click", () => { $("#wizRevisePrompt").value = t; wizRevise(t); });
      box.appendChild(c);
    });
  }
  async function wizRevise(instr) {
    const cur = $("#wizScript").value.trim();
    const st = $("#wizStatus4");
    if (!cur) { st.textContent = "먼저 대본이 있어야 해요."; return; }
    if (!instr) { st.textContent = "어떻게 바꿀지 적어주세요."; return; }
    st.textContent = `“${instr}” 반영 중…`; $("#wizReviseBtn").disabled = true;
    try {
      const out = await geminiText(
        `다음 인테리어 홍보 영상 대본을 요청에 맞게 수정해줘.\n요청: "${instr}"\n\n[현재 대본]\n${cur}\n\n수정된 대본 본문만 출력(설명·머리말 없이).`,
        "너는 인테리어 시공업체의 홍보 영상 전문 대본 작가야. 한국어로.");
      $("#wizScript").value = out; $("#wizRevisePrompt").value = "";
      st.textContent = "수정 완료! 더 바꾸거나 「이 대본 사용」을 누르세요.";
    } catch (e) { st.textContent = "실패: " + e.message; }
    finally { $("#wizReviseBtn").disabled = false; }
  }
  function wizSaveScript() {
    const text = $("#wizScript").value.trim();
    if (!text) { $("#wizStatus4").textContent = "대본이 비어 있습니다."; return null; }
    const name = (WIZ.topic ? WIZ.topic.slice(0, 18) : text.slice(0, 18));
    const asset = { id: uid(), name, text, refImages: WIZ.refImages.slice(),
      topic: WIZ.topic || "", concept: WIZ.style || "", toneName: (WIZ.tone && WIZ.tone.name) || "" };
    S.scripts.unshift(asset); persistScripts(); renderScripts();
    return asset;
  }
  function wizUse() {
    if (wizSaveScript()) $("#stScriptModal").classList.remove("open");
  }
  // 스텝4: 대본 저장 → 자막·음성 생성 → 편집화면 0초 자동 삽입 → 스텝5(자막별 영상)
  async function wizMakeNarration() {
    const asset = wizSaveScript();
    if (!asset) return;
    const n = await makeNarration(asset.id, WIZ.tone ? { gender: WIZ.tone.gender, styleHint: WIZ.tone.style } : undefined);
    if (!n) return;
    // 편집 화면(타임라인) 0초에 음성 + 딸린 자막 자동 삽입
    S.timeline.audio.push({ id: uid(), assetId: n.id, kind: "audio", name: n.name, start: 0, dur: n.dur || 4 });
    placeCues(n.cues, 0, n.id);
    renderTimeline(); seek(0);
    // 일관성: 첨부 사진 첫 장을 기본 배경(참조)으로
    S.baseBg = WIZ.refImages.length ? WIZ.refImages[0] : null;
    buildWizShots(n.cues);
    gotoStep(5);
  }
  // 스텝5: 자막별 장면 행 구성 (사진/영상/AI생성)
  function buildWizShots(cues) {
    const wrap = $("#wizShots"); if (!wrap) return;
    wrap.innerHTML = "";
    (cues || []).forEach((c, i) => wrap.appendChild(shotRow(c, c.text, i)));
    $("#wizShotStatus").textContent = `${(cues || []).length}개 자막 — 각 자막에 사진·영상을 넣거나 「🎬 AI 영상」으로 생성하세요.`;
    $("#wizGenImgAll").hidden = !(cues && cues.length);
  }
  // 스텝5: 모든 자막을 기본 배경 참조로 이미지 자동 생성 → 타임라인 배치
  async function wizGenAllImages() {
    if (!gkey()) { $("#wizShotStatus").textContent = "Gemini 키가 필요해요(상단)."; return; }
    const rows = [...document.querySelectorAll("#wizShots .shot-row")];
    if (!rows.length) return;
    const ref = S.baseBg ? [S.baseBg] : [];
    $("#wizGenImgAll").disabled = true;
    showBusy(S.baseBg ? "🖼 기본 배경 참조로 전체 장면 이미지 생성 중…" : "🖼 전체 장면 이미지 생성 중…");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prompt = row.querySelector(".shot-desc").value.trim();
      const result = row.querySelector(".shot-result");
      const d = +row.dataset.dur || 4;
      if (!prompt) continue;
      $("#stBusyMsg").textContent = `🖼 이미지 생성 ${i + 1}/${rows.length}…`;
      result.textContent = "이미지 생성 중…";
      try {
        const uri = await genImage(prompt, ref);
        const clip = addImageClipFromUri(uri, prompt, d);
        if (typeof row._setMedia === "function") row._setMedia(clip);
        else insertVideo({ assetId: clip.id, name: clip.name, dur: d }, totalDuration());
        result.textContent = "✓ 생성·배치됨";
      } catch (e) { result.textContent = "실패: " + e.message; }
    }
    hideBusy(); $("#wizGenImgAll").disabled = false;
    $("#wizShotStatus").textContent = "전체 장면 이미지 완료! 일관된 배경으로 타임라인에 배치됐어요.";
  }
  function wizFinish() { $("#stScriptModal").classList.remove("open"); }

  // ── 자막·음성 생성 (Gemini TTS via Vercel) → 프로젝트 번들에 포함 ──
  async function makeNarration(scriptId, opt) {
    const sc = S.scripts.find((x) => x.id === scriptId);
    if (!sc) return;
    const gender = (opt && opt.gender) || "female";
    const styleHint = (opt && opt.styleHint) || "차분하고 신뢰감 있는 톤으로 한국어 나레이션을 읽어 주세요.";
    const payload = { script: sc.text, voiceGender: gender, styleHint };
    const key = gkey(); if (key) payload.apiKey = key;
    showBusy("🎤 자막·음성 생성 중…");
    try {
      const res = await fetch(`${API_BASE}/api/gemini-tts`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const txt = await res.text(); let j = {};
      try { j = txt ? JSON.parse(txt) : {}; } catch { j = { message: txt.slice(0, 200) }; }
      if (!res.ok) throw new Error(j.message || `HTTP ${res.status}`);
      const b64 = j.audioBase64;
      if (!b64) throw new Error("audioBase64 없음");
      const bin = atob(b64); const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "audio/wav" });
      const urlObj = URL.createObjectURL(blob);
      let dur = await audioBlobDuration(blob);
      if (!dur) dur = await mediaDuration(urlObj, "audio");
      const cues = buildCues(sc.text, dur || 0);
      const nid = uid();
      const narration = { id: nid, projectId: sc.id, name: sc.name, url: urlObj, blob, dur, gender, cues };
      S.narrations.unshift(narration);
      sc.narrationId = nid;   // 프로젝트(대본)에 음성·자막 연결 → 한 아이콘
      renderScripts();
      return narration;
    } catch (e) { alert("자막·음성 생성 실패: " + e.message); return null; }
    finally { hideBusy(); }
  }
  // 대본을 문장 단위로 나누고, 음성 길이에 글자수 비례로 시간 배분
  function buildCues(text, totalDur) {
    let sents = String(text || "").replace(/\n+/g, " ").split(/(?<=[.!?。…])\s+/).map((s) => s.trim()).filter(Boolean);
    if (!sents.length) sents = [String(text || "").trim() || "자막"];
    const chunks = [];
    sents.forEach((s) => { if (s.length > 38) s.split(/,\s*/).forEach((p) => p.trim() && chunks.push(p.trim())); else chunks.push(s); });
    const total = Math.max(1, chunks.reduce((a, c) => a + c.length, 0));
    const D = totalDur > 0.5 ? totalDur : chunks.length * 2.5;
    let t = 0; const cues = [];
    chunks.forEach((c) => { const d = Math.max(0.8, D * (c.length / total)); cues.push({ text: c, start: t, dur: d }); t += d; });
    if (cues.length) { const last = cues[cues.length - 1]; last.dur = Math.max(0.5, last.dur + (D - (last.start + last.dur))); }
    return cues;
  }
  function renderSubtitles() {
    const grid = $("#stSubGrid"); if (!grid) return;
    grid.innerHTML = "";
    S.subtitles.forEach((s) => {
      const c = mkAsset({ ico: "💬", name: s.name, sub: `${s.cues.length}개 자막 · ${(s.dur || 0).toFixed(1)}s`, assetId: s.id, kind: "subtitle" });
      c.querySelector(".asset-x").addEventListener("click", (e) => { e.stopPropagation(); S.subtitles = S.subtitles.filter((x) => x.id !== s.id); renderSubtitles(); });
      grid.appendChild(c);
    });
    renderClips();
  }
  function renderNarrations() {
    const grid = $("#stNarGrid"); if (!grid) return;
    grid.innerHTML = "";
    S.narrations.forEach((n) => {
      const c = mkAsset({ ico: "🔊", name: n.name, sub: `${(n.dur || 0).toFixed(1)}s · ${n.gender === "male" ? "남" : "여"}${n.cues && n.cues.length ? " · 자막포함" : ""}`, assetId: n.id, kind: "audio" });
      const au = document.createElement("audio"); au.controls = true; au.src = n.url;
      au.addEventListener("click", (e) => e.stopPropagation());
      c.appendChild(au);
      c.querySelector(".asset-x").addEventListener("click", (e) => { e.stopPropagation(); S.narrations = S.narrations.filter((x) => x.id !== n.id); renderNarrations(); });
      grid.appendChild(c);
    });
    renderClips();
  }

  // ── 영상 생성 (grok-xai video_start/poll) ────────────────────
  function onRefImage(e) {
    const f = e.target.files[0]; if (!f) { S.refImageDataUri = null; $("#stRefThumb").hidden = true; return; }
    const r = new FileReader();
    r.onload = () => { S.refImageDataUri = r.result; const t = $("#stRefThumb"); t.src = r.result; t.hidden = false; };
    r.readAsDataURL(f);
  }
  async function genVideo() {
    const provider = $("#stVideoProvider").value;
    const prompt = $("#stVideoPrompt").value.trim();
    const st = $("#stVideoStatus");
    if (!prompt) { st.textContent = "프롬프트를 입력하세요."; return; }
    if (provider !== "grok") { st.textContent = "현재 Grok(xAI) 영상만 연결돼 있습니다. (Gemini/fal 은 추후)"; return; }
    const xk = xkey(); if (!xk) { st.textContent = "xAI API 키를 입력하세요."; return; }
    $("#stVideoGen").disabled = true; st.textContent = "영상 생성 중… (참조사진 없으면 시작 이미지부터 만들어요)"; showBusy("🎬 영상 생성 중…");
    try {
      const url = await grokVideo(prompt, S.refImageDataUri, xk);
      const dur = await mediaDuration(url, "video").catch(() => 5);
      S.videos.unshift({ id: uid(), name: prompt.slice(0, 16), url, dur, prompt });
      renderVideos();
      st.textContent = "완료!";
      $("#stVideoModal").classList.remove("open");
    } catch (e) { st.textContent = "실패: " + e.message; }
    finally { $("#stVideoGen").disabled = false; hideBusy(); }
  }
  function renderVideos() {
    const grid = $("#stVideoGrid"); if (!grid) return;
    grid.innerHTML = "";
    S.videos.forEach((v) => {
      const c = mkAsset({ ico: "🎬", name: v.name, sub: `${(v.dur || 0).toFixed(1)}s`, assetId: v.id, kind: "video" });
      const vv = document.createElement("video"); vv.className = "thumbvid"; vv.src = v.url; vv.muted = true;
      vv.addEventListener("click", (e) => { e.stopPropagation(); previewVideo(v.url); });
      c.appendChild(vv);
      c.querySelector(".asset-x").addEventListener("click", (e) => { e.stopPropagation(); pushHistory(); S.videos = S.videos.filter((x) => x.id !== v.id); renderVideos(); renderClips(); });
      grid.appendChild(c);
    });
    renderClips();
    scheduleSave();
  }

  // ── 자산 카드 (드래그 가능) ──────────────────────────────────
  function mkAsset({ ico, name, sub, assetId, kind }) {
    const c = document.createElement("div");
    c.className = "asset-card"; c.draggable = true;
    c.dataset.assetId = assetId; c.dataset.kind = kind;
    c.innerHTML = `<span class="asset-x" title="삭제">×</span>
      <div><span class="asset-ico">${ico}</span> <span class="asset-name">${esc(name)}</span></div>
      <div class="asset-sub">${esc(sub)}</div>`;
    c.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", JSON.stringify({ assetId, kind }));
    });
    return c;
  }

  // ── 자산 조회 ────────────────────────────────────────────────
  function findAsset(kind, id) {
    if (kind === "script") return S.scripts.find((x) => x.id === id);
    if (kind === "audio") return S.narrations.find((x) => x.id === id) || S.music.find((x) => x.id === id);
    if (kind === "music") return S.music.find((x) => x.id === id) || S.narrations.find((x) => x.id === id);
    if (kind === "video") return S.videos.find((x) => x.id === id) || S.clips.find((x) => x.id === id);
    if (kind === "subtitle") return S.subtitles.find((x) => x.id === id);
    return null;
  }
  function assetDuration(kind, a) {
    if (!a) return 4;
    if (kind === "script") return Math.max(3, Math.min(60, Math.round(a.text.length / 4))); // ~4자/초
    return a.dur || 4;
  }

  // ── 타임라인 ─────────────────────────────────────────────────
  function setupLaneDrop(lane) {
    // 내부 자산 카드(아이콘) 드롭만 처리. 파일 드롭은 window 핸들러(onWindowFileDrop)가 담당.
    lane.addEventListener("dragover", (e) => {
      if (Array.from(e.dataTransfer.types || []).includes("Files")) return;
      e.preventDefault(); lane.classList.add("drop-hot");
    });
    lane.addEventListener("dragleave", (e) => { if (e.target === lane) lane.classList.remove("drop-hot"); });
    lane.addEventListener("drop", (e) => {
      if (e.dataTransfer.files && e.dataTransfer.files.length) return;  // 파일은 window 가 처리
      e.preventDefault(); lane.classList.remove("drop-hot");
      let data; try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
      const rect = lane.getBoundingClientRect();
      const dropSec = Math.max(0, (e.clientX - rect.left) / S.pxPerSec);
      onDrop(lane.dataset.track, data, dropSec);
    });
  }
  // window 레벨 파일 드롭 — 스튜디오 어디에 떨어뜨려도 영상 파일을 받음
  async function onWindowFileDrop(e) {
    if (!document.body.classList.contains("mode-studio")) return;
    const all = Array.from(e.dataTransfer.files || []);
    if (!all.length) return;
    e.preventDefault();
    document.querySelectorAll(".drop-hot").forEach((x) => x.classList.remove("drop-hot"));
    const videoFiles = all.filter((f) => /^video\//.test(f.type));
    const audioFiles = all.filter((f) => /^audio\//.test(f.type));
    const rest = all.filter((f) => !/^video\//.test(f.type) && !/^audio\//.test(f.type));
    const lane = e.target.closest && e.target.closest(".track-lane");
    const laneTrack = lane ? lane.dataset.track : null;

    if (laneTrack === "video" && videoFiles.length) {
      // 영상 트랙에 떨어뜨림 → 순서대로 packing
      const rect = lane.getBoundingClientRect();
      const sec = Math.max(0, (e.clientX - rect.left) / S.pxPerSec);
      let idx = videoIndexAt(sec);
      for (const f of videoFiles) {
        const clip = await addClip(f, { silent: true });
        if (clip) S.timeline.video.splice(idx++, 0, { id: uid(), assetId: clip.id, kind: "video", name: clip.name, dur: clip.dur || 4, start: 0 });
      }
      repackVideo(); renderTimeline();
      if (S.timeline.video.length) seek(S.timeline.video[Math.max(0, idx - videoFiles.length)].start);
      if (audioFiles.length) await intakeFiles(audioFiles);
      if (rest.length) await intakeFiles(rest);
      return;
    }
    if (laneTrack === "music" && audioFiles.length) {
      // 음악 트랙에 음악 파일 직접 배치
      const rect = lane.getBoundingClientRect();
      let sec = Math.max(0, (e.clientX - rect.left) / S.pxPerSec);
      for (const f of audioFiles) {
        const m = await addMusic(f);
        if (m) { S.timeline.music.push({ id: uid(), assetId: m.id, kind: "music", name: m.name, start: sec, dur: m.dur || 4 }); sec += m.dur || 4; }
      }
      renderTimeline(); seek(0);
      if (videoFiles.length) for (const f of videoFiles) await addClip(f);
      if (rest.length) await intakeFiles(rest);
      return;
    }
    // 그 외(파일함/스테이지 등) → 파일함에 종류별로 추가
    if (videoFiles.length) for (const f of videoFiles) await addClip(f);
    await intakeFiles([...audioFiles, ...rest]);
  }
  // 영상줄: 0초부터 빈틈없이 순서대로 packing (자석식)
  function repackVideo() { let t = 0; for (const b of S.timeline.video) { b.start = t; t += b.dur; } }
  function videoIndexAt(sec) {
    const b = S.timeline.video;
    for (let i = 0; i < b.length; i++) { if (sec < b[i].start + b[i].dur / 2) return i; }
    return b.length;
  }
  function insertVideo(info, sec) {
    const idx = (sec == null) ? S.timeline.video.length : videoIndexAt(sec);
    const blk = { id: uid(), assetId: info.assetId, kind: "video", name: info.name, dur: info.dur || 4, start: 0, in: 0 };
    S.timeline.video.splice(idx, 0, blk);
    repackVideo(); renderTimeline(); seek(blk.start);
    return blk;
  }
  // Q=앞부분 자르기 / W=뒷부분 자르기 — 플레이헤드 위치의 영상 클립을 트림
  function trimVideo(side) {
    const t = S.playhead;
    const b = blockAt("video", t);
    if (!b) return;
    const off = t - b.start;
    if (off <= 0.05 || off >= b.dur - 0.05) return;
    if (side === "front") { b.in = (b.in || 0) + off; b.dur -= off; }
    else { b.dur = off; }
    repackVideo(); renderTimeline();
    seek(side === "front" ? b.start : Math.min(t, totalDuration()));
  }
  // ── 실행 취소(Undo) — Ctrl/Cmd+Z ───────────────────────────
  // 타임라인·자산 배열을 통째로 스냅샷. structuredClone 이 Blob 까지 보존.
  const _history = [];
  const HISTORY_MAX = 60;
  function snapshotState() {
    const pick = {
      timeline: S.timeline, videos: S.videos, clips: S.clips, music: S.music,
      narrations: S.narrations, subtitles: S.subtitles, scripts: S.scripts,
    };
    try { return structuredClone(pick); }
    catch (_) { try { return JSON.parse(JSON.stringify(pick)); } catch (__) { return null; } }
  }
  function pushHistory() {
    const snap = snapshotState();
    if (!snap) return;
    _history.push(snap);
    if (_history.length > HISTORY_MAX) _history.shift();
  }
  function undo() {
    const snap = _history.pop();
    if (!snap) return;
    if (Array.isArray(snap.videos)) S.videos = snap.videos;
    if (Array.isArray(snap.clips)) S.clips = snap.clips;
    if (Array.isArray(snap.music)) S.music = snap.music;
    if (Array.isArray(snap.narrations)) S.narrations = snap.narrations;
    if (Array.isArray(snap.subtitles)) S.subtitles = snap.subtitles;
    if (Array.isArray(snap.scripts)) S.scripts = snap.scripts;
    if (snap.timeline) {
      ["video", "audio", "script", "music"].forEach((tk) => {
        S.timeline[tk] = Array.isArray(snap.timeline[tk]) ? snap.timeline[tk] : [];
      });
    }
    S.selSet = []; S.sel = null; S.fileSel = [];
    try { persistScripts(); } catch (_) {}
    renderScripts(); renderVideos(); renderSubtitles(); renderNarrations(); renderClips(); renderTimeline();
    seek(Math.min(S.playhead, totalDuration()));
  }

  // 선택된 클립 삭제 (Delete/Backspace) — 다중 선택 모두 삭제
  function deleteSelected() {
    const sels = S.selSet.length ? S.selSet : (S.sel ? [S.sel] : []);
    if (!sels.length) return;
    pushHistory();
    let touchedVideo = false;
    sels.forEach(({ track, id }) => {
      if (!S.timeline[track]) return;
      S.timeline[track] = S.timeline[track].filter((x) => String(x.id) !== String(id));
      if (track === "video") touchedVideo = true;
    });
    if (touchedVideo) repackVideo();   // 삭제 후 빈틈 메우기
    S.selSet = []; S.sel = null;
    renderTimeline();
  }
  // 자막 cue 들을 자막트랙에 펼침 (start 기준 + 음성 싱크 표시)
  function placeCues(cues, baseStart, syncId) {
    (cues || []).forEach((c) => {
      S.timeline.script.push({ id: uid(), kind: "script", name: c.text.slice(0, 14), text: c.text, start: baseStart + c.start, dur: c.dur, syncTo: syncId || true });
    });
  }
  // 어느 트랙에 떨어뜨려도 자산 '종류'에 맞는 트랙으로 알아서 들어감
  // 어느 트랙에 떨어뜨리느냐(track)로 역할을 정하고, data.kind 로 자산을 찾는다.
  function onDrop(track, data, dropSec) {
    const a = findAsset(data.kind, data.assetId);
    if (!a) return;
    pushHistory();
    if (track === "video") {
      if (data.kind === "video") insertVideo({ assetId: a.id, name: a.name, dur: a.dur || 4 }, dropSec);
      return;
    }
    if (track === "music") {                   // 배경음악 — 음악/음성 자산을 음악줄에
      S.timeline.music.push({ id: uid(), assetId: a.id, kind: "music", name: a.name, start: dropSec, dur: a.dur || 4 });
      renderTimeline(); seek(dropSec); return;
    }
    if (track === "audio") {
      S.timeline.audio.push({ id: uid(), assetId: a.id, kind: "audio", name: a.name, start: dropSec, dur: a.dur || 4 });
      if (a.cues) placeCues(a.cues, dropSec, a.id);   // 나레이션이면 딸린 자막도 함께
      renderTimeline(); seek(dropSec); return;
    }
    if (track === "script") {
      if (data.kind === "subtitle" || (a.cues && data.kind === "audio")) { placeCues(a.cues, dropSec, a.id); }
      else if (data.kind === "script") {
        const dur = assetDuration("script", a);
        S.timeline.script.push({ id: uid(), assetId: a.id, kind: "script", name: a.name, text: a.text, start: dropSec, dur });
      }
      renderTimeline(); seek(dropSec); return;
    }
  }
  function totalDuration() {
    let m = 0;
    ["video", "audio", "script", "music"].forEach((t) => (S.timeline[t] || []).forEach((b) => { m = Math.max(m, b.start + b.dur); }));
    return m;
  }
  function fmtT(s) {
    s = Math.max(0, s); const mm = Math.floor(s / 60), ss = Math.floor(s % 60);
    return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  function renderTimeline() {
    const pps = S.pxPerSec;
    const dur = Math.max(20, totalDuration() + 6);
    const innerW = dur * pps;
    const inner = $("#stTlInner"); if (inner) inner.style.width = innerW + "px";
    // 눈금자
    const ruler = $("#stRuler");
    if (ruler) {
      ruler.style.width = innerW + "px"; ruler.innerHTML = "";
      const step = pps < 18 ? 5 : 1;   // 촘촘하면 1초, 줄이면 5초 간격
      for (let t = 0; t <= dur; t += step) {
        const tk = document.createElement("div");
        tk.className = "tl-tick"; tk.style.left = (t * pps) + "px"; tk.textContent = fmtT(t);
        ruler.appendChild(tk);
      }
    }
    // 트랙 블록
    ["script", "video", "audio", "music"].forEach((track) => {
      const lane = document.querySelector(`.track-lane[data-track="${track}"]`);
      if (!lane) return;
      lane.style.width = innerW + "px"; lane.innerHTML = "";
      (S.timeline[track] || []).forEach((b) => {
        const a = findAsset(b.kind, b.assetId);
        const el = document.createElement("div");
        el.dataset.bid = b.id;
        el.className = `block ${b.kind}` + (b.syncTo ? " synced" : "")
          + (isSelKey(track, b.id) ? " selected" : "");
        el.style.left = (b.start * pps) + "px";
        el.style.width = Math.max(26, b.dur * pps) + "px";
        let inner2 = `<span class="block-x">×</span><span class="block-label">${esc(b.name)}</span>`;
        if (b.kind === "video" && a) inner2 += `<span class="block-thumbs"><video src="${a.url}" muted preload="metadata"></video></span>`;
        else if (b.kind === "audio" || b.kind === "music") inner2 += `<span class="wave"></span>`;
        el.innerHTML = inner2;
        el.title = `${b.name} · ${b.dur.toFixed(1)}s` + (b.syncTo ? " (영상과 싱크됨)" : "");
        el.querySelector(".block-x").addEventListener("click", (e) => {
          e.stopPropagation();
          pushHistory();
          S.timeline[track] = S.timeline[track].filter((x) => x.id !== b.id);
          if (track === "video") repackVideo();   // 삭제 후 빈틈 메우기
          renderTimeline();
        });
        el.addEventListener("mousedown", (e) => startBlockDrag(e, track, b, lane));
        el.addEventListener("click", (e) => {
          if (e.target.classList.contains("block-x")) return;
          if (e.shiftKey || e.metaKey || e.ctrlKey) {
            // 토글 선택 (다중)
            if (isSelKey(track, b.id)) {
              S.selSet = S.selSet.filter((s) => !(s.track === track && String(s.id) === String(b.id)));
            } else {
              S.selSet.push({ track, id: b.id });
            }
          } else if (!isSelKey(track, b.id)) {
            // 단일 선택 (이미 다중 선택 안에 있으면 유지 — 그룹 이동용)
            S.selSet = [{ track, id: b.id }];
          }
          S.sel = { track, id: b.id };
          refreshSelUI();
        });
        lane.appendChild(el);
      });
    });
    positionPlayhead();
    $("#stTime").textContent = `${fmtT(S.playhead)} / ${fmtT(totalDuration())}`;
    scheduleSave();
  }
  function positionPlayhead() {
    const ph = $("#stPlayhead"); if (ph) ph.style.left = (S.playhead * S.pxPerSec) + "px";
  }

  // ── 다중 선택 (마퀴/드래그 선택) ─────────────────────────────
  function isSelKey(track, id) {
    return S.selSet.some((s) => s.track === track && String(s.id) === String(id));
  }
  function refreshSelUI() {
    document.querySelectorAll("#stTlInner .track-lane .block").forEach((el) => {
      const lane = el.closest(".track-lane");
      if (!lane) return;
      el.classList.toggle("selected", isSelKey(lane.dataset.track, el.dataset.bid));
    });
  }
  function clearSel() { S.selSet = []; S.sel = null; refreshSelUI(); }
  function selectInRect(x1, y1, x2, y2, additive) {
    const set = new Map();
    if (additive) S.selSet.forEach((s) => set.set(s.track + "|" + s.id, s));
    document.querySelectorAll("#stTlInner .track-lane .block").forEach((el) => {
      const r = el.getBoundingClientRect();
      const hit = !(r.right < x1 || r.left > x2 || r.bottom < y1 || r.top > y2);
      if (!hit) return;
      const track = el.closest(".track-lane").dataset.track;
      const id = el.dataset.bid;
      set.set(track + "|" + id, { track, id });
    });
    S.selSet = [...set.values()];
    S.sel = S.selSet[S.selSet.length - 1] || null;
    refreshSelUI();
  }
  function setupMarquee() {
    const inner = $("#stTlInner");
    if (!inner) return;
    inner.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      // 블록·눈금자·플레이헤드 위에서는 마퀴 시작 안 함 (각자 핸들러가 처리)
      if (e.target.closest(".block")) return;
      if (e.target.closest(".tl-ruler") || e.target.closest(".tl-playhead")) return;
      const innerRect = inner.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      const box = document.createElement("div");
      box.className = "tl-marquee";
      inner.appendChild(box);
      let moved = false;
      const draw = (ev) => {
        const x1 = Math.min(sx, ev.clientX), x2 = Math.max(sx, ev.clientX);
        const y1 = Math.min(sy, ev.clientY), y2 = Math.max(sy, ev.clientY);
        if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) moved = true;
        box.style.left = (x1 - innerRect.left) + "px";
        box.style.top = (y1 - innerRect.top) + "px";
        box.style.width = (x2 - x1) + "px";
        box.style.height = (y2 - y1) + "px";
        if (moved) selectInRect(x1, y1, x2, y2, ev.shiftKey || ev.metaKey || ev.ctrlKey);
      };
      const up = (ev) => {
        document.removeEventListener("mousemove", draw);
        document.removeEventListener("mouseup", up);
        box.remove();
        if (!moved && !(ev.shiftKey || ev.metaKey || ev.ctrlKey)) clearSel();
      };
      document.addEventListener("mousemove", draw);
      document.addEventListener("mouseup", up);
      e.preventDefault();
    });
  }

  // 블록 드래그
  function startBlockDrag(e, track, b, lane) {
    if (e.target.classList.contains("block-x")) return;
    e.preventDefault();
    const rect = lane.getBoundingClientRect();
    let _histTaken = false;
    const takeHist = () => { if (!_histTaken) { _histTaken = true; pushHistory(); } };
    if (track === "video") {
      // 영상줄: 좌우로 끌면 순서 교체(자석식, 빈틈 없음)
      const move = (ev) => {
        const sec = (ev.clientX - rect.left) / S.pxPerSec;
        const cur = S.timeline.video.indexOf(b);
        if (cur < 0) return;
        let tgt = videoIndexAt(sec);
        if (tgt > cur) tgt--;   // 자기 자신 제거에 따른 보정
        tgt = Math.max(0, Math.min(S.timeline.video.length - 1, tgt));
        if (tgt !== cur) {
          takeHist();
          S.timeline.video.splice(cur, 1);
          S.timeline.video.splice(tgt, 0, b);
          repackVideo(); renderTimeline();
        }
      };
      const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
      document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
      return;
    }
    // 음성/자막/음악: 자유 좌우 이동
    const grabSec = (e.clientX - rect.left) / S.pxPerSec - b.start;
    // 이 블록이 다중 선택에 포함돼 있으면, 영상 외 선택 블록들을 함께 이동 (그룹 이동)
    let group = null;
    if (S.selSet.length > 1 && isSelKey(track, b.id)) {
      group = [];
      S.selSet.forEach((s) => {
        if (s.track === "video") return;   // 영상줄은 자석식이라 그룹 이동 제외
        const arr = S.timeline[s.track] || [];
        const blk = arr.find((x) => String(x.id) === String(s.id));
        if (blk) group.push(blk);
      });
    }
    const bStart0 = b.start;                                   // 드래그 시작 시점의 기준 블록 위치
    const startsAtDown = group ? group.map((g) => g.start) : null;
    const minStart0 = group ? Math.min(...startsAtDown) : 0;   // 그룹 중 가장 왼쪽 — 0 미만 방지용
    const move = (ev) => {
      const newStart = Math.max(0, (ev.clientX - rect.left) / S.pxPerSec - grabSec);
      if (Math.abs(newStart - bStart0) > 0.01) takeHist();
      if (group) {
        // 0 아래로 내려가지 않게 델타 하한 보정
        const clampedDelta = Math.max(newStart - bStart0, -minStart0);
        group.forEach((g, i) => { g.start = Math.max(0, startsAtDown[i] + clampedDelta); if (g.syncTo) g.syncTo = null; });
      } else {
        b.start = newStart;
        if (b.syncTo) b.syncTo = null;
      }
      renderTimeline();
    };
    const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
    document.addEventListener("mousemove", move); document.addEventListener("mouseup", up);
  }

  // ── 미리보기 / 재생 엔진 ─────────────────────────────────────
  function previewVideo(url) {   // 단일 자산 클릭 미리보기 (타임라인 정지)
    pause();
    const v = $("#stProgram");
    $("#stStageEmpty").style.display = "none";
    if (v._url !== url) { v.src = url; v._url = url; }
    v.classList.add("on"); v.controls = true; v.muted = false;
    try { v.currentTime = 0; } catch (_) {}
  }
  function blockAt(track, t) {
    return S.timeline[track].find((b) => t >= b.start && t < b.start + b.dur) || null;
  }
  function applyFrame(t, doPlay) {
    const v = $("#stProgram"); const au = $("#stAudio"); const sub = $("#stSubtitle"); const img = $("#stProgramImg");
    // 영상
    const vb = blockAt("video", t);
    if (vb) {
      const a = findAsset("video", vb.assetId);
      $("#stStageEmpty").style.display = "none";
      if (a && a.isImage) {              // 사진(스틸) 클립
        v.classList.remove("on"); v.pause();
        if (img) {
          if (img._url !== a.url) { img.src = a.url; img._url = a.url; }
          img.classList.toggle("fill", S.fill);
          img.style.objectPosition = S.fill ? ((typeof a.panX === "number" ? a.panX : S.panX) + "% center") : "center";
          img.classList.add("on");
        }
      } else {
        if (img) img.classList.remove("on");
        v.classList.add("on"); v.controls = false;
        if (a && v._url !== a.url) { v.src = a.url; v._url = a.url; }
        v.style.objectPosition = S.fill ? (((a && typeof a.panX === "number") ? a.panX : S.panX) + "% center") : "center";
        const local = (vb.in || 0) + (t - vb.start);
        if (Math.abs((v.currentTime || 0) - local) > 0.25) { try { v.currentTime = local; } catch (_) {} }
        v.muted = S.timeline.audio.length > 0;
        if (doPlay) { v.play().catch(() => {}); } else { v.pause(); }
      }
    } else {
      v.classList.remove("on"); v.pause(); if (img) img.classList.remove("on");
      if (!totalDuration()) $("#stStageEmpty").style.display = "";
    }
    S.curVideoBlock = vb;
    // 음성
    const ab = blockAt("audio", t);
    if (ab) {
      const a = findAsset("audio", ab.assetId);
      if (a && au._url !== a.url) { au.src = a.url; au._url = a.url; }
      const local = t - ab.start;
      if (Math.abs((au.currentTime || 0) - local) > 0.25) { try { au.currentTime = local; } catch (_) {} }
      if (doPlay) au.play().catch(() => {}); else au.pause();
    } else { au.pause(); }
    S.curAudioBlock = ab;
    // 음악 (배경)
    const mu = $("#stMusic");
    const mb = blockAt("music", t);
    if (mu) {
      if (mb) {
        const ma = findAsset("music", mb.assetId);
        if (ma && mu._url !== ma.url) { mu.src = ma.url; mu._url = ma.url; }
        const local = t - mb.start;
        if (Math.abs((mu.currentTime || 0) - local) > 0.3) { try { mu.currentTime = local; } catch (_) {} }
        if (doPlay) mu.play().catch(() => {}); else mu.pause();
      } else { mu.pause(); }
    }
    S.curMusicBlock = mb;
    // 자막
    const sb = blockAt("script", t);
    if (sb) {
      const sa = sb.assetId ? findAsset("script", sb.assetId) : null;
      sub.hidden = false; sub.textContent = sb.text || (sa ? sa.text : sb.name);
    } else { sub.hidden = true; }
  }
  function seek(t) {
    S.playhead = Math.max(0, t);
    positionPlayhead();
    $("#stTime").textContent = `${fmtT(S.playhead)} / ${fmtT(totalDuration())}`;
    applyFrame(S.playhead, S.playing);
    if (S.playing) { S._wall = performance.now(); S._ph0 = S.playhead; }
  }
  function togglePlay() { S.playing ? pause() : play(); }
  function play() {
    if (S.playing) return;
    if (totalDuration() <= 0) return;
    if (S.playhead >= totalDuration()) S.playhead = 0;
    S.playing = true; $("#stPlay").textContent = "❚❚";
    S._wall = performance.now(); S._ph0 = S.playhead;
    applyFrame(S.playhead, true);
    S._raf = requestAnimationFrame(tick);
  }
  function pause() {
    if (!S.playing) { cancelAnimationFrame(S._raf); return; }
    S.playing = false; $("#stPlay").textContent = "▶";
    cancelAnimationFrame(S._raf);
    try { $("#stProgram").pause(); } catch (_) {}
    try { $("#stAudio").pause(); } catch (_) {}
    try { $("#stMusic").pause(); } catch (_) {}
  }
  function tick() {
    if (!S.playing) return;
    const t = S._ph0 + (performance.now() - S._wall) / 1000;
    const end = totalDuration();
    if (t >= end) { S.playhead = end; positionPlayhead(); pause(); return; }
    S.playhead = t; positionPlayhead();
    $("#stTime").textContent = `${fmtT(t)} / ${fmtT(end)}`;
    // 블록 경계 넘으면 소스 전환
    const vb = blockAt("video", t), ab = blockAt("audio", t), sb = blockAt("script", t), mb = blockAt("music", t);
    if (vb !== S.curVideoBlock || ab !== S.curAudioBlock || mb !== S.curMusicBlock || (sb && $("#stSubtitle").hidden) || (!sb && !$("#stSubtitle").hidden)) {
      applyFrame(t, true);
    }
    S._raf = requestAnimationFrame(tick);
  }
  function onLoadVideo(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(addClip);
    e.target.value = "";
  }
  function addClip(file, opts = {}) {
    return new Promise((resolve) => {
      if (!file || !/^video\//.test(file.type)) { resolve(null); return; }
      const url = URL.createObjectURL(file);
      const name = file.name.replace(/\.[^.]+$/, "").slice(0, 22);
      const finish = (dur) => {
        const clip = { id: uid(), name, url, dur: dur || 0 };
        S.clips.unshift(clip); renderClips();
        if (!opts.silent) previewVideo(url);
        resolve(clip);
      };
      mediaDuration(url, "video").then(finish).catch(() => finish(0));
    });
  }
  // 파일함(왼쪽) — 모든 자산(영상·사진·음성·음악·자막)과 결과물을 한곳에 모아 보여줌
  function renderClips() {
    const list = $("#stLeftList"); if (!list) return;
    list.innerHTML = "";
    const items = [];
    // 결과물(대본·나레이션) + 불러온/생성 자산 모두
    S.scripts.filter((p) => !p.narrationId).forEach((p) =>
      items.push({ kind: "script", id: p.id, name: p.name, ico: "📝", sub: `대본 · ${p.text.length}자` }));
    S.narrations.forEach((n) =>
      items.push({ kind: "audio", id: n.id, name: n.name, ico: "🔊", sub: `나레이션 ${(n.dur || 0).toFixed(1)}s${n.cues && n.cues.length ? " · 자막포함" : ""}`, audio: n.url }));
    S.subtitles.forEach((s) =>
      items.push({ kind: "subtitle", id: s.id, name: s.name, ico: "💬", sub: `자막 ${s.cues.length}개` }));
    S.music.forEach((m) =>
      items.push({ kind: "music", id: m.id, name: m.name, ico: "🎵", sub: `음악 ${(m.dur || 0).toFixed(1)}s`, audio: m.url }));
    S.videos.forEach((v) =>
      items.push({ kind: "video", id: v.id, name: v.name, ico: "🎬", sub: `영상 ${(v.dur || 0).toFixed(1)}s`, video: v.url }));
    S.clips.forEach((c) =>
      items.push({ kind: "video", id: c.id, name: c.name, ico: c.isImage ? "🖼" : "🎬", sub: `${c.isImage ? "사진" : "영상"} ${(c.dur || 0).toFixed(1)}s`, video: c.isImage ? null : c.url, image: c.isImage ? c.url : null }));

    if (!items.length) {
      list.innerHTML = `<div class="left-empty">영상·사진·음성·음악·자막 파일을 이 영역으로 끌어다 놓으세요.<br>만든 결과물도 여기에 모입니다.</div>`;
      scheduleSave(); return;
    }
    items.forEach((it) => {
      const c = document.createElement("div");
      c.className = "clip-card"; c.draggable = true;
      c.dataset.assetId = it.id; c.dataset.kind = it.kind;
      let media = "";
      if (it.video) media = `<video src="${it.video}" muted preload="metadata"></video>`;
      else if (it.image) media = `<img src="${it.image}" alt="">`;
      else media = `<div class="clip-ico">${it.ico}</div>`;
      c.innerHTML = `<span class="asset-x" title="삭제">×</span>
        ${media}
        <div class="clip-name">${it.ico} ${esc(it.name)}</div>
        <div class="clip-sub">${esc(it.sub)}</div>`;
      if (it.audio) {
        const au = document.createElement("audio"); au.controls = true; au.src = it.audio; au.className = "clip-audio";
        au.addEventListener("click", (e) => e.stopPropagation());
        c.appendChild(au);
      }
      c.addEventListener("dragstart", (e) => e.dataTransfer.setData("text/plain", JSON.stringify({ assetId: it.id, kind: it.kind })));
      c.addEventListener("click", (e) => {
        if (e.target.classList.contains("asset-x") || e.target.closest("audio")) return;
        if (e.shiftKey || e.metaKey || e.ctrlKey) {        // 토글 다중 선택
          if (fileSelHas(it.kind, it.id)) S.fileSel = S.fileSel.filter((s) => !(s.kind === it.kind && String(s.id) === String(it.id)));
          else S.fileSel.push({ kind: it.kind, id: it.id });
          refreshFileSelUI();
          return;
        }
        S.fileSel = [{ kind: it.kind, id: it.id }];          // 단일 선택 + 미리보기
        refreshFileSelUI();
        if (it.video) previewVideo(it.video);
      });
      c.querySelector(".asset-x").addEventListener("click", (e) => { e.stopPropagation(); removeAsset(it.kind, it.id); });
      list.appendChild(c);
    });
    // 사라진 자산은 선택목록에서 제거 후 하이라이트 갱신
    S.fileSel = S.fileSel.filter((s) => list.querySelector(`.clip-card[data-kind="${s.kind}"][data-asset-id="${s.id}"]`));
    refreshFileSelUI();
    scheduleSave();
  }
  // ── 파일함 다중 선택 ─────────────────────────────────────────
  const fileSelHas = (kind, id) => S.fileSel.some((s) => s.kind === kind && String(s.id) === String(id));
  function refreshFileSelUI() {
    document.querySelectorAll("#stLeftList .clip-card").forEach((el) =>
      el.classList.toggle("selected", fileSelHas(el.dataset.kind, el.dataset.assetId)));
    const cnt = $("#stFileSelCount");
    if (cnt) { cnt.hidden = !S.fileSel.length; cnt.textContent = S.fileSel.length ? `${S.fileSel.length}개 선택` : ""; }
  }
  function clearFileSel() { S.fileSel = []; refreshFileSelUI(); }
  function selectAllFiles() {
    S.fileSel = [];
    document.querySelectorAll("#stLeftList .clip-card").forEach((el) =>
      S.fileSel.push({ kind: el.dataset.kind, id: el.dataset.assetId }));
    refreshFileSelUI();
  }
  // 선택한 파일함 항목들 일괄 삭제 (한 번의 되돌리기 기록)
  function deleteFileSelected() {
    if (!S.fileSel.length) return;
    pushHistory();
    const idsOf = (k) => S.fileSel.filter((s) => s.kind === k).map((s) => String(s.id));
    const m = idsOf("music"), au = idsOf("audio"), sub = idsOf("subtitle"), sc = idsOf("script"), vi = idsOf("video");
    if (m.length) S.music = S.music.filter((x) => !m.includes(String(x.id)));
    if (au.length) { S.narrations = S.narrations.filter((x) => !au.includes(String(x.id))); S.scripts.forEach((s) => { if (au.includes(String(s.narrationId))) s.narrationId = null; }); }
    if (sub.length) S.subtitles = S.subtitles.filter((x) => !sub.includes(String(x.id)));
    if (sc.length) { S.scripts = S.scripts.filter((x) => !sc.includes(String(x.id))); persistScripts(); }
    if (vi.length) { S.videos = S.videos.filter((x) => !vi.includes(String(x.id))); S.clips = S.clips.filter((x) => !vi.includes(String(x.id))); }
    S.fileSel = [];
    renderNarrations(); renderScripts(); renderSubtitles(); renderVideos(); renderClips();
  }
  // 파일함 전체 비우기
  function clearFileBox() {
    const total = S.scripts.length + S.narrations.length + S.subtitles.length + S.music.length + S.videos.length + S.clips.length;
    if (!total) return;
    if (!confirm(`파일함의 모든 항목(${total}개)을 삭제할까요?\n(Ctrl+Z 로 되돌릴 수 있어요)`)) return;
    pushHistory();
    S.scripts = []; S.narrations = []; S.subtitles = []; S.music = []; S.videos = []; S.clips = [];
    S.fileSel = [];
    persistScripts();
    renderNarrations(); renderScripts(); renderSubtitles(); renderVideos(); renderClips();
  }
  // 파일함 드래그(마퀴) 선택
  function setupFileMarquee() {
    const list = $("#stLeftList"); if (!list) return;
    list.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (e.target.closest(".clip-card")) return;   // 카드 위에서는 드래그앤드롭/선택이 우선
      const listRect = list.getBoundingClientRect();
      const sx = e.clientX, sy = e.clientY;
      const box = document.createElement("div");
      box.className = "file-marquee";
      list.appendChild(box);
      let moved = false;
      const draw = (ev) => {
        const x1 = Math.min(sx, ev.clientX), x2 = Math.max(sx, ev.clientX);
        const y1 = Math.min(sy, ev.clientY), y2 = Math.max(sy, ev.clientY);
        if (!moved && Math.abs(ev.clientX - sx) + Math.abs(ev.clientY - sy) > 4) moved = true;
        box.style.left = (x1 - listRect.left) + "px";
        box.style.top = (y1 - listRect.top + list.scrollTop) + "px";
        box.style.width = (x2 - x1) + "px";
        box.style.height = (y2 - y1) + "px";
        if (!moved) return;
        const set = new Map();
        if (ev.shiftKey || ev.metaKey || ev.ctrlKey) S.fileSel.forEach((s) => set.set(s.kind + "|" + s.id, s));
        list.querySelectorAll(".clip-card").forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.right < x1 || r.left > x2 || r.bottom < y1 || r.top > y2) return;
          set.set(el.dataset.kind + "|" + el.dataset.assetId, { kind: el.dataset.kind, id: el.dataset.assetId });
        });
        S.fileSel = [...set.values()];
        refreshFileSelUI();
      };
      const up = (ev) => {
        document.removeEventListener("mousemove", draw);
        document.removeEventListener("mouseup", up);
        box.remove();
        if (!moved && !(ev.shiftKey || ev.metaKey || ev.ctrlKey)) clearFileSel();
      };
      document.addEventListener("mousemove", draw);
      document.addEventListener("mouseup", up);
      e.preventDefault();
    });
  }
  // 파일함 카드 삭제 — 자산 종류별 원본 목록에서 제거
  function removeAsset(kind, id) {
    pushHistory();
    if (kind === "music") S.music = S.music.filter((x) => x.id !== id);
    else if (kind === "audio") {
      S.narrations = S.narrations.filter((x) => x.id !== id);
      S.scripts.forEach((s) => { if (s.narrationId === id) s.narrationId = null; });
      renderNarrations(); renderScripts();
    } else if (kind === "subtitle") { S.subtitles = S.subtitles.filter((x) => x.id !== id); renderSubtitles(); }
    else if (kind === "script") { S.scripts = S.scripts.filter((x) => x.id !== id); persistScripts(); renderScripts(); }
    else if (kind === "video") { S.videos = S.videos.filter((x) => x.id !== id); S.clips = S.clips.filter((x) => x.id !== id); renderVideos(); }
    renderClips();
  }
  // 음악 파일 → 음악 자산으로 등록
  function addMusic(file) {
    return new Promise((resolve) => {
      if (!file || !/^audio\//.test(file.type)) { resolve(null); return; }
      const url = URL.createObjectURL(file);
      const m = { id: uid(), name: file.name.replace(/\.[^.]+$/, "").slice(0, 16), url, dur: 0 };
      S.music.unshift(m); renderClips();
      mediaDuration(url, "audio").then((d) => { m.dur = d || 0; renderClips(); }).catch(() => {});
      resolve(m);
    });
  }
  // 자막 파일(.srt/.vtt/.txt) → 자막 자산 또는 대본으로 등록
  function addSubtitleFile(file) {
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => {
        const text = String(r.result || "");
        const cues = parseSrtVtt(text);
        const name = file.name.replace(/\.[^.]+$/, "").slice(0, 16) || "자막";
        if (cues.length) {
          const dur = cues.reduce((mx, c) => Math.max(mx, c.start + c.dur), 0);
          const s = { id: uid(), name, dur, cues };
          S.subtitles.unshift(s); renderSubtitles(); renderClips(); resolve(s);
        } else {
          const s = { id: uid(), name, text: text.trim() };
          S.scripts.unshift(s); persistScripts(); renderScripts(); renderClips(); resolve(s);
        }
      };
      r.onerror = () => resolve(null);
      r.readAsText(file);
    });
  }
  // SRT/VTT 타임코드 파싱 → [{text,start,dur}]
  function parseSrtVtt(text) {
    const cues = [];
    const tc = (s) => { const m = /(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/.exec(s); if (!m) return null; return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000; };
    const blocks = text.replace(/\r/g, "").split(/\n\n+/);
    for (const blk of blocks) {
      const lines = blk.split("\n").filter((x) => x.trim() && !/^WEBVTT/i.test(x));
      const tl = lines.find((l) => /-->/.test(l));
      if (!tl) continue;
      const [aa, bb] = tl.split("-->");
      const st = tc(aa), en = tc(bb);
      if (st == null || en == null) continue;
      const txt = lines.slice(lines.indexOf(tl) + 1).join(" ").trim();
      if (txt) cues.push({ text: txt, start: st, dur: Math.max(0.5, en - st) });
    }
    return cues;
  }
  // 파일 종류별로 알맞은 자산으로 받아 파일함에 추가
  async function intakeFiles(files) {
    for (const f of Array.from(files || [])) {
      if (/^video\//.test(f.type)) await addClip(f);
      else if (/^image\//.test(f.type)) await addImageClip(f);
      else if (/^audio\//.test(f.type)) await addMusic(f);
      else if (/^text\//.test(f.type) || /\.(srt|vtt|txt)$/i.test(f.name)) await addSubtitleFile(f);
    }
  }

  // ── 유틸 ─────────────────────────────────────────────────────
  // WAV 등 blob 의 정확한 길이 — Web Audio 로 디코딩 (헤더가 부정확해도 정확)
  async function audioBlobDuration(blob) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return 0;
      const ctx = new Ctx();
      const buf = await blob.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      ctx.close();
      return decoded.duration || 0;
    } catch (_) { return 0; }
  }
  function mediaDuration(url, kind) {
    // 일부 WAV/blob 은 메타데이터에서 duration 이 Infinity/NaN 으로 옴 → 끝으로 seek 해 강제 계산
    return new Promise((resolve) => {
      const el = document.createElement(kind === "audio" ? "audio" : "video");
      el.preload = "metadata"; el.src = url;
      let done = false;
      const fin = (d) => { if (!done) { done = true; resolve(isFinite(d) && d > 0 ? d : 0); } };
      el.addEventListener("loadedmetadata", () => {
        if (!isFinite(el.duration) || isNaN(el.duration) || el.duration === 0) {
          try { el.currentTime = 1e7; } catch (_) {}
          el.addEventListener("durationchange", () => { if (isFinite(el.duration) && el.duration > 0) fin(el.duration); });
          el.addEventListener("seeked", () => fin(el.duration));
        } else { fin(el.duration); }
      });
      el.addEventListener("error", () => fin(0));
      setTimeout(() => fin(el.duration || 0), 6000);
    });
  }

  // ── 파일 드래그 기본동작 차단 (capture, 로드 시점) ──────────────
  // 스튜디오 모드에서 영상 파일을 드롭하면 브라우저가 새 탭으로 열어버리는 것을 막고
  // onWindowFileDrop 으로 넘긴다. capture 단계 + 무조건 preventDefault 로 확실히 잡음.
  function _hasFiles(e) {
    const dt = e.dataTransfer; if (!dt) return false;
    if (dt.files && dt.files.length) return true;
    try { return Array.from(dt.types || []).includes("Files"); } catch (_) { return false; }
  }
  window.addEventListener("dragenter", (e) => { if (studioMode() && _hasFiles(e)) e.preventDefault(); }, true);
  window.addEventListener("dragover", (e) => {
    if (studioMode() && _hasFiles(e)) { e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"; }
  }, true);
  window.addEventListener("drop", (e) => {
    if (studioMode() && _hasFiles(e)) { e.preventDefault(); onWindowFileDrop(e); }
  }, true);

  // ── AI 영상: 대본 분석 → 문장별 장면 제안 → 생성/내영상/내사진 ──────
  function openAnalyze() {
    $("#anaResult").hidden = true; $("#anaPick").hidden = false; $("#anaBack").hidden = true;
    const list = $("#anaProjects"); list.innerHTML = "";
    if (!S.scripts.length) {
      list.innerHTML = `<div class="pane-hint">먼저 「대본+나레이션」 탭에서 대본을 만들어 주세요.</div>`;
    }
    S.scripts.forEach((p) => {
      const card = document.createElement("button"); card.className = "concept-card";
      card.innerHTML = `<div class="cc-title">${esc(p.name)}</div><div class="cc-desc">${p.text.length}자 · ${p.narrationId ? "음성·자막 있음" : "대본만"}</div>`;
      card.addEventListener("click", () => analyzeProject(p));
      list.appendChild(card);
    });
    $("#stAnalyzeModal").classList.add("open");
  }
  async function analyzeProject(p) {
    $("#anaPick").hidden = true; $("#anaResult").hidden = false; $("#anaBack").hidden = false;
    const st = $("#anaStatus"); const wrap = $("#anaShots"); wrap.innerHTML = "";
    $("#anaBible").hidden = true; $("#anaBibleBody").textContent = ""; $("#anaGenAll").hidden = true;
    $("#anaBg").hidden = true; $("#anaBgGrid").innerHTML = ""; $("#anaGenImgAll").hidden = true; S.baseBg = null;
    const n = p.narrationId ? S.narrations.find((x) => x.id === p.narrationId) : null;
    const cues = (n && n.cues && n.cues.length) ? n.cues : buildCues(p.text, 0);
    const sysFilm = "너는 AI 영상(Veo·Sora·Grok) 연출 전문가야. 전문가 프롬프트 기법(SAEC: 주제→동작→환경→카메라·조명·렌즈)을 따르고, 구체적 카메라 용어(dolly in, tracking, orbit, crane, low-angle, bokeh, 35mm/85mm/anamorphic)를 쓰며 '시네마틱'·'역동적' 같은 모호어는 피한다. 한국어로 답해.";
    let bible = "";
    // ① 통일 배경(스타일 가이드)
    st.textContent = "통일 배경(스타일 가이드)을 잡는 중…";
    try {
      bible = await geminiText(
        `인테리어 시공 홍보 영상 대본 전체야:\n"""${p.text}"""\n\n모든 컷이 한 편의 영상처럼 보이도록 일관 적용할 '영상 스타일 가이드'를 5줄 이내로 제시해줘. 반드시 포함: ① 배경/공간 ② 색감 팔레트 ③ 조명(시간대·질감) ④ 카메라·렌즈 룩(예: 35mm, 얕은 심도, 안정적 짐벌) ⑤ 전체 분위기. 항목명: 값 형식으로 간결하게.`,
        sysFilm);
      $("#anaBibleBody").textContent = bible; $("#anaBible").hidden = false;
      $("#anaBg").hidden = false;   // 기본 배경 고르기 노출
    } catch (e) { st.textContent = "스타일 가이드 실패: " + e.message; }
    // ② 문장별 실제 생성 프롬프트 (와이드/미디엄/디테일 리듬 + 연속성)
    st.textContent = "장면별 영상 생성 프롬프트를 만드는 중…";
    let shots = [];
    try {
      const numbered = cues.map((c, i) => `${i + 1}. ${c.text}`).join("\n");
      const out = await geminiText(
        `[스타일 가이드]\n${bible}\n\n위 스타일 가이드를 모든 장면에 일관 적용해, 아래 나레이션 문장 각각에 들어갈 '실제 영상 생성 프롬프트'를 만들어줘.\n규칙:\n- SAEC 구조(주제→동작→환경→카메라·조명·렌즈)로, 그대로 영상 생성기에 넣을 수 있는 완성형.\n- 장면 리듬을 위해 [와이드](설정/공간 전체) · [미디엄](핵심 요소) · [디테일](마감·질감 클로즈업) 샷을 적절히 번갈아 배치.\n- 앞뒤 장면과 공간·조명·시점이 자연스럽게 이어지도록(연속성).\n- 구체적 카메라 무빙/렌즈/조명 명시, 모호어 금지.\n- 정확히 ${cues.length}줄. 각 줄은 "번호. [샷종류] 프롬프트" 형식. 머리말·설명·맺음말·빈 줄 없이 번호 줄만 출력.\n\n[나레이션 문장]\n${numbered}`,
        sysFilm);
      // 번호로 시작하는 줄만 추출 (머리말/맺음말 제거). 부족하면 일반 파싱.
      const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const numberedLines = lines.filter((l) => /^\d+[.)]/.test(l));
      const base = (numberedLines.length >= Math.ceil(cues.length * 0.6)) ? numberedLines : lines;
      shots = base.slice(0, cues.length).map((l) => l.replace(/^\s*\d+[.)]?\s*/, "").replace(/\*\*/g, "").trim());
    } catch (e) { st.textContent = "프롬프트 생성 실패: " + e.message + " (직접 입력 가능)"; }
    st.textContent = `${cues.length}개 장면 — 프롬프트를 확인·수정하고 🎬AI 생성 / 📁내 영상 / 🖼내 사진을 넣으세요.`;
    cues.forEach((c, i) => {
      const desc = shots[i] ? shots[i].replace(/^\s*\d+[.)]?\s*/, "") : "";
      wrap.appendChild(shotRow(c, desc, i));
    });
    if (cues.length) { $("#anaGenAll").hidden = false; $("#anaGenImgAll").hidden = false; }
  }
  // 모든 장면 영상을 순차 AI 생성 (참조사진 없으면 시작 이미지 자동 생성)
  async function genAllShots() {
    const xk = xkey(); if (!xk) { $("#anaStatus").textContent = "xAI 키가 필요해요(상단)."; return; }
    const rows = [...document.querySelectorAll("#anaShots .shot-row")];
    if (!rows.length) return;
    $("#anaGenAll").disabled = true;
    showBusy("🎬 전체 장면 영상 생성 중…");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prompt = row.querySelector(".shot-desc").value.trim();
      const result = row.querySelector(".shot-result");
      if (!prompt) { continue; }
      $("#stBusyMsg").textContent = `🎬 영상 생성 ${i + 1}/${rows.length}…`;
      result.textContent = "생성 중…";
      try {
        const url = await grokVideo(prompt, null, xk);
        const clip = { id: uid(), name: prompt.slice(0, 14), url, dur: 4 };
        S.videos.unshift(clip);
        insertVideo({ assetId: clip.id, name: clip.name, dur: 4 }, totalDuration());
        result.textContent = "✓ 생성·배치됨";
      } catch (e) { result.textContent = "실패: " + e.message; }
    }
    renderVideos(); hideBusy(); $("#anaGenAll").disabled = false;
    $("#anaStatus").textContent = "전체 생성 완료! 타임라인에 순서대로 배치됐어요.";
  }
  function shotRow(cue, desc, idx) {
    const row = document.createElement("div");
    row.className = "shot-row";
    const setDur = cue.dur || 4;
    row.dataset.dur = setDur;
    row.innerHTML = `
      <div class="shot-mediabox">
        <div class="shot-media" title="사진·영상을 끌어다 놓으세요">
          <img class="shot-media-img" alt="" hidden>
          <video class="shot-media-vid" muted loop playsinline hidden></video>
          <div class="shot-media-empty">사진·영상<br>끌어다 놓기</div>
          <button type="button" class="shot-media-clear" title="비우기" hidden>×</button>
        </div>
        <input type="range" class="shot-pan" min="0" max="100" value="50" title="좌우 위치 이동" hidden>
      </div>
      <div class="shot-cue">#${idx + 1} ${esc(cue.text)}</div>
      <textarea class="shot-desc" placeholder="이 장면에 넣을 영상 설명">${esc(desc)}</textarea>
      <div class="shot-actions">
        <button class="btn btn-primary shot-img">🖼 AI 사진</button>
        <button class="btn shot-ai">🎬 AI 영상</button>
        <label class="btn shot-myvid">📁 내 영상<input type="file" accept="video/*" hidden></label>
        <label class="btn shot-myphoto">🖼 내 사진<input type="file" accept="image/*" hidden></label>
      </div>
      <div class="shot-result"></div>`;
    const result = row.querySelector(".shot-result");
    const slot = row.querySelector(".shot-media");
    const imgEl = row.querySelector(".shot-media-img");
    const vidEl = row.querySelector(".shot-media-vid");
    const emptyEl = row.querySelector(".shot-media-empty");
    const clearBtn = row.querySelector(".shot-media-clear");
    const pan = row.querySelector(".shot-pan");

    // 슬롯 미리보기 그리기 (세로형 cover + 좌우 위치)
    function renderPreview() {
      const c = row._clip;
      if (!c) {
        imgEl.hidden = true; imgEl.removeAttribute("src");
        vidEl.hidden = true; try { vidEl.pause(); } catch (_) {} vidEl.removeAttribute("src");
        emptyEl.hidden = false; clearBtn.hidden = true; pan.hidden = true;
        return;
      }
      emptyEl.hidden = true; clearBtn.hidden = false; pan.hidden = false;
      const px = (typeof c.panX === "number") ? c.panX : 50;
      pan.value = px;
      const pos = px + "% center";
      if (c.isImage) {
        vidEl.hidden = true; try { vidEl.pause(); } catch (_) {}
        imgEl.hidden = false;
        if (imgEl.getAttribute("src") !== c.url) imgEl.src = c.url;
        imgEl.style.objectPosition = pos;
      } else {
        imgEl.hidden = true;
        vidEl.hidden = false;
        if (vidEl.getAttribute("src") !== c.url) vidEl.src = c.url;
        vidEl.style.objectPosition = pos;
        vidEl.play().catch(() => {});
      }
    }

    // 이 자막행이 소유한 클립을 교체(또는 null로 비우기). 타임라인의 같은 위치를 유지.
    function setMedia(clip) {
      let at = null;
      if (row._clip) {
        at = S.timeline.video.findIndex((b) => b.assetId === row._clip.id);
        if (at >= 0) S.timeline.video.splice(at, 1);
        S.clips = S.clips.filter((c) => c.id !== row._clip.id);
        S.videos = S.videos.filter((v) => v.id !== row._clip.id);
      }
      row._clip = clip || null;
      if (clip) {
        if (typeof clip.panX !== "number") clip.panX = 50;
        const blk = { id: uid(), assetId: clip.id, kind: "video", name: clip.name, dur: clip.dur || setDur, start: 0, in: 0 };
        if (at == null || at < 0) S.timeline.video.push(blk);
        else S.timeline.video.splice(at, 0, blk);
      }
      repackVideo(); renderClips(); renderVideos(); renderTimeline();
      renderPreview();
    }
    row._setMedia = setMedia;

    // 좌우 위치 슬라이더 — 가로 사진을 세로에 채울 때 남는 좌우를 이동
    pan.addEventListener("input", () => {
      if (!row._clip) return;
      row._clip.panX = +pan.value;
      renderPreview();
      if (S.curVideoBlock && S.curVideoBlock.assetId === row._clip.id) applyFrame(S.playhead, S.playing);
      scheduleSave();
    });
    clearBtn.addEventListener("click", (e) => { e.stopPropagation(); setMedia(null); result.textContent = "비웠어요"; });

    // 슬롯에 사진/영상 파일 드롭
    slot.addEventListener("dragover", (e) => { if (Array.from(e.dataTransfer.types || []).includes("Files")) { e.preventDefault(); slot.classList.add("drop-hot"); } });
    slot.addEventListener("dragleave", () => slot.classList.remove("drop-hot"));
    slot.addEventListener("drop", (e) => {
      slot.classList.remove("drop-hot");
      const f = Array.from(e.dataTransfer.files || []).find((x) => /^image\//.test(x.type) || /^video\//.test(x.type));
      if (!f) return;
      e.preventDefault(); e.stopPropagation();
      const p = /^image\//.test(f.type) ? addImageClip(f, setDur) : addClip(f, { silent: true });
      p.then((clip) => { if (clip) { setMedia(clip); result.textContent = "✓ 넣었어요"; } });
    });

    row.querySelector(".shot-img").addEventListener("click", async (e) => {
      const prompt = row.querySelector(".shot-desc").value.trim();
      if (!prompt) { result.textContent = "장면 설명을 입력하세요."; return; }
      if (!gkey()) { result.textContent = "Gemini 키 필요(상단)"; return; }
      e.target.disabled = true; result.textContent = "이미지 생성 중…"; showBusy(S.baseBg ? "🖼 기본 배경 참조로 이미지 생성 중…" : "🖼 이미지 생성 중…");
      try {
        const uri = await genImage(prompt, S.baseBg ? [S.baseBg] : []);
        const clip = addImageClipFromUri(uri, prompt, setDur);
        setMedia(clip);
        result.textContent = "✓ 이미지 생성·배치됨";
      } catch (err) { result.textContent = "실패: " + err.message; }
      finally { e.target.disabled = false; hideBusy(); }
    });
    row.querySelector(".shot-ai").addEventListener("click", async (e) => {
      const prompt = row.querySelector(".shot-desc").value.trim();
      if (!prompt) { result.textContent = "장면 설명을 입력하세요."; return; }
      const xk = xkey(); if (!xk) { result.textContent = "xAI 키 필요(상단)"; return; }
      e.target.disabled = true; result.textContent = "영상 생성 중…"; showBusy("🎬 장면 영상 생성 중…");
      try {
        const vid = await grokVideo(prompt, null, xk);
        const clip = { id: uid(), name: prompt.slice(0, 14), url: vid, dur: setDur };
        S.videos.unshift(clip); renderVideos();
        setMedia(clip);
        result.textContent = "✓ 생성·배치됨";
      } catch (err) { result.textContent = "실패: " + err.message; }
      finally { e.target.disabled = false; hideBusy(); }
    });
    row.querySelector(".shot-myvid input").addEventListener("change", (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      addClip(f, { silent: true }).then((clip) => { if (clip) { setMedia(clip); result.textContent = "✓ 내 영상 배치됨"; } });
    });
    row.querySelector(".shot-myphoto input").addEventListener("change", (ev) => {
      const f = ev.target.files[0]; if (!f) return;
      addImageClip(f, setDur).then((clip) => { if (clip) { setMedia(clip); result.textContent = "✓ 내 사진 배치됨"; } });
    });

    // 처음 첨부한 사진을 기본 배경으로 자동 적용
    if (S.baseBg) {
      const clip = addImageClipFromUri(S.baseBg, cue.text || "장면", setDur);
      setMedia(clip);
    } else {
      renderPreview();
    }
    return row;
  }
  function addImageClip(file, dur) {
    return new Promise((resolve) => {
      if (!file || !/^image\//.test(file.type)) { resolve(null); return; }
      const url = URL.createObjectURL(file);
      const clip = { id: uid(), name: file.name.replace(/\.[^.]+$/, "").slice(0, 14), url, dur: dur || 4, isImage: true };
      S.clips.unshift(clip); renderClips(); resolve(clip);
    });
  }
  // Gemini 이미지 생성 → dataURI 반환. refImages(dataURI[]) 를 참조로 넘기면 일관성 유지.
  async function genImage(prompt, refImages) {
    const key = gkey();
    if (!key) throw new Error("이미지 생성에 Gemini 키가 필요해요(상단)");
    const body = { prompt, gemini_api_key: key, apiKey: key };
    body.aspect_ratio = S.aspect === "9:16" ? "9:16" : "16:9";
    const imgs = (refImages || []).filter(Boolean);
    if (imgs.length) body.images = imgs;
    const r = await fetch(`${API_BASE}/api/gemini-image`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok || !j.b64_json) throw new Error(j.error || j.message || "이미지 생성 실패");
    return "data:" + (j.mime_type || "image/png") + ";base64," + j.b64_json;
  }
  // 시작 이미지(영상용) — 기본 배경이 있으면 참조로 사용해 일관성 유지
  async function genStartImage(prompt) {
    return genImage(prompt, S.baseBg ? [S.baseBg] : []);
  }
  // dataURI 를 바로 사진 클립으로 등록
  function addImageClipFromUri(uri, name, dur) {
    const clip = { id: uid(), name: (name || "장면").slice(0, 14), url: uri, dur: dur || 4, isImage: true };
    S.clips.unshift(clip); renderClips();
    return clip;
  }
  // 스타일 가이드 기반 기본 배경 3개 제안
  async function proposeBackgrounds() {
    const bible = $("#anaBibleBody").textContent.trim();
    if (!gkey()) { $("#anaStatus").textContent = "Gemini 키가 필요해요(상단)."; return; }
    const btn = $("#anaBgGen"); btn.disabled = true;
    const grid = $("#anaBgGrid"); grid.innerHTML = "";
    showBusy("🎨 기본 배경 3개 생성 중…");
    let bgPrompt = bible;
    try {
      bgPrompt = await geminiText(
        `[스타일 가이드]\n${bible}\n\n이 가이드에 맞는 '기본 배경 공간' 이미지를 만들 영어 이미지 생성 프롬프트를 한 줄로 만들어줘. 인테리어 시공이 끝난 깔끔한 빈 공간(사람·글자·로고 없음), 광고 영상의 기준 배경이 될 만한 장면. 프롬프트 문장만 출력.`,
        "너는 이미지 생성 프롬프트 전문가야. 영어 프롬프트만 한 줄로 출력해.");
    } catch (e) { bgPrompt = bible; }
    let made = 0;
    const moods = ["bright airy daylight, wide establishing angle", "warm cozy evening light, eye-level angle", "cool modern editorial light, slightly low angle"];
    for (let i = 0; i < 3; i++) {
      $("#stBusyMsg").textContent = `🎨 배경 ${i + 1}/3 생성 중…`;
      try {
        const uri = await genImage(`${bgPrompt} — ${moods[i]}. Empty interior space, no people, no text.`, []);
        grid.appendChild(bgCard(uri)); made++;
      } catch (e) { /* skip 한 장 실패해도 계속 */ }
    }
    hideBusy(); btn.disabled = false;
    $("#anaStatus").textContent = made ? "마음에 드는 배경을 클릭해 기본 배경으로 선택하세요." : "배경 생성 실패 — 키와 네트워크를 확인하세요.";
  }
  function bgCard(uri) {
    const d = document.createElement("button");
    d.className = "ana-bg-card";
    const img = document.createElement("img"); img.src = uri; img.alt = "배경 후보";
    const tag = document.createElement("span"); tag.className = "ana-bg-pick"; tag.textContent = "이 배경 선택";
    d.appendChild(img); d.appendChild(tag);
    d.addEventListener("click", () => {
      S.baseBg = uri;
      [...document.querySelectorAll(".ana-bg-card")].forEach((c) => c.classList.remove("sel"));
      d.classList.add("sel");
      $("#anaGenImgAll").hidden = false;
      $("#anaStatus").textContent = "✓ 기본 배경 선택됨 — 「전체 장면 이미지 생성」을 누르면 이 배경을 참조해 일관된 장면들을 만들어요.";
    });
    return d;
  }
  // 모든 장면을 기본 배경 참조로 이미지 생성 → 타임라인 배치
  async function genAllImages() {
    if (!gkey()) { $("#anaStatus").textContent = "Gemini 키가 필요해요(상단)."; return; }
    const rows = [...document.querySelectorAll("#anaShots .shot-row")];
    if (!rows.length) return;
    const ref = S.baseBg ? [S.baseBg] : [];
    $("#anaGenImgAll").disabled = true;
    showBusy(S.baseBg ? "🖼 기본 배경 참조로 전체 장면 이미지 생성 중…" : "🖼 전체 장면 이미지 생성 중…");
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prompt = row.querySelector(".shot-desc").value.trim();
      const result = row.querySelector(".shot-result");
      if (!prompt) continue;
      $("#stBusyMsg").textContent = `🖼 이미지 생성 ${i + 1}/${rows.length}…`;
      result.textContent = "이미지 생성 중…";
      try {
        const uri = await genImage(prompt, ref);
        const clip = addImageClipFromUri(uri, prompt, 4);
        insertVideo({ assetId: clip.id, name: clip.name, dur: 4 }, totalDuration());
        result.textContent = "✓ 이미지 생성·배치됨";
      } catch (e) { result.textContent = "실패: " + e.message; }
    }
    hideBusy(); $("#anaGenImgAll").disabled = false;
    $("#anaStatus").textContent = S.baseBg ? "전체 장면 이미지 완료! 같은 배경으로 일관되게 타임라인에 배치됐어요." : "전체 장면 이미지 완료! (기본 배경을 고르면 더 일관돼요)";
  }
  // grok 영상 생성 → 완성 URL 반환 (xAI 는 image-to-video 라 이미지 필수 → 없으면 자동 생성)
  async function grokVideo(prompt, imageDataUri, xk) {
    let img = imageDataUri;
    if (!img) img = await genStartImage(prompt);
    const startBody = { action: "video_start", prompt, xai_api_key: xk, image: img };
    let r = await fetch(`${API_BASE}/api/grok-xai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(startBody) });
    let j = await r.json();
    if (!r.ok) throw new Error(j.message || j.error || `HTTP ${r.status}`);
    const vid = j.id || j.video_id || j.request_id;
    let url = j.video_url || j.url || null; let tries = 0;
    while (!url && vid && tries < 60) {
      await new Promise((res) => setTimeout(res, 5000)); tries++;
      r = await fetch(`${API_BASE}/api/grok-xai`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "video_poll", id: vid, xai_api_key: xk }) });
      j = await r.json();
      if (j.status && /fail|error/i.test(j.status)) throw new Error(j.message || j.status);
      url = j.video_url || j.url || (j.video && j.video.url) || null;
    }
    if (!url) throw new Error("시간 초과");
    return url;
  }

  window.Studio = { init, show, hide };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => { if (document.body.classList.contains("mode-studio")) init(); });
})();
