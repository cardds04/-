/**
 * Vercel Serverless — Gemini로 이미지 분위기 캡션(텍스트) 생성
 *
 * POST JSON: { gemini_api_key?, image_data_url: "data:image/png;base64,...", author_notes?: string }
 * 환경: GEMINI_API_KEY, GEMINI_CAPTION_MODEL (기본 gemini-2.0-flash)
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
        reject(new Error("요청 본문이 너무 큽니다. 이미지를 줄이거나 JPEG로보내 보세요."));
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

function extractTextFromGeminiJson(data) {
  const cands = data && data.candidates;
  if (!Array.isArray(cands) || !cands.length) return "";
  const parts = cands[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join("")
    .trim();
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
          "Gemini API 키가 없습니다. Vercel에 GEMINI_API_KEY를 설정하거나, 화면에서 Gemini 키를 입력·저장하세요.",
      });
      return;
    }

    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "POST만 지원합니다." });
      return;
    }

    const imageDataUrl = String(body.image_data_url || "").trim();
    const m = /^data:([^;]+);base64,(.+)$/is.exec(imageDataUrl);
    if (!m) {
      res.status(400).json({
        ok: false,
        error: "image_data_url 은 data:image/...;base64,... 형식이어야 합니다.",
      });
      return;
    }
    const mime = (m[1] || "image/png").trim();
    const b64 = m[2].replace(/\s/g, "");
    if (!b64 || b64.length > 10 * 1024 * 1024) {
      res.status(400).json({ ok: false, error: "이미지 데이터가 없거나 너무 큽니다." });
      return;
    }

    const authorNotes = String(body.author_notes || "").trim();
    const model =
      (process.env.GEMINI_CAPTION_MODEL || "").trim() || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const prompt =
      "이 이미지는 인스타그램에 올릴 인테리어(또는 공간) 사진이며, 로고·텍스트가 합성되어 있을 수 있습니다.\n\n" +
      (authorNotes
        ? "작성자가 저장해 둔 로고별 피드 메모(참고용, 그대로 인용하지 말 것):\n" +
          authorNotes +
          "\n\n"
        : "") +
      "한국어로 2~6문장, 분위기·빛·재질·공간의 느낌 위주로 간단히 써 주세요. 해시태그·가격·홍보 문구·지나친 과장은 넣지 마세요. " +
      "인스타그램 캡션에 이어 붙이기 좋은 자연스러운 문단 하나로.";

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }, { inlineData: { mimeType: mime, data: b64 } }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 768,
          temperature: 0.85,
        },
      }),
    });

    const rawText = await r.text();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      res.status(502).json({ ok: false, error: "Gemini 응답 JSON 파싱 실패", raw: rawText.slice(0, 400) });
      return;
    }

    if (!r.ok) {
      const msg =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        `Gemini HTTP ${r.status}`;
      res.status(r.status >= 400 && r.status < 600 ? r.status : 502).json({
        ok: false,
        error: String(msg),
      });
      return;
    }

    const text = extractTextFromGeminiJson(data);
    if (!text) {
      res.status(502).json({
        ok: false,
        error: "모델이 빈 텍스트를 반환했습니다. 다른 이미지로 다시 시도해 보세요.",
      });
      return;
    }

    res.status(200).json({ ok: true, text });
  } catch (e) {
    console.error("[api/gemini-caption]", e);
    res.status(500).json({ ok: false, error: e?.message || "서버 오류" });
  }
};
