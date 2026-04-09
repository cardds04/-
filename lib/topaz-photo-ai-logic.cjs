/**
 * Topaz Photo AI CLI upscale(2x) — 로컬 전용
 *
 * IMPORTANT
 * - Vercel(서버리스)에서는 Topaz 앱/CLI를 실행할 수 없습니다.
 * - 로컬에서 server.js로 실행할 때만 동작하도록 설계했습니다.
 *
 * 환경 변수(권장):
 * - TOPAZ_PHOTO_AI_CLI: Photo AI CLI 실행 파일 경로(또는 커맨드)
 *
 * Topaz Photo AI CLI는 버전별로 옵션이 달라질 수 있어,
 * --help를 확인해 가능한 옵션 조합을 "추정"하여 실행합니다.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const MAX_IMAGE_BYTES = 25 * 1024 * 1024; // 25MB

function safeBaseName(name) {
  const stem = String(name || "image").replace(/\.[^.]+$/, "");
  const cleaned = stem.replace(/[^\w.\-\uAC00-\uD7A3]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned || "image";
}

function extForMime(mime) {
  const m = String(mime || "").toLowerCase();
  if (m.includes("jpeg") || m === "image/jpg") return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("png")) return "png";
  return "png";
}

let _cachedHelp = null;
function _runHelp(cli) {
  const r = spawnSync(cli, ["--help"], { encoding: "utf8" });
  const text = String(r.stdout || "") + "\n" + String(r.stderr || "");
  return { ok: r.status === 0 && !r.error, status: r.status, error: r.error, text };
}

function pickCliCommand() {
  const fromEnv = (process.env.TOPAZ_PHOTO_AI_CLI || "").trim();
  if (fromEnv) return [fromEnv];
  // 1) PATH에 등록된 경우
  const list = ["topaz-photo-ai", "topaz_photo_ai", "topazphotoai"];
  // 2) macOS 앱 번들(추정) — 사용자가 여기에 설치한 경우가 많음
  list.push("/Applications/Topaz Photo AI.app/Contents/MacOS/Topaz Photo AI");
  list.push("/Applications/Topaz Photo AI.app/Contents/MacOS/TopazPhotoAI");
  list.push("/Applications/Topaz Photo AI.app/Contents/MacOS/Photo AI");
  // 3) 리브랜딩: Topaz Photo / 외장 SSD 설치 케이스
  list.push("/Applications/Topaz Photo.app/Contents/MacOS/Topaz Photo");
  list.push("/Volumes/ssd/Applications/Topaz Photo.app/Contents/MacOS/Topaz Photo");
  list.push("/Volumes/ssd/Applications/Topaz Photo AI.app/Contents/MacOS/Topaz Photo AI");
  list.push("/Volumes/ssd/Applications/Topaz Photo AI.app/Contents/MacOS/TopazPhotoAI");
  return list;
}

function getCliHelpText(cli) {
  if (_cachedHelp && _cachedHelp.cli === cli) return _cachedHelp.text;
  const r = _runHelp(cli);
  _cachedHelp = { cli, text: r.text, ok: r.ok, error: r.error };
  return r.text;
}

function buildCliArgs(helpText, inputPath, outputPath) {
  const h = String(helpText || "");

  const hasInput = h.includes("--input");
  const hasOutput = h.includes("--output");
  const hasAutopilot = h.toLowerCase().includes("autopilot") && h.includes("--");

  // "2x" upscale control은 CLI에서 직접 지원하지 않는 경우가 많습니다.
  // 가능한 옵션을 감지해 시도하고, 안 되면 Autopilot(환경설정 기반)으로만 처리합니다.
  const supportsUpscale = h.includes("--upscale");
  const supportsScale = h.includes("--scale");

  /** @type {string[]} */
  const args = [];
  if (hasInput) args.push("--input", inputPath);
  if (hasOutput) args.push("--output", outputPath);
  if (!hasInput || !hasOutput) {
    // fallback: positional
    if (!hasInput) args.push(inputPath);
    if (!hasOutput) args.push(outputPath);
  }

  if (hasAutopilot) {
    // 흔한 형태를 최대한 보수적으로
    if (h.includes("--autopilot")) args.push("--autopilot");
    else if (h.includes("--auto")) args.push("--auto");
  }

  // 2x upscale 시도 (지원 시)
  if (supportsUpscale) {
    // --upscale 2 또는 --upscale 2x 둘 중 하나가 먹을 수 있음
    args.push("--upscale", "2");
  } else if (supportsScale) {
    args.push("--scale", "2");
  }

  return args;
}

