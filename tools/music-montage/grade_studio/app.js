/* grade_studio — Phase 1 frontend
   - load clips, render rail + strip + grade panel
   - HTML5 <video> playing 720p proxy from server
   - SVG feColorMatrix live preview (Phase 1 approximation)
   - A/B toggle, keyboard shortcuts, precision input
*/
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const SLIDER_KEYS = [
    "temp", "tint",
    "bright", "gamma", "rolloff",
    "expo", "contrast", "hi", "sh", "wh", "bl",
    "sat", "vib", "tex", "clr", "dh",
  ];
  const TRIM_KEYS = ["trim_in", "trim_out"];
  const HSL_CHANNELS = ["red","orange","yellow","green","aqua","blue","purple","magenta"];
  const HSL_CHANNEL_COLOR = {
    red:"#ff3b30", orange:"#ff9500", yellow:"#ffcc00", green:"#34c759",
    aqua:"#5ac8fa", blue:"#0a84ff", purple:"#bf5af2", magenta:"#ff2d92",
  };
  const HSL_CHANNEL_LABEL = {
    red:"빨강", orange:"주황", yellow:"노랑", green:"초록",
    aqua:"하늘", blue:"파랑", purple:"보라", magenta:"마젠타",
  };
  const DEFAULT_HSL_CELL = { h: 0, s: 0, l: 0 };
  const DEFAULT_HSL = HSL_CHANNELS.reduce((m, ch) => (m[ch] = {...DEFAULT_HSL_CELL}, m), {});
  const DEFAULT_GRADE = {
    temp: 6500, tint: 0,
    bright: 0, gamma: 0, rolloff: 0,
    expo: 0, contrast: 0, hi: 0, sh: 0, wh: 0, bl: 0,
    sat: 0, vib: 0, tex: 0, clr: 0, dh: 0,
    hsl: DEFAULT_HSL,
    trim_in: 0, trim_out: 0,
    disabled: 0, disabled_tri: 0,
    // 다음 클립으로 넘어갈 때 적용할 전환 — 마지막 클립은 무시됨.
    xtype: "none", xdur: 0.5,
  };
  // 사용자에게 노출하는 전환 종류 (ffmpeg xfade 매핑)
  const XTYPES = [
    { id: "none",       label: "없음",      icon: "✕" },
    { id: "fade",       label: "페이드",    icon: "◐" },
    { id: "dissolve",   label: "디졸브",    icon: "▒" },
    { id: "wipeleft",   label: "쓸기 ←",    icon: "⇠" },
    { id: "wiperight",  label: "쓸기 →",    icon: "⇢" },
    { id: "horzopen",   label: "가로 열기", icon: "↔" },
    { id: "vertopen",   label: "세로 열기", icon: "↕" },
    { id: "slideleft",  label: "슬라이드 ←", icon: "⇇" },
    { id: "slideright", label: "슬라이드 →", icon: "⇉" },
  ];
  const XTYPE_IDS = new Set(XTYPES.map(x => x.id));
  function isTriMode() {
    const c = document.getElementById("chkTri");
    return c ? !!c.checked : false;
  }
  // Filter rules:
  //   tri build  : exclude if disabled OR disabled_tri
  //   normal build: exclude if disabled (only)
  function isClipDisabledForBuild(c) {
    const tri = isTriMode();
    return tri
      ? (Number(c.grade.disabled || 0) || Number(c.grade.disabled_tri || 0))
      : Number(c.grade.disabled || 0);
  }
  const SAVE_DEBOUNCE_MS = 350;

  const state = {
    folder: "",
    clips: [],          // [{id, name, stem, grade, proxy}]
    activeId: -1,
    selectedIds: new Set(),
    lastClickedId: -1,  // for shift-range selection
    abShowOriginal: false,
    saveTimer: null,
    presetSlot: null,   // grade dict or null
    history: [],        // undo stack: items {batch:[{clipId, before}]}
    _lastPushAt: 0,
    _lastPushKey: "",
  };
  const HIST_MAX = 100;
  const PUSH_DEBOUNCE_MS = 220;

  function snapshotGrade(g) {
    const out = {};
    for (const k of Object.keys(DEFAULT_GRADE)) {
      const def = DEFAULT_GRADE[k];
      const v = (g && g[k] !== undefined) ? g[k] : def;
      if (typeof def === "string") out[k] = String(v ?? def);
      else out[k] = Number(v ?? def);
    }
    return out;
  }
  function pushHistorySingle(clipId) {
    const c = state.clips.find(x => x.id === clipId);
    if (!c) return;
    const now = Date.now();
    const key = `s:${clipId}`;
    if (key === state._lastPushKey && now - state._lastPushAt < PUSH_DEBOUNCE_MS) return;
    state._lastPushAt = now;
    state._lastPushKey = key;
    state.history.push({ batch: [{ clipId, before: snapshotGrade(c.grade) }] });
    if (state.history.length > HIST_MAX) state.history.shift();
  }
  function pushHistoryBatch(clipIds) {
    const items = [];
    clipIds.forEach(id => {
      const c = state.clips.find(x => x.id === id);
      if (c) items.push({ clipId: id, before: snapshotGrade(c.grade) });
    });
    if (!items.length) return;
    state.history.push({ batch: items });
    state._lastPushAt = Date.now();
    state._lastPushKey = `b:${items.length}:${Date.now()}`;
    if (state.history.length > HIST_MAX) state.history.shift();
  }
  function undoOne() {
    const h = state.history.pop();
    if (!h) return false;
    let activeTouched = false;
    for (const it of h.batch) {
      const c = state.clips.find(x => x.id === it.clipId);
      if (!c) continue;
      c.grade = { ...DEFAULT_GRADE, ...it.before };
      markClipGraded(c);
      scheduleSave(c);
      if (c.id === state.activeId) activeTouched = true;
    }
    if (activeTouched) {
      const ac = currentClip();
      if (ac) {
        writeGradeToPanel(ac.grade);
        applyMatrixToFilter(ac.grade);
        updateTrimVisual(ac.grade);
      }
    }
    setBusyShort(`되돌림 (${state.history.length} 남음)`);
    return true;
  }
  function setBusyShort(msg) {
    const status = $("#saveStatus");
    if (!status) return;
    status.textContent = msg;
    status.className = "status-pill ok";
    setTimeout(() => { if (status.textContent === msg) status.textContent = ""; }, 1200);
  }

  // ─────────────────────────────────────────────────────────
  // Color math: convert grade dict → 4x5 color matrix (approximation)
  // Phase 1: temp/tint/expo/contrast/sat are mapped accurately enough
  // for live preview; hi/sh/wh/bl/vib/tex/clr/dh are flagged ≈.

  function kelvinToRgbMul(k) {
    // Lightroom-style: slider right (higher K) = warmer image.
    const t = (k - 6500) / 6500;             // -0.54 .. +0.54
    const warm = t;                           // higher K = warmer (flipped)
    const r = 1.0 + warm * 0.45;
    const g = 1.0 + warm * 0.05;
    const b = 1.0 - warm * 0.45;
    return [r, g, b];
  }

  function tintToGreenMagenta(t) {
    // Lightroom-style: positive (right) = magenta, negative (left) = green.
    const v = -t / 100;                       // flipped
    return [1 - v * 0.10, 1 + v * 0.18, 1 - v * 0.10];
  }

  function buildColorMatrix(g) {
    // start with identity 4x5
    // expo: stops-ish, mapped via 2^(expo/100). slider [-200..+200] -> [-2..+2] stops
    const expFactor = Math.pow(2, (g.expo || 0) / 100);

    // contrast (with dehaze additive): -100..+100 → ~0.5x..~2x around 0.5 luma
    const dh = (g.dh || 0) / 100;             // -1..1
    const cInput = ((g.contrast || 0) + dh * 40) / 100;  // dehaze adds contrast
    const c = 1 + cInput;
    const cOff = (1 - c) * 0.5;

    // saturation (sat + 60% of vibrance + 25% of dehaze): -100..+100 mapped → 0..2
    const vib = (g.vib || 0) / 100;
    const satInput = ((g.sat || 0) + vib * 60 + dh * 25) / 100;
    const sat = 1 + satInput;

    // wb
    const [kr, kg, kb] = kelvinToRgbMul(g.temp || 6500);
    const [tr, tg, tb] = tintToGreenMagenta(g.tint || 0);
    const wbR = kr * tr * expFactor;
    const wbG = kg * tg * expFactor;
    const wbB = kb * tb * expFactor;

    // saturation matrix using BT.709 luma approx
    const lumR = 0.2126, lumG = 0.7152, lumB = 0.0722;
    const sR = (1 - sat) * lumR;
    const sG = (1 - sat) * lumG;
    const sB = (1 - sat) * lumB;

    // combine wb (per-channel scale) → contrast (scale + offset on each channel) → saturation
    // For simplicity stack contrast on combined wb scale:
    const r0 = wbR * c, g0 = wbG * c, b0 = wbB * c;
    const off = cOff;

    // Final 4x5 matrix:
    // Out_R = (sR + sat) * inR + sR_g * inG + sR_b * inB  (sat mix) → multiplied by per-channel scale not trivial.
    // We approximate by composing:  saturation matrix × diag(r0,g0,b0) is still linear → produces per-row mix.
    // Simpler & visually correct enough: apply saturation *after* per-channel scale by mixing toward luma.
    // We bake it into one matrix as: M = sat_matrix * diag(r0,g0,b0)
    const a11 = (sR + sat) * r0, a12 = sG * g0, a13 = sB * b0;
    const a21 = sR * r0,         a22 = (sG + sat) * g0, a23 = sB * b0;
    const a31 = sR * r0,         a32 = sG * g0,         a33 = (sB + sat) * b0;

    return [
      a11, a12, a13, 0, off,
      a21, a22, a23, 0, off,
      a31, a32, a33, 0, off,
      0,   0,   0,   1, 0,
    ];
  }

  // ── Tone curve LUT (highlights / shadows / whites / blacks) ─────────
  // 5 control points at x = 0, .25, .5, .75, 1.0 with y offsets per slider.
  // Sampled to 33-point LUT, then formatted as SVG tableValues.
  function buildToneCurveLut(g) {
    const bl = (g.bl || 0) / 100;   // -1..1
    const sh = (g.sh || 0) / 100;
    const hi = (g.hi || 0) / 100;
    const wh = (g.wh || 0) / 100;

    // y at each anchor: positive bl/sh = lift dark; positive hi/wh = lift bright.
    // Reasonable ranges so endpoints don't clip to (0|1) too aggressively.
    const xs = [0.00, 0.25, 0.50, 0.75, 1.00];
    const ys = [
      Math.max(0, Math.min(1, 0.00 + bl * 0.15)),
      Math.max(0, Math.min(1, 0.25 + sh * 0.12)),
      0.50,
      Math.max(0, Math.min(1, 0.75 + hi * 0.12)),
      Math.max(0, Math.min(1, 1.00 + wh * 0.12 - Math.max(0, -wh) * 0.0)),
    ];
    // Make sure y is monotonic non-decreasing so we don't inverse the image.
    for (let i = 1; i < ys.length; i++) {
      if (ys[i] < ys[i - 1]) ys[i] = ys[i - 1];
    }

    const N = 33;
    const out = new Array(N);
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      // find segment
      let s = 0;
      while (s < xs.length - 2 && x > xs[s + 1]) s++;
      const x0 = xs[s], x1 = xs[s + 1];
      const y0 = ys[s], y1 = ys[s + 1];
      const t = (x - x0) / Math.max(1e-9, (x1 - x0));
      out[i] = y0 + (y1 - y0) * t;
    }

    // ── 추가 톤 (밝기/감마/롤오프) — 기존 5-point 커브 출력에 후처리 ──
    // bright  : -100..+100 → ±0.25 additive (전체 균일 리프트)
    // gamma   : -100..+100 → exponent 1/2^(g/100). +100 = 미드톤 ↑, -100 = 미드톤 ↓
    // rolloff : -100..+100. >0 = 하이라이트 부드럽게 압축, <0 = 약간 강조
    const br = ((g.bright || 0) / 100) * 0.25;
    const gm = (g.gamma || 0) / 100;
    const ro = (g.rolloff || 0) / 100;
    const gammaExp = Math.pow(2, -gm);  // y^gammaExp; gm>0 → exp<1 → midtones up
    const applyExtra = (br !== 0 || gm !== 0 || ro !== 0);
    if (applyExtra) {
      for (let i = 0; i < N; i++) {
        let y = out[i];
        // gamma
        if (gm !== 0) y = Math.pow(Math.max(0, Math.min(1, y)), gammaExp);
        // rolloff (knee at 0.5)
        if (ro !== 0 && y > 0.5) {
          const t = (y - 0.5) / 0.5;          // 0..1 in upper half
          if (ro > 0) {
            const k = ro * 0.5;                // 압축 강도
            y = 0.5 + 0.5 * (t / (1 + k * t));
          } else {
            const k = -ro * 0.4;               // 확장 강도 (하이라이트 더 빨리 1.0 도달)
            y = 0.5 + 0.5 * (t * (1 + k * (1 - t)));
          }
        }
        // bright (additive)
        if (br !== 0) y = y + br;
        out[i] = Math.max(0, Math.min(1, y));
      }
    }
    return out.map(v => v.toFixed(4)).join(" ");
  }

  // ── Sharpen kernel from texture+clarity ─────────────────────────────
  function buildSharpenKernel(g) {
    const tex = (g.tex || 0) / 100;
    const clr = (g.clr || 0) / 100;
    const a = Math.max(-1, Math.min(1, tex * 0.5 + clr * 0.7));   // -1..1
    if (Math.abs(a) < 1e-3) {
      return "0 0 0  0 1 0  0 0 0";
    }
    // unsharp mask: center = 1 + 4a, edges = -a (4-neighbour)
    const center = 1 + 4 * a;
    const edge = -a;
    return `0 ${edge} 0  ${edge} ${center} ${edge}  0 ${edge} 0`;
  }

  function applyAll(g) {
    // WebGL 미리보기 — 모든 보정 (매트릭스 + 톤커브 + HSL) 을 GPU 셰이더로 적용
    if (_gl.ready) updateGlGrade(g);
  }

  // backward-compat alias
  function applyMatrixToFilter(g) { applyAll(g); }

  function setOriginalView(on) {
    _gl.showOriginal = !!on;
    $("#abBadge").hidden = !on;
    // 다시 그리기 트리거 — 다음 rAF 에서 처리됨
  }

  // ─────────────────────────────────────────────────────────────
  // WebGL preview pipeline — fragment shader 가 매트릭스 + 톤커브 + HSL 모두 적용
  const _gl = {
    ready: false,
    showOriginal: false,
    canvas: null,
    video: null,
    ctx: null,
    program: null,
    tex: null,
    vbo: null,
    loc: {},
    grade: null,
    lastTexW: 0,
    lastTexH: 0,
  };

  function initGlPlayer() {
    const canvas = document.getElementById("playerCanvas");
    const video = document.getElementById("player");
    if (!canvas || !video) return;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false, antialias: false });
    if (!gl) {
      console.warn("[grade_studio] WebGL2 미지원 — 미리보기 셰이더 비활성");
      return;
    }
    const vertSrc = `#version 300 es
      in vec2 aPos;
      out vec2 vUv;
      void main() {
        vUv = vec2(aPos.x * 0.5 + 0.5, 1.0 - (aPos.y * 0.5 + 0.5));
        gl_Position = vec4(aPos, 0.0, 1.0);
      }`;
    const fragSrc = `#version 300 es
      precision highp float;
      uniform sampler2D uTex;
      uniform mat3 uMat;
      uniform float uOff;
      uniform float uTone[33];
      uniform int uHslEnabled;
      uniform float uHslH[8];
      uniform float uHslS[8];
      uniform float uHslL[8];
      uniform float uHueCenters[8];
      uniform int uOrig;
      uniform float uLetterbox;   // 0.0 = none, 0.1065 = cinema (위/아래 각 10.65%)
      in vec2 vUv;
      out vec4 outColor;

      float toneSample(float v) {
        float x = clamp(v, 0.0, 1.0) * 32.0;
        int i0 = int(floor(x));
        int i1 = i0 + 1;
        if (i1 > 32) i1 = 32;
        if (i0 > 32) i0 = 32;
        float t = x - float(i0);
        float a = uTone[i0];
        float b = uTone[i1];
        return mix(a, b, t);
      }
      vec3 rgb2hsl(vec3 c) {
        float mx = max(max(c.r, c.g), c.b);
        float mn = min(min(c.r, c.g), c.b);
        float l = (mx + mn) * 0.5;
        float h = 0.0;
        float s = 0.0;
        if (mx != mn) {
          float d = mx - mn;
          s = (l > 0.5) ? d / (2.0 - mx - mn) : d / (mx + mn);
          if (mx == c.r) h = (c.g - c.b) / d + ((c.g < c.b) ? 6.0 : 0.0);
          else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
          else h = (c.r - c.g) / d + 4.0;
          h *= 60.0;
        }
        return vec3(h, s, l);
      }
      float hue2rgb(float p, float q, float t) {
        if (t < 0.0) t += 1.0;
        if (t > 1.0) t -= 1.0;
        if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
        if (t < 1.0/2.0) return q;
        if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
        return p;
      }
      vec3 hsl2rgb(vec3 hsl) {
        float h = hsl.x; float s = hsl.y; float l = hsl.z;
        if (s < 1e-6) return vec3(l);
        float hh = mod(h, 360.0) / 360.0;
        float q = (l < 0.5) ? l * (1.0 + s) : l + s - l * s;
        float p = 2.0 * l - q;
        return vec3(hue2rgb(p, q, hh + 1.0/3.0),
                    hue2rgb(p, q, hh),
                    hue2rgb(p, q, hh - 1.0/3.0));
      }
      void main() {
        // 시네마 letterbox — 위/아래 uLetterbox 비율을 검정으로 덮음
        if (uLetterbox > 0.001) {
          if (vUv.y < uLetterbox || vUv.y > (1.0 - uLetterbox)) {
            outColor = vec4(0.0, 0.0, 0.0, 1.0);
            return;
          }
        }
        vec3 col = texture(uTex, vUv).rgb;
        if (uOrig == 1) {
          outColor = vec4(col, 1.0);
          return;
        }
        // 1) 4x5 매트릭스
        col = uMat * col + vec3(uOff);
        // 2) 톤커브 (per-channel, identical curve)
        col.r = toneSample(col.r);
        col.g = toneSample(col.g);
        col.b = toneSample(col.b);
        col = clamp(col, 0.0, 1.0);
        // 3) HSL (RGB→HSL→채널별 가중치 보정→RGB)
        if (uHslEnabled == 1) {
          vec3 hsl = rgb2hsl(col);
          float chroma_gate = clamp(hsl.y * 4.0, 0.0, 1.0);
          if (chroma_gate > 0.001) {
            float ws[8];
            float total = 0.0;
            for (int i = 0; i < 8; i++) {
              float d = abs(mod(hsl.x - uHueCenters[i] + 540.0, 360.0) - 180.0);
              ws[i] = (d < 60.0) ? (0.5 * (1.0 + (1.0 - d / 60.0))) : 0.0;
              total += ws[i];
            }
            if (total > 1e-6) {
              float dh = 0.0; float ds = 0.0; float dl = 0.0;
              for (int i = 0; i < 8; i++) {
                float w = (ws[i] / total) * chroma_gate;
                dh += w * uHslH[i] / 100.0 * 30.0;
                ds += w * uHslS[i] / 100.0;
                dl += w * uHslL[i] / 100.0 * 0.5;
              }
              hsl.x = mod(hsl.x + dh + 720.0, 360.0);
              hsl.y = clamp(hsl.y * (1.0 + ds), 0.0, 1.0);
              hsl.z = clamp(hsl.z + dl, 0.0, 1.0);
              col = hsl2rgb(hsl);
            }
          }
        }
        outColor = vec4(col, 1.0);
      }`;
    function compile(type, src) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error("shader compile:", gl.getShaderInfoLog(sh));
        return null;
      }
      return sh;
    }
    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("program link:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(gl.getUniformLocation(prog, "uTex"), 0);
    gl.activeTexture(gl.TEXTURE0);

    _gl.canvas = canvas;
    _gl.video = video;
    _gl.ctx = gl;
    _gl.program = prog;
    _gl.tex = tex;
    _gl.vbo = vbo;
    _gl.loc = {
      uMat: gl.getUniformLocation(prog, "uMat"),
      uOff: gl.getUniformLocation(prog, "uOff"),
      uTone: gl.getUniformLocation(prog, "uTone[0]"),
      uHslEnabled: gl.getUniformLocation(prog, "uHslEnabled"),
      uHslH: gl.getUniformLocation(prog, "uHslH[0]"),
      uHslS: gl.getUniformLocation(prog, "uHslS[0]"),
      uHslL: gl.getUniformLocation(prog, "uHslL[0]"),
      uHueCenters: gl.getUniformLocation(prog, "uHueCenters[0]"),
      uOrig: gl.getUniformLocation(prog, "uOrig"),
      uLetterbox: gl.getUniformLocation(prog, "uLetterbox"),
    };
    // hue centers (GLSL es 1.0 호환을 위해 한 번만 set)
    gl.uniform1fv(_gl.loc.uHueCenters, new Float32Array([0, 30, 60, 120, 180, 240, 285, 320]));
    // identity grade 초기값
    updateGlGrade(DEFAULT_GRADE);
    _gl.ready = true;

    let _histTickCounter = 0;
    function tick() {
      drawGl();
      // 히스토그램은 ~6fps 로 갱신 (매 10번째 프레임). readPixels GPU 동기화가 비싸서.
      if ((++_histTickCounter % 10) === 0) updateHistogram();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // ─────────────────────────────────────────────────────────────
  // 히스토그램 — WebGL 캔버스에서 픽셀을 읽어 RGB 분포를 그림
  const _hist = {
    canvas: null, ctx: null, buf: null, lastW: 0, lastH: 0,
  };
  function initHistogram() {
    const c = document.getElementById("histogram");
    if (!c) return;
    _hist.canvas = c;
    _hist.ctx = c.getContext("2d");
    drawHistogramEmpty();
  }
  function drawHistogramEmpty() {
    const ctx = _hist.ctx; if (!ctx) return;
    const W = _hist.canvas.width, H = _hist.canvas.height;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = Math.round((i / 4) * W) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
  }
  function updateHistogram() {
    if (!_gl.ready || !_gl.ctx || !_hist.ctx) return;
    const v = _gl.video;
    if (!v || v.readyState < 2 || v.videoWidth === 0) { drawHistogramEmpty(); return; }
    const gl = _gl.ctx;
    const srcW = _gl.canvas.width, srcH = _gl.canvas.height;
    if (srcW < 4 || srcH < 4) { drawHistogramEmpty(); return; }
    // 16분의 1로 다운샘플링 — 256x144 정도면 통계상 충분, readPixels 비용도 감소
    const step = 4;
    const sampleW = Math.max(1, Math.floor(srcW / step));
    const sampleH = Math.max(1, Math.floor(srcH / step));
    // 전체 prev frame 을 읽고 step 마다 샘플 (gl.readPixels 는 부분 영역도 가능하지만,
    // 일정 간격 샘플을 위해 step 으로 인덱스 점프)
    if (!_hist.buf || _hist.lastW !== srcW || _hist.lastH !== srcH) {
      _hist.buf = new Uint8Array(srcW * srcH * 4);
      _hist.lastW = srcW; _hist.lastH = srcH;
    }
    try {
      gl.readPixels(0, 0, srcW, srcH, gl.RGBA, gl.UNSIGNED_BYTE, _hist.buf);
    } catch (_) {
      drawHistogramEmpty();
      return;
    }
    const px = _hist.buf;
    const histR = new Uint32Array(256);
    const histG = new Uint32Array(256);
    const histB = new Uint32Array(256);
    // step 픽셀 간격으로 샘플
    const rowStride = srcW * 4 * step;
    for (let y = 0; y < srcH; y += step) {
      let i = y * srcW * 4;
      for (let x = 0; x < srcW; x += step, i += 4 * step) {
        const a = px[i + 3];
        if (a === 0) continue;     // letterbox 검정 영역은 a 가 0 이 아닐 수도, 그냥 포함
        histR[px[i]]++;
        histG[px[i + 1]]++;
        histB[px[i + 2]]++;
      }
      void rowStride;
    }
    drawHistogram(histR, histG, histB);
  }
  function drawHistogram(hR, hG, hB) {
    const ctx = _hist.ctx; if (!ctx) return;
    const W = _hist.canvas.width, H = _hist.canvas.height;
    // 최댓값 결정 (95퍼센타일 정도로 잘라서 스파이크에 흔들리지 않게)
    let maxV = 1;
    for (let i = 1; i < 255; i++) {
      if (hR[i] > maxV) maxV = hR[i];
      if (hG[i] > maxV) maxV = hG[i];
      if (hB[i] > maxV) maxV = hB[i];
    }
    // 양 끝 (0, 255) 의 클리핑 카운트는 시각적 노이즈가 되니 무시
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, W, H);
    // 격자 (1/4, 1/2, 3/4)
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const x = Math.round((i / 4) * W) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    // RGB 합성 — additive blending 으로 겹치는 영역이 흰색으로 보이게
    ctx.globalCompositeOperation = "lighter";
    function plot(hist, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let i = 0; i < 256; i++) {
        const x = (i / 255) * W;
        const v = Math.min(1, hist[i] / maxV);
        const y = H - v * (H - 2);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fill();
    }
    plot(hR, "rgba(255, 60, 60, 0.7)");
    plot(hG, "rgba(60, 220, 100, 0.7)");
    plot(hB, "rgba(80, 140, 255, 0.7)");
    ctx.globalCompositeOperation = "source-over";
    // 클리핑 표시 — 0/255 빈에 큰 값이 있으면 양 끝에 빨간/흰 점
    const clipL = (hR[0] + hG[0] + hB[0]) / Math.max(1, maxV * 3);
    const clipR = (hR[255] + hG[255] + hB[255]) / Math.max(1, maxV * 3);
    if (clipL > 0.05) {
      ctx.fillStyle = "rgba(255, 80, 80, 0.85)";
      ctx.fillRect(0, 0, 3, H);
    }
    if (clipR > 0.05) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(W - 3, 0, 3, H);
    }
  }

  function updateGlGrade(g) {
    if (!_gl.ready && !_gl.ctx) {
      _gl.grade = g;       // initGlPlayer 직후 적용되도록 캐시
      return;
    }
    const gl = _gl.ctx;
    gl.useProgram(_gl.program);
    // 매트릭스 (3x3) + offset
    const mFlat = buildColorMatrix(g);   // 4x5 array; rows = [a11..a13, 0, off]
    // 3x3 column-major for uniformMatrix3fv
    const mat3 = new Float32Array([
      mFlat[0], mFlat[5], mFlat[10],     // col 0: r-row
      mFlat[1], mFlat[6], mFlat[11],     // col 1: g-row
      mFlat[2], mFlat[7], mFlat[12],     // col 2: b-row
    ]);
    gl.uniformMatrix3fv(_gl.loc.uMat, false, mat3);
    gl.uniform1f(_gl.loc.uOff, mFlat[4]);
    // 톤커브
    const lutStr = buildToneCurveLut(g);
    const tone = new Float32Array(lutStr.split(/\s+/).map(Number));
    if (tone.length === 33) gl.uniform1fv(_gl.loc.uTone, tone);
    // HSL
    const hsl = (g && g.hsl) || {};
    const hH = new Float32Array(8), hS = new Float32Array(8), hL = new Float32Array(8);
    let hslOn = 0;
    HSL_CHANNELS.forEach((ch, i) => {
      const cell = hsl[ch] || {h:0,s:0,l:0};
      hH[i] = Number(cell.h || 0);
      hS[i] = Number(cell.s || 0);
      hL[i] = Number(cell.l || 0);
      if (hH[i] !== 0 || hS[i] !== 0 || hL[i] !== 0) hslOn = 1;
    });
    gl.uniform1fv(_gl.loc.uHslH, hH);
    gl.uniform1fv(_gl.loc.uHslS, hS);
    gl.uniform1fv(_gl.loc.uHslL, hL);
    gl.uniform1i(_gl.loc.uHslEnabled, hslOn);
    _gl.grade = g;
  }

  function drawGl() {
    if (!_gl.ready) return;
    const gl = _gl.ctx;
    const v = _gl.video;
    const cv = _gl.canvas;
    if (!v || v.readyState < 2 || v.videoWidth === 0) return;
    // 캔버스 internal resolution 을 video 해상도에 맞춤 (화면 표시 크기는 CSS 가 결정)
    if (cv.width !== v.videoWidth || cv.height !== v.videoHeight) {
      cv.width = v.videoWidth;
      cv.height = v.videoHeight;
      cv.style.aspectRatio = `${v.videoWidth} / ${v.videoHeight}`;
      gl.viewport(0, 0, cv.width, cv.height);
    }
    gl.useProgram(_gl.program);
    gl.bindTexture(gl.TEXTURE_2D, _gl.tex);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, v);
    } catch (e) {
      return;
    }
    gl.uniform1i(_gl.loc.uOrig, _gl.showOriginal ? 1 : 0);
    // 시네마 모드면 위/아래 115/1080 = 10.648% 를 letterbox 로 덮음
    const cine = document.body.classList.contains("cinema-mode") ? (115.0 / 1080.0) : 0.0;
    gl.uniform1f(_gl.loc.uLetterbox, cine);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ─────────────────────────────────────────────────────────
  function isActiveDirty(g) {
    if (SLIDER_KEYS.some(k => Number(g[k]) !== Number(DEFAULT_GRADE[k]))) return true;
    if (TRIM_KEYS.some(k => Number(g[k] || 0) > 1e-3)) return true;
    if (isHslDirty(g)) return true;
    if (isTransitionDirty(g)) return true;
    return false;
  }
  function isHslDirty(g) {
    const hsl = g && g.hsl ? g.hsl : null;
    if (!hsl) return false;
    for (const ch of HSL_CHANNELS) {
      const cell = hsl[ch] || {};
      if (Number(cell.h || 0) !== 0) return true;
      if (Number(cell.s || 0) !== 0) return true;
      if (Number(cell.l || 0) !== 0) return true;
    }
    return false;
  }
  function isHslChannelDirty(g, ch) {
    const cell = (g && g.hsl && g.hsl[ch]) || {};
    return Number(cell.h || 0) !== 0 || Number(cell.s || 0) !== 0 || Number(cell.l || 0) !== 0;
  }
  function ensureHsl(g) {
    if (!g.hsl) g.hsl = {};
    for (const ch of HSL_CHANNELS) {
      if (!g.hsl[ch]) g.hsl[ch] = {h:0, s:0, l:0};
    }
    return g.hsl;
  }
  // 기본값으로 *새* grade 객체 (hsl 도 깊은 복제 — 클립 간 reference 공유 방지)
  function freshDefaultGrade() {
    const g = { ...DEFAULT_GRADE };
    g.hsl = HSL_CHANNELS.reduce((m, ch) => (m[ch] = {h:0,s:0,l:0}, m), {});
    return g;
  }
  function cloneGrade(g) {
    const out = { ...g };
    out.hsl = {};
    for (const ch of HSL_CHANNELS) {
      const src = (g && g.hsl && g.hsl[ch]) || {};
      out.hsl[ch] = { h: Number(src.h||0), s: Number(src.s||0), l: Number(src.l||0) };
    }
    return out;
  }
  function isMac() {
    return navigator.platform && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  }
  function modKey(e) {
    return isMac() ? e.metaKey : e.ctrlKey;
  }

  function currentClip() {
    return state.clips.find(c => c.id === state.activeId) || null;
  }
  function currentGrade() {
    const c = currentClip();
    return c ? c.grade : DEFAULT_GRADE;
  }

  // ─────────────────────────────────────────────────────────
  // Slider <-> grade sync
  function readPanelToGrade() {
    const g = {};
    $$(".slider-row").forEach(row => {
      const k = row.dataset.key;
      const num = row.querySelector("input[type=number]");
      g[k] = Number(num.value);
    });
    return g;
  }

  function writeGradeToPanel(g) {
    $$(".slider-row").forEach(row => {
      const k = row.dataset.key;
      if (!k) return;       // hsl-row 는 별도 처리
      const range = row.querySelector("input[type=range]");
      const num = row.querySelector("input[type=number]");
      const v = Number(g[k] ?? DEFAULT_GRADE[k]);
      range.value = String(v);
      num.value = String(v);
      const dirty = Number(v) !== Number(DEFAULT_GRADE[k]);
      row.classList.toggle("dirty", dirty);
    });
    // HSL 슬라이더 — 활성 채널 기준
    syncHslPanelFromGrade(g);
    // 전환 패널
    syncTransitionPanel(g);
  }

  // ─────────────────────────────────────────────────────────
  // HSL 패널 (color chips + 3 sliders for active channel)
  let _hslActive = "red";   // 현재 편집 중인 색상 채널
  function renderHslChips() {
    const root = $("#hslChips");
    if (!root) return;
    root.innerHTML = "";
    HSL_CHANNELS.forEach(ch => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hsl-chip" + (ch === _hslActive ? " active" : "");
      btn.title = HSL_CHANNEL_LABEL[ch];
      btn.dataset.ch = ch;
      btn.style.background = HSL_CHANNEL_COLOR[ch];
      btn.addEventListener("click", () => {
        _hslActive = ch;
        renderHslChips();
        const c = currentClip();
        if (c) syncHslPanelFromGrade(c.grade);
      });
      const c = currentClip();
      if (c && isHslChannelDirty(c.grade, ch)) btn.classList.add("dirty");
      root.appendChild(btn);
    });
  }
  function syncHslPanelFromGrade(g) {
    ensureHsl(g);
    const cell = g.hsl[_hslActive] || {h:0,s:0,l:0};
    $$("#hslPanel .hsl-row").forEach(row => {
      const k = row.dataset.hsl;       // h | s | l
      const range = row.querySelector("input[type=range]");
      const num = row.querySelector("input[type=number]");
      const v = Number(cell[k] || 0);
      range.value = String(v);
      num.value = String(v);
      row.classList.toggle("dirty", v !== 0);
    });
    // 칩 dirty 마크 갱신
    $$("#hslChips .hsl-chip").forEach(btn => {
      const ch = btn.dataset.ch;
      btn.classList.toggle("dirty", isHslChannelDirty(g, ch));
      btn.classList.toggle("active", ch === _hslActive);
    });
  }
  function bindHslRow(row) {
    const sk = row.dataset.hsl;            // h | s | l
    const range = row.querySelector("input[type=range]");
    const num = row.querySelector("input[type=number]");
    const onChange = (raw) => {
      const min = Number(range.min);
      const max = Number(range.max);
      let v = Math.max(min, Math.min(max, Number(raw)));
      if (Number.isNaN(v)) v = 0;
      range.value = String(v);
      num.value = String(v);
      row.classList.toggle("dirty", v !== 0);
      const c = currentClip();
      if (c) {
        ensureHsl(c.grade);
        c.grade.hsl[_hslActive][sk] = v;
        // 미리보기 SVG 매트릭스는 HSL 미반영 (출력에만 정확히 적용) — applyMatrix 호출은 유지
        applyMatrixToFilter(c.grade);
        markClipGraded(c);
        // 칩 dirty 마크 갱신
        const chip = $(`#hslChips .hsl-chip[data-ch="${_hslActive}"]`);
        if (chip) chip.classList.toggle("dirty", isHslChannelDirty(c.grade, _hslActive));
        scheduleSave(c);
      }
    };
    const _captureBefore = () => {
      const c = currentClip();
      if (c) pushHistorySingle(c.id);
    };
    range.addEventListener("pointerdown", _captureBefore);
    num.addEventListener("focus", _captureBefore);
    range.addEventListener("input", () => onChange(range.value));
    num.addEventListener("change", () => onChange(num.value));
    num.addEventListener("input", () => onChange(num.value));
    const wheelOn = (el) => {
      el.addEventListener("wheel", (e) => {
        if (document.activeElement !== el) return;
        e.preventDefault();
        _captureBefore();
        const step = Number(range.step) || 1;
        const dir = e.deltaY > 0 ? -1 : 1;
        const mul = e.shiftKey ? 10 : 1;
        onChange(Number(range.value) + dir * step * mul);
      }, { passive: false });
    };
    wheelOn(range);
    wheelOn(num);
    num.addEventListener("dblclick", () => num.select());
  }

  function bindSliderRow(row) {
    const k = row.dataset.key;
    const range = row.querySelector("input[type=range]");
    const num = row.querySelector("input[type=number]");

    const onChange = (raw) => {
      const min = Number(range.min);
      const max = Number(range.max);
      let v = Math.max(min, Math.min(max, Number(raw)));
      if (Number.isNaN(v)) v = Number(DEFAULT_GRADE[k] ?? 0);
      range.value = String(v);
      num.value = String(v);
      row.classList.toggle("dirty", Number(v) !== Number(DEFAULT_GRADE[k]));
      const c = currentClip();
      if (c) {
        c.grade[k] = v;
        applyMatrixToFilter(c.grade);
        markClipGraded(c);
        scheduleSave(c);
      }
    };

    const _captureBefore = () => {
      const c = currentClip();
      if (c) pushHistorySingle(c.id);
    };
    range.addEventListener("pointerdown", _captureBefore);
    num.addEventListener("focus", _captureBefore);

    range.addEventListener("input", () => onChange(range.value));
    num.addEventListener("change", () => onChange(num.value));
    num.addEventListener("input", () => onChange(num.value));

    // wheel = step; shift+wheel = ×10
    const wheelOn = (el) => {
      el.addEventListener("wheel", (e) => {
        if (document.activeElement !== el) return;
        e.preventDefault();
        _captureBefore();   // debounced inside push
        const step = Number(range.step) || 1;
        const dir = e.deltaY > 0 ? -1 : 1;
        const mul = e.shiftKey ? 10 : 1;
        onChange(Number(range.value) + dir * step * mul);
      }, { passive: false });
    };
    wheelOn(range);
    wheelOn(num);

    // double click number to clear focus and edit
    num.addEventListener("dblclick", () => num.select());
  }

  function bindAllSliders() {
    // 일반 슬라이더 (data-key 가 있는 것만 — HSL row 는 data-hsl 로 분기)
    $$(".slider-row").forEach(row => {
      if (row.dataset.key) bindSliderRow(row);
      else if (row.dataset.hsl) bindHslRow(row);
    });
    renderHslChips();
  }

  // ─────────────────────────────────────────────────────────
  // 클립 전환 패널 — xtype chips + xdur 슬라이더 (xdur 는 slider-row 이므로 bindSliderRow 가 처리)
  function isTransitionDirty(g) {
    const t = (g && g.xtype) ? String(g.xtype) : "none";
    return t !== "none";
  }
  function renderXtypeChips() {
    const root = $("#xtypeChips");
    if (!root) return;
    root.innerHTML = "";
    XTYPES.forEach(x => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "xtype-chip";
      btn.dataset.xtype = x.id;
      btn.title = x.label;
      const ic = document.createElement("span");
      ic.className = "xt-icon";
      ic.textContent = x.icon;
      const lb = document.createElement("span");
      lb.textContent = x.label;
      btn.appendChild(ic);
      btn.appendChild(lb);
      btn.addEventListener("click", () => {
        const c = currentClip();
        if (!c) return;
        pushHistorySingle(c.id);
        c.grade.xtype = x.id;
        if (x.id !== "none" && (!c.grade.xdur || c.grade.xdur < 0.05)) {
          c.grade.xdur = Number(DEFAULT_GRADE.xdur);
        }
        syncTransitionPanel(c.grade);
        markClipGraded(c);
        scheduleSave(c);
        renderStrip();    // 우측 모서리 배지 갱신
      });
      root.appendChild(btn);
    });
  }
  function syncTransitionPanel(g) {
    const cur = (g && XTYPE_IDS.has(String(g.xtype))) ? String(g.xtype) : "none";
    $$("#xtypeChips .xtype-chip").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.xtype === cur);
    });
    // xdur 행은 xtype=none 일 때 어둡게
    const xdurRow = document.querySelector('.slider-row[data-key="xdur"]');
    if (xdurRow) xdurRow.classList.toggle("inactive", cur === "none");
  }
  function applyTransitionToAll() {
    const c = currentClip();
    if (!c) return;
    const xt = String(c.grade.xtype || "none");
    const xd = Number(c.grade.xdur || DEFAULT_GRADE.xdur);
    const ids = state.clips.map(cc => cc.id);
    if (!ids.length) return;
    pushHistoryBatch(ids);
    state.clips.forEach(cc => {
      cc.grade.xtype = xt;
      cc.grade.xdur = xd;
      markClipGraded(cc);
      const t = _saveTimers.get(cc.id);
      if (t) { clearTimeout(t); _saveTimers.delete(cc.id); }
    });
    // bulk save
    fetch("/api/save_bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: state.clips.map(cc => ({ id: cc.id, grade: cc.grade })) }),
    }).then(() => setBusyShort(`전환 ${XTYPES.find(x => x.id === xt)?.label || xt} 전체 적용`))
      .catch(() => setBusyShort("전체 적용 실패"));
    syncTransitionPanel(c.grade);
    renderStrip();
  }
  function bindTransitionPanel() {
    renderXtypeChips();
    const btn = $("#btnXApplyAll");
    if (btn) btn.addEventListener("click", applyTransitionToAll);
  }

  // ─────────────────────────────────────────────────────────
  // Save (debounced, per-clip — 각 클립마다 독립된 타이머)
  const _saveTimers = new Map();      // clipId -> timeout id
  const _pendingSaves = new Set();    // 진행 중인 doSave Promise 들
  function _trackSave(p) {
    _pendingSaves.add(p);
    p.finally(() => _pendingSaves.delete(p));
  }
  function scheduleSave(clip) {
    const t = _saveTimers.get(clip.id);
    if (t) clearTimeout(t);
    const id = setTimeout(() => {
      _saveTimers.delete(clip.id);
      _trackSave(doSave(clip));
    }, SAVE_DEBOUNCE_MS);
    _saveTimers.set(clip.id, id);
  }
  // Flush all pending saves immediately:
  //   1) 디바운스 timer 강제 발사 + 새로 doSave 추가
  //   2) 그리고 *이미 진행 중인 save fetch* 들도 같이 await
  async function flushAllSaves() {
    for (const [id, t] of _saveTimers) {
      clearTimeout(t);
      const c = state.clips.find(x => x.id === id);
      if (c) _trackSave(doSave(c));
    }
    _saveTimers.clear();
    if (_pendingSaves.size) {
      await Promise.all([..._pendingSaves]);
    }
  }
  async function doSave(clip) {
    const status = $("#saveStatus");
    status.textContent = "저장 중…";
    status.className = "status-pill";
    try {
      const r = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: clip.id, grade: clip.grade }),
      });
      if (!r.ok) throw new Error("save fail " + r.status);
      status.textContent = "저장됨";
      status.className = "status-pill ok";
      setTimeout(() => { if (status.textContent === "저장됨") status.textContent = ""; }, 1500);
    } catch (err) {
      status.textContent = "저장 실패";
      status.className = "status-pill err";
      console.error(err);
    }
  }

  // ─────────────────────────────────────────────────────────
  // Rendering
  function renderClipList() {
    const root = $("#clipList");
    root.innerHTML = "";
    state.clips.forEach(c => {
      const el = document.createElement("div");
      el.className = "clip-item" + (c.id === state.activeId ? " active" : "");
      if (isActiveDirty(c.grade)) el.classList.add("graded");
      el.dataset.id = String(c.id);
      el.innerHTML = `
        <div class="thumb"><img alt="" /></div>
        <div class="meta">
          <div class="name"></div>
          <div class="sub"><span class="proxy-status">…</span><span class="group-dot"></span></div>
        </div>`;
      const img = el.querySelector("img");
      img.src = `/api/thumb?id=${c.id}`;
      img.loading = "lazy";
      el.querySelector(".name").textContent = c.name;
      el.querySelector(".proxy-status").textContent = proxyLabel(c.proxy);
      el.addEventListener("click", (e) => {
        selectClip(c.id, { toggle: modKey(e), range: e.shiftKey });
      });
      root.appendChild(el);
    });
    $("#clipCount").textContent = String(state.clips.length);
    repaintAll();
  }

  function renderStrip() {
    const root = $("#strip");
    root.innerHTML = "";
    state.clips.forEach(c => {
      const wrap = document.createElement("div");
      wrap.className = "strip-thumb-wrap";
      wrap.dataset.id = String(c.id);
      // 드래그 앤 드롭으로 순서 변경
      wrap.draggable = true;
      wrap.addEventListener("dragstart", (e) => onStripDragStart(e, c.id));
      wrap.addEventListener("dragover", (e) => onStripDragOver(e, c.id));
      wrap.addEventListener("dragleave", (e) => onStripDragLeave(e));
      wrap.addEventListener("drop", (e) => onStripDrop(e, c.id));
      wrap.addEventListener("dragend", () => onStripDragEnd());

      // tri-mode group band on top (clickable for disabled_tri toggle)
      const band = document.createElement("div");
      band.className = "tri-band";
      band.dataset.id = String(c.id);
      band.title = "클릭으로 3컷 영상에서만 제외/포함";
      band.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleTriDisable(c.id);
      });
      wrap.appendChild(band);

      const el = document.createElement("div");
      el.className = "strip-thumb" + (c.id === state.activeId ? " active" : "");
      if (isActiveDirty(c.grade)) el.classList.add("graded");
      const img = document.createElement("img");
      img.src = `/api/thumb?id=${c.id}`;
      img.loading = "lazy";
      img.alt = c.name;
      img.draggable = false;        // 이미지 자체 드래그 방지 (wrap 만 드래그)
      el.appendChild(img);
      // graded marker (점) — 별도 div, ::after 와 분리
      const dot = document.createElement("span");
      dot.className = "graded-dot";
      el.appendChild(dot);
      // 전환 표시 — 우측 모서리에 작은 배지 (마지막 클립이거나 type=none 이면 숨김)
      const xt = (c.grade && c.grade.xtype) ? String(c.grade.xtype) : "none";
      const isLast = state.clips.indexOf(c) === state.clips.length - 1;
      if (xt !== "none" && !isLast) {
        const meta = XTYPES.find(x => x.id === xt);
        const badge = document.createElement("span");
        badge.className = "strip-x-badge";
        badge.textContent = meta ? meta.icon : "→";
        badge.title = `→ 다음 클립 (${meta ? meta.label : xt}, ${Number(c.grade.xdur || 0).toFixed(2)}s)`;
        wrap.appendChild(badge);
      }
      el.title = c.name;
      el.addEventListener("click", (e) => {
        selectClip(c.id, { toggle: modKey(e), range: e.shiftKey });
      });
      wrap.appendChild(el);
      root.appendChild(wrap);
    });
  }

  // ─────────────────────────────────────────────────────────
  // strip drag & drop reorder
  let _dragState = null;   // { ids: Set<number> } 드래그 중인 클립 ID 들
  function onStripDragStart(e, clipId) {
    // 다중 선택된 클립을 드래그 중이면 그 그룹 전체, 아니면 단일
    const sel = state.selectedIds || new Set();
    let ids;
    if (sel.has(clipId) && sel.size > 1) {
      ids = new Set(sel);
    } else {
      ids = new Set([clipId]);
    }
    _dragState = { ids };
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", String(clipId)); } catch {}
    // 드래그 중인 thumb 들 시각 피드백
    $$("#strip .strip-thumb-wrap").forEach(w => {
      if (ids.has(Number(w.dataset.id))) w.classList.add("dragging");
    });
  }
  function onStripDragOver(e, hoverId) {
    if (!_dragState) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // 좌/우 절반 판별 — 드롭 indicator
    const wrap = e.currentTarget;
    const r = wrap.getBoundingClientRect();
    const before = (e.clientX - r.left) < r.width / 2;
    $$("#strip .strip-thumb-wrap").forEach(w => w.classList.remove("drop-before","drop-after"));
    wrap.classList.add(before ? "drop-before" : "drop-after");
  }
  function onStripDragLeave(e) {
    e.currentTarget.classList.remove("drop-before","drop-after");
  }
  function onStripDrop(e, hoverId) {
    if (!_dragState) return;
    e.preventDefault();
    const wrap = e.currentTarget;
    const r = wrap.getBoundingClientRect();
    const before = (e.clientX - r.left) < r.width / 2;
    const draggedIds = _dragState.ids;
    onStripDragEnd();
    reorderClipsTo(draggedIds, hoverId, before);
  }
  function onStripDragEnd() {
    _dragState = null;
    $$("#strip .strip-thumb-wrap").forEach(w => {
      w.classList.remove("dragging","drop-before","drop-after");
    });
  }
  async function reorderClipsTo(draggedIdSet, anchorId, before) {
    if (!draggedIdSet || draggedIdSet.size === 0) return;
    // 현재 순서 기준으로 dragged 들을 strip 순서대로 정렬
    const allIds = state.clips.map(c => c.id);
    const dragOrdered = allIds.filter(id => draggedIdSet.has(id));
    const remaining = allIds.filter(id => !draggedIdSet.has(id));
    // anchor 가 dragged 안에 있을 수도 — 그러면 자기 위치는 무시되므로 remaining 에 없음.
    // 그 경우 가장 가까운 비드래그 anchor 를 찾는다.
    let anchorIdx = remaining.indexOf(anchorId);
    if (anchorIdx < 0) {
      // 원래 anchor 의 인덱스 → 그 직전/직후 비드래그 클립
      const origIdx = allIds.indexOf(anchorId);
      // before 면 원래 anchor 자리 앞으로 — 즉 remaining 에서 origIdx 보다 앞에 있던 것들 다음
      // after 면 origIdx 보다 뒤 첫 비드래그 클립 앞
      const beforeRemain = allIds.slice(0, origIdx).filter(id => !draggedIdSet.has(id));
      anchorIdx = beforeRemain.length;       // remaining 안의 위치
      // anchor 가 dragged 일 때 before/after 구분이 모호 → before 처리로 통일
      const newOrder = [
        ...remaining.slice(0, anchorIdx),
        ...dragOrdered,
        ...remaining.slice(anchorIdx),
      ];
      await postReorder(newOrder);
      return;
    }
    const insertAt = before ? anchorIdx : anchorIdx + 1;
    const newOrder = [
      ...remaining.slice(0, insertAt),
      ...dragOrdered,
      ...remaining.slice(insertAt),
    ];
    await postReorder(newOrder);
  }
  async function postReorder(newOrderIds) {
    // 중복 방지: 변화가 없으면 스킵
    const cur = state.clips.map(c => c.id);
    if (cur.length === newOrderIds.length && cur.every((v, i) => v === newOrderIds[i])) return;
    // 활성/선택 클립의 *경로* 보존 — reorder 후 ID(인덱스)는 바뀌지만 path 는 유지
    const idToPath = new Map(state.clips.map(c => [c.id, c.path]));
    const activePath = idToPath.get(state.activeId);
    const selectedPaths = new Set([...(state.selectedIds || [])].map(id => idToPath.get(id)).filter(Boolean));
    try {
      const r = await fetch("/api/reorder", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ ids: newOrderIds }),
      });
      if (!r.ok) throw new Error("reorder failed");
    } catch (err) {
      console.error("reorder failed", err);
      return;
    }
    // 서버 반영 후 reloadState — 새 ID 매핑으로 active/selected 복원
    await reloadState({ preserveActive: false });
    // path 기반으로 active/selected 복원
    const pathToId = new Map(state.clips.map(c => [c.path, c.id]));
    if (activePath && pathToId.has(activePath)) {
      state.activeId = pathToId.get(activePath);
    }
    state.selectedIds = new Set();
    selectedPaths.forEach(pp => {
      const nid = pathToId.get(pp);
      if (nid !== undefined) state.selectedIds.add(nid);
    });
    repaintAll();
  }

  function proxyLabel(s) {
    if (s === "ready") return "준비됨";
    if (s === "building") return "프록시 생성중…";
    if (s && s.startsWith("error")) return "오류";
    return "대기";
  }

  function markClipGraded(c) {
    const dirty = isActiveDirty(c.grade);
    $$(`#clipList .clip-item[data-id="${c.id}"]`).forEach(el => el.classList.toggle("graded", dirty));
    $$(`#strip .strip-thumb`).forEach((el, i) => {
      if (state.clips[i] && state.clips[i].id === c.id) el.classList.toggle("graded", dirty);
    });
  }

  // ─────────────────────────────────────────────────────────
  function showOverlay(msg) {
    $("#overlayMsg").textContent = msg || "";
    $("#playerOverlay").classList.toggle("hidden", !msg);
  }

  function _setActiveOnly(id) {
    state.activeId = id;
    state.selectedIds = new Set([id]);
    state.lastClickedId = id;
    repaintAll();
  }
  function _toggleSelected(id) {
    if (state.selectedIds.has(id)) {
      state.selectedIds.delete(id);
      if (state.activeId === id) {
        const next = state.selectedIds.values().next().value;
        if (next !== undefined) state.activeId = next;
      }
    } else {
      state.selectedIds.add(id);
      state.activeId = id;
    }
    state.lastClickedId = id;
    repaintAll();
  }
  function _selectRange(toId) {
    if (state.lastClickedId < 0) return _setActiveOnly(toId);
    const a = Math.min(state.lastClickedId, toId);
    const b = Math.max(state.lastClickedId, toId);
    state.selectedIds = new Set();
    state.clips.forEach((c, i) => { if (i >= a && i <= b) state.selectedIds.add(c.id); });
    state.activeId = toId;
    repaintAll();
  }
  function _selectAll() {
    state.selectedIds = new Set(state.clips.map(c => c.id));
    repaintAll();
  }
  function repaintSelection() {
    $$(".clip-item").forEach(el => {
      const id = Number(el.dataset.id);
      el.classList.toggle("active", id === state.activeId);
      el.classList.toggle("selected", state.selectedIds.has(id));
    });
    $$(".strip-thumb").forEach((el, i) => {
      const c = state.clips[i];
      if (!c) return;
      el.classList.toggle("active", c.id === state.activeId);
      el.classList.toggle("selected", state.selectedIds.has(c.id));
    });
    const badge = document.getElementById("selectionBadge");
    if (badge) {
      const n = state.selectedIds.size;
      if (n > 1) {
        badge.textContent = `${n}개 선택`;
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    }
  }

  // Compute group color for tri mode based on active-clip ordering.
  // Returns map: clipId -> { activeIdx, groupIdx, color }
  function triGroupMap() {
    const map = new Map();
    if (!isTriMode()) return map;
    let ai = 0;
    for (const c of state.clips) {
      // 3컷 빌드는 disabled_tri 만 보고 제외. (시네마용 disabled 와 분리)
      if (Number(c.grade.disabled_tri || 0)) continue;
      const groupIdx = Math.floor(ai / 3);
      const positionInGroup = ai % 3;
      const color = (groupIdx % 2 === 0) ? "green" : "yellow";
      map.set(c.id, { activeIdx: ai, groupIdx, positionInGroup, color });
      ai++;
    }
    return map;
  }

  function renderTriPanel() {
    const bar = document.getElementById("triClipBar");
    const track = document.getElementById("triClipBarTrack");
    if (!bar || !track) return;
    if (!isTriMode()) {
      bar.hidden = true;
      track.innerHTML = "";
      return;
    }
    bar.hidden = false;
    const groups = triGroupMap();
    let activeCount = 0;
    state.clips.forEach(c => {
      if (!(Number(c.grade.disabled || 0) || Number(c.grade.disabled_tri || 0))) activeCount++;
    });
    const leftoverStart = activeCount - (activeCount % 3);

    track.innerHTML = "";
    state.clips.forEach((c, idx) => {
      const cell = document.createElement("div");
      cell.className = "tri-cell";
      cell.dataset.id = String(c.id);
      cell.title = c.name;
      if (c.id === state.activeId) cell.classList.add("active");
      // Disabled in tri (locally — disabled_tri only; if disabled (general) is also off, show normal grayed)
      const dTri = Number(c.grade.disabled_tri || 0);
      const dAll = Number(c.grade.disabled || 0);
      if (dTri) cell.classList.add("disabled-tri");

      // group color square (top-left)
      const badge = document.createElement("span");
      badge.className = "tri-cell-badge";
      const g = groups.get(c.id);
      if (g) {
        const isLeftover = g.activeIdx >= leftoverStart;
        badge.classList.add(isLeftover ? "gray" : g.color);
      } else {
        badge.classList.add("gray");
      }
      cell.appendChild(badge);

      // thumbnail
      const img = document.createElement("img");
      img.src = `/api/thumb?id=${c.id}`;
      img.loading = "lazy";
      img.alt = "";
      cell.appendChild(img);

      // index number
      const num = document.createElement("span");
      num.className = "tri-cell-num";
      num.textContent = String(idx + 1);
      cell.appendChild(num);

      // 일반 disabled 도 시각적으로 표시 (✕ 없이 회색, 클릭 무력)
      if (dAll && !dTri) {
        cell.style.opacity = "0.18";
        cell.title = c.name + " (전체에서 비활성됨 — 사이드바 Delete로 해제)";
      }
      cell.addEventListener("click", () => {
        if (dAll && !dTri) return;     // 일반 disabled는 여기서 토글 X
        toggleTriDisable(c.id);
      });
      track.appendChild(cell);
    });

    // scroll active into view
    const activeEl = track.querySelector(".tri-cell.active");
    if (activeEl) activeEl.scrollIntoView({ block: "nearest", inline: "center" });
  }

  function repaintDisabledAndGroups() {
    const tri = isTriMode();
    const groups = triGroupMap();
    document.body.classList.toggle("tri-mode", tri);

    // count active clips & leftover boundary (분리된 build 규칙에 맞춰)
    let activeCount = 0;
    state.clips.forEach(c => {
      if (tri) {
        if (!Number(c.grade.disabled_tri || 0)) activeCount++;     // 3컷 활성
      } else {
        if (!Number(c.grade.disabled || 0)) activeCount++;          // 시네마/일반 활성
      }
    });
    const leftoverStart = tri ? (activeCount - (activeCount % 3)) : activeCount;

    // (Old above-player tri panel/badge removed — group color is shown via the band on top of strip thumbs.)

    $$(".clip-item").forEach(el => {
      const id = Number(el.dataset.id);
      const c = state.clips.find(x => x.id === id);
      if (!c) return;
      // Sidebar dimming = 'disabled' (Delete) only. 3컷 전용 비활성은 strip 띠로만.
      el.classList.toggle("disabled", !!Number(c.grade.disabled || 0));
      const dot = el.querySelector(".group-dot");
      if (dot) {
        if (tri) {
          const g = groups.get(id);
          if (g) {
            const isLeftover = g.activeIdx >= leftoverStart;
            dot.className = "group-dot " + (isLeftover ? "gray" : g.color);
            dot.textContent = "●";
          } else {
            dot.textContent = "";
          }
        } else {
          dot.textContent = "";
        }
      }
    });
    $$(".strip-thumb").forEach((el, i) => {
      const c = state.clips[i];
      if (!c) return;
      // Strip thumbnail dimming reflects ONLY 'disabled' (Delete-key flag, 시네마/일반 빌드 제외 표시).
      // disabled_tri (band click)는 thumb 시각화 X — 띠에서만 표현.
      el.classList.toggle("disabled", !!Number(c.grade.disabled || 0));
      // 기존 group-dot-marker(좌상단 작은 네모) 제거 — 위쪽 띠로 충분.
      const oldMk = el.querySelector(".group-dot-marker");
      if (oldMk) oldMk.remove();
    });

    // group bands on top of strip thumbs (3컷 모드 전용 — 시네마 비활성과 무관)
    $$(".strip-thumb-wrap").forEach(wrap => {
      const id = Number(wrap.dataset.id);
      const c = state.clips.find(x => x.id === id);
      const band = wrap.querySelector(".tri-band");
      if (!c || !band) return;
      band.className = "tri-band";
      band.style.opacity = "";
      band.style.pointerEvents = "";
      if (!tri) return;
      const dTri = Number(c.grade.disabled_tri || 0);
      const g = groups.get(c.id);
      if (g) {
        const isLeftover = g.activeIdx >= leftoverStart;
        band.classList.add(isLeftover ? "gray" : g.color);
      } else {
        band.classList.add("gray");   // 비활성으로 그룹에 안 들어간 경우
      }
      if (dTri) band.classList.add("disabled-tri");
    });
  }

  function repaintAll() {
    repaintSelection();
    repaintDisabledAndGroups();
  }

  async function selectClip(id, opts) {
    if (!state.clips.length) return;
    opts = opts || {};
    if (id < 0) id = state.clips.length - 1;
    if (id >= state.clips.length) id = 0;

    if (opts.toggle) { _toggleSelected(id); }
    else if (opts.range) { _selectRange(id); }
    else { _setActiveOnly(id); }

    const c = currentClip();
    if (!c) return;

    $("#panelTitle").textContent = c.name;
    writeGradeToPanel(c.grade);
    applyMatrixToFilter(c.grade);
    updateTrimVisual(c.grade);

    // 1) 즉시 video 비우기 — 이전 클립이 재생 중인 상태로 남지 않게
    const v = $("#player");
    try { v.pause(); } catch (_) {}
    v.removeAttribute("src");
    v.load();
    showOverlay("프록시 준비 중…");

    // 2) 프록시 준비 (새 클립 sha 기반) — 이전 결과와 충돌 X
    fetch(`/api/proxy/start?id=${id}`).catch(() => {});
    await waitProxyReady(id);
    if (state.activeId !== id) return;          // user moved on

    // 3) 새 src 설정 (cache-bust)
    v.src = `/api/proxy.mp4?id=${id}&t=${Date.now()}`;
    v.load();
    v.onloadeddata = () => {
      // 비동기 도중 다른 클립으로 이동했으면 무시
      if (state.activeId !== id) return;
      showOverlay("");
      const cc = currentClip();
      if (cc && cc.grade.trim_in > 0) v.currentTime = cc.grade.trim_in;
    };
    v.onerror = () => showOverlay("재생 오류");
    // Scroll active into view
    const item = $(`#clipList .clip-item[data-id="${id}"]`);
    if (item) item.scrollIntoView({ block: "nearest" });
    const strip = $$("#strip .strip-thumb")[id];
    if (strip) strip.scrollIntoView({ block: "nearest", inline: "center" });
  }

  async function waitProxyReady(id, timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const r = await fetch(`/api/proxy/status?id=${id}`);
        const j = await r.json();
        const c = state.clips.find(x => x.id === id);
        if (c) {
          c.proxy = j.status;
          const lbl = $(`#clipList .clip-item[data-id="${id}"] .proxy-status`);
          if (lbl) lbl.textContent = proxyLabel(j.status);
        }
        if (j.status === "ready") return;
        if (j.status && j.status.startsWith && j.status.startsWith("error")) {
          showOverlay("프록시 생성 오류");
          return;
        }
      } catch (_) {}
      await sleep(700);
    }
    showOverlay("프록시 시간 초과");
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ─────────────────────────────────────────────────────────
  // Player controls
  function bindPlayer() {
    const v = $("#player");
    const seek = $("#seek");
    const tnow = $("#timeNow");
    const tdur = $("#timeDur");
    const btnPlay = $("#btnPlay");
    const btnAB = $("#btnAB");

    v.addEventListener("loadedmetadata", () => {
      seek.max = String(v.duration || 0);
      tdur.textContent = fmtTime(v.duration || 0);
      updateTrimVisual(currentGrade());
    });
    v.addEventListener("timeupdate", () => {
      seek.value = String(v.currentTime || 0);
      tnow.textContent = fmtTime(v.currentTime || 0);
      // enforce trim during playback
      const c = currentClip();
      if (c) {
        const tin = Number(c.grade.trim_in || 0);
        const tout = Number(c.grade.trim_out || 0);
        const dur = v.duration || 0;
        if (tout > 0 && v.currentTime >= tout && !v.paused) {
          v.currentTime = tin > 0 ? tin : 0;
        } else if (tin > 0 && v.currentTime < tin - 0.05) {
          v.currentTime = tin;
        }
      }
    });
    v.addEventListener("play", () => btnPlay.textContent = "❚❚");
    v.addEventListener("pause", () => btnPlay.textContent = "▶");

    seek.addEventListener("input", () => { v.currentTime = Number(seek.value); });
    btnPlay.addEventListener("click", () => v.paused ? v.play() : v.pause());

    btnAB.addEventListener("mousedown", () => { state.abShowOriginal = true; setOriginalView(true); });
    btnAB.addEventListener("mouseup",   () => { state.abShowOriginal = false; setOriginalView(false); });
    btnAB.addEventListener("mouseleave",() => { if (state.abShowOriginal) { state.abShowOriginal = false; setOriginalView(false); } });

    // 미리보기 아래 strip — 마우스 휠로 좌우 스크롤
    const strip = $("#strip");
    if (strip) {
      strip.addEventListener("wheel", (e) => {
        // 이미 가로 의도(deltaX)면 그대로 두고, 세로 휠(deltaY)을 가로 이동으로 변환
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          strip.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }
  }

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ─────────────────────────────────────────────────────────
  // Trim helpers
  function updateTrimVisual(g) {
    const v = $("#player");
    const dur = v.duration || 0;
    const trimDiv = $("#seekTrim");
    if (!trimDiv) return;
    const tin = Math.max(0, Number(g && g.trim_in || 0));
    const tout = Math.max(0, Number(g && g.trim_out || 0));
    if (dur <= 0 || (tin <= 0 && tout <= 0)) {
      trimDiv.style.background = "transparent";
      return;
    }
    const inPct = Math.min(100, (tin / dur) * 100);
    const outPct = tout > 0 ? Math.min(100, (tout / dur) * 100) : 100;
    const dim = "rgba(0,0,0,0.55)";
    const lit = "rgba(255,122,61,0.20)";
    trimDiv.style.background =
      `linear-gradient(to right, ${dim} 0%, ${dim} ${inPct}%, ${lit} ${inPct}%, ${lit} ${outPct}%, ${dim} ${outPct}%, ${dim} 100%)`;
  }
  function setTrimIn() {
    const c = currentClip(); if (!c) return;
    pushHistorySingle(c.id);
    const v = $("#player");
    const t = Math.max(0, v.currentTime || 0);
    const tout = Number(c.grade.trim_out || 0);
    c.grade.trim_in = (tout > 0 && t >= tout) ? Math.max(0, tout - 0.1) : t;
    updateTrimVisual(c.grade);
    markClipGraded(c);
    scheduleSave(c);
  }
  function setTrimOut() {
    const c = currentClip(); if (!c) return;
    pushHistorySingle(c.id);
    const v = $("#player");
    const t = Math.max(0, v.currentTime || 0);
    const tin = Number(c.grade.trim_in || 0);
    c.grade.trim_out = (t <= tin) ? Math.min((v.duration || t + 1), tin + 0.1) : t;
    updateTrimVisual(c.grade);
    markClipGraded(c);
    scheduleSave(c);
  }
  function clearTrim() {
    const c = currentClip(); if (!c) return;
    pushHistorySingle(c.id);
    c.grade.trim_in = 0;
    c.grade.trim_out = 0;
    updateTrimVisual(c.grade);
    markClipGraded(c);
    scheduleSave(c);
  }

  // ─────────────────────────────────────────────────────────
  // Preset slot
  async function loadPresetSlot() {
    try {
      const r = await fetch("/api/preset");
      const j = await r.json();
      state.presetSlot = j.grade || null;
    } catch (_) { state.presetSlot = null; }
  }
  async function savePresetFromActive() {
    const c = currentClip(); if (!c) return;
    const status = $("#saveStatus");
    status.textContent = "사전저장 중…"; status.className = "status-pill";
    try {
      const r = await fetch("/api/preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: c.grade }),
      });
      const j = await r.json();
      state.presetSlot = j.grade || c.grade;
      status.textContent = "사전저장됨"; status.className = "status-pill ok";
      setTimeout(() => { if (status.textContent === "사전저장됨") status.textContent = ""; }, 1500);
    } catch (_) {
      status.textContent = "실패"; status.className = "status-pill err";
    }
  }
  async function applyPresetToSelected() {
    if (!state.presetSlot) {
      const status = $("#saveStatus");
      status.textContent = "사전저장 비어있음";
      status.className = "status-pill err";
      return;
    }
    const ids = state.selectedIds.size ? state.selectedIds : new Set([state.activeId]);
    pushHistoryBatch(Array.from(ids));
    const items = [];
    let n = 0;
    state.clips.forEach(c => {
      if (!ids.has(c.id)) return;
      // copy slider keys (skip trim — keep per-clip trim)
      SLIDER_KEYS.forEach(k => { c.grade[k] = Number(state.presetSlot[k] ?? DEFAULT_GRADE[k]); });
      // HSL 색조/채도/밝기 (8채널 × {h,s,l}) 도 함께 복사 — cloneGrade 가 깊은 복제 처리
      const presetHsl = cloneGrade(state.presetSlot).hsl;
      c.grade.hsl = presetHsl;
      markClipGraded(c);
      // 디바운스 timer 도 cancel — 같은 클립이 곧이어 batch 로 저장될 거라 timer 발사 불필요
      const t = _saveTimers.get(c.id);
      if (t) { clearTimeout(t); _saveTimers.delete(c.id); }
      items.push({ id: c.id, grade: c.grade });
      n++;
    });
    const ac = currentClip();
    if (ac) {
      writeGradeToPanel(ac.grade);
      applyMatrixToFilter(ac.grade);
    }
    const status = $("#saveStatus");
    status.textContent = `${n}개 저장 중…`;
    status.className = "status-pill";
    // 한 번의 batch fetch — 동시 30개 race condition 방지
    try {
      const r = await fetch("/api/save_bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "fail");
      status.textContent = `${j.saved || n}개 적용됨`;
      status.className = "status-pill ok";
    } catch (err) {
      status.textContent = "일괄 저장 실패";
      status.className = "status-pill err";
      console.error(err);
    }
    setTimeout(() => { if (status.textContent.includes("적용")) status.textContent = ""; }, 1500);
  }

  // ─────────────────────────────────────────────────────────
  // 🌈 그라데이션 보간
  //   현재 선택된 클립들을 anchor 로 사용 (짝수개 필요).
  //   anchor 들을 타임라인 순서대로 페어(1-2, 3-4, ...)로 묶고,
  //   각 페어 사이의 클립들에 슬라이더 값을 선형 보간하여 적용.
  //   HSL / 트림 / disabled 는 보간하지 않음 (값 그대로 유지).
  async function applyGradientInterpolation() {
    const status = $("#saveStatus");
    const setStatus = (msg, cls) => {
      status.textContent = msg;
      status.className = "status-pill" + (cls ? " " + cls : "");
    };

    const anchorIds = Array.from(state.selectedIds || []);
    if (anchorIds.length < 2) {
      setStatus("anchor 2개 이상 선택 필요", "err");
      setTimeout(() => { if (status.textContent.includes("anchor")) setStatus(""); }, 2500);
      return;
    }
    if (anchorIds.length % 2 !== 0) {
      setStatus(`anchor ${anchorIds.length}개 (짝수여야 함)`, "err");
      setTimeout(() => { if (status.textContent.includes("anchor")) setStatus(""); }, 2500);
      return;
    }

    // anchor 들을 state.clips(타임라인) 순서로 정렬
    const idxOf = new Map(state.clips.map((c, i) => [c.id, i]));
    const anchors = anchorIds
      .filter(id => idxOf.has(id))
      .sort((a, b) => idxOf.get(a) - idxOf.get(b));

    // 페어 생성 (1-2, 3-4, ...)
    const pairs = [];
    for (let i = 0; i < anchors.length; i += 2) {
      const s = anchors[i], e = anchors[i + 1];
      const sIdx = idxOf.get(s), eIdx = idxOf.get(e);
      if (sIdx != null && eIdx != null && sIdx < eIdx) {
        pairs.push({ sId: s, eId: e, sIdx, eIdx });
      }
    }
    if (!pairs.length) {
      setStatus("페어를 만들 수 없음 (anchor 사이에 클립 필요)", "err");
      setTimeout(() => { if (status.textContent.includes("페어")) setStatus(""); }, 2500);
      return;
    }

    // 보간 대상 클립 수집 + 히스토리 저장
    const touchedIds = [];
    for (const p of pairs) {
      for (let i = p.sIdx + 1; i < p.eIdx; i++) {
        touchedIds.push(state.clips[i].id);
      }
    }
    if (!touchedIds.length) {
      setStatus("보간 대상 없음 (anchor 사이가 모두 비어있음)", "err");
      setTimeout(() => { if (status.textContent.includes("보간")) setStatus(""); }, 2500);
      return;
    }
    pushHistoryBatch(touchedIds);

    // 보간 적용
    const items = [];
    for (const p of pairs) {
      const sc = state.clips[p.sIdx];
      const ec = state.clips[p.eIdx];
      const span = p.eIdx - p.sIdx;
      for (let i = p.sIdx + 1; i < p.eIdx; i++) {
        const middle = state.clips[i];
        const t = (i - p.sIdx) / span;
        SLIDER_KEYS.forEach(k => {
          const a = Number(sc.grade[k] ?? DEFAULT_GRADE[k]);
          const b = Number(ec.grade[k] ?? DEFAULT_GRADE[k]);
          const v = a + t * (b - a);
          // temp 는 step 50, 정수. 나머지는 정수.
          middle.grade[k] = k === "temp" ? Math.round(v / 50) * 50 : Math.round(v);
        });
        markClipGraded(middle);
        // 디바운스 저장 timer 캔슬 — 곧 batch 저장됨
        const tmr = _saveTimers.get(middle.id);
        if (tmr) { clearTimeout(tmr); _saveTimers.delete(middle.id); }
        items.push({ id: middle.id, grade: middle.grade });
      }
    }

    // 활성 클립이 보간 대상이면 패널/필터 갱신
    const ac = currentClip();
    if (ac && touchedIds.includes(ac.id)) {
      writeGradeToPanel(ac.grade);
      applyMatrixToFilter(ac.grade);
    }

    setStatus(`${items.length}개 보간 적용 중…`);
    try {
      const r = await fetch("/api/save_bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "fail");
      setStatus(`🌈 ${pairs.length}페어 / ${items.length}장 보간 완료`, "ok");
    } catch (err) {
      setStatus("일괄 저장 실패", "err");
      console.error(err);
    }
    setTimeout(() => { if (status.textContent.includes("보간")) setStatus(""); }, 2500);
  }

  // ─────────────────────────────────────────────────────────
  // Delete = toggle `disabled` (always; affects both normal and tri builds)
  // 3컷 전용 비활성은 위 가로 패널의 cell 클릭으로 별도 처리(`disabled_tri`).
  function deleteSelected() {
    const ids = Array.from(state.selectedIds.size ? state.selectedIds : [state.activeId]);
    if (!ids.length || ids[0] < 0) return;
    pushHistoryBatch(ids);
    let anyEnabled = false;
    for (const id of ids) {
      const c = state.clips.find(x => x.id === id);
      if (c && !Number(c.grade.disabled || 0)) { anyEnabled = true; break; }
    }
    const newVal = anyEnabled ? 1 : 0;
    for (const id of ids) {
      const c = state.clips.find(x => x.id === id);
      if (!c) continue;
      c.grade.disabled = newVal;
      markClipGraded(c);
      scheduleSave(c);
    }
    repaintAll();
    setBusyShort(newVal ? `${ids.length}개 비활성` : `${ids.length}개 활성화`);
  }
  function toggleTriDisable(clipId) {
    const c = state.clips.find(x => x.id === clipId);
    if (!c) return;
    pushHistorySingle(c.id);
    c.grade.disabled_tri = Number(c.grade.disabled_tri || 0) ? 0 : 1;
    markClipGraded(c);
    scheduleSave(c);
    repaintAll();
  }

  // ─────────────────────────────────────────────────────────
  // Keyboard
  function bindKeys() {
    document.addEventListener("keydown", (e) => {
      const tag = (e.target && (e.target.tagName || "")).toLowerCase();
      const isInput = tag === "input" || tag === "textarea";
      const isText = isInput && e.target.type !== "range";

      // ⌘/Ctrl combinations first
      if (modKey(e)) {
        if (e.key === "z" || e.key === "Z") {
          e.preventDefault();
          undoOne();
          return;
        }
        if (e.key === "a" || e.key === "A") {
          if (isText) return;
          e.preventDefault();
          _selectAll();
          return;
        }
        if (e.key === "s" || e.key === "S") {
          e.preventDefault();
          savePresetFromActive();
          return;
        }
        if (e.key === "d" || e.key === "D") {
          e.preventDefault();
          applyPresetToSelected();
          return;
        }
        return; // other modkey passes
      }

      if (e.key === " " && !isText) {
        e.preventDefault();
        const v = $("#player");
        if (v.paused) v.play(); else v.pause();
      } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !isInput) {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        selectClip(state.activeId + dir);
      } else if (e.altKey && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        selectClip(state.activeId - 1);
      } else if (e.altKey && (e.key === "d" || e.key === "D")) {
        e.preventDefault();
        selectClip(state.activeId + 1);
      } else if (e.altKey && (e.code === "KeyW" || e.key === "w" || e.key === "W") && !isText) {
        e.preventDefault();
        _eye.armed ? disarmEyedropper() : armEyedropper();
      } else if ((e.key === "a" || e.key === "A") && !isText && !e.altKey) {
        e.preventDefault();
        state.abShowOriginal = !state.abShowOriginal;
        setOriginalView(state.abShowOriginal);
      } else if ((e.key === "q" || e.key === "Q") && !isText) {
        e.preventDefault();
        setTrimIn();
      } else if ((e.key === "w" || e.key === "W") && !isText) {
        e.preventDefault();
        setTrimOut();
      } else if ((e.key === "Delete" || e.key === "Backspace") && !isText) {
        e.preventDefault();
        deleteSelected();
      }
    });
    // Reset button
    $("#btnReset").addEventListener("click", () => {
      const c = currentClip();
      if (!c) return;
      pushHistorySingle(c.id);
      c.grade = freshDefaultGrade();
      writeGradeToPanel(c.grade);
      applyMatrixToFilter(c.grade);
      updateTrimVisual(c.grade);
      markClipGraded(c);
      scheduleSave(c);
    });
    $("#btnPresetSave").addEventListener("click", () => savePresetFromActive());
    $("#btnPresetApply").addEventListener("click", () => applyPresetToSelected());
    $("#btnGradient").addEventListener("click", () => applyGradientInterpolation());
    $("#btnTrimIn").addEventListener("click", () => setTrimIn());
    $("#btnTrimOut").addEventListener("click", () => setTrimOut());
    $("#btnTrimClear").addEventListener("click", () => clearTrim());

    const SOFT_RELOAD_ENDPOINTS = new Set([
      "/api/pick_logo",
      "/api/clear_logo",
      "/api/pick_music_folder",
    ]);
    const pick = async (path, label) => {
      // 슬라이더 디바운스 중인 변경이 사라지지 않도록 picker 호출 전 강제 저장
      try { await flushAllSaves(); } catch (_) {}
      setBusy(label);
      try {
        const r = await fetch(path, { method: "POST" });
        const j = await r.json();
        if (j.cancelled) { setBusy(""); return; }
        if (!r.ok || j.error) {
          setBusy("실패");
          alert("불러오기 실패: " + (j.error || r.status));
          return;
        }
        // 로고/음악 같은 부분 변경 → 현재 보던 클립과 보정 슬라이더 그대로 유지
        const soft = SOFT_RELOAD_ENDPOINTS.has(path);
        await reloadState({ preserveActive: soft });
        setBusy("");
      } catch (err) {
        console.error(err);
        setBusy("실패");
      }
    };
    $("#btnPickFolder").addEventListener("click", () => pick("/api/pick_folder", "폴더 여는 중…"));
    $("#btnPickFiles").addEventListener("click", () => pick("/api/pick_files", "파일 고르는 중…"));
    $("#btnAddFiles").addEventListener("click", () => pick("/api/add_files", "추가하는 중…"));
    $("#btnPickMusic").addEventListener("click", () => pick("/api/pick_music_folder", "음악 폴더 여는 중…"));
    $("#btnOpenMusicFolder").addEventListener("click", async () => {
      try {
        const r = await fetch("/api/open_music_folder", { method: "POST" });
        const j = await r.json();
        if (!r.ok || j.error) {
          alert(j.error || "폴더 열기 실패");
          return;
        }
        // Finder 가 열렸으니 유저가 곡을 추가/삭제 후 페이지 새로고침하면 자동 반영
        setBusyShort("Finder 에서 폴더 열림 — 곡 추가/삭제 후 새로고침");
      } catch (e) {
        alert("폴더 열기 실패: " + e);
      }
    });
    $("#btnShuffleMusic").addEventListener("click", async () => {
      try { await flushAllSaves(); } catch (_) {}
      setBusy("랜덤 곡 선택 중…");
      try {
        const r = await fetch("/api/music/randomize", { method: "POST" });
        const j = await r.json();
        if (!r.ok || j.error) {
          setBusy("");
          alert(j.error || "랜덤 실패");
          return;
        }
        // 음악 라벨만 갱신 (현재 보던 클립/보정 그대로)
        await reloadState({ preserveActive: true });
        setBusyShort(`다음 곡 ${j.next_index} · ${j.next_name}`);
      } catch (err) {
        console.error(err);
        setBusy("");
      }
    });
    $("#btnPickLogo").addEventListener("click", () => pick("/api/pick_logo", "로고 여는 중…"));
    $("#btnClearLogo").addEventListener("click", async () => {
      try { await flushAllSaves(); } catch (_) {}
      await fetch("/api/clear_logo", { method: "POST" });
      await reloadState({ preserveActive: true });
    });
    $("#btnBuild").addEventListener("click", () => startBuild());
    $("#btnSnapshotSave").addEventListener("click", () => saveSnapshotNow());
    $("#btnBuildClose").addEventListener("click", () => $("#buildModal").hidden = true);
    const _toggleLog = () => $("#buildCard").classList.toggle("collapsed");
    $("#btnBuildToggleLog").addEventListener("click", (e) => { e.stopPropagation(); _toggleLog(); });
    $("#buildCardHead").addEventListener("click", (e) => {
      // ignore clicks on action buttons
      if (e.target && e.target.closest && e.target.closest(".build-card-head-actions")) return;
      _toggleLog();
    });

    // Cinema toggle: live letterbox + persist locally
    const chkCinema = $("#chkCinema");
    const initCinema = (() => {
      const saved = localStorage.getItem("gs_cinema");
      if (saved === null) return true;     // default on
      return saved === "1";
    })();
    chkCinema.checked = initCinema;
    applyCinemaVisual(initCinema);
    chkCinema.addEventListener("change", () => {
      const on = chkCinema.checked;
      localStorage.setItem("gs_cinema", on ? "1" : "0");
      applyCinemaVisual(on);
    });

    // 가로형(fullframe) — 1920×1080 일반 비율. 기본값 OFF (시네마와 둘 다 켜면 두 종류가 같이 빌드됨)
    const chkFull = $("#chkFull");
    if (chkFull) {
      const initFull = localStorage.getItem("gs_full") === "1";
      chkFull.checked = initFull;
      chkFull.addEventListener("change", () => {
        localStorage.setItem("gs_full", chkFull.checked ? "1" : "0");
      });
    }

    const chkTri = $("#chkTri");
    const initTri = localStorage.getItem("gs_tri") === "1";
    chkTri.checked = initTri;
    document.body.classList.toggle("tri-mode", initTri);
    chkTri.addEventListener("change", () => {
      const on = chkTri.checked;
      localStorage.setItem("gs_tri", on ? "1" : "0");
      // re-render disabled/group view since key + colors change with mode
      repaintAll();
    });
  }
  function isFullOn() {
    const c = document.getElementById("chkFull");
    return c ? !!c.checked : false;
  }

  // ─────────────────────────────────────────────────────────
  // 로고 크기 — localStorage 에 보관, 빌드 시 서버로 전달
  function getLogoScalePct() {
    const raw = Number(localStorage.getItem("gs_logo_scale") || 100);
    if (!isFinite(raw)) return 100;
    return Math.max(10, Math.min(150, Math.round(raw)));
  }
  function setLogoScalePct(pct) {
    const v = Math.max(10, Math.min(150, Math.round(Number(pct) || 100)));
    localStorage.setItem("gs_logo_scale", String(v));
    return v;
  }
  function applyLogoSizeFromInput() {
    // 미리보기 overlay 의 CSS scale 을 % 에 맞춰 (기본 2배 × pct/100)
    const pct = getLogoScalePct();
    document.documentElement.style.setProperty("--logo-preview-scale", String(2 * pct / 100));
    const inp = document.getElementById("logoSize");
    if (inp && Number(inp.value) !== pct) inp.value = String(pct);
  }
  function bindLogoSize() {
    const inp = document.getElementById("logoSize");
    if (!inp) return;
    inp.value = String(getLogoScalePct());
    const onChange = () => {
      const v = setLogoScalePct(inp.value);
      inp.value = String(v);
      applyLogoSizeFromInput();
    };
    inp.addEventListener("input", onChange);
    inp.addEventListener("change", onChange);
    inp.addEventListener("wheel", (e) => {
      if (document.activeElement !== inp) return;
      e.preventDefault();
      const step = Number(inp.step) || 5;
      const dir = e.deltaY > 0 ? -1 : 1;
      inp.value = String(Math.max(10, Math.min(150, Number(inp.value) + dir * step)));
      onChange();
    }, { passive: false });
    applyLogoSizeFromInput();
  }

  function applyCinemaVisual(on) {
    // body 클래스로 토글 — CSS 가 video max-height 를 850/1080 으로 축소.
    // 위/아래는 .player-frame 검은 배경이 자연스럽게 letterbox 를 형성.
    document.body.classList.toggle("cinema-mode", !!on);
  }
  function isCinemaOn() {
    const c = document.getElementById("chkCinema");
    return c ? !!c.checked : true;
  }

  // ─────────────────────────────────────────────────────────
  async function startBuild() {
    const full = isFullOn();
    const cinema = isCinemaOn();
    const tri = isTriMode();
    if (!full && !cinema && !tri) {
      alert("만들 영상 종류를 하나 이상 선택하세요 (📺 가로 / 시네마 / 🎞 3컷)");
      return;
    }
    // 변경한 보정값이 빌드에 누락되지 않도록 디바운스된 저장을 모두 즉시 반영
    await flushAllSaves();
    const r = await fetch("/api/build", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full, cinema, tri_stack: tri, logo_scale_pct: getLogoScalePct() }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) {
      alert(j.error || "만들기 실패");
      return;
    }
    if (j.warnings && j.warnings.length) console.warn("build warnings:", j.warnings);
    openBuildModal();
    await reloadState();
    await loadSnapshots();
    pollBuild();
  }

  // ─────────────────────────────────────────────────────────
  // Snapshot rail
  async function loadSnapshots() {
    try {
      const r = await fetch("/api/snapshots");
      const j = await r.json();
      renderSnapshotChips(j.snapshots || []);
    } catch (_) {}
  }
  function renderSnapshotChips(snaps) {
    const rail = document.getElementById("snapshotRail");
    if (!rail) return;
    rail.innerHTML = "";
    for (const s of snaps) {
      const cls = (s.build_status === "saved") ? "saved"
        : (s.build_status === "building") ? "building"
        : (s.build_status === "done") ? "done"
        : (typeof s.build_status === "string" && s.build_status.startsWith("error")) ? "error"
        : "saved";
      const icon =
        cls === "done" ? "✓" :
        cls === "error" ? "!" :
        cls === "saved" ? "◆" : "";
      const chip = document.createElement("div");
      chip.className = `snapshot-chip ${cls}`;
      chip.dataset.id = s.id;
      const outputs = s.outputs || {};
      const expected = s.expected_tags || [];
      const outputSummary = Object.entries(outputs)
        .filter(([_, v]) => v)
        .map(([t, v]) => `${t === "cine" ? "시네마" : t === "tri" ? "3컷" : t}: ${v.split("/").pop()}`)
        .join("\n") || (expected.length ? `대기: ${expected.join(", ")}` : "");
      const tooltip = [
        s.label,
        `클립 ${s.video_count}개`,
        `시네마: ${s.cinema_on ? "ON" : "OFF"}, 3컷: ${s.tri_on ? "ON" : "OFF"}`,
        new Date(s.created_at*1000).toLocaleString(),
        outputSummary,
      ].filter(Boolean).join("\n");
      chip.title = tooltip;
      chip.innerHTML = `<span class="chip-icon">${icon}</span><span class="chip-label"></span><span class="chip-x" title="삭제">×</span>`;
      chip.querySelector(".chip-label").textContent = s.label || "untitled";
      chip.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("chip-x")) return;
        loadSnapshotById(s.id);
      });
      chip.querySelector(".chip-x").addEventListener("click", async (e) => {
        e.stopPropagation();
        if (!confirm(`'${s.label}' 작업을 삭제할까요?`)) return;
        await fetch("/api/snapshot/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: s.id }),
        });
        await loadSnapshots();
      });
      rail.appendChild(chip);
    }
  }
  async function saveSnapshotNow() {
    setBusy("저장 중…");
    try {
      const r = await fetch("/api/snapshot/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full: isFullOn(), cinema: isCinemaOn(), tri: isTriMode() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        alert(j.error || "저장 실패");
        setBusy("");
        return;
      }
      await loadSnapshots();
      setBusyShort("저장됨");
    } catch (_) {
      setBusy("");
    }
  }
  async function loadSnapshotById(sid) {
    setBusy("불러오는 중…");
    try {
      const r = await fetch("/api/snapshot/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sid }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        alert(j.error || "불러오기 실패");
        setBusy("");
        return;
      }
      // Apply full + cinema + tri toggles from snapshot
      if (typeof j.full === "boolean") {
        const f = document.getElementById("chkFull");
        if (f) { f.checked = j.full; localStorage.setItem("gs_full", j.full ? "1" : "0"); }
      }
      if (typeof j.cinema === "boolean") {
        const c = document.getElementById("chkCinema");
        if (c) { c.checked = j.cinema; localStorage.setItem("gs_cinema", j.cinema ? "1" : "0"); applyCinemaVisual(j.cinema); }
      }
      if (typeof j.tri === "boolean") {
        const t = document.getElementById("chkTri");
        if (t) { t.checked = j.tri; localStorage.setItem("gs_tri", j.tri ? "1" : "0"); }
      }
      if (j.missing && j.missing > 0) {
        setBusyShort(`불러옴 (${j.missing}개 파일 누락)`);
      } else {
        setBusyShort("불러옴");
      }
      await reloadState();
    } catch (_) {
      setBusy("");
    }
  }
  function openBuildModal() {
    $("#buildModal").hidden = false;
    $("#buildCard").classList.add("collapsed");  // start collapsed; user can expand log
    $("#buildTitle").innerHTML = '<span class="spinner"></span><span>영상 만드는 중…</span>';
    $("#buildLog").textContent = "";
    $("#buildFoot").textContent = "";
  }
  let _pollTimer = null;
  async function pollBuild() {
    if (_pollTimer) clearTimeout(_pollTimer);
    try {
      const r = await fetch("/api/build/status");
      const j = await r.json();
      const log = (j.log_tail || []).join("\n");
      $("#buildLog").textContent = log;
      $("#buildLog").scrollTop = $("#buildLog").scrollHeight;
      const queueSize = Number(j.queue_size || 0);
      const qInfo = queueSize > 0 ? ` · 대기 ${queueSize}` : "";
      // 큐가 비고 idle 이면 완전 종료
      if (j.status === "idle" && queueSize === 0) {
        $("#buildTitle").textContent = "✅ 완성";
        const out = j.output || "";
        if (out) {
          $("#buildFoot").innerHTML = `결과: <a href="#" id="revealOut">${escapeHtml(out)}</a>`;
          const a = $("#revealOut");
          if (a) a.addEventListener("click", (e) => {
            e.preventDefault();
            fetch("/api/reveal", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: out }),
            }).catch(() => {});
          });
        }
        loadSnapshots();
        return;
      }
      if (typeof j.status === "string" && j.status.startsWith("error") && queueSize === 0) {
        $("#buildTitle").textContent = "❌ 실패";
        $("#buildFoot").textContent = j.status;
        loadSnapshots();
        return;
      }
      // running 또는 다음 작업 대기 중 — 헤더 갱신
      $("#buildTitle").innerHTML = `<span class="spinner"></span><span>영상 만드는 중…${qInfo}</span>`;
      if (j.status === "done" || (typeof j.status === "string" && j.status.startsWith("error"))) {
        // transitioning to next job
        loadSnapshots();
      }
    } catch (err) {
      console.error(err);
    }
    _pollTimer = setTimeout(pollBuild, 1000);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
  }

  function setBusy(msg) {
    const status = $("#saveStatus");
    if (msg) {
      status.textContent = msg;
      status.className = "status-pill";
    } else {
      status.textContent = "";
      status.className = "status-pill";
    }
  }

  async function reloadState(opts) {
    opts = opts || {};
    const preserveActive = !!opts.preserveActive;
    const prevActiveId = state.activeId;
    // 폴더 변경 등 큰 변경에만 video clear + activeId reset.
    // 로고/음악 등 부분 변경엔 preserveActive=true 로 호출 → 현재 보던 클립 그대로.
    if (!preserveActive) {
      const _v0 = document.getElementById("player");
      if (_v0) {
        try { _v0.pause(); } catch (_) {}
        _v0.removeAttribute("src");
        _v0.load();
      }
      state.activeId = -1;
    }
    showOverlay("불러오는 중…");
    try {
      const r = await fetch("/api/state");
      const j = await r.json();
      state.folder = j.folder || "";
      state.clips = j.clips || [];
      state.activeId = -1;
      $("#folderLabel").textContent = j.folder_label || j.folder || "(폴더 미선택)";
      $("#folderLabel").title = j.folder || "";
      const mus = j.music || {};
      const mLab = $("#musicLabel");
      if (mLab) {
        if (mus.folder) {
          const folderName = mus.folder.split("/").pop();
          const next = mus.next_index ? ` · 다음 ${mus.next_index}/${mus.count}` : "";
          mLab.textContent = `🎵 ${folderName}${next}`;
          const lines = [
            mus.folder,
            "",
            mus.next_name ? `▶ 다음 빌드: ${mus.next_index}/${mus.count} · ${mus.next_name}` : "",
            mus.last_name ? `← 이전 사용: ${mus.last_index}/${mus.count} · ${mus.last_name}` : "",
            "",
            "전체 목록:",
            ...(mus.names || []).map((n, i) => `  ${i + 1}. ${n}`),
          ];
          mLab.title = lines.filter(s => s !== undefined).join("\n");
        } else {
          mLab.textContent = "(음악 미선택)";
          mLab.title = "";
        }
      }
      const lg = j.logo || {};
      const lLab = $("#logoLabel");
      const lClr = $("#btnClearLogo");
      const lImg = $("#logoOverlay");
      const lSize = $("#logoSizeWrap");
      if (lLab) {
        if (lg.path) {
          lLab.textContent = `🖼 ${lg.name || "로고"}`;
          lLab.title = lg.path;
          if (lClr) lClr.hidden = false;
          if (lSize) lSize.hidden = false;
          if (lImg) {
            lImg.hidden = false;
            lImg.src = `/api/logo?t=${Date.now()}`;
          }
        } else {
          lLab.textContent = "(로고 미선택)";
          lLab.title = "";
          if (lClr) lClr.hidden = true;
          if (lSize) lSize.hidden = true;
          if (lImg) { lImg.hidden = true; lImg.removeAttribute("src"); }
        }
      }
      applyLogoSizeFromInput();
    } catch (err) {
      showOverlay("서버 연결 실패");
      console.error(err);
      return;
    }
    renderClipList();
    renderStrip();
    if (state.clips.length) {
      if (preserveActive && prevActiveId >= 0 && prevActiveId < state.clips.length) {
        // 부분 변경 — 현재 보던 클립 그대로. 슬라이더만 새 grade 로 다시 적용 (서버 fresh 값 반영).
        const c = state.clips.find(x => x.id === prevActiveId);
        if (c) {
          state.activeId = prevActiveId;
          state.selectedIds = new Set([prevActiveId]);
          state.lastClickedId = prevActiveId;
          writeGradeToPanel(c.grade);
          applyMatrixToFilter(c.grade);
          updateTrimVisual(c.grade);
          showOverlay("");
          repaintAll();
        } else {
          selectClip(0);
        }
      } else {
        // 첫 클립이 합성 출력물(예: 3컷세로형) 같이 재생 안 되는 케이스 회피 — 단순히 0번부터
        selectClip(0);
      }
    } else {
      // 비디오 src 비우기
      const v = $("#player");
      v.removeAttribute("src");
      v.load();
      $("#panelTitle").textContent = "보정";
      writeGradeToPanel(DEFAULT_GRADE);
      applyMatrixToFilter(DEFAULT_GRADE);
      showOverlay("폴더 또는 파일을 선택하세요 (상단 「폴더 열기」 / 「파일 고르기」)");
    }
  }

  // ─────────────────────────────────────────────────────────
  // 스포이드 — 미리보기에서 회색/흰색이어야 할 지점을 클릭 → 원본 픽셀에서
  // 색온도(temp) / 색조(tint) 자동 계산. WB 단계는 per-channel scale 이므로
  // tr == tb 가 자동 소거됨 → R/B 비율로 temp 풀이 → 잔여 G 캐스트로 tint 풀이.
  const _eye = { armed: false, hintEl: null, _onClick: null, _onKey: null };
  function _sampleVideoRgb(cx, cy) {
    const v = $("#player");
    if (!v || v.readyState < 2 || !v.videoWidth) return null;
    const r = 3;                    // 7x7 평균
    const w = r * 2 + 1, h = r * 2 + 1;
    const x0 = Math.max(0, Math.min(v.videoWidth  - w, Math.round(cx) - r));
    const y0 = Math.max(0, Math.min(v.videoHeight - h, Math.round(cy) - r));
    const off = document.createElement("canvas");
    off.width = w; off.height = h;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    try {
      ctx.drawImage(v, x0, y0, w, h, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h).data;
      let R = 0, G = 0, B = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
      return [R / n / 255, G / n / 255, B / n / 255];
    } catch (e) {
      console.warn("[eyedropper] sample failed", e);
      return null;
    }
  }
  function _solveWb(R, G, B) {
    // 채도 너무 낮은(=이미 회색) 경우 그대로 둠
    const eps = 1e-3;
    if (R < eps || G < eps || B < eps) return null;
    // 1) R*(1+0.45w) == B*(1-0.45w)  →  w = (B-R) / (0.45*(R+B))
    let w = (B - R) / (0.45 * (R + B));
    w = Math.max(-0.538, Math.min(0.538, w));  // → temp ∈ [3000, 10000]
    let temp = Math.round((6500 * (1 + w)) / 50) * 50;
    temp = Math.max(3000, Math.min(10000, temp));
    const wFinal = (temp - 6500) / 6500;
    // 2) 온도 보정 후: R' = R*(1+0.45w), G' = G*(1+0.05w)
    //    R'*(1-0.10v) == G'*(1+0.18v)  →  v = (R'-G') / (0.18*G' + 0.10*R')
    const Rp = R * (1 + 0.45 * wFinal);
    const Gp = G * (1 + 0.05 * wFinal);
    const denom = 0.18 * Gp + 0.10 * Rp;
    let v = Math.abs(denom) < 1e-6 ? 0 : (Rp - Gp) / denom;
    let tint = Math.round(-v * 100);
    tint = Math.max(-100, Math.min(100, tint));
    return { temp, tint };
  }
  function _applyEyedropAt(clientX, clientY) {
    const c = currentClip();
    if (!c) { setBusyShort("클립 없음"); return; }
    const canvas = $("#playerCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return;
    const cx = (clientX - rect.left) / rect.width  * canvas.width;
    const cy = (clientY - rect.top)  / rect.height * canvas.height;
    const rgb = _sampleVideoRgb(cx, cy);
    if (!rgb) { setBusyShort("샘플 실패"); return; }
    const sol = _solveWb(rgb[0], rgb[1], rgb[2]);
    if (!sol) { setBusyShort("픽셀이 너무 어둠"); return; }
    pushHistorySingle(c.id);
    c.grade.temp = sol.temp;
    c.grade.tint = sol.tint;
    writeGradeToPanel(c.grade);
    applyMatrixToFilter(c.grade);
    markClipGraded(c);
    scheduleSave(c);
    setBusyShort(`스포이드 → ${sol.temp}K / 색조 ${sol.tint > 0 ? "+" : ""}${sol.tint}`);
  }
  function armEyedropper() {
    if (_eye.armed) return;
    if (!currentClip()) { setBusyShort("클립 없음"); return; }
    _eye.armed = true;
    const btn = $("#btnEyedropper");
    if (btn) btn.classList.add("armed");
    const frame = $("#playerFrame");
    if (frame) frame.classList.add("eyedrop-armed");
    if (!_eye.hintEl && frame) {
      const hint = document.createElement("div");
      hint.className = "eyedrop-hint";
      hint.textContent = "🧪 회색/흰색이어야 할 지점을 클릭 (Alt+W 또는 Esc 취소)";
      frame.appendChild(hint);
      _eye.hintEl = hint;
    }
    _eye._onClick = (e) => {
      if (e.target.id !== "playerCanvas") return;
      e.preventDefault(); e.stopPropagation();
      _applyEyedropAt(e.clientX, e.clientY);
      disarmEyedropper();
    };
    _eye._onKey = (e) => { if (e.key === "Escape") { e.preventDefault(); disarmEyedropper(); } };
    document.addEventListener("click", _eye._onClick, true);
    document.addEventListener("keydown", _eye._onKey, true);
  }
  function disarmEyedropper() {
    if (!_eye.armed) return;
    _eye.armed = false;
    const btn = $("#btnEyedropper");
    if (btn) btn.classList.remove("armed");
    const frame = $("#playerFrame");
    if (frame) frame.classList.remove("eyedrop-armed");
    if (_eye.hintEl) { _eye.hintEl.remove(); _eye.hintEl = null; }
    if (_eye._onClick) document.removeEventListener("click", _eye._onClick, true);
    if (_eye._onKey)   document.removeEventListener("keydown", _eye._onKey, true);
    _eye._onClick = null; _eye._onKey = null;
  }
  function bindEyedropper() {
    const btn = $("#btnEyedropper");
    if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      _eye.armed ? disarmEyedropper() : armEyedropper();
    });
  }

  // ─────────────────────────────────────────────────────────
  async function init() {
    initGlPlayer();
    initHistogram();
    bindAllSliders();
    bindPlayer();
    bindKeys();
    bindEyedropper();
    bindTransitionPanel();
    bindLogoSize();
    await loadPresetSlot();
    await loadSnapshots();
    await reloadState();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
