/**
 * 쇼츠 분석 → 따라 찍는 지시서 (Gemini 영상 이해)
 *
 *   POST { videoId, title? }  → { ok, refAnalysis, guide:{clips...} }
 *
 * Gemini 는 YouTube URL 을 직접 '보고' 분석할 수 있다. 분석 결과를
 * 우리 릴스 지시서(guide) 포맷으로 받아 → reelRenderGuide / reelToEditor 로 재사용.
 *
 * 환경변수: GEMINI_API_KEY (Gemini API 사용 설정 필요)
 *           SHORTS_ANALYZE_MODEL (선택, 기본 gemini-2.5-flash)
 */
"use strict";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function geminiKey() { return String(process.env.GEMINI_API_KEY || "").trim(); }
function model() { return String(process.env.SHORTS_ANALYZE_MODEL || "gemini-2.5-flash").trim(); }

const PROMPT = `유튜브 쇼츠 영상을 보고, 초보자가 비슷하게 '따라 찍을 수 있는' 분석 + 촬영 지시서를 만들어라.
- 한국어. 영상에 실제로 보이는 것 기준(추측 최소화). 화면 자막이 있으면 읽어서 반영.
- 클립은 4~7개. 각 minSec(초)의 합이 영상 길이와 비슷하게.
- 아래 JSON만 출력(설명·코드블록·주석 없이):
{
  "refAnalysis": "이 레퍼가 잘 된 이유(후킹·전개 패턴·음악) 2~3문장",
  "guide": {
    "title": "○○ 따라 만들기",
    "hook": "0~3초 후킹으로 따라 쓸 한 줄",
    "format": "전개 패턴 한마디(예: 정보나열 / 전후비교 / 공간투어 / 반전)",
    "povSpine": "이 영상이 진짜 파는 것(밑에 깔린 메시지) 한 줄",
    "totalSeconds": 정수,
    "clips": [
      { "n":1, "role":"후킹|전개|증거|반전|마무리 등", "minSec":정수,
        "label":"무엇을 찍나(짧게)", "footage":"구체 촬영지시(무엇을·어떤 앵글·동작)",
        "subtitle":"화면 자막(없으면 빈 문자열)", "audio":"음악/소리 분위기", "tip":"따라할 팁(없으면 빈 문자열)" }
    ],
    "shootTips": ["따라 찍을 때 핵심 팁 2~3개"],
    "cta": "마지막 화면 문구"
  }
}`;

