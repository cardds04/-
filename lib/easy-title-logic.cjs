/**
 * 이지숏폼 '타이틀 메이커' — 문구 + 스타일 → Gemini 이미지로 타이틀 레터링 생성
 * Express(server.js) / Vercel(api/easy-title.js) 공용 로직
 *
 * 입력 body: { text, style }
 * 출력: { ok, image: "data:image/png;base64,...", bg: "#ffffff", style, label }
 *   → 서버는 '평평한 단색 배경'에 글자만 생성해서 raw 이미지로 돌려준다.
 *     배경 제거(투명화)는 클라이언트(브라우저 캔버스)가 bg 색을 키잉해서 처리 → 영상 위 오버레이.
 *
 * 환경 변수:
 *   - GEMINI_API_KEY        (필수)
 *   - GEMINI_TITLE_MODEL    (선택, 기본 gemini-3.1-flash-image-preview)
 */

// 모든 스타일은 '글자 위주 + 평평한 흰 배경'(흰색 글자 채움은 피함 → 흰 배경 키잉이 깨끗)
const DEFAULT_STYLE = "hand";
const TITLE_STYLES = {
  hand:   { label: "🧡 손글씨 오렌지", bg: "#ffffff", prompt: "bold playful Korean brush/marker hand-lettering, one vivid red-orange color (#F0502A), thick rounded strokes, a few small star sparkles and motion accents, energetic trendy variety-caption look" },
  yellow: { label: "📣 예능 옐로",   bg: "#ffffff", prompt: "bold rounded Korean variety-show title lettering, bright YELLOW fill with a thick black outline and a subtle white drop shadow, punchy and fun" },
  red:    { label: "🔴 뉴스 레드",   bg: "#ffffff", prompt: "heavy condensed bold Korean breaking-news style title lettering, bright RED fill with a thick black outline, urgent and dramatic" },
  gold:   { label: "🏆 골드 메탈",   bg: "#ffffff", prompt: "bold Korean title lettering with a metallic GOLD gradient fill (light gold on top to deep gold at the bottom) and a thick black outline, premium blockbuster look" },
  marker: { label: "🖍 형광 마커",   bg: "#ffffff", prompt: "bold BLACK Korean lettering with bright yellow highlighter-marker swashes painted behind the words, casual hand-made note look" },
  mint:   { label: "🩵 민트 팝",     bg: "#ffffff", prompt: "cute bubbly rounded Korean lettering, MINT/teal fill with a navy-blue outline and a soft highlight, friendly and soft" },
  purple: { label: "💜 퍼플 팝",     bg: "#ffffff", prompt: "bold Korean lettering, vivid PURPLE/violet fill with a thick white-then-black double outline and a soft glow, modern trendy" },
};

function styleList() {
  return Object.keys(TITLE_STYLES).map((k) => ({ key: k, label: TITLE_STYLES[k].label, bg: TITLE_STYLES[k].bg }));
}

function buildPrompt(text, sty, hasRef, transparent) {
  // ★중요: 배경만 투명, 글자는 꽉 채워 불투명(속 빈 글자 방지)
  const bg = transparent
    ? "The background — everything OUTSIDE the letters — must be FULLY TRANSPARENT (PNG alpha). But the letters themselves MUST be SOLID and 100% OPAQUE: completely filled in with their color, NEVER hollow, outline-only, or see-through inside."
    : "Place the lettering on a perfectly FLAT SOLID WHITE (#FFFFFF) background (it will be cut out). The letters must be solid and fully filled.";
  if (hasRef) {
    // 사용자 지시 그대로(에디트 방식): 참조 타이틀을 새 문구로 바꾸고, 배경 투명, 참조 느낌 비슷하게
    return `Change the title in this image to this Korean text: "${text}" — keep it perfectly spelled.
Make the background fully transparent.
Keep the title's look and feel similar to the reference image's title.`;
  }
  return `Create Korean title lettering in EXACTLY this style: ${sty.prompt}.
Use this exact Korean text, perfectly spelled, in 1-3 balanced lines: "${text}"
Flat 2D sticker lettering, thick clean strokes, the lettering is the only element.
${bg}
No scene, no objects, no extra words besides the given text.`;
}

// ── OpenAI gpt-image-1 (네이티브 투명 배경 — 키잉 불필요) ──
async function callOpenAIImage(prompt, ref) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) { const e = new Error("OPENAI_API_KEY 가 설정되어 있지 않습니다."); e.status = 500; throw e; }
  const model = String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-1").trim();
  const size = String(process.env.OPENAI_IMAGE_SIZE || "1024x1024").trim();
  const quality = String(process.env.OPENAI_IMAGE_QUALITY || "low").trim();   // 비용 제어 (low/medium/high) — 기본 low(~15원)
  let r;
  if (ref) {
    // 참조 스타일 → edits (멀티파트, 참조 이미지 첨부)
    const fd = new FormData();
    fd.append("model", model); fd.append("prompt", prompt); fd.append("size", size); fd.append("quality", quality);
    fd.append("background", "transparent"); fd.append("output_format", "png");
    fd.append("image", new Blob([Buffer.from(ref.b64, "base64")], { type: ref.mime || "image/png" }), "ref.png");
    r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: "Bearer " + key }, body: fd });
  } else {
    r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify({ model, prompt, size, quality, background: "transparent", output_format: "png", n: 1 }),
    });
  }
  const txt = await r.text();
  let data; try { data = txt ? JSON.parse(txt) : {}; } catch (_) { data = {}; }
  if (!r.ok) {
    const msg = data?.error?.message || `HTTP ${r.status}`;
    const e = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    e.status = r.status >= 400 && r.status < 600 ? r.status : 502; throw e;
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) { const e = new Error("이미지를 생성하지 못했어요. 다시 시도해 주세요."); e.status = 502; throw e; }
  return "data:image/png;base64," + b64;
}

