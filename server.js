const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const express = require("express");
const multer = require("multer");
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

/** 저장 대상 NAS·내장 경로 검증 (읽기 전용 소스에도 동일 규칙 사용) */
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

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, ent.name);
    const d = path.join(dest, ent.name);
    if (ent.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

/**
 * 브라우저에서 사진 업로드 → JPEG 압축 → 지정 공유폴더에 저장.
 * 선택: alsoZip=1 이면 같은 내용의 ZIP을 브라우저로 내려받기 (공유폴더 저장은 이미 완료).
 */
app.post(
  "/api/blog-photo-save-compressed",
  (req, res, next) => {
    if (process.env.BLOG_SHRINK_API === "0") {
      return res.status(503).json({ message: "이 서버에서 사진 저장 API가 비활성화되어 있습니다." });
    }
    if (!fs.existsSync(SHRINK_SCRIPT)) {
      return res.status(500).json({ message: "shrink_photos.py 를 찾을 수 없습니다." });
    }
    req._uploadBase = fs.mkdtempSync(path.join(os.tmpdir(), "blog-shrink-upload-"));
    next();
  },
  (req, res, next) => {
    const storage = multer.diskStorage({
      destination(_req, _file, cb) {
        cb(null, req._uploadBase);
      },
      filename(_req, file, cb) {
        const raw = (file.originalname || "file").replace(/[^\w.\-\uAC00-\uD7A3]/g, "_");
        cb(null, `${Date.now()}_${raw}`);
      }
    });
    multer({
      storage,
      limits: { fileSize: 80 * 1024 * 1024, files: SHRINK_MAX_IMAGES }
    }).array("images", SHRINK_MAX_IMAGES)(req, res, (err) => {
      if (err) {
        try {
          fs.rmSync(req._uploadBase, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
        const msg =
          err.code === "LIMIT_FILE_SIZE"
            ? "파일 하나가 너무 큽니다 (80MB 이하)."
            : err.message || "업로드 오류";
        return res.status(400).json({ message: msg });
      }
      next();
    });
  },
  (req, res) => {
    const files = req.files || [];
    if (!files.length) {
      try {
        fs.rmSync(req._uploadBase, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return res.status(400).json({ message: "사진을 한 장 이상 선택하세요." });
    }

    let destReal;
    try {
      destReal = assertAllowedShrinkSource(req.body.dest || "");
    } catch (e) {
      try {
        fs.rmSync(req._uploadBase, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return res.status(400).json({ message: e.message || "경로 오류" });
    }

    const maxSide = Math.min(8192, Math.max(256, parseInt(req.body.maxSide, 10) || 2560));
    const quality = Math.min(95, Math.max(40, parseInt(req.body.quality, 10) || 82));
    const alsoZip = req.body.alsoZip === "1" || req.body.alsoZip === "true";

    const outTmp = fs.mkdtempSync(path.join(os.tmpdir(), "blog-shrink-out-"));
    const py = process.env.PYTHON3 || "python3";

    const r = spawnSync(
      py,
      [
        SHRINK_SCRIPT,
        "--source",
        req._uploadBase,
        "--dest",
        outTmp,
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

    try {
      fs.rmSync(req._uploadBase, { recursive: true, force: true });
    } catch {
      /* ignore */
    }

    if (r.status !== 0) {
      const errText = (r.stderr || r.stdout || "").trim() || `종료 코드 ${r.status}`;
      console.error("[blog-photo-save-compressed]", errText);
      try {
        fs.rmSync(outTmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return res.status(500).json({
        message: "압축 처리 실패: " + errText.slice(0, 800)
      });
    }

    try {
      copyDirRecursive(outTmp, destReal);
    } catch (e) {
      try {
        fs.rmSync(outTmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      return res.status(500).json({ message: "공유폴더에 저장 실패: " + (e.message || e) });
    }

    if (alsoZip) {
      const zipPath = path.join(os.tmpdir(), `blog-shrink-${Date.now()}.zip`);
      const z = spawnSync("zip", ["-r", "-q", zipPath, "."], {
        cwd: outTmp,
        encoding: "utf8",
        timeout: 120000
      });
      try {
        fs.rmSync(outTmp, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      if (z.status !== 0) {
        try {
          fs.unlinkSync(zipPath);
        } catch {
          /* ignore */
        }
        return res.json({
          ok: true,
          saved: true,
          message:
            "공유폴더에는 저장했습니다. ZIP 만들기만 실패했습니다: " +
            ((z.stderr || z.stdout || "").trim().slice(0, 200) || `코드 ${z.status}`),
          dest: destReal
        });
      }
      return res.download(zipPath, "blog_shrink_photos.zip", (err) => {
        try {
          fs.unlinkSync(zipPath);
        } catch {
          /* ignore */
        }
        if (err) console.error("[blog-photo-save-compressed] download", err);
      });
    }

    try {
      fs.rmSync(outTmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    return res.json({
      ok: true,
      message: `${files.length}장을 JPEG로 줄여 공유폴더에 저장했습니다.`,
      dest: destReal
    });
  }
);

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
