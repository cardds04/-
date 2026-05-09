#!/usr/bin/env python3
"""grade_studio — 로컬 웹 그레이딩 스튜디오 (라이트룸풍 + 720p 프록시 재생).

실행:
  python -m grade_studio.server "/Volumes/.../영상폴더"
  python -m grade_studio.server "/Volumes/.../영상폴더" --port 8765

기존 grade_web 은 그대로 유지(롤백 안전망). 색 보정 결과는
~/.music_montage_grade_studio/sessions/<sha1>.json 에 저장.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import threading
import time
import unicodedata
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".mkv"}

CACHE_ROOT = Path.home() / ".music_montage_grade_studio"
PROXY_DIR = CACHE_ROOT / "proxies"
THUMB_DIR = CACHE_ROOT / "thumbs"
SESSION_DIR = CACHE_ROOT / "sessions"
SNAPSHOT_DIR = CACHE_ROOT / "snapshots"
LUT_DIR = CACHE_ROOT / "luts"
TRIM_DIR = CACHE_ROOT / "trims"
for d in (PROXY_DIR, THUMB_DIR, SESSION_DIR, SNAPSHOT_DIR, LUT_DIR, TRIM_DIR):
    d.mkdir(parents=True, exist_ok=True)

PROXY_HEIGHT = 720
PROXY_CRF = "24"
PROXY_PRESET = "veryfast"

HSL_CHANNELS = ("red", "orange", "yellow", "green", "aqua", "blue", "purple", "magenta")
# HSL 채널별 hue 중심값 (도 단위, 0~360)
HSL_CHANNEL_HUE = {
    "red": 0, "orange": 30, "yellow": 60, "green": 120,
    "aqua": 180, "blue": 240, "purple": 285, "magenta": 320,
}
DEFAULT_HSL = {ch: {"h": 0, "s": 0, "l": 0} for ch in HSL_CHANNELS}

DEFAULT_GRADE: dict = {
    "temp": 6500,
    "tint": 0,
    "expo": 0,
    "contrast": 0,
    "hi": 0,
    "sh": 0,
    "wh": 0,
    "bl": 0,
    "sat": 0,
    "vib": 0,
    "tex": 0,
    "clr": 0,
    "dh": 0,
    "hsl": DEFAULT_HSL,    # 색상별 H/S/L 8채널
    "trim_in": 0.0,
    "trim_out": 0.0,
    "disabled": 0,        # 0/1 — 일반(시네마/fullframe) 빌드에서 제외
    "disabled_tri": 0,    # 0/1 — 3컷 빌드에서 제외 (별개 플래그)
}
PRESET_FILE = CACHE_ROOT / "preset_slot.json"

AUDIO_EXTS = {".mp3", ".wav", ".m4a", ".flac", ".aac", ".ogg"}

# 사용자 기본 음악 폴더 — 서버 시작 시 자동으로 이걸 로드. 화면에서 다른 폴더 고르면
# 그 세션 동안만 적용되고, 다음 재시작 시 이 폴더로 복귀.
DEFAULT_MUSIC_FOLDER = Path("/Volumes/ssd/ssd데스크탑/영어노래")


def list_audio(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(folder.iterdir(), key=lambda x: x.name.lower()):
        if p.name.startswith("._"):
            continue
        if p.is_file() and p.suffix.lower() in AUDIO_EXTS:
            out.append(p)
    return out


# ─────────────────────────────────────────────────────────────────────────
# 미리보기(SVG) ↔ 실제 출력(ffmpeg) 일치를 위해 *프론트엔드와 동일한* 식을 Python 으로
# 포팅해 33³ .cube 3D LUT 파일을 만들고, ffmpeg lut3d 로 그대로 적용한다.
# (app.js 의 buildColorMatrix + buildToneCurveLut 와 1:1 대응)
# ─────────────────────────────────────────────────────────────────────────

def _kelvin_to_rgb_mul(k: float) -> tuple[float, float, float]:
    t = (k - 6500.0) / 6500.0
    return (1.0 + t * 0.45, 1.0 + t * 0.05, 1.0 - t * 0.45)


def _tint_to_gm(tint: float) -> tuple[float, float, float]:
    v = -tint / 100.0
    return (1 - v * 0.10, 1 + v * 0.18, 1 - v * 0.10)


def _build_color_matrix_py(g: dict) -> tuple[list[list[float]], float]:
    """Returns (3x3 matrix, offset). Out_c = sum(M[c][i]*In_i) + offset."""
    expo = float(g.get("expo", 0) or 0)
    exp_factor = 2.0 ** (expo / 100.0)

    dh = float(g.get("dh", 0) or 0) / 100.0
    c_input = (float(g.get("contrast", 0) or 0) + dh * 40.0) / 100.0
    c = 1.0 + c_input
    c_off = (1.0 - c) * 0.5

    vib = float(g.get("vib", 0) or 0) / 100.0
    sat_input = (float(g.get("sat", 0) or 0) + vib * 60.0 + dh * 25.0) / 100.0
    sat = 1.0 + sat_input

    kr, kg, kb = _kelvin_to_rgb_mul(float(g.get("temp", 6500) or 6500))
    tr, tg, tb = _tint_to_gm(float(g.get("tint", 0) or 0))
    wb_r = kr * tr * exp_factor
    wb_g = kg * tg * exp_factor
    wb_b = kb * tb * exp_factor

    lum_r, lum_g, lum_b = 0.2126, 0.7152, 0.0722
    s_r = (1 - sat) * lum_r
    s_g = (1 - sat) * lum_g
    s_b = (1 - sat) * lum_b

    r0, g0, b0 = wb_r * c, wb_g * c, wb_b * c

    # M = sat_matrix * diag(r0, g0, b0)
    m = [
        [(s_r + sat) * r0, s_g * g0,         s_b * b0        ],
        [s_r * r0,         (s_g + sat) * g0, s_b * b0        ],
        [s_r * r0,         s_g * g0,         (s_b + sat) * b0],
    ]
    return m, c_off


def _build_tone_curve_lut(g: dict, n: int = 33) -> list[float]:
    bl = float(g.get("bl", 0) or 0) / 100.0
    sh = float(g.get("sh", 0) or 0) / 100.0
    hi = float(g.get("hi", 0) or 0) / 100.0
    wh = float(g.get("wh", 0) or 0) / 100.0
    xs = [0.00, 0.25, 0.50, 0.75, 1.00]
    ys = [
        max(0.0, min(1.0, 0.00 + bl * 0.15)),
        max(0.0, min(1.0, 0.25 + sh * 0.12)),
        0.50,
        max(0.0, min(1.0, 0.75 + hi * 0.12)),
        max(0.0, min(1.0, 1.00 + wh * 0.12)),
    ]
    for i in range(1, len(ys)):
        if ys[i] < ys[i - 1]:
            ys[i] = ys[i - 1]
    out: list[float] = []
    for i in range(n):
        x = i / (n - 1)
        s = 0
        while s < len(xs) - 2 and x > xs[s + 1]:
            s += 1
        x0, x1 = xs[s], xs[s + 1]
        y0, y1 = ys[s], ys[s + 1]
        t = (x - x0) / max(1e-9, (x1 - x0))
        out.append(y0 + (y1 - y0) * t)
    return out


def _grade_signature(g: dict) -> str:
    """LUT 파일 캐시 키 — 같은 grade 면 같은 LUT 재사용."""
    keys = ("temp", "tint", "expo", "contrast", "hi", "sh", "wh", "bl",
            "sat", "vib", "dh")
    parts = []
    for k in keys:
        v = g.get(k, 0)
        try:
            parts.append(f"{k}={float(v):.4f}")
        except (TypeError, ValueError):
            parts.append(f"{k}=0")
    # HSL 8채널 × 3 = 24개 값도 시그니처에 포함
    hsl_in = g.get("hsl") or {}
    for ch in HSL_CHANNELS:
        cell = hsl_in.get(ch) or {}
        for sk in ("h", "s", "l"):
            try:
                parts.append(f"hsl.{ch}.{sk}={float(cell.get(sk, 0) or 0):.4f}")
            except (TypeError, ValueError):
                parts.append(f"hsl.{ch}.{sk}=0")
    s = "|".join(parts)
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:16]


def _is_identity_grade(g: dict) -> bool:
    """color/tone 슬라이더가 모두 default 면 LUT 불필요."""
    try:
        if abs(float(g.get("temp", 6500) or 6500) - 6500.0) > 0.5: return False
        for k in ("tint","expo","contrast","hi","sh","wh","bl","sat","vib","dh"):
            if abs(float(g.get(k, 0) or 0)) > 0.5: return False
        # HSL 모두 0 인지 검사
        hsl_in = g.get("hsl") or {}
        for ch in HSL_CHANNELS:
            cell = hsl_in.get(ch) or {}
            for sk in ("h", "s", "l"):
                if abs(float(cell.get(sk, 0) or 0)) > 0.5: return False
    except (TypeError, ValueError):
        return False
    return True


def _rgb_to_hsl(r: float, g: float, b: float) -> tuple[float, float, float]:
    """0..1 RGB → (H 0..360, S 0..1, L 0..1)."""
    mx = max(r, g, b); mn = min(r, g, b)
    l = (mx + mn) / 2.0
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2.0 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == r:
        h = ((g - b) / d) + (6.0 if g < b else 0.0)
    elif mx == g:
        h = ((b - r) / d) + 2.0
    else:
        h = ((r - g) / d) + 4.0
    return h * 60.0, s, l


def _hsl_to_rgb(h: float, s: float, l: float) -> tuple[float, float, float]:
    """(H 0..360, S 0..1, L 0..1) → 0..1 RGB."""
    if s <= 1e-9:
        return l, l, l
    h = (h % 360.0) / 360.0
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    def hue2rgb(t: float) -> float:
        if t < 0: t += 1
        if t > 1: t -= 1
        if t < 1/6: return p + (q - p) * 6 * t
        if t < 1/2: return q
        if t < 2/3: return p + (q - p) * (2/3 - t) * 6
        return p
    return hue2rgb(h + 1/3), hue2rgb(h), hue2rgb(h - 1/3)


def _hsl_channel_weights(hue_deg: float) -> list[float]:
    """주어진 hue 가 8 색상 채널 각각에 얼마나 속하는지 (cosine 가중치).
    인접한 두 채널에만 weight 가 0 보다 크게 분포 (라이트룸/다빈치 식).
    weights 합 == 1.
    """
    centers = [HSL_CHANNEL_HUE[ch] for ch in HSL_CHANNELS]
    n = len(centers)
    weights = [0.0] * n
    for i, c in enumerate(centers):
        d = abs(((hue_deg - c + 540.0) % 360.0) - 180.0)
        # 채널 간 평균 간격 ≈ 45도. cosine fade-out 으로 ±60도 안에서만 영향.
        if d < 60.0:
            weights[i] = (1.0 + ((60.0 - d) / 60.0) ** 1.0)
        else:
            weights[i] = 0.0
    # 다시 normalize 해서 인접 채널끼리 부드럽게 블렌드
    cosw = []
    for i, c in enumerate(centers):
        d = abs(((hue_deg - c + 540.0) % 360.0) - 180.0)
        if d < 60.0:
            cosw.append(0.5 * (1 + (1 - d / 60.0)))
        else:
            cosw.append(0.0)
    s = sum(cosw)
    if s <= 1e-9:
        return [1.0 / n] * n
    return [w / s for w in cosw]


def _apply_hsl(r: float, g: float, b: float, hsl_settings: dict) -> tuple[float, float, float]:
    """RGB → HSL 보정 → RGB. hsl_settings: {ch:{h,s,l}} (-100..+100 단위)."""
    h, s, l = _rgb_to_hsl(r, g, b)
    # 무채색에 가까우면 hue 영향 안 받음
    chroma_gate = min(1.0, s * 4.0)        # s>0.25 부터 1
    if chroma_gate <= 1e-3:
        return r, g, b
    weights = _hsl_channel_weights(h)
    dh = 0.0; ds = 0.0; dl = 0.0
    for i, ch in enumerate(HSL_CHANNELS):
        w = weights[i] * chroma_gate
        cell = hsl_settings.get(ch) or {}
        dh += w * (float(cell.get("h", 0) or 0) / 100.0) * 30.0   # ±100 → ±30°
        ds += w * (float(cell.get("s", 0) or 0) / 100.0)          # ±100 → ±1.0
        dl += w * (float(cell.get("l", 0) or 0) / 100.0) * 0.5    # ±100 → ±0.5
    h2 = (h + dh) % 360.0
    s2 = max(0.0, min(1.0, s * (1.0 + ds)))
    l2 = max(0.0, min(1.0, l + dl))
    return _hsl_to_rgb(h2, s2, l2)


def _apply_tone_curve(v: float, tone_lut: list[float]) -> float:
    n = len(tone_lut)
    if n < 2:
        return v
    x = max(0.0, min(1.0, v))
    pos = x * (n - 1)
    i0 = int(pos)
    i1 = min(n - 1, i0 + 1)
    t = pos - i0
    return tone_lut[i0] * (1 - t) + tone_lut[i1] * t


def write_grade_cube_lut(g: dict, out_path: Path, size: int = 33) -> Path:
    """프론트엔드 매트릭스+톤커브+HSL 그대로 → 33³ .cube 파일 작성."""
    m, off = _build_color_matrix_py(g)
    tone = _build_tone_curve_lut(g, n=33)
    hsl_settings = g.get("hsl") or {}
    hsl_active = any(
        abs(float((hsl_settings.get(ch) or {}).get(sk, 0) or 0)) > 0.5
        for ch in HSL_CHANNELS for sk in ("h", "s", "l")
    )
    lines = [
        "# grade_studio LUT — auto-generated to match SVG preview",
        f"LUT_3D_SIZE {size}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
    ]
    for ib in range(size):
        b = ib / (size - 1)
        for ig in range(size):
            gv = ig / (size - 1)
            for ir in range(size):
                r = ir / (size - 1)
                # 1) 4x5 color matrix
                rr = m[0][0] * r + m[0][1] * gv + m[0][2] * b + off
                gg = m[1][0] * r + m[1][1] * gv + m[1][2] * b + off
                bb = m[2][0] * r + m[2][1] * gv + m[2][2] * b + off
                # 2) tone curve (per channel, identical curve like feFuncR/G/B in preview)
                rr = _apply_tone_curve(rr, tone)
                gg = _apply_tone_curve(gg, tone)
                bb = _apply_tone_curve(bb, tone)
                # 3) HSL — RGB→HSL→shift→RGB (색상별 채널 가중치)
                if hsl_active:
                    # clamp before HSL conversion (negative/over values break HSL math)
                    r2 = 0.0 if rr < 0 else (1.0 if rr > 1 else rr)
                    g2 = 0.0 if gg < 0 else (1.0 if gg > 1 else gg)
                    b2 = 0.0 if bb < 0 else (1.0 if bb > 1 else bb)
                    rr, gg, bb = _apply_hsl(r2, g2, b2, hsl_settings)
                # clamp 0..1
                rr = 0.0 if rr < 0 else (1.0 if rr > 1 else rr)
                gg = 0.0 if gg < 0 else (1.0 if gg > 1 else gg)
                bb = 0.0 if bb < 0 else (1.0 if bb > 1 else bb)
                lines.append(f"{rr:.6f} {gg:.6f} {bb:.6f}")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out_path


def get_or_make_lut(g: dict) -> Path | None:
    """grade dict → 캐시된 LUT 경로 (identity 면 None). 같은 시그니처면 재사용."""
    if _is_identity_grade(g):
        return None
    sig = _grade_signature(g)
    fp = LUT_DIR / f"grade_{sig}.cube"
    if not fp.is_file():
        write_grade_cube_lut(g, fp, size=33)
    return fp


def _ffprobe_duration(p: Path) -> float:
    try:
        cp = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(p)],
            capture_output=True, text=True, check=True,
        )
        return float((cp.stdout or "0").strip() or 0)
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
        return 0.0


def get_or_trim_clip(src: Path, trim_in: float, trim_out: float) -> Path:
    """trim_in(>=0) / trim_out(>=0) 만큼 앞/뒤를 잘라낸 클립 파일 경로 반환.
    둘 다 0 이면 원본 그대로. 결과는 캐시에 저장 (같은 파일+같은 trim 이면 재사용).
    re-encode 로 정확한 키프레임 단위 trim (`-ss before -i` + libx264).
    """
    trim_in = max(0.0, float(trim_in or 0))
    trim_out = max(0.0, float(trim_out or 0))
    if trim_in <= 1e-3 and trim_out <= 1e-3:
        return src
    try:
        src_resolved = src.resolve()
        st = src_resolved.stat()
        sig_src = f"{src_resolved}|{st.st_size}|{int(st.st_mtime)}|{trim_in:.3f}|{trim_out:.3f}"
        sig = hashlib.sha1(sig_src.encode("utf-8")).hexdigest()[:16]
    except OSError:
        return src
    out_path = TRIM_DIR / f"{src.stem}_{sig}{src.suffix.lower() or '.mp4'}"
    if out_path.is_file():
        return out_path
    duration = _ffprobe_duration(src)
    if duration <= 0:
        return src
    end = duration - trim_out
    new_dur = max(0.1, end - trim_in)
    if new_dur <= 0.1:
        # 너무 많이 잘라서 남는 게 거의 없음 → 원본 그대로 (skip 효과는 안남)
        return src
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{trim_in:.3f}",
        "-i", str(src),
        "-t", f"{new_dur:.3f}",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "192k",
        "-movflags", "+faststart",
        str(out_path),
    ]
    try:
        subprocess.run(cmd, check=True)
        return out_path
    except (subprocess.CalledProcessError, FileNotFoundError):
        try:
            out_path.unlink(missing_ok=True)
        except OSError:
            pass
        return src


def grade_studio_to_montage_grade(g: dict) -> dict:
    """grade_studio 슬라이더 dict → montage_lib manual_clip_grade dict.

    노출은 라이트룸/우리 미리보기 의도 대로 ev = expo/100 으로 ffmpeg 적용되도록
    montage_exposure_vf_from_manual_pct 의 역계산 식으로 e 를 역산.
    montage_exposure_vf_from_manual_pct:
        e<=100: fac = 0.5 + 0.0055*e
        e> 100: fac = 1.05 + 0.011*(e-100)
        ev = log2(fac/1.05)
    원하는 ev = expo/100 → fac = 2**ev → e 역산.
    """
    expo = float(g.get("expo", 0) or 0)
    target_fac = 2.0 ** (expo / 100.0) * 1.05    # 우리 미리보기와 동일 강도
    if target_fac >= 1.05:
        e = 100.0 + (target_fac - 1.05) / 0.011
    else:
        e = (target_fac - 0.5) / 0.0055
    expo_pct = int(max(0, min(200, round(e))))

    # tint/색조: 라이트룸식(+ = 마젠타) ↔ montage_lib colorbalance gm(+ = 그린)
    # → 부호 반전해서 보냄
    tint_pct = -int(g.get("tint", 0) or 0)

    return {
        "exposure_pct": expo_pct,
        "contrast_pct": int(max(0, min(200, 100 + int(g.get("contrast", 0) or 0)))),
        "saturation_pct": int(max(0, min(200, 100 + int(g.get("sat", 0) or 0)))),
        "tint_pct": int(max(-100, min(100, tint_pct))),
        "highlights_pct": int(g.get("hi", 0) or 0),
        "shadows_pct": int(g.get("sh", 0) or 0),
        "whites_pct": int(g.get("wh", 0) or 0),
        "blacks_pct": int(g.get("bl", 0) or 0),
        "vibrance_pct": int(g.get("vib", 0) or 0),
        "dehaze_pct": int(g.get("dh", 0) or 0),
    }


_build_state = {
    "status": "idle",       # idle | running | done | error:<msg>
    "log": [],
    "output": None,
    "started_at": 0,
    "current_snapshot": None,
    "queue_size": 0,
}
_build_queue: list[dict] = []   # pending jobs
_build_lock = threading.Lock()
_build_thread: threading.Thread | None = None


def _log_build(msg: str) -> None:
    s = str(msg)
    with _build_lock:
        _build_state["log"].append(s)
        if len(_build_state["log"]) > 1500:
            del _build_state["log"][:500]


def _grade_dicts_for_build(grades: dict[str, dict]) -> tuple[dict, dict, dict]:
    """grade_studio grades → (manual_by, ct_by, lut_by).

    NEW: 미리보기 SVG 매트릭스+톤커브를 그대로 .cube LUT 로 굽고 ffmpeg lut3d 로
    적용 → 미리보기와 픽셀 단위 일치. manual_by/ct_by 는 비워서 montage_lib 의
    별도 색 보정 chain (colortemperature/colorbalance/eq/curves) 가 LUT 위에
    중복 적용되지 않게 한다.
    """
    manual_by: dict[str, dict] = {}
    ct_by: dict[str, float] = {}
    lut_by: dict[str, str] = {}
    for path_key, g in (grades or {}).items():
        try:
            lut_path = get_or_make_lut(g)
        except (OSError, ValueError):
            lut_path = None
        if lut_path is not None:
            lut_by[path_key] = str(lut_path)
    return manual_by, ct_by, lut_by


def _apply_center_wipe(
    input_path: Path,
    target_h_px: int = 0,
    open_sec: float = 1.5,
    close_sec: float = 1.5,
) -> bool:
    """위/아래 검은 박스가 화면 절반 → target_h_px 로 줄어드는 진짜 셔터 효과.

    도입부: 위·아래 박스가 영상 가운데를 가린 상태(절반)에서 시작 → 양쪽으로 동시에
    벌어지며 영상이 점점 드러남.
    말미: 반대로 위·아래 박스가 다시 가운데로 모이며 닫힘.

    target_h_px: opening 끝났을 때 남기는 위/아래 검은 띠 두께.
        시네마(1920×1080, 이미 115px letterbox 포함) → 115 (letterbox 까지만 보임)
        풀프레임 → 0 (박스 완전 화면 밖)
    """
    src = Path(input_path)
    if not src.is_file():
        return False
    try:
        cp = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(src)],
            capture_output=True, text=True, check=True,
        )
        duration = float((cp.stdout or "0").strip() or 0)
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
        return False
    if duration <= 0.5:
        return False

    # 영상 크기 (검은 박스 사이즈 결정용)
    try:
        cp = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v",
             "-show_entries", "stream=width,height",
             "-of", "csv=p=0:s=x", str(src)],
            capture_output=True, text=True, check=True,
        )
        wh = (cp.stdout or "").strip().split("x")
        w_px, h_px = int(wh[0]), int(wh[1])
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
        w_px, h_px = 1920, 1080

    o = max(0.3, min(float(open_sec), duration / 3.0))
    c = max(0.3, min(float(close_sec), duration / 3.0))
    # close 가 마지막 프레임 도달 전에 완전히 닫히도록 0.2 초 버퍼 — 그 이후는 완전 검정 유지
    end_buffer = min(0.2, max(0.0, duration - c - 0.05))
    close_start = max(0.0, duration - c - end_buffer)

    half_h = h_px // 2                       # 1080 → 540
    target = max(0, min(int(target_h_px), half_h))
    travel = half_h - target                 # 시네마: 540-115=425, 풀: 540-0=540

    # 위 박스 (높이 half_h): t=0 일 때 y=0(영상 위 절반 덮음) → opening 끝 y=-travel(target px 만 남김)
    # close_start 이후 다시 y=0 (완전 덮음) 으로 복귀, 닫힌 후엔 0 으로 clamp 유지
    top_y = (
        f"if(lt(t,{o:.4f}),"
        f"  -{travel}*t/{o:.4f},"
        f"  if(lt(t,{close_start:.4f}),"
        f"    -{travel},"
        f"    -{travel} + {travel}*min(1,(t-{close_start:.4f})/{c:.4f})))"
    )
    # 아래 박스 (높이 half_h): t=0 일 때 y=half_h(영상 아래 절반 덮음) → opening 끝 y=half_h+travel
    # close 시 다시 y=half_h 로 복귀, 닫힌 후엔 half_h 로 clamp 유지
    bot_y = (
        f"if(lt(t,{o:.4f}),"
        f"  {half_h} + {travel}*t/{o:.4f},"
        f"  if(lt(t,{close_start:.4f}),"
        f"    {half_h}+{travel},"
        f"    {half_h}+{travel} - {travel}*min(1,(t-{close_start:.4f})/{c:.4f})))"
    )

    fc = (
        f"[0:v]fps=30,format=yuv420p,setpts=PTS-STARTPTS[v0];"
        f"color=c=black:s={w_px}x{half_h}:d={duration:.4f}:r=30,format=yuv420p[topblk];"
        f"color=c=black:s={w_px}x{half_h}:d={duration:.4f}:r=30,format=yuv420p[botblk];"
        f"[v0][topblk]overlay=x=0:y='{top_y}':eval=frame[v1];"
        f"[v1][botblk]overlay=x=0:y='{bot_y}':eval=frame[vfin]"
    )

    tmp = src.with_suffix(".cw.mp4")
    try:
        src.rename(tmp)
    except OSError:
        return False
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(tmp),
        "-filter_complex", fc,
        "-map", "[vfin]",
        "-map", "0:a?",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-c:a", "copy",
        str(src),
    ]
    try:
        subprocess.run(cmd, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        try:
            tmp.rename(src)
        except OSError:
            pass
        _log_build(f"[grade_studio] center wipe 후처리 실패: {e}")
        return False
    try:
        tmp.unlink()
    except OSError:
        pass
    return True


def _wrap_cinema_letterbox(output_path: Path) -> bool:
    """1920×850 결과 mp4 를 1920×1080 검은 letterbox 박스로 감싸 같은 경로에 덮어쓴다.
    위/아래 각각 115px 검정 패딩. 오디오는 copy."""
    src = Path(output_path)
    if not src.is_file():
        return False
    tmp = src.with_suffix(".prepad.mp4")
    try:
        src.rename(tmp)
    except OSError:
        return False
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(tmp),
        "-vf", "pad=1920:1080:0:115:black,setsar=1,format=yuv420p",
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        "-c:a", "copy",
        str(src),
    ]
    try:
        subprocess.run(cmd, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        # 후처리 실패 시 원본 복구
        try:
            tmp.rename(src)
        except OSError:
            pass
        _log_build(f"[grade_studio] 시네마 letterbox 후처리 실패: {e}")
        return False
    try:
        tmp.unlink()
    except OSError:
        pass
    return True


def _run_one_build(job: dict) -> None:
    """단일 빌드 실행. 호출 전에 _build_state["status"] = "running" 으로 설정되어 있어야."""
    from montage_lib import _grade_map_lookup, run_montage  # lazy
    snapshot_id = job.get("snapshot_id")
    manual_by, ct_by, lut_by = _grade_dicts_for_build(job["grades"])

    # 클립별 trim_in/trim_out 적용 — ffmpeg 로 미리 잘라 임시 파일 생성, video_files 갱신.
    # LUT 매핑 키도 잘린 파일 path 로 옮김.
    grades = job.get("grades") or {}
    trimmed_videos: list[Path] = []
    trim_count = 0
    for v in job["videos"]:
        try:
            vp = Path(v).resolve()
        except OSError:
            trimmed_videos.append(Path(v))
            continue
        g = grades.get(_nfc(str(vp))) or grades.get(str(vp)) or {}
        ti = float(g.get("trim_in", 0) or 0)
        to = float(g.get("trim_out", 0) or 0)
        if ti > 1e-3 or to > 1e-3:
            new_p = get_or_trim_clip(vp, ti, to)
            trimmed_videos.append(new_p)
            if new_p != vp:
                trim_count += 1
                # LUT 매핑 키 옮기기 — 원본 키들 모두 새 path 키로 복사
                old_lut = _grade_map_lookup(lut_by, vp)
                if old_lut is not None:
                    lut_by[_nfc(str(new_p.resolve()))] = old_lut
        else:
            trimmed_videos.append(vp)
    if trim_count:
        _log_build(f"[grade_studio] 트림 적용: {trim_count}개 클립 (TRIM_DIR 캐싱)")
    # 갱신된 영상 목록을 job 에 반영
    job["videos"] = [str(p) for p in trimmed_videos]

    # 진단: active video 중 실제 LUT 가 매핑되는 개수 (NFC/NFD 포함)
    matched = 0
    unmatched_names: list[str] = []
    for v in job["videos"]:
        try:
            if _grade_map_lookup(lut_by, Path(v).resolve()) is not None:
                matched += 1
            elif len(unmatched_names) < 3:
                unmatched_names.append(Path(v).name)
        except (OSError, ValueError):
            continue
    _log_build(
        f"[grade_studio] LUT 매핑 {matched}/{len(job['videos'])}개 클립 "
        f"(LUT 캐시 {len(lut_by)})"
    )
    if matched == 0 and len(job["videos"]) > 0:
        _log_build(
            f"[grade_studio] LUT 적용 클립 0건 (모두 기본값이거나 매핑 안됨): {unmatched_names}"
        )
    tag = job.get("tag") or job.get("layout") or "out"
    is_tri = (job.get("layout") == "tri_stack")
    # cine/full 은 우리가 직접 center wipe 후처리 → montage_lib 의 alpha 페이드 + 검은 tail 끔.
    # (검은 tail 이 있으면 우리 close 셔터가 이미 검정인 영역을 닫게 돼서 부자연스러움)
    # tri 는 그대로 (alpha 페이드·tail 유지).
    lb_open = 2.0 if is_tri else 0.0
    lb_close = 2.0 if is_tri else 0.0
    tail_black = 2.0 if is_tri else 0.0
    try:
        out = run_montage(
            job["music_path"],
            job["output_path"],
            videos_dir=None,
            video_files=job["videos"],
            window_sec=4.0,
            peak_band_start=3.0,
            width=job["width"],
            height=job["height"],
            layout=job["layout"],
            output_preset_tag=f"{job['layout']}_{job['width']}x{job['height']}",
            audio_fade_out_sec=5.0,
            # 클립별 trim 은 server.py 가 ffmpeg 로 정확히 처리해서 미리 잘라 보냄 → 0
            clip_trim_start_sec=0.0,
            letterbox_open_sec=lb_open,
            letterbox_close_sec=lb_close,
            tail_black_sec=tail_black,
            logo_path=job.get("logo_path"),
            manual_clip_grade_by_clip=manual_by,
            auto_ct_kelvin_by_clip=ct_by,
            clip_lut_path_by_clip=lut_by,
            log=_log_build,
        )
        # 후처리:
        #   cine: 1920×850 → 1920×1080 letterbox wrap → center wipe (target 115px)
        #   full: 1920×1080 그대로 → center wipe (target 0, 박스 완전 사라짐)
        #   tri:  적용 X (montage_lib alpha 페이드 그대로)
        if tag == "cine":
            _log_build("[grade_studio] 1920×1080 시네마 letterbox 박스 후처리…")
            _wrap_cinema_letterbox(Path(out))
            _log_build("[grade_studio] 시네마 center wipe 후처리…")
            _apply_center_wipe(Path(out), target_h_px=115)
        elif tag == "full":
            _log_build("[grade_studio] 풀프레임 가로 center wipe 후처리…")
            _apply_center_wipe(Path(out), target_h_px=0)
        with _build_lock:
            _build_state["output"] = str(out)
        if snapshot_id:
            update_snapshot_tag(snapshot_id, tag, "done", str(out))
    except Exception as e:
        _log_build(f"오류: {e}")
        with _build_lock:
            _build_state["status"] = f"error: {e}"
        if snapshot_id:
            update_snapshot_tag(snapshot_id, tag, f"error: {e}")


def _drain_build_queue() -> None:
    """워커 루프 — 큐가 빌 때까지 순차 실행."""
    while True:
        with _build_lock:
            if not _build_queue:
                _build_state["status"] = "idle"
                _build_state["queue_size"] = 0
                _build_state["current_snapshot"] = None
                return
            job = _build_queue.pop(0)
            _build_state["status"] = "running"
            _build_state["queue_size"] = len(_build_queue)
            _build_state["log"] = []
            _build_state["output"] = None
            _build_state["started_at"] = int(time.time())
            _build_state["current_snapshot"] = job.get("snapshot_id")
        _run_one_build(job)


def enqueue_build_job(job: dict) -> None:
    """빌드 큐에 작업 추가. worker가 죽었으면 새로 시작."""
    global _build_thread
    with _build_lock:
        _build_queue.append(job)
        _build_state["queue_size"] = len(_build_queue) + (1 if _build_state["status"] == "running" else 0)
        thread_alive = (_build_thread is not None) and _build_thread.is_alive()
    if not thread_alive:
        _build_thread = threading.Thread(target=_drain_build_queue, daemon=True)
        _build_thread.start()


def _nfc(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def _key_for_video(p: Path) -> str:
    try:
        st = p.stat()
        sig = f"{p.resolve()}|{st.st_size}|{int(st.st_mtime)}"
    except OSError:
        sig = str(p)
    return hashlib.sha1(sig.encode("utf-8")).hexdigest()[:16]


def _folder_key(p: Path) -> str:
    return hashlib.sha1(str(p.resolve()).encode("utf-8")).hexdigest()[:16]


def list_videos(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(folder.iterdir(), key=lambda x: x.name.lower()):
        if p.name.startswith("._"):
            continue
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
            out.append(p)
    return out


_thumb_locks: dict[str, threading.Lock] = {}
_thumb_locks_mu = threading.Lock()


def _lock_for(key: str, store: dict[str, threading.Lock]) -> threading.Lock:
    with _thumb_locks_mu:
        lk = store.get(key)
        if lk is None:
            lk = threading.Lock()
            store[key] = lk
        return lk


def thumb_path(video: Path) -> Path:
    return THUMB_DIR / f"{_key_for_video(video)}.jpg"


def ensure_thumb(video: Path) -> Path | None:
    """중간 시점 1프레임 jpg(가로 360) 생성."""
    out = thumb_path(video)
    if out.is_file() and out.stat().st_size > 0:
        return out
    lk = _lock_for(out.name, _thumb_locks)
    with lk:
        if out.is_file() and out.stat().st_size > 0:
            return out
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-ss", "1.0", "-i", str(video),
            "-vframes", "1",
            "-vf", "scale=360:-2",
            "-q:v", "5", str(out),
        ]
        try:
            subprocess.run(cmd, check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            return None
    return out if out.is_file() else None


_proxy_state: dict[str, str] = {}  # key -> "building"|"ready"|"error:<msg>"
_proxy_state_mu = threading.Lock()

# 폴더 전체 프록시 미리 빌드 큐 (단일 worker, 순차 처리, ffmpeg CPU 폭주 방지)
_pre_lock = threading.Lock()
_pre_queue: list[Path] = []
_pre_seen: set[str] = set()
_pre_thread: threading.Thread | None = None


def _drain_prebuild_queue() -> None:
    """단일 worker — 큐의 비디오들을 *순차적으로* 프록시 빌드.
    이미 ready 면 skip. 이미 다른 thread 가 building 중이면 skip."""
    while True:
        with _pre_lock:
            if not _pre_queue:
                return
            v = _pre_queue.pop(0)
        out = PROXY_DIR / f"{_key_for_video(v)}.mp4"
        if out.is_file() and out.stat().st_size > 0:
            with _proxy_state_mu:
                _proxy_state[out.name] = "ready"
            continue
        with _proxy_state_mu:
            st = _proxy_state.get(out.name)
            if st == "building":
                # 이미 다른 thread (예: 사용자 클릭으로 시작된 start_proxy_build)
                continue
            _proxy_state[out.name] = "building"
        tmp = out.with_suffix(".part.mp4")
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(v),
            "-vf", f"scale=-2:{PROXY_HEIGHT}",
            "-c:v", "libx264", "-preset", PROXY_PRESET, "-crf", PROXY_CRF,
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-c:a", "aac", "-b:a", "128k",
            str(tmp),
        ]
        try:
            subprocess.run(cmd, check=True)
            tmp.replace(out)
            with _proxy_state_mu:
                _proxy_state[out.name] = "ready"
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            try:
                tmp.unlink()
            except OSError:
                pass
            with _proxy_state_mu:
                _proxy_state[out.name] = f"error:{e}"


def queue_prebuild_videos(videos: list[Path], priority: bool = False) -> None:
    """폴더 전체 클립을 백그라운드 큐에 추가. priority=True 면 큐 앞에 삽입."""
    global _pre_thread
    with _pre_lock:
        # 중복 제거
        for v in videos:
            key = str(v)
            if key in _pre_seen:
                continue
            _pre_seen.add(key)
            if priority:
                _pre_queue.insert(0, v)
            else:
                _pre_queue.append(v)
        alive = _pre_thread is not None and _pre_thread.is_alive()
    if not alive:
        _pre_thread = threading.Thread(target=_drain_prebuild_queue, daemon=True)
        _pre_thread.start()


def proxy_path(video: Path) -> Path:
    return PROXY_DIR / f"{_key_for_video(video)}.mp4"


def get_proxy_status(video: Path) -> str:
    """ready / building / missing / error:..."""
    out = proxy_path(video)
    if out.is_file() and out.stat().st_size > 0:
        return "ready"
    with _proxy_state_mu:
        st = _proxy_state.get(out.name)
    return st or "missing"


def start_proxy_build(video: Path) -> str:
    """사용자가 클릭한 클립을 큐 우선순위로 빌드. 이미 ready/building 이면 그 상태 반환.
    단일 worker 큐와 통합 — 동시 ffmpeg 1 개로 CPU 폭주 방지."""
    out = proxy_path(video)
    if out.is_file() and out.stat().st_size > 0:
        return "ready"
    with _proxy_state_mu:
        st = _proxy_state.get(out.name)
        if st in ("building",) or (st and st.startswith("error:")):
            return st
    queue_prebuild_videos([video], priority=True)
    return "building"


def osascript_pick_folder(prompt: str = "영상 폴더를 선택하세요") -> Path | None:
    """macOS Finder 폴더 선택 다이얼로그. 취소 시 None."""
    if sys.platform != "darwin":
        return None
    try:
        cp = subprocess.run(
            ["osascript", "-e", f'POSIX path of (choose folder with prompt "{prompt}")'],
            capture_output=True, text=True, timeout=600,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None
    if cp.returncode != 0:
        return None
    p = (cp.stdout or "").strip()
    if not p:
        return None
    return Path(p).expanduser().resolve()


def osascript_pick_image(prompt: str = "로고 이미지 파일을 선택하세요") -> Path | None:
    if sys.platform != "darwin":
        return None
    script = (
        'POSIX path of (choose file with prompt "' + prompt + '" '
        'of type {"public.image","png","jpg","jpeg","webp","PNG","JPG","JPEG","WEBP"})'
    )
    try:
        cp = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=600)
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return None
    if cp.returncode != 0:
        return None
    line = (cp.stdout or "").strip()
    if not line:
        return None
    p = Path(line).expanduser().resolve()
    return p if p.is_file() else None


def osascript_pick_files(prompt: str = "추가할 영상 파일을 선택하세요") -> list[Path]:
    """macOS 다중 파일 선택 다이얼로그. 취소 시 빈 리스트."""
    if sys.platform != "darwin":
        return []
    script = (
        'set theFiles to choose file with prompt "' + prompt + '" '
        'of type {"public.movie","mp4","mov","m4v","mkv","MP4","MOV","M4V","MKV"} '
        'with multiple selections allowed\n'
        'set theList to ""\n'
        'repeat with f in theFiles\n'
        '  set theList to theList & POSIX path of f & "\\n"\n'
        'end repeat\n'
        'return theList'
    )
    try:
        cp = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True, text=True, timeout=600,
        )
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return []
    if cp.returncode != 0:
        return []
    paths: list[Path] = []
    for line in (cp.stdout or "").splitlines():
        line = line.strip()
        if not line:
            continue
        p = Path(line).expanduser().resolve()
        if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
            paths.append(p)
    return paths


def session_file(folder: Path) -> Path:
    return SESSION_DIR / f"{_folder_key(folder)}.json"


# 폴더별 session 파일 lock — 동시 save race condition 방지
_session_locks: dict[str, threading.Lock] = {}
_session_locks_mu = threading.Lock()


def session_lock_for(folder: Path) -> threading.Lock:
    try:
        key = str(folder.resolve())
    except OSError:
        key = str(folder)
    with _session_locks_mu:
        lk = _session_locks.get(key)
        if lk is None:
            lk = threading.Lock()
            _session_locks[key] = lk
        return lk


def load_session(folder: Path) -> dict:
    fp = session_file(folder)
    if not fp.is_file():
        return {"folder": str(folder), "grades": {}, "order": []}
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"folder": str(folder), "grades": {}, "order": []}


def save_session(folder: Path, data: dict) -> None:
    fp = session_file(folder)
    fp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _new_snapshot_id() -> str:
    return time.strftime("%Y%m%d_%H%M%S") + "_" + os.urandom(2).hex()


_GENERIC_FOLDER_NAMES = {
    "영상", "비디오", "동영상", "촬영", "원본", "raw", "source",
    "video", "videos", "footage", "clip", "clips", "media",
}


def _label_clean(name: str) -> str:
    """폴더명에서 앞뒤 숫자·날짜 접두/접미를 제거해 글자만 남긴다.
    예: '0428공감대영상' → '공감대영상', '20260430_셋어컨셉' → '셋어컨셉'.
    한글/영문이 전혀 없으면 원본 그대로 반환."""
    import re
    s = name.strip()
    # 앞쪽 숫자/공백/언더바/하이픈/점 제거
    s = re.sub(r"^[\d\s_\-\.]+", "", s)
    # 뒤쪽 같은 문자도 제거
    s = re.sub(r"[\d\s_\-\.]+$", "", s)
    s = s.strip()
    return s or name


def _smart_folder_label(folder: Path | None, videos: list[Path] | None = None) -> str:
    """폴더명이 generic('영상' 등) 이면 한 단계 상위 폴더 이름을 사용.
    label_clean 적용 후 '영상' 같은 게 남으면 부모 시도. 끝까지 generic 이면 원본.
    macOS 는 NFD 로 경로를 반환하므로 비교 전에 NFC 정규화 필수."""
    import unicodedata
    if folder is None:
        if videos:
            return _smart_folder_label(videos[0].parent)
        return "untitled"
    cur = Path(folder)
    for _ in range(3):                 # 안전장치: 최대 3 단계 위로
        raw = unicodedata.normalize("NFC", cur.name or "untitled")
        cleaned = unicodedata.normalize("NFC", _label_clean(raw))
        if cleaned.lower() not in _GENERIC_FOLDER_NAMES and cleaned not in _GENERIC_FOLDER_NAMES:
            return cleaned
        # generic 이면 부모로
        parent = cur.parent
        if parent == cur or not parent.name:
            return cleaned                # 더 올라갈 수 없음
        cur = parent
    return unicodedata.normalize("NFC", _label_clean(folder.name)) or "untitled"


def list_snapshots() -> list[dict]:
    out = []
    files = list(SNAPSHOT_DIR.glob("*.json"))
    files.sort(key=lambda x: x.stat().st_mtime, reverse=True)
    for fp in files:
        try:
            d = json.loads(fp.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        # 라벨은 표시할 때마다 재계산 — 옛 snapshot 도 새 _smart_folder_label 규칙 적용
        folder_str = d.get("video_folder") or ""
        if folder_str:
            try:
                fresh_label = _smart_folder_label(Path(folder_str))
            except (OSError, ValueError):
                fresh_label = d.get("label") or "untitled"
        else:
            fresh_label = d.get("label") or "untitled"
        out.append({
            "id": d.get("id"),
            "label": fresh_label,
            "created_at": d.get("created_at", 0),
            "build_status": d.get("build_status", "saved"),
            "build_output": d.get("build_output"),
            "video_count": len(d.get("video_files") or []),
            "video_folder": d.get("video_folder", ""),
            "cinema_on": bool(d.get("cinema_on", d.get("cinema", True))),
            "tri_on": bool(d.get("tri_on", False)),
            "outputs": d.get("outputs") or {},
            "expected_tags": d.get("expected_tags") or [],
        })
    return out


def save_snapshot(
    folder: Path | None,
    videos: list[Path],
    music_folder: Path | None,
    grades: dict,
    *,
    cinema: bool = True,
    tri: bool = False,
    label: str | None = None,
    status: str = "saved",
    expected_tags: list[str] | None = None,
) -> dict:
    """expected_tags: 이 빌드 세션에서 만들 출력 종류 (예: ['cine', 'tri']).
    status='building' 일 때 사용 — 모든 tag 출력이 완료되면 done 으로 자동 갱신."""
    sid = _new_snapshot_id()
    if not label:
        label = _smart_folder_label(folder, videos)
    snap = {
        "id": sid,
        "label": label,
        "created_at": int(time.time()),
        "video_folder": str(folder) if folder else "",
        "video_files": [str(v) for v in videos],
        "music_folder": str(music_folder) if music_folder else "",
        "cinema": bool(cinema),
        "cinema_on": bool(cinema),
        "tri_on": bool(tri),
        "grades": grades or {},
        "build_status": status,
        "build_output": None,                             # legacy, kept for backward compat
        "expected_tags": expected_tags or [],
        "outputs": {},                                    # tag -> mp4 path
    }
    SNAPSHOT_DIR.joinpath(f"{sid}.json").write_text(
        json.dumps(snap, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return snap


def update_snapshot_tag(sid: str, tag: str, status: str, output_path: str | None = None) -> None:
    """특정 tag(예 'cine','tri','full') 결과를 snapshot 에 반영. 모든 expected_tags 가
    완료되면 build_status='done', 어느 하나라도 error 면 'error: ...' 로."""
    fp = SNAPSHOT_DIR / f"{sid}.json"
    if not fp.is_file():
        return
    try:
        d = json.loads(fp.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    outputs = d.setdefault("outputs", {})
    if status == "done" and output_path:
        outputs[tag] = output_path
        d["build_output"] = output_path                   # legacy: 마지막 결과
    elif status.startswith("error"):
        outputs[tag] = None
        d["build_status"] = status
        fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
        return
    expected = d.get("expected_tags") or []
    if expected and all(outputs.get(t) for t in expected):
        d["build_status"] = "done"
    fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")


def update_snapshot(sid: str, patch: dict) -> None:
    fp = SNAPSHOT_DIR / f"{sid}.json"
    if not fp.is_file():
        return
    try:
        d = json.loads(fp.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return
    d.update(patch)
    fp.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")


def read_snapshot(sid: str) -> dict | None:
    fp = SNAPSHOT_DIR / f"{sid}.json"
    if not fp.is_file():
        return None
    try:
        return json.loads(fp.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def remove_snapshot(sid: str) -> bool:
    fp = SNAPSHOT_DIR / f"{sid}.json"
    if fp.is_file():
        try:
            fp.unlink()
            return True
        except OSError:
            return False
    return False


def load_preset_slot() -> dict | None:
    if not PRESET_FILE.is_file():
        return None
    try:
        d = json.loads(PRESET_FILE.read_text(encoding="utf-8"))
        return d.get("grade") if isinstance(d, dict) else None
    except (OSError, json.JSONDecodeError):
        return None


def save_preset_slot(grade: dict) -> None:
    PRESET_FILE.write_text(
        json.dumps({"grade": grade, "saved_at": int(time.time())}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def serve_file(handler: BaseHTTPRequestHandler, path: Path, content_type: str | None = None) -> None:
    if not path.is_file():
        handler.send_error(404, "not found")
        return
    ctype = content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    size = path.stat().st_size
    range_h = handler.headers.get("Range")
    start, end = 0, size - 1
    status = 200
    if range_h and range_h.startswith("bytes="):
        try:
            spec = range_h.split("=", 1)[1].split(",", 1)[0].strip()
            s, _, e = spec.partition("-")
            if s:
                start = int(s)
            if e:
                end = int(e)
            else:
                end = size - 1
            if start < 0 or end >= size or start > end:
                handler.send_response(416)
                handler.send_header("Content-Range", f"bytes */{size}")
                handler.end_headers()
                return
            status = 206
        except ValueError:
            status = 200
            start, end = 0, size - 1
    length = end - start + 1
    handler.send_response(status)
    handler.send_header("Content-Type", ctype)
    handler.send_header("Accept-Ranges", "bytes")
    handler.send_header("Content-Length", str(length))
    if status == 206:
        handler.send_header("Content-Range", f"bytes {start}-{end}/{size}")
    handler.send_header("Cache-Control", "no-cache")
    handler.end_headers()
    with open(path, "rb") as f:
        f.seek(start)
        remaining = length
        while remaining > 0:
            chunk = f.read(min(64 * 1024, remaining))
            if not chunk:
                break
            try:
                handler.wfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                return
            remaining -= len(chunk)


class GradeStudioHandler(BaseHTTPRequestHandler):
    server_version = "GradeStudio/0.1"

    def log_message(self, format: str, *args) -> None:  # noqa: A002
        # quieter logs
        if "/api/" in self.path or self.path.endswith((".html", ".js", ".css")):
            return
        super().log_message(format, *args)

    def _json(self, obj, status: int = 200) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        p = parsed.path
        qs = parse_qs(parsed.query or "")

        if p in ("/", "/index.html"):
            return serve_file(self, ROOT_DIR / "index.html", "text/html; charset=utf-8")
        if p == "/styles.css":
            return serve_file(self, ROOT_DIR / "styles.css", "text/css; charset=utf-8")
        if p == "/app.js":
            return serve_file(self, ROOT_DIR / "app.js", "application/javascript; charset=utf-8")

        if p == "/api/state":
            return self._json(self._state_payload())

        if p == "/api/preset":
            return self._json({"grade": load_preset_slot()})

        if p == "/api/snapshots":
            return self._json({"snapshots": list_snapshots()})

        if p == "/api/logo":
            with self.server.state_lock:
                lp = self.server.logo_path
            if not lp or not Path(lp).is_file():
                self.send_error(404)
                return
            return serve_file(self, Path(lp))

        if p == "/api/build/status":
            with _build_lock:
                return self._json({
                    "status": _build_state["status"],
                    "output": _build_state["output"],
                    "started_at": _build_state["started_at"],
                    "log_tail": _build_state["log"][-40:],
                    "log_total": len(_build_state["log"]),
                    "queue_size": _build_state.get("queue_size", 0),
                    "current_snapshot": _build_state.get("current_snapshot"),
                })

        if p == "/api/thumb":
            i = self._idx(qs)
            if i is None:
                return self._json({"error": "bad id"}, 400)
            v = self._video_at(i)
            if v is None:
                return self._json({"error": "no video"}, 404)
            tp = ensure_thumb(v)
            if not tp:
                return self._json({"error": "thumb fail"}, 500)
            return serve_file(self, tp, "image/jpeg")

        if p == "/api/proxy/status":
            i = self._idx(qs)
            if i is None:
                return self._json({"error": "bad id"}, 400)
            v = self._video_at(i)
            if v is None:
                return self._json({"error": "no video"}, 404)
            return self._json({"id": i, "status": get_proxy_status(v)})

        if p == "/api/proxy/start":
            i = self._idx(qs)
            if i is None:
                return self._json({"error": "bad id"}, 400)
            v = self._video_at(i)
            if v is None:
                return self._json({"error": "no video"}, 404)
            return self._json({"id": i, "status": start_proxy_build(v)})

        if p == "/api/proxy.mp4":
            i = self._idx(qs)
            if i is None:
                return self._json({"error": "bad id"}, 400)
            v = self._video_at(i)
            if v is None:
                return self._json({"error": "no video"}, 404)
            st = start_proxy_build(v)
            if st != "ready":
                self.send_response(202)
                self.send_header("Content-Type", "application/json")
                body = json.dumps({"status": st}).encode("utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            return serve_file(self, proxy_path(v), "video/mp4")

        self.send_error(404)

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        p = parsed.path
        length = int(self.headers.get("Content-Length") or "0")
        body_raw = self.rfile.read(length) if length else b""
        try:
            body = json.loads(body_raw.decode("utf-8")) if body_raw else {}
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self._json({"error": "bad json"}, 400)

        if p == "/api/pick_logo":
            picked = osascript_pick_image()
            if picked is None:
                return self._json({"cancelled": True})
            with self.server.state_lock:
                self.server.logo_path = picked
            return self._json({"ok": True, "logo": str(picked)})

        if p == "/api/clear_logo":
            with self.server.state_lock:
                self.server.logo_path = None
            return self._json({"ok": True})

        if p == "/api/music/randomize":
            with self.server.state_lock:
                music_folder = self.server.music_folder
                music_files = list(self.server.music_files)
            if not music_folder or not music_files:
                return self._json({"error": "음악 폴더 미선택"}, 400)
            try:
                from montage_lib import (
                    _bgm_pool_signature,
                    _bgm_state_folder_key,
                    _load_bgm_order_state,
                    _save_bgm_order_state,
                    read_next_bgm_track_index,
                )
                import random
                sig = _bgm_pool_signature(music_files)
                n = len(music_files)
                cur = read_next_bgm_track_index(music_folder, n, sig)
                new_idx = cur
                if n > 1:
                    while new_idx == cur:
                        new_idx = random.randint(0, n - 1)
                # state file 직접 갱신 (persist_bgm_track_position 은 num_used>0 요구)
                data = _load_bgm_order_state()
                folders = data.setdefault("folders", {})
                folders[_bgm_state_folder_key(music_folder)] = {"sig": sig, "next": new_idx}
                _save_bgm_order_state(data)
                return self._json({
                    "ok": True,
                    "next_index": new_idx + 1,
                    "next_name": music_files[new_idx].name,
                })
            except (ImportError, OSError, ValueError) as e:
                return self._json({"error": f"randomize 실패: {e}"}, 500)

        if p == "/api/pick_music_folder":
            picked = osascript_pick_folder("음악 폴더를 선택하세요")
            if picked is None:
                return self._json({"cancelled": True})
            files = list_audio(picked)
            with self.server.state_lock:
                self.server.music_folder = picked
                self.server.music_files = files
            return self._json({
                "ok": True,
                "music_folder": str(picked),
                "music_count": len(files),
                "music_names": [f.name for f in files[:50]],
            })

        if p == "/api/reveal":
            target = body.get("path") or ""
            try:
                tp = Path(target).expanduser().resolve()
                if tp.exists():
                    subprocess.Popen(["open", "-R", str(tp)])
                    return self._json({"ok": True})
            except OSError:
                pass
            return self._json({"error": "not found"}, 404)

        if p == "/api/build":
            with self.server.state_lock:
                folder = self.server.folder
                videos = list(self.server.videos)
                music_folder = self.server.music_folder
                music_files = list(self.server.music_files)
                logo_path = self.server.logo_path
            if not videos:
                return self._json({"error": "영상 없음"}, 400)
            if music_folder is None or not music_files:
                return self._json({"error": "음악 폴더가 비어있음"}, 400)
            sess = load_session(folder) if folder is not None else {"grades": {}}
            grades = sess.get("grades") or {}

            cinema_on = bool(body.get("cinema", True))
            tri_on = bool(body.get("tri_stack", False))

            # 분리된 필터 규칙:
            #   시네마/일반 빌드: disabled=1 만 제외
            #   3컷 빌드:        disabled_tri=1 만 제외
            def _build_active(disabled_field: str) -> list[Path]:
                out_l = []
                for v in videos:
                    key = _nfc(str(v.resolve()))
                    g = grades.get(key) or {}
                    if int(g.get(disabled_field, 0) or 0):
                        continue
                    out_l.append(v)
                return out_l

            ts = time.strftime("%m%d_%H%M%S")
            out_root = folder if folder is not None else videos[0].parent
            queued: list[dict] = []
            errors: list[str] = []

            FILENAME_BY_TAG = {
                "cine": "시네마(고객선물용)",
                "tri":  "3컷분할(릴스용)",
                "full": f"grade_studio_full_{ts}",
            }

            # 1) 어떤 작업을 큐할지 미리 계산 (expected_tags 결정용)
            plan: list[dict] = []
            if not cinema_on and not tri_on:
                active = _build_active("disabled")
                if active:
                    plan.append({"layout": "fullframe", "width": 1920, "height": 1080, "tag": "full", "active": active})
                else:
                    errors.append("일반 활성 클립 없음")
            if cinema_on:
                active = _build_active("disabled")
                if active:
                    plan.append({"layout": "fullframe", "width": 1920, "height": 850, "tag": "cine", "active": active})
                else:
                    errors.append("시네마 — 활성 클립 없음")
            if tri_on:
                active = _build_active("disabled_tri")
                n3 = len(active) - (len(active) % 3)
                active_tri = active[:n3]
                if active_tri:
                    plan.append({"layout": "tri_stack", "width": 1080, "height": 1920, "tag": "tri", "active": active_tri})
                else:
                    errors.append("3컷 — 3의 배수 이상의 활성 클립 필요")

            if not plan:
                return self._json({"error": " · ".join(errors) or "빌드 대상 없음"}, 400)

            # 2) 한 번에 한 snapshot 만들고 plan 의 모든 작업이 같은 snapshot_id 사용
            snap = save_snapshot(
                folder, videos, music_folder, grades,
                cinema=cinema_on, tri=tri_on, status="building",
                expected_tags=[p["tag"] for p in plan],
            )

            # 3) 각 작업 enqueue
            for p in plan:
                base_name = FILENAME_BY_TAG.get(p["tag"], f"grade_studio_{p['tag']}_{ts}")
                output_path = out_root / f"{base_name}.mp4"
                if output_path.exists():
                    output_path = out_root / f"{base_name}_{ts}.mp4"
                enqueue_build_job({
                    "videos": p["active"],
                    "grades": grades,
                    "music_path": music_folder,
                    "output_path": output_path,
                    "width": p["width"],
                    "height": p["height"],
                    "layout": p["layout"],
                    "logo_path": logo_path,
                    "snapshot_id": snap["id"],
                    "tag": p["tag"],
                })
                queued.append({"snapshot_id": snap["id"], "tag": p["tag"], "layout": p["layout"], "active_count": len(p["active"]), "output_planned": str(output_path)})

            # 화면 비우기 (사용자가 다음 작업할 수 있게)
            with self.server.state_lock:
                self.server.folder = None
                self.server.videos = []
                self.server.music_folder = None
                self.server.music_files = []

            return self._json({
                "ok": True,
                "queued": queued,
                "warnings": errors,
            })

        if p == "/api/snapshot/save":
            with self.server.state_lock:
                folder = self.server.folder
                videos = list(self.server.videos)
                music_folder = self.server.music_folder
            if not videos and folder is None:
                return self._json({"error": "저장할 작업이 없습니다"}, 400)
            sess = load_session(folder) if folder is not None else {"grades": {}}
            grades = sess.get("grades") or {}
            cinema = bool(body.get("cinema", True))
            label = (body.get("label") or "").strip() or None
            snap = save_snapshot(folder, videos, music_folder, grades, cinema=cinema, label=label, status="saved")
            return self._json({"ok": True, "snapshot": snap})

        if p == "/api/snapshot/load":
            sid = body.get("id") or ""
            snap = read_snapshot(sid)
            if not snap:
                return self._json({"error": "스냅샷 없음"}, 404)
            folder_s = snap.get("video_folder") or ""
            folder = Path(folder_s).expanduser() if folder_s else None
            try:
                if folder is not None:
                    folder = folder.resolve()
            except OSError:
                pass
            video_files = []
            for vp in (snap.get("video_files") or []):
                try:
                    p2 = Path(vp).expanduser().resolve()
                    if p2.is_file():
                        video_files.append(p2)
                except OSError:
                    continue
            music_s = snap.get("music_folder") or ""
            music_folder = Path(music_s).expanduser() if music_s else None
            music_files = list_audio(music_folder) if (music_folder and music_folder.is_dir()) else []
            with self.server.state_lock:
                self.server.folder = folder
                self.server.videos = video_files
                self.server.music_folder = music_folder
                self.server.music_files = music_files
            queue_prebuild_videos(video_files)
            # restore grades into session for that folder
            grades = snap.get("grades") or {}
            if folder is not None and grades:
                sess = load_session(folder)
                sess["grades"] = grades
                save_session(folder, sess)
            return self._json({
                "ok": True,
                "missing": len((snap.get("video_files") or [])) - len(video_files),
                "cinema": bool(snap.get("cinema_on", snap.get("cinema", True))),
                "tri": bool(snap.get("tri_on", False)),
                "outputs": snap.get("outputs") or {},
            })

        if p == "/api/snapshot/delete":
            sid = body.get("id") or ""
            ok = remove_snapshot(sid)
            return self._json({"ok": ok})

        if p == "/api/pick_folder":
            picked = osascript_pick_folder()
            if picked is None:
                return self._json({"cancelled": True})
            with self.server.state_lock:
                self.server.folder = picked
                self.server.videos = list_videos(picked)
                vids = list(self.server.videos)
            queue_prebuild_videos(vids)        # 전체 클립 백그라운드 미리 빌드
            return self._json({"ok": True, "folder": str(picked), "count": len(vids)})

        if p == "/api/pick_files":
            picked = osascript_pick_files()
            if not picked:
                return self._json({"cancelled": True})
            with self.server.state_lock:
                parents = {pp.parent for pp in picked}
                folder = picked[0].parent if len(parents) == 1 else (self.server.folder or picked[0].parent)
                self.server.folder = folder
                self.server.videos = list(picked)
                vids = list(self.server.videos)
            queue_prebuild_videos(vids)
            return self._json({"ok": True, "folder": str(folder), "count": len(vids)})

        if p == "/api/add_files":
            picked = osascript_pick_files()
            if not picked:
                return self._json({"cancelled": True})
            with self.server.state_lock:
                existing = {str(v.resolve()) for v in self.server.videos}
                added = 0
                for v in picked:
                    if str(v.resolve()) not in existing:
                        self.server.videos.append(v)
                        added += 1
                vids = list(self.server.videos)
            queue_prebuild_videos(picked)      # 새로 추가된 것들만 큐에
            return self._json({"ok": True, "count": len(vids), "added": added})

        if p == "/api/preset":
            grade = body.get("grade") or {}
            sg = self._sanitize_grade(grade)
            save_preset_slot(sg)
            return self._json({"ok": True, "grade": sg})

        if p == "/api/remove_clips":
            ids = body.get("ids") or []
            if not isinstance(ids, list):
                return self._json({"error": "bad ids"}, 400)
            try:
                ids_set = {int(x) for x in ids}
            except (TypeError, ValueError):
                return self._json({"error": "bad ids"}, 400)
            with self.server.state_lock:
                kept = [v for i, v in enumerate(self.server.videos) if i not in ids_set]
                removed = len(self.server.videos) - len(kept)
                self.server.videos = kept
            return self._json({"ok": True, "removed": removed, "count": len(kept)})

        if p == "/api/save":
            cid = body.get("id")
            grade = body.get("grade") or {}
            v = self._video_at(cid) if isinstance(cid, int) else None
            if v is None:
                return self._json({"error": "bad id"}, 400)
            with self.server.state_lock:
                folder = self.server.folder
            if folder is None:
                return self._json({"error": "no folder"}, 400)
            with session_lock_for(folder):
                sess = load_session(folder)
                grades = sess.setdefault("grades", {})
                grades[_nfc(str(v.resolve()))] = self._sanitize_grade(grade)
                save_session(folder, sess)
            return self._json({"ok": True})

        if p == "/api/save_bulk":
            # body: {"items": [{"id": 0, "grade": {...}}, ...]}
            items = body.get("items") or []
            if not isinstance(items, list):
                return self._json({"error": "bad items"}, 400)
            with self.server.state_lock:
                folder = self.server.folder
            if folder is None:
                return self._json({"error": "no folder"}, 400)
            saved = 0
            with session_lock_for(folder):
                sess = load_session(folder)
                grades = sess.setdefault("grades", {})
                for it in items:
                    cid = it.get("id")
                    grade = it.get("grade") or {}
                    v = self._video_at(cid) if isinstance(cid, int) else None
                    if v is None:
                        continue
                    grades[_nfc(str(v.resolve()))] = self._sanitize_grade(grade)
                    saved += 1
                save_session(folder, sess)
            return self._json({"ok": True, "saved": saved})

        if p == "/api/save_order":
            order = body.get("order") or []
            if not isinstance(order, list):
                return self._json({"error": "bad order"}, 400)
            with self.server.state_lock:
                folder = self.server.folder
            if folder is None:
                return self._json({"error": "no folder"}, 400)
            with session_lock_for(folder):
                sess = load_session(folder)
                sess["order"] = [str(x) for x in order]
                save_session(folder, sess)
            return self._json({"ok": True})

        if p == "/api/reorder":
            # body: { "ids": [int, int, ...] }  — 현재 클립 ID(인덱스) 의 새 순서
            ids = body.get("ids") or []
            if not isinstance(ids, list):
                return self._json({"error": "bad ids"}, 400)
            try:
                new_order_ids = [int(x) for x in ids]
            except (TypeError, ValueError):
                return self._json({"error": "bad ids"}, 400)
            with self.server.state_lock:
                vids = list(self.server.videos)
                n = len(vids)
                if sorted(new_order_ids) != list(range(n)):
                    return self._json({"error": "ids must be permutation of 0..n-1"}, 400)
                reordered = [vids[i] for i in new_order_ids]
                self.server.videos = reordered
                folder = self.server.folder
            if folder is not None:
                with session_lock_for(folder):
                    sess = load_session(folder)
                    sess["order"] = [str(p.resolve()) for p in reordered]
                    save_session(folder, sess)
            return self._json({"ok": True, "count": len(reordered)})

        self.send_error(404)

    # helpers
    def _idx(self, qs: dict[str, list[str]]) -> int | None:
        try:
            i = int(qs.get("id", ["-1"])[0])
        except (TypeError, ValueError):
            return None
        with self.server.state_lock:
            n = len(self.server.videos)
        if i < 0 or i >= n:
            return None
        return i

    def _video_at(self, i: int) -> Path | None:
        with self.server.state_lock:
            if 0 <= i < len(self.server.videos):
                return self.server.videos[i]
        return None

    def _sanitize_grade(self, g: dict) -> dict:
        out: dict = {}
        for k, default in DEFAULT_GRADE.items():
            if k == "hsl":
                hsl_in = g.get("hsl") or {}
                hsl_out: dict = {}
                for ch in HSL_CHANNELS:
                    src = hsl_in.get(ch) or {}
                    cell: dict = {}
                    for sk in ("h", "s", "l"):
                        try:
                            cell[sk] = int(max(-100, min(100, round(float(src.get(sk, 0) or 0)))))
                        except (TypeError, ValueError):
                            cell[sk] = 0
                    hsl_out[ch] = cell
                out["hsl"] = hsl_out
                continue
            v = g.get(k, default)
            try:
                if isinstance(default, float):
                    out[k] = float(v)
                else:
                    out[k] = int(round(float(v)))
            except (TypeError, ValueError):
                out[k] = default
        # clamp trim to non-negative
        if out.get("trim_in", 0.0) < 0: out["trim_in"] = 0.0
        if out.get("trim_out", 0.0) < 0: out["trim_out"] = 0.0
        return out

    def _state_payload(self) -> dict:
        with self.server.state_lock:
            folder = self.server.folder
            videos = list(self.server.videos)
            music_folder = self.server.music_folder
            music_files = list(self.server.music_files)
            logo_path = self.server.logo_path
        logo_block = {"path": str(logo_path) if logo_path else "", "name": (Path(logo_path).name if logo_path else "")}

        # 음악 BGM 순환 상태 — montage_lib 의 디스크 저장 (~/.music_montage/bgm_folder_order.json) 활용
        next_index = 0
        next_name = ""
        last_index = 0
        last_name = ""
        if music_folder and music_files:
            try:
                from montage_lib import (
                    _bgm_pool_signature,
                    read_next_bgm_track_index,
                )
                sig = _bgm_pool_signature(music_files)
                # read_next_bgm_track_index 의 첫 인자는 *음악 폴더* path (resolve 키로 사용됨)
                ni = read_next_bgm_track_index(music_folder, len(music_files), sig)
                next_index = ni + 1
                next_name = music_files[ni].name
                li = (ni - 1) % len(music_files) if music_files else 0
                last_index = li + 1
                last_name = music_files[li].name
            except (ImportError, OSError, ValueError):
                pass

        music_block = {
            "folder": str(music_folder) if music_folder else "",
            "count": len(music_files),
            "names": [f.name for f in music_files[:200]],
            "next_index": next_index,        # 1-based
            "next_name": next_name,
            "last_index": last_index,
            "last_name": last_name,
        }
        if folder is None:
            return {
                "folder": "",
                "count": 0,
                "clips": [],
                "default_grade": dict(DEFAULT_GRADE),
                "empty_reason": "no_folder",
                "music": music_block,
                "logo": logo_block,
            }
        sess = load_session(folder)
        grades_by_path = sess.get("grades") or {}
        clips = []
        for i, v in enumerate(videos):
            key = _nfc(str(v.resolve()))
            g = grades_by_path.get(key) or dict(DEFAULT_GRADE)
            try:
                size = v.stat().st_size
            except OSError:
                size = 0
            clips.append({
                "id": i,
                "name": v.name,
                "stem": v.stem,
                "path": str(v.resolve()),
                "size": size,
                "grade": g,
                "proxy": get_proxy_status(v),
            })
        return {
            "folder": str(folder),
            "folder_label": _smart_folder_label(folder, videos),
            "count": len(clips),
            "clips": clips,
            "default_grade": dict(DEFAULT_GRADE),
            "music": music_block,
            "logo": logo_block,
        }


def main() -> None:
    parser = argparse.ArgumentParser(description="grade_studio web grader")
    parser.add_argument("folder", type=Path, nargs="?", default=None, help="영상 폴더(생략 가능, 화면 안에서 선택)")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    if shutil.which("ffmpeg") is None:
        print("ffmpeg 가 필요합니다 (brew install ffmpeg)", file=sys.stderr)
        sys.exit(2)

    folder: Path | None = None
    videos: list[Path] = []
    if args.folder is not None:
        f = args.folder.expanduser().resolve()
        if f.is_dir():
            folder = f
            videos = list_videos(folder)
            # 사용자 정의 순서 (sess["order"]) 가 있으면 적용
            try:
                sess0 = load_session(folder)
                saved_order = sess0.get("order") or []
                if saved_order:
                    by_path = {str(v.resolve()): v for v in videos}
                    ordered = [by_path[str(Path(p).resolve())] for p in saved_order if str(Path(p).resolve()) in by_path]
                    leftover = [v for v in videos if v not in ordered]
                    videos = ordered + leftover
                    print(f"[grade_studio] 저장된 순서 적용: {len(ordered)}개")
            except (OSError, ValueError, KeyError):
                pass
            print(f"[grade_studio] folder: {folder}")
            print(f"[grade_studio] {len(videos)}개 클립 로드 — 전체 프록시 백그라운드 빌드 시작")
            queue_prebuild_videos(videos)
        else:
            print(f"[grade_studio] 폴더 없음: {f} (화면에서 다시 선택하세요)", file=sys.stderr)

    server = ThreadingHTTPServer((args.host, args.port), GradeStudioHandler)
    server.folder = folder           # type: ignore[attr-defined]
    server.videos = videos           # type: ignore[attr-defined]
    # 기본 음악 폴더 자동 로드 (있으면)
    if DEFAULT_MUSIC_FOLDER.is_dir():
        server.music_folder = DEFAULT_MUSIC_FOLDER   # type: ignore[attr-defined]
        server.music_files = list_audio(DEFAULT_MUSIC_FOLDER)  # type: ignore[attr-defined]
        print(f"[grade_studio] 기본 음악 폴더: {DEFAULT_MUSIC_FOLDER} ({len(server.music_files)}곡)")
    else:
        server.music_folder = None       # type: ignore[attr-defined]
        server.music_files = []          # type: ignore[attr-defined]
        print(f"[grade_studio] 기본 음악 폴더 없음 — 화면에서 선택 필요: {DEFAULT_MUSIC_FOLDER}")
    server.logo_path = None          # type: ignore[attr-defined]
    server.state_lock = threading.Lock()  # type: ignore[attr-defined]

    url = f"http://{args.host}:{args.port}/"
    print(f"[grade_studio] {url}")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[grade_studio] stop")
        server.server_close()


if __name__ == "__main__":
    main()
