/**
 * Vercel Serverless — fal.ai 통합 이미지 생성/편집 엔드포인트.
 *
 * 지원 모델 (body.model 값):
 *   - "flux-pro-ultra"   → fal-ai/flux-pro/v1.1-ultra (text2img, image_url로 ref)
 *   - "recraft-v3"       → fal-ai/recraft-v3 (text2img)
 *   - "imagen-4-ultra"   → fal-ai/imagen4/preview/ultra (text2img)
 *   - "nano-banana-2"    → fal-ai/gemini-3-pro-image/edit (이미지 편집)
 *   - "gpt-image"        → fal-ai/gpt-image-1/edit-image (이미지 편집)
 *
 * 환경: FAL_KEY (선택) — body.fal_api_key 로 덮어쓰기 가능.
 *
 * POST JSON:
 *   {
 *     model:    "flux-pro-ultra" | "recraft-v3" | "imagen-4-ultra" | "nano-banana-2" | "gpt-image",
 *     prompt:   string,
 *     images?:  [dataUri ...]   // 참조/편집용 원본
 *     aspect_ratio?: string,    // "1:1" 같은 표준 ratio
 *     fal_api_key?: string,
 *   }
 *
 * 응답: { ok: true, b64_json, mime_type }  또는  { ok: false, error }
 */

const FAL_QUEUE = "https://queue.fal.run";
const FAL_REST = "https://fal.run";
const POLL_MAX_MS = 270 * 1000;
const POLL_INTERVAL_MS = 1500;
const REF_FETCH_MAX_BYTES = 25 * 1024 * 1024;

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function resolveKey(body) {
  const fromBody = body && typeof body.fal_api_key === "string" ? body.fal_api_key.trim() : "";
  if (fromBody) return fromBody;
  return (process.env.FAL_KEY || process.env.FAL_API_KEY || "").trim();
}

function readJsonBody(req, maxLen = 30 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxLen) {
        reject(new Error("요청 본문이 너무 큽니다. 이미지를 줄이거나 압축하세요."));
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** fal.ai storage 업로드 — data URI 를 https URL 로 바꿔 모델에 넘기기 위함. */
async function uploadDataUriToFal(dataUri, apiKey) {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(String(dataUri || "").trim());
  if (!m) throw new Error("이미지 형식이 올바르지 않습니다(data URI 아님).");
  const mime = m[1].trim() || "image/jpeg";
  const buf = Buffer.from(m[2].replace(/\s/g, ""), "base64");
  if (buf.length > REF_FETCH_MAX_BYTES) {
    throw new Error("참조 이미지가 너무 큽니다(서버 한도 25MB).");
  }
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const filename = `ref_${Date.now()}.${ext}`;

  // 1) initiate
  const initRes = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate", {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ file_name: filename, content_type: mime }),
  });
  if (!initRes.ok) {
    const t = await initRes.text();
    throw new Error(`fal storage initiate 실패: ${initRes.status} ${t.slice(0, 200)}`);
  }
  const init = await initRes.json();
  const uploadUrl = init.upload_url;
  const fileUrl = init.file_url;
  if (!uploadUrl || !fileUrl) throw new Error("fal storage 응답에 URL이 없습니다.");

  // 2) PUT bytes
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": mime },
    body: buf,
  });
  if (!putRes.ok) {
    const t = await putRes.text();
    throw new Error(`fal storage upload 실패: ${putRes.status} ${t.slice(0, 200)}`);
  }
  return fileUrl;
}

function buildModelRequest(modelKey, prompt, refUrls, aspectRatio) {
  const ar = aspectRatio && aspectRatio.toLowerCase() !== "auto" ? aspectRatio : null;

  switch (modelKey) {
    case "flux-pro-ultra":
      return {
        path: "fal-ai/flux-pro/v1.1-ultra",
        input: {
          prompt,
          aspect_ratio: ar || "16:9",
          num_images: 1,
          output_format: "jpeg",
          safety_tolerance: "6",
          ...(refUrls[0] ? { image_url: refUrls[0], image_prompt_strength: 0.45 } : {}),
        },
      };
    case "recraft-v3":
      return {
        path: "fal-ai/recraft-v3",
        input: {
          prompt,
          style: "realistic_image",
          ...(ar ? { image_size: aspectRatioToRecraft(ar) } : {}),
        },
      };
    case "imagen-4-ultra":
      return {
        path: "fal-ai/imagen4/preview/ultra",
        input: {
          prompt,
          aspect_ratio: ar || "16:9",
          num_images: 1,
          output_format: "jpeg",
        },
      };
    case "nano-banana-2":
      return {
        path: refUrls.length
          ? "fal-ai/gemini-3-pro-image/edit"
          : "fal-ai/gemini-3-pro-image",
        input: {
          prompt,
          num_images: 1,
          output_format: "jpeg",
          ...(refUrls.length ? { image_urls: refUrls.slice(0, 4) } : {}),
        },
      };
    case "gpt-image":
      return {
        path: refUrls.length
          ? "fal-ai/gpt-image-1/edit-image/byok"
          : "fal-ai/gpt-image-1/text-to-image/byok",
        input: {
          prompt,
          ...(refUrls.length ? { image_urls: refUrls.slice(0, 4) } : {}),
          quality: "high",
          output_format: "jpeg",
        },
      };
    default:
      throw new Error("지원하지 않는 model입니다: " + modelKey);
  }
}

