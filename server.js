const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT || 8787);
const DATA_DIR = path.join(__dirname, "data");
const STATE_PATH = path.join(DATA_DIR, "shared-state.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(STATE_PATH)) {
  fs.writeFileSync(
    STATE_PATH,
    JSON.stringify({ state: {}, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));

const { handleBlogGenerateRequest, pickGeminiModel } = require("./lib/blog-generate-logic.cjs");

function readState() {
  const raw = fs.readFileSync(STATE_PATH, "utf8");
  const parsed = JSON.parse(raw || "{}");
  const state = parsed && typeof parsed.state === "object" && parsed.state ? parsed.state : {};
  const updatedAt = parsed && parsed.updatedAt ? parsed.updatedAt : null;
  return { state, updatedAt };
}

function writeState(nextState) {
  const payload = {
    state: nextState || {},
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(STATE_PATH, JSON.stringify(payload, null, 2), "utf8");
}

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", async (req, res) => {
  try {
    const { state, updatedAt } = readState();
    res.json({ state, updatedAt });
  } catch (error) {
    res.status(500).json({ message: "Failed to read state." });
  }
});

app.put("/api/state", async (req, res) => {
  try {
    const incoming = req.body && typeof req.body === "object" ? req.body.state : null;
    if (!incoming || typeof incoming !== "object" || Array.isArray(incoming)) {
      return res.status(400).json({ message: "Invalid payload. Expected object at body.state." });
    }
    writeState(incoming);
    const { updatedAt } = readState();
    res.json({ ok: true, updatedAt });
  } catch (error) {
    res.status(500).json({ message: "Failed to write state." });
  }
});

app.get("/inlog", (req, res) => {
  res.sendFile(path.join(__dirname, "inlog.html"));
});

/** 블로그 도우미 — 로직은 lib/blog-generate-logic.cjs (Vercel api/blog-generate.js 와 공유) */
app.post("/api/blog-generate", async (req, res) => {
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const out = await handleBlogGenerateRequest(body);
    res.status(out.status).json(out.json);
  } catch (error) {
    console.error("[blog-generate]", error);
    res.status(500).json({ message: error?.message || "서버 오류" });
  }
});

const SHRINK_SCRIPT = path.join(__dirname, "tools", "blog-photo-shrink", "shrink_photos.py");
const SHRINK_MAX_IMAGES = Math.min(
  800,
  Math.max(1, parseInt(process.env.BLOG_SHRINK_MAX_IMAGES || "400", 10))
);

function assertAllowedShrinkSource(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("공유폴더 경로를 입력하세요.");
  }
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("\0")) {
    throw new Error("경로가 올바르지 않습니다.");
  }
  const resolved = path.resolve(trimmed);
  let real;
  try {
    real = fs.realpathSync.native(resolved);
  } catch {
    throw new Error("폴더를 찾을 수 없습니다. 마운트·경로를 확인하세요.");
  }
  const home = os.homedir();
  const extra = (process.env.BLOG_SHRINK_ALLOWED_PREFIXES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const prefixes = extra.length ? extra : ["/Volumes", home];
  const ok = prefixes.some((p) => {
    const prefix = path.resolve(p);
    return real === prefix || real.startsWith(prefix + path.sep);
  });
  if (!ok) {
    throw new Error(
      "허용되지 않은 경로입니다. 기본은 /Volumes/…(NAS) 또는 홈 폴더 아래만 가능합니다."
    );
  }
  const st = fs.statSync(real);
  if (!st.isDirectory()) {
    throw new Error("폴더가 아닙니다.");
  }
  return real;
}

function countShrinkableImages(dir) {
  const exts = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".heic",
    ".heif",
    ".gif"
  ]);
  let n = 0;
  function walk(d) {
    let entries;
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (ent.name.startsWith(".")) continue;
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (exts.has(path.extname(ent.name).toLowerCase())) {
        n++;
      }
    }
  }
  walk(dir);
  return n;
}

