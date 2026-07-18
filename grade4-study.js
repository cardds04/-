(function () {
  "use strict";

  var app = document.getElementById("app");
  var liveRegion = document.getElementById("liveRegion");
  var headerProgress = document.getElementById("headerProgress");
  var headerProgressText = document.getElementById("headerProgressText");
  var resetDialog = document.getElementById("resetDialog");
  var confirmReset = document.getElementById("confirmReset");
  var DATA = window.GRADE4_STUDY_DATA;
  var REFERENCES = window.GRADE4_STUDY_REFERENCES || {};

  if (!DATA || !Array.isArray(DATA.chapters) || !DATA.chapters.length) {
    app.innerHTML = '<section class="error-card"><div class="big-emoji">📚</div><h1>학습 자료를 열지 못했어요</h1><p>페이지를 새로고침해 주세요. 계속 보이면 공부방으로 돌아갔다가 다시 들어와 주세요.</p><a class="primary-button" href="study-game.html">공부방으로 돌아가기</a></section>';
    return;
  }

  var chapters = DATA.chapters;
  var lessons = [];
  var lessonById = {};
  var questionById = {};
  var questionTotal = 0;
  var answerSlots = makeBalancedAnswerSlots(chapters.reduce(function (sum, chapter) {
    return sum + (chapter.lessons || []).reduce(function (lessonSum, lesson) {
      return lessonSum + (lesson.questions || []).length;
    }, 0);
  }, 0));

  chapters.forEach(function (chapter) {
    (chapter.lessons || []).forEach(function (lesson, lessonIndex) {
      lesson.chapter = chapter;
      lesson.chapterLessonIndex = lessonIndex;
      lessons.push(lesson);
      lessonById[lesson.id] = lesson;
      (lesson.questions || []).forEach(function (question, questionIndex) {
        var questionId = lesson.id + "-q" + (questionIndex + 1);
        question.id = questionId;
        question.lesson = lesson;
        question.questionIndex = questionIndex;
        balanceChoiceOrder(question, answerSlots[questionTotal]);
        questionById[questionId] = question;
        questionTotal += 1;
      });
    });
  });

  var THEMES = {
    "social-1": { image: "assets/grade4-study/chapters/social-1.jpg", color: "#ef8b6c", deep: "#b95841", soft: "#fff0e8", line: "#f2c9b9", icon: "🗺️" },
    "science-1": { image: "assets/grade4-study/chapters/science-1.jpg", color: "#35b893", deep: "#187a5f", soft: "#e9faf4", line: "#b8e7d7", icon: "🔬" },
    "social-2": { image: "assets/grade4-study/chapters/social-2.jpg", color: "#9a7ddd", deep: "#6750a4", soft: "#f2edff", line: "#d7cbf4", icon: "🏘️" },
    "science-2": { image: "assets/grade4-study/chapters/science-2.jpg", color: "#4b9ed3", deep: "#276d9a", soft: "#eaf6fd", line: "#bfdef1", icon: "🌍" }
  };

  var VISUALS = {
    "4사05-01": [["🧭", "🗺️", "⛰️"], "방위·범례·등고선은 지도를 읽는 열쇠예요."],
    "4사05-02": [["📍", "🏘️", "📊"], "여러 지리 정보를 비교하면 지역의 특징이 보여요."],
    "4사06-01": [["🏯", "🏺", "🎶"], "모양이 있는 유산과 사람을 통해 이어지는 유산이 있어요."],
    "4사06-02": [["🏛️", "🔎", "📝"], "질문하고 관찰한 근거로 옛 생활을 알아봐요."],
    "4사07-01": [["🪙", "⚖️", "✏️"], "필요한 정도와 조건을 비교해 알맞게 선택해요."],
    "4사07-02": [["🥕", "🏭", "🤝"], "생산과 소비, 지역 간 교류는 서로 이어져 있어요."],
    "4과09-01": [["🧲", "📎", "🪵"], "자석에 붙는 물체와 붙지 않는 물체를 관찰해요."],
    "4과09-02": [["Ｎ", "🧲", "Ｓ"], "같은 극은 밀고 다른 극은 끌어당겨요."],
    "4과09-03": [["🧲", "🛠️", "💡"], "필요한 기능에 알맞은 자석의 성질을 골라요."],
    "4과10-01": [["🧊", "💧", "☁️"], "물은 고체·액체·기체 상태로 존재해요."],
    "4과10-02": [["❄️", "💧", "♨️"], "얼기·녹기·증발·끓음·응결을 구별해요."],
    "4과10-03": [["☀️", "💨", "💧"], "증발한 물을 응결시켜 다시 모을 수 있어요."],
    "4과11-01": [["🏞️", "➡️", "🏖️"], "흐르는 물은 땅을 깎고 옮기고 쌓아요."],
    "4과11-02": [["🌋", "🪨", "☁️"], "화산에서 나오는 물질과 모형의 한계를 알아봐요."],
    "4과11-03": [["⬛", "🔍", "⬜"], "현무암과 화강암의 겉모습을 관찰해 분류해요."],
    "4과11-04": [["🚨", "🪑", "🏃"], "지진 때는 몸을 보호한 뒤 안전하게 이동해요."],
    "4과12-01": [["🍄", "🦠", "🔬"], "작은 생물도 생김새와 사는 곳이 서로 달라요."],
    "4과12-02": [["🥖", "🧫", "⚠️"], "생물은 상황에 따라 이롭거나 해로운 영향을 줘요."],
    "4과12-03": [["🧬", "💊", "🌱"], "생물의 특징을 음식·의약품·환경에 이용해요."],
    "4사08-01": [["🙋", "💬", "🤲"], "모두 참여하고 소수 의견도 존중하며 결정해요."],
    "4사08-02": [["🏘️", "👨‍👩‍👧‍👦", "📮"], "주민은 여러 방법으로 지역의 일에 참여해요."],
    "4사09-01": [["🔎", "📋", "💡"], "문제와 원인을 조사한 뒤 해결안을 비교해요."],
    "4사09-02": [["📸", "🎪", "🌿"], "지역의 특징을 정확하고 지속가능하게 알려요."],
    "4사10-01": [["🌾", "🏘️", "🏙️"], "옛 자료와 지금 자료를 비교하면 토지 이용과 도시화 과정이 보여요."],
    "4사10-02": [["🏙️", "🚌", "🏠"], "도시의 기능과 생활 모습, 문제를 함께 알아봐요."],
    "4과13-01": [["🌙", "🌓", "🌕"], "지구에서 보이는 달의 모양은 날마다 달라져요."],
    "4과13-02": [["☀️", "🌍", "🪐"], "태양과 여덟 행성은 태양계를 이루어요."],
    "4과13-03": [["⭐", "🧭", "✨"], "별자리로 북극성의 위치를 찾을 수 있어요."],
    "4과14-01": [["🌱", "🐇", "🍄"], "생산자·소비자·분해자가 환경과 관계를 맺어요."],
    "4과14-02": [["🌿", "🦗", "🐸"], "여러 먹이 관계가 연결되면 다른 먹이를 이용할 가능성도 커져요."],
    "4과14-03": [["🏞️", "♻️", "🤲"], "서식지와 생물을 지키는 일을 함께 실천해요."],
    "4과15-01": [["🎈", "⚖️", "💨"], "같은 물체의 공기 넣기 전후 무게를 비교해요."],
    "4과15-02": [["🌡️", "🎈", "💉"], "온도와 누르는 힘에 따라 기체 부피가 달라져요."],
    "4과15-03": [["🫧", "🧯", "🥤"], "기체마다 성질이 달라 생활 속 쓰임도 달라요."],
    "4과15-04": [["💨", "🚀", "🛠️"], "기체의 성질을 이용해 움직이는 장치를 만들어요."],
    "4과16-01": [["📅", "🌡️", "📈"], "오랜 기간의 기록으로 기후 변화 경향을 살펴요."],
    "4과16-02": [["🌊", "🌾", "🏠"], "기후변화는 자연과 사람의 생활에 영향을 줘요."],
    "4과16-03": [["🚲", "🌳", "☂️"], "배출을 줄이는 완화와 피해에 대비하는 적응을 실천해요."]
  };

  function makeBalancedAnswerSlots(count) {
    var slots = [];
    for (var i = 0; i < count; i += 1) slots.push(i % 4);
    var seed = 20260713;
    for (var j = slots.length - 1; j > 0; j -= 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      seed >>>= 0;
      var swapIndex = Math.floor((seed / 4294967296) * (j + 1));
      var temp = slots[j];
      slots[j] = slots[swapIndex];
      slots[swapIndex] = temp;
    }
    return slots;
  }

  function balanceChoiceOrder(question, targetAnswer) {
    if (!question || !Array.isArray(question.choices) || question.choices.length !== 4) return;
    var originalAnswer = Number(question.answer);
    if (originalAnswer < 0 || originalAnswer > 3) return;
    var correctChoice = question.choices[originalAnswer];
    var distractors = question.choices.filter(function (_, index) { return index !== originalAnswer; });
    var seed = 0;
    for (var i = 0; i < question.id.length; i += 1) seed = (seed * 31 + question.id.charCodeAt(i)) >>> 0;
    for (var j = distractors.length - 1; j > 0; j -= 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      var swapIndex = seed % (j + 1);
      var temp = distractors[j];
      distractors[j] = distractors[swapIndex];
      distractors[swapIndex] = temp;
    }
    var balanced = [];
    var distractorIndex = 0;
    for (var slot = 0; slot < 4; slot += 1) {
      balanced.push(slot === targetAnswer ? correctChoice : distractors[distractorIndex++]);
    }
    question.choices = balanced;
    question.answer = targetAnswer;
  }

  function currentKidId() {
    try {
      return localStorage.getItem("family_todos_selected_kid_id") || "";
    } catch (error) {
      return "";
    }
  }

  var kidId = currentKidId();
  var STORAGE_BASE_KEY = "grade4_subject_study_v1";
  var STORAGE_KEY = STORAGE_BASE_KEY + (kidId ? ":" + kidId : "");
  var SYNC_SAVED_AT_KEY = "study_game_local_saved_at_v1" + (kidId ? ":" + kidId : "");
  var state = loadState();
  var currentView = "home";
  var currentLesson = null;
  var currentStep = 0;
  var feedback = null;
  var reviewQuestionId = null;
  var libraryOpen = false;

  function blankState() {
    return {
      version: 1,
      cursor: { lessonId: lessons[0] ? lessons[0].id : "", step: 0 },
      answers: {},
      mastered: {},
      wrong: [],
      updatedAt: Date.now()
    };
  }

  function loadState() {
    var fresh = blankState();
    try {
      var parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!parsed || parsed.version !== 1) return fresh;
      parsed.answers = parsed.answers && typeof parsed.answers === "object" ? parsed.answers : {};
      parsed.mastered = parsed.mastered && typeof parsed.mastered === "object" ? parsed.mastered : {};
      parsed.wrong = Array.isArray(parsed.wrong) ? parsed.wrong.filter(function (id) { return !!questionById[id]; }) : [];
      if (!parsed.cursor || !lessonById[parsed.cursor.lessonId]) parsed.cursor = fresh.cursor;
      parsed.cursor.step = Math.max(0, Math.min(7, Number(parsed.cursor.step) || 0));
      Object.keys(parsed.mastered).forEach(function (code) {
        if (!lessons.some(function (lesson) { return lesson.standard === code; })) delete parsed.mastered[code];
      });
      return parsed;
    } catch (error) {
      return fresh;
    }
  }

  function saveState() {
    state.updatedAt = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(SYNC_SAVED_AT_KEY, String(state.updatedAt));
    } catch (error) {}
    updateHeader();
  }

  function markSyncDirty() {
    try { localStorage.setItem(SYNC_SAVED_AT_KEY, String(Date.now())); } catch (error) {}
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function shortenText(value, limit) {
    var characters = Array.from(String(value == null ? "" : value));
    return characters.length > limit ? characters.slice(0, Math.max(1, limit - 1)).join("") + "…" : characters.join("");
  }

  function chapterKey(chapter) {
    var subject = String(chapter.subject || "").indexOf("과학") >= 0 ? "science" : "social";
    var semester = String(chapter.semester || chapter.title || "").indexOf("2") >= 0 ? "2" : "1";
    return subject + "-" + semester;
  }

  function themeFor(chapter) {
    return THEMES[chapterKey(chapter)] || THEMES["social-1"];
  }

  function themeStyle(chapter) {
    var theme = themeFor(chapter);
    return "--chapter-color:" + theme.color + ";--chapter-deep:" + theme.deep + ";--chapter-soft:" + theme.soft + ";--chapter-line:" + theme.line + ";--card-deep:" + theme.deep + ";--card-soft:" + theme.soft + ";--card-line:" + theme.line;
  }

  function masteredCount() {
    return lessons.filter(function (lesson) { return !!state.mastered[lesson.standard]; }).length;
  }

  function chapterMastered(chapter) {
    return chapter.lessons.filter(function (lesson) { return !!state.mastered[lesson.standard]; }).length;
  }

  function updateHeader() {
    headerProgressText.textContent = masteredCount() + " / " + lessons.length;
  }

  function announce(message) {
    liveRegion.textContent = "";
    window.setTimeout(function () { liveRegion.textContent = message; }, 20);
  }

  function motionBehavior() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function focusRenderedView(preferFeedback) {
    window.setTimeout(function () {
      var target = preferFeedback ? document.getElementById("feedbackBox") : null;
      target = target || app;
      try { target.focus({ preventScroll: true }); }
      catch (error) { target.focus(); }
    }, 30);
  }

  function firstUnmastered(chapter) {
    var source = chapter ? chapter.lessons : lessons;
    return source.find(function (lesson) { return !state.mastered[lesson.standard]; }) || source[0] || lessons[0];
  }

  function resumeLesson() {
    return lessonById[state.cursor.lessonId] || firstUnmastered();
  }

  function totalAttempts() {
    return Object.keys(state.answers).reduce(function (sum, id) { return sum + (Number(state.answers[id].attempts) || 0); }, 0);
  }

  function referenceCount() {
    return lessons.reduce(function (sum, lesson) {
      var group = REFERENCES[lesson.id] || {};
      var pointCount = Array.isArray(group.points) ? group.points.filter(Boolean).length : 0;
      var questionCount = Array.isArray(group.questions) ? group.questions.filter(Boolean).length : 0;
      return sum + pointCount + questionCount + (group.example ? 1 : 0);
    }, 0);
  }

  function renderHome() {
    currentView = "home";
    currentLesson = null;
    feedback = null;
    var learned = masteredCount();
    var next = learned === lessons.length ? lessons[0] : (resumeLesson() || firstUnmastered());
    var nextTheme = themeFor(next.chapter);
    var chapterCards = chapters.map(function (chapter) {
      var theme = themeFor(chapter);
      var done = chapterMastered(chapter);
      var percent = chapter.lessons.length ? Math.round(done / chapter.lessons.length * 100) : 0;
      return '<button class="chapter-card" type="button" data-action="start-chapter" data-chapter="' + escapeHtml(chapter.id) + '" style="' + themeStyle(chapter) + '">' +
        '<span class="chapter-image"><img src="' + theme.image + '" alt="' + escapeHtml(chapter.title) + ' 내용을 표현한 귀여운 학습 삽화" width="960" height="640" loading="lazy"></span>' +
        '<span class="chapter-card-copy"><span class="chapter-tag">' + escapeHtml(chapter.subject) + ' · ' + escapeHtml(chapter.semester) + '학기</span>' +
        '<h3>' + escapeHtml(chapter.title) + '</h3><p>' + escapeHtml(chapter.subtitle || "한 개념씩 그림과 문제로 배워요.") + '</p>' +
        '<span class="mini-progress"><span class="mini-progress-track"><span class="mini-progress-fill" style="--progress:' + percent + '%"></span></span><b>' + done + '/' + chapter.lessons.length + '</b></span></span></button>';
    }).join("");

    var lessonLibrary = "";
    if (libraryOpen) {
      lessonLibrary = '<section class="lesson-browser"><div class="section-heading"><div><h2>📖 전체 38개 개념</h2><p>필요한 개념을 골라 다시 공부할 수도 있어요.</p></div><button type="button" data-action="toggle-library">접기</button></div><div class="lesson-list">' +
        lessons.map(function (lesson) {
          var visual = VISUALS[lesson.standard] || [["📘", "💡", "✅"], "그림을 보고 한 가지씩 배워요."];
          var done = !!state.mastered[lesson.standard];
          return '<button class="lesson-row" type="button" data-action="start-lesson" data-lesson="' + escapeHtml(lesson.id) + '" style="--lesson-soft:' + themeFor(lesson.chapter).soft + '"><span class="lesson-row-icon">' + visual[0][0] + '</span><span><strong>' + escapeHtml(lesson.title) + '</strong><small>' + escapeHtml(lesson.chapter.subject) + ' ' + escapeHtml(lesson.chapter.semester) + '학기 · ' + escapeHtml(lesson.standard) + '</small></span><span class="lesson-state" aria-label="' + (done ? "학습 완료" : "아직 학습하지 않음") + '">' + (done ? "✅" : "○") + '</span></button>';
        }).join("") + '</div></section>';
    }

    app.innerHTML = '<section class="home-hero"><div class="hero-copy"><div class="eyebrow">🌱 외우기보다 이해하기</div><h1>한 번에 <em>한 가지씩</em><br>천천히 배워요</h1><p>귀여운 그림과 미니 도식·비교자료를 먼저 살펴본 다음, 짧은 문제를 풀고 바로 해설을 읽어요. 틀려도 괜찮아요. 참고자료를 보고 다시 풀면 돼요!</p><div class="hero-actions"><button class="primary-button" type="button" data-action="resume">' + (learned ? "이어 공부하기 →" : "첫 개념 시작하기 →") + '</button><button class="secondary-button" type="button" data-action="review">틀린 문제 복습 ' + (state.wrong.length ? "(" + state.wrong.length + ")" : "") + '</button></div></div><div class="hero-art"><img src="' + nextTheme.image + '" alt="아이와 곰 친구가 함께 공부하는 귀여운 삽화" width="960" height="640"><div class="mascot-note">🐻 “말로만 어렵다면, 자료를 눈으로 같이 살펴보자!”</div></div></section>' +
      '<section class="quick-stats" aria-label="학습 현황"><div class="stat-card"><span class="stat-icon">🌱</span><span><strong>' + learned + '개</strong><small>이해한 개념</small></span></div><div class="stat-card"><span class="stat-icon">🧩</span><span><strong>' + referenceCount() + '개</strong><small>시각 참고자료</small></span></div><div class="stat-card"><span class="stat-icon">📝</span><span><strong>' + questionTotal + '문제</strong><small>전체 확인 문제</small></span></div><div class="stat-card"><span class="stat-icon">🔁</span><span><strong>' + state.wrong.length + '개</strong><small>다시 볼 문제</small></span></div></section>' +
      '<section><div class="section-heading"><div><h2>어디부터 공부할까요?</h2><p>사회·과학 1학기와 2학기 내용이 모두 들어 있어요.</p></div><button type="button" data-action="toggle-library">' + (libraryOpen ? "전체 개념 접기" : "전체 개념 보기") + '</button></div><div class="chapter-grid">' + chapterCards + '</div></section>' +
      lessonLibrary +
      '<footer class="home-footer"><span>🐻 오늘은 한 개념만 공부해도 충분해요.</span><button class="text-button" type="button" data-action="progress">전체 진도 보기</button><button class="text-button" type="button" data-action="open-reset">이 아이의 진도 초기화</button></footer>';
    updateHeader();
    window.scrollTo({ top: 0, behavior: motionBehavior() });
    focusRenderedView(false);
  }

  function setCursor(lesson, step) {
    state.cursor = { lessonId: lesson.id, step: step };
    saveState();
  }

  function startLesson(lesson, step) {
    currentLesson = lesson;
    currentStep = Math.max(0, Math.min(7, Number(step) || 0));
    feedback = null;
    setCursor(lesson, currentStep);
    renderStudy();
  }

  function studyTop(lesson) {
    var dots = "";
    for (var i = 0; i < 8; i += 1) {
      dots += '<span class="step-dot ' + (i < currentStep ? "done" : i === currentStep ? "current" : "") + '"></span>';
    }
    return '<div class="study-topbar"><button class="round-button" type="button" data-action="home" aria-label="처음 화면으로">←</button><div class="study-position"><strong>' + escapeHtml(lesson.title) + '</strong><small>' + (lesson.chapterLessonIndex + 1) + '/' + lesson.chapter.lessons.length + '번째 개념 · ' + escapeHtml(lesson.standard) + '</small></div><span class="chapter-chip stage-label" style="margin:0;' + themeStyle(lesson.chapter) + '">' + escapeHtml(lesson.chapter.subject) + ' ' + escapeHtml(lesson.chapter.semester) + '학기</span></div><div class="step-dots" aria-label="이 개념의 학습 단계 ' + (currentStep + 1) + '/8">' + dots + '</div>';
  }

  function conceptVisual(lesson) {
    var visual = VISUALS[lesson.standard] || [["📘", "💡", "✅"], "그림을 보고 한 가지씩 배워요."];
    return '<div class="concept-scene" role="img" aria-label="' + escapeHtml(visual[1]) + '"><div class="concept-emoji-row">' + visual[0].map(function (emoji) { return '<span class="concept-emoji">' + emoji + '</span>'; }).join("") + '</div><span class="visual-caption">' + escapeHtml(visual[1]) + '</span></div>';
  }

  function referenceFor(lesson, pointIndex, useExample) {
    var group = REFERENCES[lesson.id] || {};
    var reference = useExample ? group.example : (Array.isArray(group.points) ? group.points[pointIndex] : null);
    if (reference && Array.isArray(reference.items) && reference.items.length) return reference;
    var visual = VISUALS[lesson.standard] || [["📘", "💡", "✅"], "그림을 보고 한 가지씩 배워요."];
    return {
      badge: "그림 자료",
      title: lesson.title + " 눈으로 보기",
      layout: "flow",
      items: visual[0].map(function (icon, index) {
        return { icon: icon, label: (index + 1) + "번째 단서", text: useExample ? lesson.example : (lesson.points[pointIndex] || lesson.concept) };
      }),
      caption: visual[1],
      check: "그림 속 단서와 설명이 어떻게 이어지는지 손가락으로 짚어 보세요."
    };
  }

  function questionReferenceFor(lesson, questionIndex) {
    var group = REFERENCES[lesson.id] || {};
    var reference = Array.isArray(group.questions) ? group.questions[questionIndex] : null;
    if (reference && Array.isArray(reference.items) && reference.items.length) return reference;
    var question = lesson.questions[questionIndex] || {};
    var answerText = Array.isArray(question.choices) ? question.choices[question.answer] : "정답을 다시 확인해요.";
    return {
      badge: "기본 해설 자료",
      title: "정답 이유 다시 보기",
      layout: "compare",
      items: [
        { icon: "✅", label: "정답", text: shortenText(answerText, 50) },
        { icon: "💡", label: "핵심 이유", text: shortenText(question.explanation || "해설을 천천히 다시 읽어 보세요.", 50) }
      ],
      caption: question.explanation || "문제의 해설을 읽고 정답과 이어지는 단서를 찾아보세요.",
      check: question.hint || "정답과 해설에서 같은 뜻의 단서를 찾아보세요."
    };
  }

  function referenceMaterial(reference, compact) {
    if (!reference || !Array.isArray(reference.items) || !reference.items.length) return "";
    var layout = ["grid", "compare", "flow"].indexOf(reference.layout) >= 0 ? reference.layout : "grid";
    var listTag = layout === "flow" ? "ol" : "ul";
    var listLabel = layout === "flow" ? "순서대로 보는 자료" : (layout === "compare" ? "비교해서 보는 자료" : "함께 살펴보는 자료");
    var items = reference.items.map(function (item) {
      return '<li class="reference-item"><span class="reference-icon" aria-hidden="true">' + escapeHtml(item.icon || "🔎") + '</span><strong>' + escapeHtml(item.label || "살펴보기") + '</strong><p>' + escapeHtml(item.text || "") + '</p></li>';
    }).join("");
    var headingTag = "h2";
    var caption = reference.caption ? '<p class="reference-caption"><span aria-hidden="true">🧩</span>' + escapeHtml(reference.caption) + '</p>' : "";
    var check = reference.check ? '<p class="reference-check"><span aria-hidden="true">👀</span><span><b>자료에서 찾아봐요</b>' + escapeHtml(reference.check) + '</span></p>' : "";
    return '<section class="reference-card layout-' + layout + (compact ? ' compact' : '') + '" aria-label="참고자료: ' + escapeHtml(reference.title || "눈으로 보는 참고자료") + '"><div class="reference-head"><span class="reference-badge">' + escapeHtml(reference.badge || "참고자료") + '</span><div><small>설명에 딱 맞는 참고자료</small><' + headingTag + '>' + escapeHtml(reference.title || "눈으로 보는 참고자료") + '</' + headingTag + '></div></div><' + listTag + ' class="reference-items" aria-label="' + listLabel + '">' + items + '</' + listTag + '>' + caption + check + '</section>';
  }

  function lessonPreview(lesson) {
    var group = REFERENCES[lesson.id] || {};
    if (!Array.isArray(group.points) || !group.points.length) return "";
    var cards = group.points.slice(0, 3).map(function (reference, index) {
      var firstItem = reference && Array.isArray(reference.items) ? reference.items[0] : null;
      return '<span><b aria-hidden="true">' + escapeHtml(firstItem && firstItem.icon ? firstItem.icon : "🔎") + '</b><span><small>' + (index + 1) + '번째 단서</small>' + escapeHtml(reference && reference.title ? reference.title : "눈으로 살펴보기") + '</span></span>';
    }).join("");
    return '<div class="cover-reference"><strong>🧩 이 개념에서 눈으로 볼 자료</strong><div>' + cards + '</div></div>';
  }

  function lessonCover(lesson) {
    var theme = themeFor(lesson.chapter);
    return '<div class="lesson-cover"><div class="lesson-cover-image"><img src="' + theme.image + '" alt="' + escapeHtml(lesson.chapter.title) + ' 내용을 표현한 귀여운 그림" width="960" height="640"></div><div class="lesson-cover-copy"><span class="lesson-number">새 개념 · ' + escapeHtml(lesson.standard) + '</span><h1>' + escapeHtml(lesson.title) + '</h1><p>' + escapeHtml(lesson.concept) + '</p>' + lessonPreview(lesson) + '<div class="cover-promise"><span>🐻</span><span>지금은 외우지 않아도 돼요.<br>미니 그림·비교표·순서 자료를 보며 하나씩 이해해 봐요.</span></div></div></div>';
  }

  function conceptStage(lesson, pointIndex) {
    var point = lesson.points[pointIndex] || lesson.concept;
    return '<div class="study-content"><span class="stage-label">👀 하나만 살펴보기 · ' + (pointIndex + 1) + '/3</span><h1>' + escapeHtml(lesson.title) + '</h1><div class="one-idea"><small>먼저 한 문장으로</small><strong>' + escapeHtml(point) + '</strong></div>' + referenceMaterial(referenceFor(lesson, pointIndex, false), false) + '</div>';
  }

  function exampleStage(lesson) {
    return '<div class="study-content"><span class="stage-label">💡 생활 속 예시</span><h1>이럴 때 생각해 봐요</h1><div class="example-box"><small>곰곰이의 예시</small><p>' + escapeHtml(lesson.example) + '</p></div>' + referenceMaterial(referenceFor(lesson, 0, true), false) + '</div>';
  }

  function answerRecord(questionId) {
    return state.answers[questionId] || { attempts: 0, correct: false };
  }

  function questionBlock(lesson, questionIndex, context) {
    var question = lesson.questions[questionIndex];
    var activeFeedback = feedback && feedback.questionId === question.id ? feedback : null;
    var choices = question.choices.map(function (choice, index) {
      var className = "choice-button";
      var mark = "";
      if (activeFeedback) {
        if (index === question.answer) { className += " is-correct"; mark = "✓"; }
        if (!activeFeedback.correct && index === activeFeedback.selected) { className += " is-wrong"; mark = "×"; }
      }
      return '<button class="' + className + '" type="button" data-choice="' + index + '" data-context="' + context + '"' + (activeFeedback ? " disabled" : "") + '><span class="choice-key">' + (index + 1) + '</span><span>' + escapeHtml(choice) + '</span><span class="choice-mark">' + mark + '</span></button>';
    }).join("");

    var feedbackHtml = "";
    if (activeFeedback) {
      feedbackHtml = activeFeedback.correct
        ? '<div class="feedback-box good" id="feedbackBox" tabindex="-1"><div class="feedback-title">🌟 맞았어요! 왜 그런지 읽어 볼까요?</div><p>' + escapeHtml(question.explanation) + '</p></div>'
        : '<div class="feedback-box try" id="feedbackBox" tabindex="-1"><div class="feedback-title">🌱 괜찮아요. 여기서 다시 생각해 봐요.</div><p>' + escapeHtml(question.explanation) + '</p><p class="feedback-hint">💡 힌트: ' + escapeHtml(question.hint) + '</p></div>';
      feedbackHtml += '<div class="answer-reference"><div class="answer-reference-label">📎 이 문제 전용 참고자료</div>' + referenceMaterial(questionReferenceFor(lesson, questionIndex), true) + '</div>';
    }

    return '<div class="study-content"><p class="question-count">확인 문제 ' + (questionIndex + 1) + ' / 3</p><h1 class="question-title">' + escapeHtml(question.prompt) + '</h1><p class="question-help">정답이라고 생각하는 것을 하나 눌러 주세요. 키보드 숫자 1~4도 사용할 수 있어요.</p><div class="choice-list">' + choices + '</div>' + feedbackHtml + '</div>';
  }

  function studyNav(lesson) {
    var isQuestion = currentStep >= 5;
    var canNext = !isQuestion || (feedback && feedback.correct);
    var nextLabel = currentStep === 7 ? "이 개념 마치기 ✓" : "다음으로 →";
    var nextAction = currentStep === 7 ? "finish-lesson" : "next-step";
    if (isQuestion && feedback && !feedback.correct) {
      return '<nav class="study-nav" aria-label="학습 이동"><button class="soft-button" type="button" data-action="previous-step">← 이전</button><button class="primary-button" type="button" data-action="retry">자료 보고 다시 풀기</button></nav>';
    }
    return '<nav class="study-nav" aria-label="학습 이동"><button class="soft-button" type="button" data-action="previous-step"' + (currentStep === 0 ? " disabled" : "") + '>← 이전</button><button class="primary-button" type="button" data-action="' + nextAction + '"' + (canNext ? "" : " disabled") + '>' + nextLabel + '</button></nav>';
  }

  function renderStudy() {
    currentView = "study";
    var lesson = currentLesson;
    var content = "";
    if (currentStep === 0) content = lessonCover(lesson);
    else if (currentStep >= 1 && currentStep <= 3) content = conceptStage(lesson, currentStep - 1);
    else if (currentStep === 4) content = exampleStage(lesson);
    else content = questionBlock(lesson, currentStep - 5, "study");
    app.innerHTML = '<section class="study-shell" style="' + themeStyle(lesson.chapter) + '">' + studyTop(lesson) + '<article class="study-card">' + content + '</article>' + studyNav(lesson) + '</section>';
    updateHeader();
    window.scrollTo({ top: 0, behavior: motionBehavior() });
    focusRenderedView(!!feedback);
  }

  function recordAnswer(question, selected, context) {
    var record = answerRecord(question.id);
    record.attempts = (Number(record.attempts) || 0) + 1;
    record.correct = selected === question.answer || !!record.correct;
    record.lastAnsweredAt = Date.now();
    state.answers[question.id] = record;
    if (selected === question.answer && context === "review") {
      state.wrong = state.wrong.filter(function (id) { return id !== question.id; });
    } else if (selected !== question.answer && state.wrong.indexOf(question.id) < 0) {
      state.wrong.push(question.id);
    }
    saveState();
    return selected === question.answer;
  }

  function selectChoice(index, context) {
    var lesson;
    var question;
    if (context === "review") {
      question = questionById[reviewQuestionId];
      if (!question) return;
      lesson = question.lesson;
    } else {
      lesson = currentLesson;
      question = lesson.questions[currentStep - 5];
    }
    if (!question || feedback) return;
    var correct = recordAnswer(question, index, context);
    feedback = { questionId: question.id, selected: index, correct: correct };
    announce(correct ? "맞았어요. 해설과 문제 전용 참고자료를 읽고 다음으로 넘어가세요." : "괜찮아요. 해설과 참고자료를 살펴보고 다시 풀어 보세요.");
    if (context === "review") renderReviewQuestion();
    else renderStudy();
  }

  function finishLesson() {
    var lesson = currentLesson;
    state.mastered[lesson.standard] = true;
    var lessonIndex = lessons.indexOf(lesson);
    var nextOrder = lessons.slice(lessonIndex + 1).concat(lessons.slice(0, lessonIndex + 1));
    var next = nextOrder.find(function (item) { return !state.mastered[item.standard]; }) || lessons[0];
    state.cursor = { lessonId: next.id, step: 0 };
    saveState();
    feedback = null;
    renderCompletion(lesson, next);
    announce(lesson.title + " 개념 학습을 마쳤어요.");
  }

  function renderCompletion(lesson, nextLesson) {
    currentView = "completion";
    var attempts = lesson.questions.reduce(function (sum, question) { return sum + (answerRecord(question.id).attempts || 0); }, 0);
    var theme = themeFor(lesson.chapter);
    var allDone = masteredCount() === lessons.length;
    var primaryAction = allDone
      ? (state.wrong.length
          ? '<button class="primary-button" type="button" data-action="review">틀린 문제 복습하기 →</button>'
          : '<button class="primary-button" type="button" data-action="progress">전체 진도 보기 →</button>')
      : '<button class="primary-button" type="button" data-action="start-lesson" data-lesson="' + escapeHtml(nextLesson.id) + '">다음 개념 배우기 →</button>';
    app.innerHTML = '<section class="study-shell" style="' + themeStyle(lesson.chapter) + '"><article class="study-card completion-card"><div class="completion-illustration"><span class="big">🐻</span><span class="spark">✨</span><span class="spark">🌟</span><span class="spark">💛</span></div><span class="stage-label">' + (allDone ? "38개 개념 모두 완료" : "개념 하나 완료") + '</span><h1>' + (allDone ? "사회·과학을 끝까지 배웠어요!" : escapeHtml(lesson.title) + ' 이해 완료!') + '</h1><p>' + (allDone ? "네 학기 내용을 " + referenceCount() + "개 그림·도식·비교자료로 살펴보고 114문제의 해설까지 차근차근 확인했어요. 틀린 문제는 언제든 다시 복습할 수 있어요." : "문제를 맞히는 것보다 참고자료와 해설을 함께 보고 이유를 이해한 것이 더 멋져요. 다음 개념도 지금처럼 천천히 가면 돼요.") + '</p><div class="completion-summary"><div><strong>✅ 3</strong><small>확인한 문제</small></div><div><strong>' + attempts + '번</strong><small>생각한 횟수</small></div><div><strong>' + masteredCount() + '/' + lessons.length + '</strong><small>전체 진도</small></div></div><div class="completion-actions"><button class="secondary-button" type="button" data-action="home">처음 화면</button>' + primaryAction + '</div></article></section>';
    window.scrollTo({ top: 0, behavior: motionBehavior() });
    focusRenderedView(false);
  }

  function renderProgress() {
    currentView = "progress";
    var done = masteredCount();
    var percent = lessons.length ? Math.round(done / lessons.length * 100) : 0;
    var chapterRows = chapters.map(function (chapter) {
      var count = chapterMastered(chapter);
      var theme = themeFor(chapter);
      return '<div class="progress-chapter" style="' + themeStyle(chapter) + '"><span>' + (chapter.emoji || theme.icon) + '</span><span><strong>' + escapeHtml(chapter.title) + '</strong><small>' + escapeHtml(chapter.subject) + ' ' + escapeHtml(chapter.semester) + '학기</small></span><b>' + count + '/' + chapter.lessons.length + '</b></div>';
    }).join("");
    app.innerHTML = '<section class="progress-panel"><div class="panel-head"><h1>나의 학습 진도</h1><button class="round-button" type="button" data-action="home">×</button></div><div class="panel-card"><div class="big-progress"><div class="progress-ring" style="--p:' + percent + '"><strong>' + percent + '%</strong></div><div><h2>' + done + '개의 개념을 이해했어요</h2><p>전부 한 번에 끝낼 필요는 없어요. 한 개념을 제대로 이해할 때마다 초록색 진도가 조금씩 자라요.</p></div></div><div class="progress-chapters">' + chapterRows + '</div></div><div class="home-footer"><span>📝 지금까지 문제를 ' + totalAttempts() + '번 생각해 봤어요.</span><button class="text-button" type="button" data-action="review">틀린 문제 복습</button></div></section>';
    window.scrollTo({ top: 0, behavior: motionBehavior() });
    focusRenderedView(false);
  }

  function startReview() {
    currentView = "review";
    feedback = null;
    reviewQuestionId = state.wrong[0] || null;
    renderReviewQuestion();
  }

  function renderReviewQuestion() {
    currentView = "review";
    var question = questionById[reviewQuestionId];
    if (!question) {
      app.innerHTML = '<section class="progress-panel"><div class="panel-head"><h1>틀린 문제 복습</h1><button class="round-button" type="button" data-action="home">×</button></div><div class="panel-card review-empty"><div class="big-emoji">🌼</div><h2>지금 다시 볼 문제는 없어요!</h2><p>새 개념을 공부하다 틀린 문제가 생기면 여기에 모아 둘게요.</p><button class="primary-button" type="button" data-action="resume">공부 이어가기</button></div></section>';
      focusRenderedView(false);
      return;
    }
    var lesson = question.lesson;
    var feedbackHtml = questionBlock(lesson, question.questionIndex, "review");
    var nav = "";
    if (feedback && feedback.questionId === question.id) {
      nav = feedback.correct
        ? '<nav class="study-nav"><button class="soft-button" type="button" data-action="home">그만하기</button><button class="primary-button" type="button" data-action="next-review">다음 복습 →</button></nav>'
        : '<nav class="study-nav"><button class="soft-button" type="button" data-action="home">그만하기</button><button class="primary-button" type="button" data-action="retry-review">자료 보고 다시 풀기</button></nav>';
    }
    app.innerHTML = '<section class="study-shell" style="' + themeStyle(lesson.chapter) + '"><div class="study-topbar"><button class="round-button" type="button" data-action="home">←</button><div class="study-position"><strong>틀린 문제 복습</strong><small>남은 문제 ' + state.wrong.length + '개</small></div><span class="chapter-chip stage-label" style="margin:0">' + escapeHtml(lesson.title) + '</span></div><article class="study-card">' + conceptVisual(lesson) + feedbackHtml + '</article>' + nav + '</section>';
    window.scrollTo({ top: 0, behavior: motionBehavior() });
    focusRenderedView(!!feedback);
  }

  app.addEventListener("click", function (event) {
    var choice = event.target.closest("[data-choice]");
    if (choice) {
      selectChoice(Number(choice.getAttribute("data-choice")), choice.getAttribute("data-context") || "study");
      return;
    }
    var target = event.target.closest("[data-action]");
    if (!target) return;
    var action = target.getAttribute("data-action");
    if (action === "home") renderHome();
    else if (action === "resume") {
      var resume = resumeLesson() || firstUnmastered();
      startLesson(resume, state.cursor.lessonId === resume.id ? state.cursor.step : 0);
    } else if (action === "start-chapter") {
      var chapter = chapters.find(function (item) { return item.id === target.getAttribute("data-chapter"); });
      if (chapter) startLesson(firstUnmastered(chapter), 0);
    } else if (action === "start-lesson") {
      var lesson = lessonById[target.getAttribute("data-lesson")];
      if (lesson) startLesson(lesson, 0);
    } else if (action === "toggle-library") {
      libraryOpen = !libraryOpen;
      renderHome();
      if (libraryOpen) window.setTimeout(function () { var list = document.querySelector(".lesson-browser"); if (list) list.scrollIntoView({ behavior: motionBehavior(), block: "start" }); }, 50);
    } else if (action === "next-step") {
      if (currentStep < 7) { currentStep += 1; feedback = null; setCursor(currentLesson, currentStep); renderStudy(); }
    } else if (action === "previous-step") {
      if (currentStep > 0) { currentStep -= 1; feedback = null; setCursor(currentLesson, currentStep); renderStudy(); }
    } else if (action === "retry") {
      feedback = null;
      renderStudy();
    } else if (action === "finish-lesson") {
      if (feedback && feedback.correct) finishLesson();
    } else if (action === "progress") renderProgress();
    else if (action === "review") startReview();
    else if (action === "retry-review") { feedback = null; renderReviewQuestion(); }
    else if (action === "next-review") { feedback = null; reviewQuestionId = state.wrong[0] || null; renderReviewQuestion(); }
    else if (action === "open-reset") resetDialog.showModal();
  });

  headerProgress.addEventListener("click", renderProgress);

  confirmReset.addEventListener("click", function () {
    try { localStorage.removeItem(STORAGE_KEY); } catch (error) {}
    markSyncDirty();
    state = blankState();
    libraryOpen = false;
    window.setTimeout(renderHome, 0);
    announce("현재 아이의 학습 진도를 처음으로 되돌렸어요.");
  });

  document.addEventListener("keydown", function (event) {
    if (resetDialog.open) return;
    if ((currentView === "study" && currentStep >= 5) || currentView === "review") {
      var number = Number(event.key);
      if (number >= 1 && number <= 4 && !feedback) {
        event.preventDefault();
        selectChoice(number - 1, currentView === "review" ? "review" : "study");
      }
    }
    if (event.key === "Enter" && feedback && feedback.correct) {
      var nextButton = app.querySelector('[data-action="finish-lesson"], [data-action="next-step"], [data-action="next-review"]');
      if (nextButton && document.activeElement.tagName !== "BUTTON") nextButton.click();
    }
  });

  window.addEventListener("storage", function (event) {
    if ((event.key === "family_todos_selected_kid_id" || event.key === "selectedKidId") && currentKidId() !== kidId) {
      alert("공부하는 아이가 바뀌었어요. 새 아이의 진도를 불러올게요.");
      location.reload();
    }
  });

  updateHeader();
  renderHome();
})();