function aspectRatioToRecraft(ar) {
  const map = {
    "1:1": "square_hd",
    "4:3": "landscape_4_3",
    "3:4": "portrait_4_3",
    "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",
    "3:2": "landscape_4_3",
    "2:3": "portrait_4_3",
  };
  return map[ar] || "square_hd";
}

async function submitAndWait(modelPath, input, apiKey) {
  const submitRes = await fetch(`${FAL_QUEUE}/${modelPath}`, {
    method: "POST",
    headers: {
      Authorization: `Key ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const submitTxt = await submitRes.text();
  let submitJson;
  try { submitJson = submitTxt ? JSON.parse(submitTxt) : {}; }
  catch { submitJson = { _raw: submitTxt }; }
  if (!submitRes.ok) {
    const msg = submitJson?.detail || submitJson?.error || submitJson?.message || submitTxt || `HTTP ${submitRes.status}`;
    const err = new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
    err.status = submitRes.status >= 400 && submitRes.status < 600 ? submitRes.status : 502;
    throw err;
  }
  const requestId = submitJson.request_id;
  const statusUrl = submitJson.status_url || `${FAL_QUEUE}/${modelPath}/requests/${requestId}/status`;
  const responseUrl = submitJson.response_url || `${FAL_QUEUE}/${modelPath}/requests/${requestId}`;
  if (!requestId) throw new Error("fal.ai 큐 응답에 request_id가 없습니다.");

  const t0 = Date.now();
  while (Date.now() - t0 < POLL_MAX_MS) {
    await sleep(POLL_INTERVAL_MS);
    const sRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    if (!sRes.ok) {
      const t = await sRes.text();
      throw new Error(`상태 확인 실패: ${sRes.status} ${t.slice(0, 200)}`);
    }
    const sJson = await sRes.json();
    const st = String(sJson.status || "").toUpperCase();
    if (st === "COMPLETED") {
      const rRes = await fetch(responseUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const rTxt = await rRes.text();
      let rJson;
      try { rJson = rTxt ? JSON.parse(rTxt) : {}; }
      catch { rJson = { _raw: rTxt }; }
      if (!rRes.ok) {
        throw new Error(`결과 가져오기 실패: ${rRes.status} ${rTxt.slice(0, 200)}`);
      }
      return rJson;
    }
    if (st === "FAILED" || st === "ERROR") {
      const msg = sJson.error || sJson.detail || JSON.stringify(sJson).slice(0, 300);
      throw new Error(`fal.ai 작업 실패: ${msg}`);
    }
  }
  throw new Error("fal.ai 작업 시간 초과 (~4분 대기).");
}

function extractImageUrl(result) {
  if (!result || typeof result !== "object") return null;
  if (Array.isArray(result.images) && result.images.length) {
    const x = result.images[0];
    if (x && typeof x === "object" && x.url) return x.url;
    if (typeof x === "string") return x;
  }
  if (result.image && result.image.url) return result.image.url;
  if (typeof result.image === "string") return result.image;
  if (Array.isArray(result.output) && result.output.length) {
    const x = result.output[0];
    if (x && typeof x === "object" && x.url) return x.url;
    if (typeof x === "string") return x;
  }
  return null;
}

async function fetchImageToBase64(url) {
  const r = await fetch(url, { redirect: "follow" });
  if (!r.ok) throw new Error(`결과 이미지 다운로드 실패: ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  let mime = (r.headers.get("content-type") || "").split(";")[0].trim() || "image/jpeg";
  if (!mime.startsWith("image/")) mime = "image/jpeg";
  return { b64: buf.toString("base64"), mime };
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "POST만 지원합니다." });
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
          "fal.ai API 키가 없습니다. Vercel에 FAL_KEY를 설정하거나 화면에서 키를 입력·저장하세요.",
      });
      return;
    }

    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      res.status(400).json({ ok: false, error: "prompt가 필요합니다." });
      return;
    }

    const modelKey = String(body.model || "").trim();
    const SUPPORTED = ["flux-pro-ultra", "recraft-v3", "imagen-4-ultra", "nano-banana-2", "gpt-image"];
    if (!SUPPORTED.includes(modelKey)) {
      res.status(400).json({
        ok: false,
        error: "model 파라미터가 필요합니다. 지원: " + SUPPORTED.join(", "),
      });
      return;
    }

    const imgs = Array.isArray(body.images) ? body.images.filter((x) => typeof x === "string") : [];

    let refUrls = [];
    for (const uri of imgs.slice(0, 4)) {
      const url = await uploadDataUriToFal(uri, apiKey);
      refUrls.push(url);
    }

    const aspect = String(body.aspect_ratio || "").trim();
    const { path, input } = buildModelRequest(modelKey, prompt, refUrls, aspect);

    const result = await submitAndWait(path, input, apiKey);
    const imgUrl = extractImageUrl(result);
    if (!imgUrl) {
      res.status(502).json({ ok: false, error: "응답에 이미지 URL이 없습니다." });
      return;
    }
    const { b64, mime } = await fetchImageToBase64(imgUrl);

    res.status(200).json({
      ok: true,
      b64_json: b64,
      mime_type: mime,
      model: modelKey,
    });
  } catch (e) {
    console.error("[api/fal-image]", e);
    const st = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
    res.status(st).json({ ok: false, error: e.message || "서버 오류" });
  }
};