/** 로컬 Mac 전용: 공유폴더 경로의 사진을 JPEG로 줄인 뒤 ZIP으로 내려받기 (원본 삭제 없음) */
app.post("/api/blog-photo-shrink", (req, res) => {
  if (process.env.BLOG_SHRINK_API === "0") {
    return res.status(503).json({ message: "이 서버에서 사진 ZIP API가 비활성화되어 있습니다." });
  }
  if (!fs.existsSync(SHRINK_SCRIPT)) {
    return res.status(500).json({ message: "shrink_photos.py 를 찾을 수 없습니다." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  let sourceReal;
  try {
    sourceReal = assertAllowedShrinkSource(body.source || "");
  } catch (e) {
    return res.status(400).json({ message: e.message || "경로 오류" });
  }

  const maxSide = Math.min(8192, Math.max(256, parseInt(body.maxSide, 10) || 2560));
  const quality = Math.min(95, Math.max(40, parseInt(body.quality, 10) || 82));

  const nImg = countShrinkableImages(sourceReal);
  if (nImg === 0) {
    return res.status(400).json({ message: "해당 폴더에 처리할 이미지가 없습니다." });
  }
  if (nImg > SHRINK_MAX_IMAGES) {
    return res.status(400).json({
      message: `이미지가 너무 많습니다 (${nImg}장). ${SHRINK_MAX_IMAGES}장 이하로 나누거나 BLOG_SHRINK_MAX_IMAGES를 조정하세요.`
    });
  }

  const tmpDest = fs.mkdtempSync(path.join(os.tmpdir(), "blog-shrink-out-"));
  const zipPath = path.join(os.tmpdir(), `blog-shrink-${Date.now()}.zip`);
  const py = process.env.PYTHON3 || "python3";

  try {
    const r = spawnSync(
      py,
      [
        SHRINK_SCRIPT,
        "--source",
        sourceReal,
        "--dest",
        tmpDest,
        "--max-side",
        String(maxSide),
        "--quality",
        String(quality)
      ],
      {
        encoding: "utf8",
        maxBuffer: 20 * 1024 * 1024,
        timeout: Math.min(60 * 60 * 1000, parseInt(process.env.BLOG_SHRINK_TIMEOUT_MS || "900000", 10))
      }
    );
    if (r.status !== 0) {
      const errText = (r.stderr || r.stdout || "").trim() || `종료 코드 ${r.status}`;
      console.error("[blog-photo-shrink]", errText);
      try {
        fs.rmSync(tmpDest, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return res.status(500).json({
        message: "압축 처리 실패: " + errText.slice(0, 800)
      });
    }

    const z = spawnSync("zip", ["-r", "-q", zipPath, "."], {
      cwd: tmpDest,
      encoding: "utf8",
      timeout: 120000
    });
    try {
      fs.rmSync(tmpDest, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    if (z.status !== 0) {
      const errText = (z.stderr || z.stdout || "").trim() || `zip 종료 ${z.status}`;
      try {
        fs.unlinkSync(zipPath);
      } catch {
        /* ignore */
      }
      return res.status(500).json({ message: "ZIP 생성 실패: " + errText.slice(0, 400) });
    }
  } catch (e) {
    console.error("[blog-photo-shrink]", e);
    try {
      fs.rmSync(tmpDest, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(zipPath);
    } catch {
      /* ignore */
    }
    return res.status(500).json({ message: e?.message || "처리 오류" });
  }

  res.download(zipPath, "blog_shrink_photos.zip", (err) => {
    try {
      fs.unlinkSync(zipPath);
    } catch {
      /* ignore */
    }
    if (err) {
      console.error("[blog-photo-shrink] download callback", err);
    }
  });
});

app.use(express.static(__dirname));

const HOST = process.env.HOST || "0.0.0.0";
app.listen(PORT, HOST, () => {
  console.log(`Listening on http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT} (bind ${HOST})`);
  console.log(`Blog helper: http://localhost:${PORT}/blog-writing-assistant.html`);
  console.log(`State file path: ${STATE_PATH}`);
  console.log(
    `[blog-generate] Gemini 기본 후보: ${pickGeminiModel({})} (페이지에서 모델 선택 시 그 값이 우선)`
  );
  if (process.env.GEMINI_API_KEY) {
    console.log("[blog-generate] GEMINI_API_KEY: 서버 환경변수로 설정됨 (클라이언트 입력 생략 가능)");
  }
});
