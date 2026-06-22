/**
 * 이지숏폼 '타이틀 메이커' — 문구 + 스타일 → AI 이미지로 타이틀 레터링 생성
 * Express(server.js) / Vercel(api/easy-title.js) 공용 로직
 *
 * 입력 body: { text, style }
 * 출력: { ok, image: "data:image/png;base64,...", bg: "#00ff00", style, label }
 *   → 서버는 '평평한 크로마키 배경'에 글자만 생성해서 raw 이미지로 돌려준다.
 *     배경 제거(투명화)는 클라이언트(브라우저 캔버스)가 bg 색을 키잉해서 처리 → 영상 위 오버레이.
 *
 * 환경 변수:
 *   - OPENAI_API_KEY        (기본 엔진 필수)
 *   - OPENAI_IMAGE_MODEL    (선택, 기본 gpt-image-2)
 *   - TITLE_ENGINE          (선택, 기본 openai / gemini 로 되돌릴 수 있음)
 *   - GEMINI_API_KEY        (TITLE_ENGINE=gemini 일 때 필수)
 *   - GEMINI_TITLE_MODEL    (선택, 기본 gemini-3.1-flash-image-preview)
 */

// 모든 스타일은 '글자 위주 + 평평한 크로마키 배경'(초록은 제거용이라 글자에는 쓰면 안 됨)
const DEFAULT_STYLE = "movie";
const TITLE_CHROMA_BG = "#00ff00";
const TITLE_STYLES = {
  hand:   { label: "🧡 손글씨 오렌지", bg: TITLE_CHROMA_BG, prompt: "bold playful Korean brush/marker hand-lettering, one vivid red-orange color (#F0502A), thick rounded strokes, a few small star sparkles and motion accents, energetic trendy variety-caption look" },
  yellow: { label: "📣 예능 옐로",   bg: TITLE_CHROMA_BG, prompt: "bold rounded Korean variety-show title lettering, bright YELLOW fill with a thick black outline and a subtle white drop shadow, punchy and fun" },
  red:    { label: "🔴 뉴스 레드",   bg: TITLE_CHROMA_BG, prompt: "heavy condensed bold Korean breaking-news style title lettering, bright RED fill with a thick black outline, urgent and dramatic" },
  gold:   { label: "🏆 골드 메탈",   bg: TITLE_CHROMA_BG, prompt: "bold Korean title lettering with a metallic GOLD gradient fill (light gold on top to deep gold at the bottom) and a thick black outline, premium blockbuster look" },
  marker: { label: "🖍 형광 마커",   bg: TITLE_CHROMA_BG, prompt: "bold BLACK Korean lettering with bright yellow highlighter-marker swashes painted behind the words, casual hand-made note look" },
  mint:   { label: "🩵 민트 팝",     bg: TITLE_CHROMA_BG, prompt: "cute bubbly rounded Korean lettering, MINT/teal fill with a navy-blue outline and a soft highlight, friendly and soft" },
  purple: { label: "💜 퍼플 팝",     bg: TITLE_CHROMA_BG, prompt: "bold Korean lettering, vivid PURPLE/violet fill with a thick white-then-black double outline and a soft glow, modern trendy" },
  movie:  { label: "🎬 영화 타이틀", bg: TITLE_CHROMA_BG, prompt: "dramatic Korean blockbuster movie-title logo, massive blocky custom letterforms, icy white rough stone texture, chipped edges, diagonal slash cuts, small flying shards around the letters, deep navy/black bevel and outline integrated into the logo, high-impact poster title design" },
};

function styleList() {
  return Object.keys(TITLE_STYLES).map((k) => ({ key: k, label: TITLE_STYLES[k].label, bg: TITLE_STYLES[k].bg }));
}

function chromaInstruction(bgHex = TITLE_CHROMA_BG) {
  return `Create the title on a perfectly flat solid ${bgHex} chroma-key background for background removal.
The background must be one uniform color with no shadows, gradients, texture, reflections, floor plane, or lighting variation.
Keep the title fully separated from the chroma-key background with crisp edges and generous padding.
Do not use ${bgHex} anywhere in the title.
No cast shadow onto the background, no contact shadow, no watermark, no English text.`;
}