function runTopazCli(cli, args) {
  const r = spawnSync(cli, args, { encoding: "utf8" });
  return {
    ok: r.status === 0,
    status: r.status,
    stdout: String(r.stdout || ""),
    stderr: String(r.stderr || ""),
  };
}

/**
 * @param {Record<string, unknown>} body
 * @returns {Promise<{ status: number, json: Record<string, unknown> }>}
 */
async function handleTopazUpscaleRequest(body) {
  const b = body && typeof body === "object" ? body : {};
  const fileName = typeof b.fileName === "string" ? b.fileName.trim() : "image.png";
  const mimeType = typeof b.mimeType === "string" ? b.mimeType.trim() : "image/png";
  const imageBase64 = typeof b.imageBase64 === "string" ? b.imageBase64.trim() : "";
  if (!imageBase64) return { status: 400, json: { message: "imageBase64가 필요합니다." } };

  let raw;
  try {
    raw = Buffer.from(imageBase64, "base64");
  } catch {
    return { status: 400, json: { message: "imageBase64가 올바른 base64가 아닙니다." } };
  }
  if (!raw.length) return { status: 400, json: { message: "이미지 데이터가 비어 있습니다." } };
  if (raw.length > MAX_IMAGE_BYTES) {
    return { status: 413, json: { message: `이미지가 너무 큽니다. (${Math.round(raw.length / (1024 * 1024))}MB)` } };
  }

  const candidates = pickCliCommand();
  let cli = candidates[0];
  let helpText = "";
  /** @type {{cli: string, err?: string}[]} */
  const triedHelp = [];
  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const r = _runHelp(cand);
    triedHelp.push({ cli: cand, err: r.error ? String(r.error.code || r.error.message || r.error) : "" });
    if (r.ok && r.text && !/not found|No such file|is not recognized/i.test(r.text)) {
      cli = cand;
      helpText = r.text;
      break;
    }
  }
  if (!helpText) {
    return {
      status: 400,
      json: {
        message:
          "Topaz Photo AI CLI를 찾지 못했습니다. TOPAZ_PHOTO_AI_CLI 환경변수에 CLI 실행 파일 경로(또는 커맨드)를 넣어 주세요.",
        detail:
          "예) TOPAZ_PHOTO_AI_CLI=\"/Applications/Topaz Photo AI.app/Contents/MacOS/Topaz Photo AI\"",
        tried: triedHelp.map((x) => `${x.cli}${x.err ? ` (${x.err})` : ""}`).join(" | "),
      },
    };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "topaz-photo-ai-"));
  const base = safeBaseName(fileName);
  const inExt = extForMime(mimeType);
  const inputPath = path.join(tmpDir, `${base}_in.${inExt}`);
  const outputPath = path.join(tmpDir, `${base}_topaz2x.${inExt}`);

  fs.writeFileSync(inputPath, raw);

  const args = buildCliArgs(helpText, inputPath, outputPath);
  const r = runTopazCli(cli, args);

  if (!r.ok) {
    return {
      status: 502,
      json: {
        message: "Topaz CLI 실행에 실패했습니다.",
        detail: (r.stderr || r.stdout || "").slice(0, 2000),
        tried: [cli].concat(args).join(" "),
      },
    };
  }

  if (!fs.existsSync(outputPath)) {
    return {
      status: 502,
      json: {
        message: "Topaz 출력 파일을 찾지 못했습니다.",
        detail: (r.stderr || r.stdout || "").slice(0, 2000),
        tried: [cli].concat(args).join(" "),
      },
    };
  }

  const out = fs.readFileSync(outputPath);
  const outName = `${base}_토파즈2x.${inExt}`;
  return {
    status: 200,
    json: {
      ok: true,
      name: outName,
      mimeType: mimeType,
      imageBase64: out.toString("base64"),
      tried: [cli].concat(args).join(" "),
    },
  };
}

module.exports = { handleTopazUpscaleRequest };