// 참조 이미지 URL → inlineData 파트 (서버가 받아서 인라인)
async function fetchUrlToPart(u) {
  const r = await fetch(u);
  if (!r.ok) throw Object.assign(new Error("참조 이미지를 받지 못했습니다 (" + r.status + ")"), { status: 400 });
  const ct = r.headers.get("content-type") || "image/png";
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) throw Object.assign(new Error("참조 이미지가 너무 큽니다."), { status: 400 });
  return { inlineData: { mimeType: ct.split(";")[0], data: buf.toString("base64") } };
}

async function callGeminiImage(prompt, refPart) {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    const err = new Error("GEMINI_API_KEY 가 설정되어 있지 않습니다.");
    err.status = 500;
    throw err;
  }
  const model = String(process.env.GEMINI_TITLE_MODEL || "gemini-3.1-flash-image-preview").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts = [{ text: prompt }];
  if (refPart) parts.push(refPart);   // 참조 이미지(스타일 가이드)
  const body = {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig: { imageSize: "1K", aspectRatio: "4:3" } },
  };
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const txt = await r.text();
  let data; try { data = txt ? JSON.parse(txt) : {}; } catch (_) { data = {}; }
  if (!r.ok) {
    const msg = data?.error?.message || `HTTP ${r.status}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = r.status >= 400 && r.status < 600 ? r.status : 502;
    throw err;
  }
  if (data?.promptFeedback?.blockReason) {
    const err = new Error("요청이 차단되었습니다: " + JSON.stringify(data.promptFeedback));
    err.status = 400; throw err;
  }
  let b64 = null, mime = "image/png";
  (function walk(o) {
    if (b64 || !o || typeof o !== "object") return;
    if (o.inlineData && o.inlineData.data) { b64 = o.inlineData.data; mime = o.inlineData.mimeType || mime; return; }
    for (const k in o) walk(o[k]);
  })(data);
  if (!b64) {
    const err = new Error("이미지를 생성하지 못했어요. 문구를 줄이거나 다시 시도해 주세요.");
    err.status = 502; throw err;
  }
  return `data:${mime};base64,${b64}`;
}

async function generateTitle(body) {
  const text = String(body?.text || "").trim().slice(0, 60);
  if (!text) { const err = new Error("타이틀 문구를 입력해 주세요."); err.status = 400; throw err; }
  // 참조 이미지(관리자가 지정한 스타일) → {mime, b64} — dataURI 직접 or 스토리지 URL(서버가 받음)
  let ref = null;
  const refImage = typeof body?.refImage === "string" && /^data:image\//.test(body.refImage) ? body.refImage : null;
  const refUrl = typeof body?.refUrl === "string" && /^https:\/\//.test(body.refUrl) ? body.refUrl.trim() : null;
  if (refImage) {
    const m = refImage.match(/^data:([^;]+);base64,(.*)$/);
    if (m) ref = { mime: m[1], b64: m[2] };
  } else if (refUrl) {
    const p = await fetchUrlToPart(refUrl); ref = { mime: p.inlineData.mimeType, b64: p.inlineData.data };
  }
  const styleKey = String(body?.style || "").trim();
  const sty = TITLE_STYLES[styleKey] || TITLE_STYLES[DEFAULT_STYLE];
  const styleOut = ref ? "ref" : (TITLE_STYLES[styleKey] ? styleKey : DEFAULT_STYLE);
  const labelOut = ref ? "📎 참조 스타일" : sty.label;
  // gpt-image-1(네이티브 투명) 전용 — Gemini 폴백 제거(요청). 키 없거나 실패하면 그 오류가 그대로 표시됨.
  const image = await callOpenAIImage(buildPrompt(text, sty, !!ref, true), ref);
  return { ok: true, image, transparent: true, bg: "transparent", provider: "openai", style: styleOut, label: labelOut, text };
}

async function handleEasyTitle(body) {
  const action = String(body?.action || "generate").trim();
  try {
    if (action === "styles") return { status: 200, json: { ok: true, styles: styleList() } };
    if (action === "generate") return { status: 200, json: await generateTitle(body) };
    return { status: 400, json: { ok: false, error: `알 수 없는 action: ${action}` } };
  } catch (e) {
    const status = e?.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    return { status, json: { ok: false, error: e?.message || "서버 오류" } };
  }
}

module.exports = { handleEasyTitle, generateTitle, styleList, TITLE_STYLES, DEFAULT_STYLE };
