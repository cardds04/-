/**
 * Vercel Serverless — Gemini 이미지 생성 (나노바나나2 / Flash Image)
 *
 * 환경: GEMINI_API_KEY (선택), GEMINI_IMAGE_MODEL (기본 gemini-3.1-flash-image-preview)
 * 본문: gemini_api_key 로 키 덮어쓰기 가능
 *
 * POST JSON: { prompt, aspect_ratio?, resolution?, images?: [dataUri...] }
 */

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function resolveKey(body) {
  const fromBody =
    body && typeof body.gemini_api_key === "string" ? body.gemini_api_key.trim() : "";
  if (fromBody) return fromBody;
  return (process.env.GEMINI_API_KEY || "").trim();
}

function readJsonBody(req, maxLen = 12 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxLen) {
        reject(new Error("요청 본문이 너무 큽니다. 참조 이미지를 줄이거나 압축하세요."));
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function dataUriToPart(dataUri) {
  const s = String(dataUri || "").trim();
  const m = /^data:([^;]+);base64,(.+)$/i.exec(s);
  if (!m) return null;
  const mime = m[1].trim() || "image/jpeg";
  const data = m[2].replace(/\s/g, "");
  if (!data) return null;
  return { inlineData: { mimeType: mime, data } };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const body =
      req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)
        ? req.body
        : await readJsonBody(req);

    const apiKey = resolveKey(body);
    if (!apiKey) {
      res.status(401).json({
        ok: false,
        error:
          "Gemini API 키가 없습니다. Vercel에 GEMINI_API_KEY를 설정하거나, 화면에서 키를 입력·저장하세요.",
      });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "POST만 지원합니다." });
      return;
    }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      res.status(400).json({ ok: false, error: "prompt가 필요합니다." });
      return;
    }

    const model =
      (process.env.GEMINI_IMAGE_MODEL || "").trim() || "gemini-3.1-flash-image-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const parts = [{ text: prompt }];
    const imgs = Array.isArray(body.images) ? body.images.filter((x) => typeof x === "string") : [];
    for (const uri of imgs.slice(0, 8)) {
      const p = dataUriToPart(uri);
      if (p) parts.push(p);
    }

    const ar = String(body.aspect_ratio || "").trim();
    const rs = String(body.resolution || "1k").trim().toLowerCase();
    const sizeMap = { "1k": "1K", "2k": "2K", "4k": "4K", "512": "512" };
    const imageSize = sizeMap[rs] || "1K";

    const imgCfg = { imageSize };
    if (ar && ar.toLowerCase() !== "auto") {
      imgCfg.aspectRatio = ar;
    }

    const genBody = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: imgCfg,
      },
    };

    const u = new URL(url);
    u.searchParams.set("key", apiKey);
    const r = await fetch(u.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(genBody),
    });
    const text = await r.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { _raw: text };
    }
    if (!r.ok) {
      const msg = data?.error?.message || data?.message || text || `HTTP ${r.status}`;
      res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({
        ok: false,
        error: typeof msg === "string" ? msg : JSON.stringify(msg),
      });
      return;
    }

    const fb = data.promptFeedback || {};
    if (fb.blockReason) {
      res.status(400).json({ ok: false, error: `요청이 차단되었습니다: ${JSON.stringify(fb)}` });
      return;
    }

    const cands = data.candidates || [];
    let b64 = null;
    let outMime = "image/png";
    for (const c of cands) {
      const plist = (c.content || {}).parts || [];
      for (const p of plist) {
        const inline = p.inlineData || p.inline_data;
        if (inline && inline.data) {
          b64 = inline.data;
          if (inline.mimeType || inline.mime_type) {
            outMime = String(inline.mimeType || inline.mime_type).split(";")[0] || outMime;
          }
          break;
        }
      }
      if (b64) break;
    }

    if (!b64) {
      res.status(502).json({ ok: false, error: "응답에 이미지 데이터가 없습니다." });
      return;
    }

    res.status(200).json({
      ok: true,
      b64_json: b64,
      mime_type: outMime,
    });
  } catch (e) {
    console.error("[api/gemini-image]", e);
    res.status(500).json({ ok: false, error: e.message || "서버 오류" });
  }
};