function buildPrompt(text, sty, hasRef, transparent) {
  // 기본은 OpenAI/Gemini 모두 크로마키 소스 → 클라이언트가 투명화.
  const bg = transparent
    ? "The background — everything OUTSIDE the letters — must be FULLY TRANSPARENT (PNG alpha). But the letters themselves MUST be SOLID and 100% OPAQUE: completely filled in with their color, NEVER hollow, outline-only, or see-through inside."
    : chromaInstruction(TITLE_CHROMA_BG);
  if (hasRef) {
    // 참조 타이틀을 새 문구로 바꾸고, 참조 느낌 비슷하게, 배경은 위 bg 규칙대로
    return `Change the title in this image to this Korean text: "${text}" — keep it perfectly spelled, keep the word spacing.
Keep the title's look and feel similar to the reference image's title.
${bg}`;
  }
  return `Create Korean title lettering in EXACTLY this style: ${sty.prompt}.
Use this exact Korean text, perfectly spelled, in 1-3 balanced lines: "${text}"
Flat 2D sticker lettering, thick clean strokes, the lettering is the only element.
${bg}
No scene, no objects, no extra words besides the given text.`;
}

// ── OpenAI gpt-image (기본: 크로마키 소스 생성 → 클라이언트 키잉) ──
async function callOpenAIImage(prompt, ref, transparent, modelOverride, qualityOverride) {
  const key = String(process.env.OPENAI_API_KEY || "").trim();
  if (!key) { const e = new Error("OPENAI_API_KEY 가 설정되어 있지 않습니다."); e.status = 500; throw e; }
  const model = String(modelOverride || process.env.OPENAI_IMAGE_MODEL || "gpt-image-2").trim();
  const size = String(process.env.OPENAI_IMAGE_SIZE || "1024x1024").trim();
  const quality = String(qualityOverride || process.env.OPENAI_IMAGE_QUALITY || "medium").trim();
  const common = { model, prompt, size, quality, n: 1 };
  if (transparent) {
    common.background = "transparent";
    common.output_format = "png";
  }
  let r;
  if (ref) {
    // 참조 스타일 → edits (멀티파트, 참조 이미지 첨부)
    const fd = new FormData();
    fd.append("model", model); fd.append("prompt", prompt); fd.append("size", size); fd.append("quality", quality);
    if (transparent) { fd.append("background", "transparent"); fd.append("output_format", "png"); }
    fd.append("image", new Blob([Buffer.from(ref.b64, "base64")], { type: ref.mime || "image/png" }), "ref.png");
    r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: "Bearer " + key }, body: fd });
  } else {
    r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
      body: JSON.stringify(common),
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
  const isSticker = !!body?.sticker;   // 🏷 스티커 모드 — 글씨는 선택, 참조사진 비슷한 느낌의 그래픽 생성
  const text = String(body?.text || "").trim().slice(0, 60);
  if (!text && !isSticker) { const err = new Error("타이틀 문구를 입력해 주세요."); err.status = 400; throw err; }
  // 엔진: 기본 OpenAI(gpt-image). TITLE_ENGINE=gemini 로 되돌릴 수 있음.
  // 🏷 스티커는 환경변수와 무관하게 항상 OpenAI gpt-image-2 + low 로 고정(제미나이 안 씀).
  const engine = isSticker ? "openai" : String(body?.engine || process.env.TITLE_ENGINE || "openai").trim().toLowerCase();
  const openaiModel = isSticker ? "gpt-image-2" : String(process.env.OPENAI_IMAGE_MODEL || "gpt-image-2").trim();
  // 화질: 클라이언트가 low/medium/high 중 선택 가능(없으면 env 기본 → medium). 저화질이 빠르고 쌈.
  const ALLOWED_QUALITY = ["low", "medium", "high"];
  let quality = String(body?.quality || "").trim().toLowerCase();
  if (!ALLOWED_QUALITY.includes(quality)) quality = String(process.env.OPENAI_IMAGE_QUALITY || "medium").trim().toLowerCase();
  if (!ALLOWED_QUALITY.includes(quality)) quality = "medium";
  if (isSticker) quality = "low";   // 스티커는 무조건 low
  // 네이티브 투명 배경(background:transparent)은 gpt-image-1 만 지원. gpt-image-2(및 이후)는 미지원 →
  // 크로마키(초록 #00ff00) 배경으로 생성하고 클라이언트가 그 색을 키잉해서 투명 PNG로 만든다(Gemini와 동일 경로).
  const openaiNativeTransparent = /^gpt-image-1\b/.test(openaiModel);
  // 배경: 투명 지원 모델이면 기본 투명(잔상 없음), 아니면 크로마키. Gemini는 항상 크로마키.
  // TITLE_TRANSPARENT=1 강제 투명 / =0 강제 크로마키 로 덮어쓸 수 있음.
  const _tEnv = String(body?.transparent != null ? body.transparent : (process.env.TITLE_TRANSPARENT || "")).trim();
  const transparent = _tEnv === "1" ? true : _tEnv === "0" ? false : (engine === "openai" && openaiNativeTransparent);
  // 🖊 관리자가 직접 쓴 프롬프트가 최우선 (있으면 참조이미지는 무시 → edits 한글 깨짐 회피)
  const customPrompt = String(body?.customPrompt || "").trim().slice(0, 1500);
  // 참조 이미지 — customPrompt 없을 때만 사용. {mime,b64}=OpenAI용, inlineData=Gemini용
  let ref = null, refPart = null;
  if (!customPrompt) {
    const refImage = typeof body?.refImage === "string" && /^data:image\//.test(body.refImage) ? body.refImage : null;
    const refUrl = typeof body?.refUrl === "string" && /^https:\/\//.test(body.refUrl) ? body.refUrl.trim() : null;
    if (refImage) {
      const m = refImage.match(/^data:([^;]+);base64,(.*)$/);
      if (m) { ref = { mime: m[1], b64: m[2] }; refPart = { inlineData: { mimeType: m[1], data: m[2] } }; }
    } else if (refUrl) {
      refPart = await fetchUrlToPart(refUrl); ref = { mime: refPart.inlineData.mimeType, b64: refPart.inlineData.data };
    }
  }
  const styleKey = String(body?.style || "").trim();
  const sty = TITLE_STYLES[styleKey] || TITLE_STYLES[DEFAULT_STYLE];
  const bgNote = transparent
    ? `\nThe background must be FULLY TRANSPARENT (PNG alpha); the letters must be SOLID and 100% OPAQUE, never hollow or outline-only.`
    : `\n${chromaInstruction(TITLE_CHROMA_BG)}\nThe letters must be SOLID, fully filled, and clearly separated from the chroma-key background.`;
  let prompt, styleOut, labelOut;
  if (isSticker) {
    const refS = refPart ? "Create ONE decorative sticker/graphic element that matches the look, feel, colors and overall style of the reference image (same vibe — do NOT copy it exactly)." : "Create ONE cute, eye-catching decorative sticker/badge graphic suitable as a short-form video overlay.";
    const txtS = text ? `The sticker prominently includes this EXACT Korean text, perfectly spelled, keep word spacing: "${text}".` : "No text — graphic only.";
    prompt = `${refS} ${txtS} A single isolated object centered in frame, bold, clean, high-contrast, with crisp edges so it reads clearly over video.${bgNote}`;
    styleOut = "sticker"; labelOut = "🏷 스티커";
  } else if (customPrompt) {
    let p = /\{문구\}|\{text\}/i.test(customPrompt) ? customPrompt.replace(/\{문구\}|\{text\}/gi, text) : (customPrompt + `\nRender this EXACT Korean text, perfectly spelled, keep the word spacing: "${text}".`);
    p += bgNote;
    prompt = p; styleOut = "custom"; labelOut = "🖊 직접 프롬프트";
  } else {
    prompt = buildPrompt(text, sty, !!refPart, transparent);
    styleOut = refPart ? "ref" : (TITLE_STYLES[styleKey] ? styleKey : DEFAULT_STYLE);
    labelOut = refPart ? "📎 참조 스타일" : sty.label;
  }
  if (engine === "openai") {
    const image = await callOpenAIImage(prompt, ref, transparent, openaiModel, quality);
    return { ok: true, image, transparent, bg: transparent ? "transparent" : TITLE_CHROMA_BG, provider: "openai", model: openaiModel, quality, style: styleOut, label: labelOut, text, usedPrompt: prompt };
  }
  // Gemini — 크로마키 단색 배경으로 생성, 클라이언트가 bg 색을 키잉해 투명 PNG로
  const image = await callGeminiImage(prompt, refPart);
  return { ok: true, image, transparent: false, bg: TITLE_CHROMA_BG, provider: "gemini", model: String(process.env.GEMINI_TITLE_MODEL || "gemini-3.1-flash-image-preview").trim(), style: styleOut, label: labelOut, text, usedPrompt: prompt };
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