async function analyze(videoId, title) {
  const key = geminiKey();
  if (!key) { const e = new Error("GEMINI_API_KEY 가 설정되어 있지 않습니다."); e.status = 500; throw e; }
  videoId = String(videoId || "").trim();
  if (!/^[\w-]{6,20}$/.test(videoId)) { const e = new Error("videoId 가 올바르지 않습니다."); e.status = 400; throw e; }
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const body = {
    contents: [{ parts: [
      { text: PROMPT + (title ? `\n\n참고 제목: ${String(title).slice(0, 120)}` : "") },
      { fileData: { fileUri: url } },
    ] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.6, maxOutputTokens: 4096, thinkingConfig: { thinkingBudget: 0 } },
  };
  const r = await fetch(`${GEMINI_BASE}/${model()}:generateContent?key=${key}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = (data && data.error && data.error.message) || `Gemini 오류 ${r.status}`;
    const e = new Error(msg); e.status = (r.status >= 400 && r.status < 600) ? r.status : 502; throw e;
  }
  let text = "";
  const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  if (Array.isArray(parts)) for (const p of parts) if (p && p.text) text += p.text;
  let out = null;
  try { out = JSON.parse(text); } catch (_) {
    const a = text.indexOf("{"), b = text.lastIndexOf("}");
    if (a >= 0 && b > a) { try { out = JSON.parse(text.slice(a, b + 1)); } catch (__) {} }
  }
  if (!out || !out.guide || !Array.isArray(out.guide.clips) || !out.guide.clips.length) {
    const e = new Error("분석 결과를 읽지 못했어요. 다시 시도해 주세요."); e.status = 502; throw e;
  }
  const g = out.guide;
  g.clips = g.clips.map((c, i) => ({
    n: c.n || i + 1,
    role: c.role || "장면",
    minSec: Math.max(1, Math.min(30, Number(c.minSec) || 3)),
    label: c.label || "",
    footage: c.footage || "",
    subtitle: c.subtitle || "",
    audio: c.audio || "",
    tip: c.tip || "",
  }));
  g.totalClips = g.clips.length;
  if (!g.totalSeconds) g.totalSeconds = g.clips.reduce((s, c) => s + (c.minSec || 0), 0);
  return { status: 200, json: { ok: true, refAnalysis: out.refAnalysis || "", guide: g, videoId } };
}

// 레퍼 구조를 사용자 주제·컨셉으로 변형 → 컷마다 원본(orig)+내버전(mine)
const ADAPT_PROMPT = `유튜브 쇼츠를 보고, 그 '구조·패턴'을 사용자의 주제·컨셉으로 변형한 촬영 지침서를 만들어라.
- 한국어. 각 컷마다 원본(orig: 영상에 실제로 보이는 것)과 내버전(mine: 같은 역할을 사용자 주제·컨셉으로 바꾼 것)을 둘 다 적는다.
- 후킹은 사용자 주제·컨셉에 맞춰 새로 짠다. 클립 4~7개. 각 minSec(초).
- 아래 JSON만 출력(설명·코드블록·주석 없이):
{
  "refAnalysis": "원본이 잘 된 이유(후킹·패턴·음악) 2~3문장",
  "myTitle": "사용자 주제용 제목",
  "myHook": "사용자 주제·컨셉에 맞춘 0~3초 후킹 한 줄",
  "clips": [
    { "n":1, "role":"후킹|전개|증거|반전|마무리 등", "minSec":정수,
      "orig": { "footage":"원본 이 컷이 보여주는 것", "subtitle":"원본 화면 자막" },
      "mine": { "footage":"같은 역할을 사용자 주제·컨셉으로 바꾼 구체 촬영지시(앵글·동작)", "subtitle":"사용자 주제용 화면 자막", "tip":"팁(없으면 빈 문자열)" } }
  ]
}`;
async function adapt(videoId, title, topic, concept) {
  const key = geminiKey();
  if (!key) { const e = new Error("GEMINI_API_KEY 가 설정되어 있지 않습니다."); e.status = 500; throw e; }
  videoId = String(videoId || "").trim();
  if (!/^[\w-]{6,20}$/.test(videoId)) { const e = new Error("videoId 가 올바르지 않습니다."); e.status = 400; throw e; }
  topic = String(topic || "").trim().slice(0, 120); concept = String(concept || "").trim().slice(0, 300);
  if (!topic) { const e = new Error("주제를 입력해 주세요."); e.status = 400; throw e; }
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const ptext = ADAPT_PROMPT + `\n\n사용자 주제: ${topic}\n사용자 컨셉: ${concept || "(자유)"}` + (title ? `\n원본 제목: ${String(title).slice(0, 120)}` : "");
  const body = {
    contents: [{ parts: [{ text: ptext }, { fileData: { fileUri: url } }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.7, maxOutputTokens: 6000, thinkingConfig: { thinkingBudget: 0 } },
  };
  const r = await fetch(`${GEMINI_BASE}/${model()}:generateContent?key=${key}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) { const msg = (data && data.error && data.error.message) || `Gemini 오류 ${r.status}`; const e = new Error(msg); e.status = (r.status >= 400 && r.status < 600) ? r.status : 502; throw e; }
  let text = ""; const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
  if (Array.isArray(parts)) for (const p of parts) if (p && p.text) text += p.text;
  let out = null; try { out = JSON.parse(text); } catch (_) { const a = text.indexOf("{"), b = text.lastIndexOf("}"); if (a >= 0 && b > a) { try { out = JSON.parse(text.slice(a, b + 1)); } catch (__) {} } }
  if (!out || !Array.isArray(out.clips) || !out.clips.length) { const e = new Error("변형 결과를 읽지 못했어요. 다시 시도해 주세요."); e.status = 502; throw e; }
  const clips = out.clips.map((c, i) => ({
    n: c.n || i + 1, role: c.role || "장면", minSec: Math.max(1, Math.min(30, Number(c.minSec) || 3)),
    orig: { footage: (c.orig && c.orig.footage) || "", subtitle: (c.orig && c.orig.subtitle) || "" },
    mine: { footage: (c.mine && c.mine.footage) || "", subtitle: (c.mine && c.mine.subtitle) || "", tip: (c.mine && c.mine.tip) || "" },
  }));
  const guide = {
    title: out.myTitle || (topic + " 영상 지침서"),
    hook: out.myHook || "", format: "", povSpine: "",
    totalClips: clips.length,
    totalSeconds: clips.reduce((s, c) => s + (c.minSec || 0), 0),
    clips: clips.map((c) => ({ n: c.n, role: c.role, minSec: c.minSec, label: c.role, footage: c.mine.footage, subtitle: c.mine.subtitle, audio: "", tip: c.mine.tip })),
    shootTips: [], cta: "",
  };
  return { status: 200, json: { ok: true, refAnalysis: out.refAnalysis || "", topic, concept, myTitle: guide.title, myHook: out.myHook || "", compare: clips, guide, videoId } };
}

async function handleShortsAnalyze({ method, body }) {
  if (String(method || "POST").toUpperCase() !== "POST") return { status: 405, json: { ok: false, error: "POST만 지원합니다." } };
  try {
    if (body && body.topic) return await adapt(body.videoId, body.title, body.topic, body.concept);   // 주제 있으면 변형
    return await analyze(body && body.videoId, body && body.title);                                    // 없으면 단순 분석
  } catch (e) {
    const s = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return { status: s, json: { ok: false, error: e.message || "서버 오류" } };
  }
}

module.exports = { handleShortsAnalyze };
