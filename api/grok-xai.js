/**
 * Vercel Serverless — xAI Grok Imagine 이미지·영상 API 프록시
 *
 * 환경 변수: XAI_API_KEY (선택) — 설정 시 클라이언트 키 없이 동작
 * 또는 요청마다 JSON body / Authorization Bearer 로 xai_api_key 전달
 *
 * POST JSON:
 *  - { action: "image", prompt, aspect_ratio?, resolution?, images?: [dataUri...] }
 *  - { action: "video_start", prompt, image (dataUri), duration?, aspect_ratio?, resolution? }
 *  - { action: "video_poll", request_id }
 */

const XAI_VIDEOS = "https://api.x.ai/v1/videos/generations";
const XAI_VIDEO_STATUS = (id) => `https://api.x.ai/v1/videos/${encodeURIComponent(id)}`;
const XAI_IMG_GEN = "https://api.x.ai/v1/images/generations";
const XAI_IMG_EDIT = "https://api.x.ai/v1/images/edits";

const ASPECT_OK = new Set(["16:9", "9:16", "1:1", "4:3", "3:4", "2:3", "3:2", "auto"]);
const RES_VIDEO = new Set(["720p", "480p"]);
const RES_IMAGE = new Set(["1k", "2k"]);

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function resolveKey(req, body) {
  const auth = req.headers.authorization;
  if (auth && typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    const k = auth.slice(7).trim();
    if (k) return k;
  }
  if (body && typeof body.xai_api_key === "string" && body.xai_api_key.trim()) {
    return body.xai_api_key.trim();
  }
  const env = process.env.XAI_API_KEY || process.env.GROK_WEB_DEFAULT_XAI_KEY || "";
  return (env || "").trim();
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

async function xaiJson(method, url, apiKey, body) {
  const headers = { Authorization: `Bearer ${apiKey}` };
  if (body != null && method !== "GET") {
    headers["Content-Type"] = "application/json";
  }
  const r = await fetch(url, {
    method,
    headers,
    body: body != null && method !== "GET" ? JSON.stringify(body) : undefined,
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
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function handleImage(apiKey, body) {
  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    const e = new Error("prompt가 필요합니다.");
    e.status = 400;
    throw e;
  }
  let ar = String(body.aspect_ratio || "16:9").trim();
  if (!ASPECT_OK.has(ar)) ar = "16:9";
  let res = String(body.resolution || "1k").trim().toLowerCase();
  if (!RES_IMAGE.has(res)) res = "1k";

  const images = Array.isArray(body.images) ? body.images.filter((x) => typeof x === "string") : [];
  const ref0 = typeof body.image === "string" ? body.image : null;
  const refs = images.length ? images.slice(0, 5) : ref0 ? [ref0] : [];

  let ep = XAI_IMG_GEN;
  let reqBody;

  if (refs.length >= 2) {
    ep = XAI_IMG_EDIT;
    reqBody = {
      model: "grok-imagine-image",
      prompt,
      aspect_ratio: ar,
      resolution: res,
      images: refs.map((url) => ({ url, type: "image_url" })),
    };
  } else if (refs.length === 1) {
    ep = XAI_IMG_EDIT;
    reqBody = {
      model: "grok-imagine-image",
      prompt,
      aspect_ratio: ar,
      resolution: res,
      image: { url: refs[0], type: "image_url" },
    };
  } else {
    reqBody = {
      model: "grok-imagine-image",
      prompt,
      aspect_ratio: ar,
      resolution: res,
    };
  }

  let data = await xaiJson("POST", ep, apiKey, reqBody);

  if (
    (!data?.data || !data.data[0]) &&
    ep === XAI_IMG_EDIT &&
    refs.length === 1 &&
    reqBody.image
  ) {
    reqBody = {
      model: "grok-imagine-image",
      prompt,
      aspect_ratio: ar,
      resolution: res,
      image: { url: refs[0] },
    };
    data = await xaiJson("POST", ep, apiKey, reqBody);
  }

  const arr = data?.data;
  if (!Array.isArray(arr) || !arr[0]) {
    const e = new Error("응답에 이미지가 없습니다.");
    e.status = 502;
    throw e;
  }
  const item = arr[0];
  return {
    ok: true,
    url: item.url || null,
    b64_json: item.b64_json || null,
  };
}

async function handleVideoStart(apiKey, body) {
  const prompt = String(body.prompt || "").trim();
  const image = typeof body.image === "string" ? body.image.trim() : "";
  if (!prompt || !image) {
    const e = new Error("prompt와 image(데이터 URL 또는 base64)가 필요합니다.");
    e.status = 400;
    throw e;
  }
  const duration = Math.min(15, Math.max(1, parseInt(String(body.duration || "2"), 10) || 2));
  let ar = String(body.aspect_ratio || "16:9").trim();
  if (!ASPECT_OK.has(ar)) ar = "16:9";
  let res = String(body.resolution || "720p").trim().toLowerCase();
  if (!RES_VIDEO.has(res)) res = "720p";

  const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

  const reqBody = {
    model: "grok-imagine-video",
    prompt,
    duration,
    aspect_ratio: ar,
    resolution: res,
    image: { url: imageUrl },
  };

  const data = await xaiJson("POST", XAI_VIDEOS, apiKey, reqBody);
  const rid = data?.request_id;
  if (!rid) {
    const e = new Error("request_id 없음");
    e.status = 502;
    throw e;
  }
  return { ok: true, request_id: rid };
}

async function handleVideoPoll(apiKey, body) {
  const rid = String(body.request_id || "").trim();
  if (!rid) {
    const e = new Error("request_id가 필요합니다.");
    e.status = 400;
    throw e;
  }
  const data = await xaiJson("GET", XAI_VIDEO_STATUS(rid), apiKey, null);
  const out = {
    ok: true,
    status: data.status,
    progress: data.progress != null ? data.progress : null,
    error: data.error || null,
  };
  if (data.status === "done" && data.video?.url) {
    out.video_url = data.video.url;
  }
  return out;
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

    const apiKey = resolveKey(req, body);
    if (!apiKey) {
      res.status(401).json({
        ok: false,
        error: "xAI API 키가 없습니다. Vercel 환경 변수 XAI_API_KEY 를 설정하거나, 화면에서 키를 입력하세요.",
      });
      return;
    }

    const action = String(body.action || "").trim().toLowerCase();
    if (req.method !== "POST" || !action) {
      res.status(405).json({ ok: false, error: "POST 와 action 필드가 필요합니다." });
      return;
    }

    let result;
    if (action === "image") {
      result = await handleImage(apiKey, body);
    } else if (action === "video_start") {
      result = await handleVideoStart(apiKey, body);
    } else if (action === "video_poll") {
      result = await handleVideoPoll(apiKey, body);
    } else {
      res.status(400).json({ ok: false, error: "action은 image, video_start, video_poll 중 하나입니다." });
      return;
    }

    res.status(200).json(result);
  } catch (e) {
    const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    console.error("[api/grok-xai]", e);
    res.status(status).json({
      ok: false,
      error: e.message || "서버 오류",
    });
  }
};
