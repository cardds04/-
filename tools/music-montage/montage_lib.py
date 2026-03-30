"""
음악 피크 기준 컷 + 영상 이어붙이기 (CLI·GUI 공용)
"""

from __future__ import annotations

import math
import os
import random
import re
import shutil
import subprocess
import tempfile
import unicodedata
from collections.abc import Callable
from datetime import datetime
from pathlib import Path

import numpy as np

import librosa

VIDEO_EXTS = {".mp4", ".mov", ".m4v", ".avi", ".mkv", ".webm"}
AUDIO_EXTS = {".mp3", ".m4a", ".aac", ".wav", ".flac", ".ogg"}

# 합본 overlay scale=-2:H 의 H (출력 높이보다 크면 잘리지 않게 상한)
MONTAGE_LOGO_HEIGHT_PX = 600
# 로고 알파 페이드 인·아웃 목표 길이(초); 구간이 짧으면 mux_final_output 안에서 줄임
MONTAGE_LOGO_FADE_SEC = 1.0


def _ensure_cli_tools_path() -> None:
    """Finder·일부 IDE에서 띄운 프로세스는 PATH에 Homebrew가 없어 ffmpeg를 못 찾는 경우가 있음."""
    path = os.environ.get("PATH", "")
    parts = [x for x in path.split(os.pathsep) if x]
    extras = [
        d
        for d in ("/opt/homebrew/bin", "/usr/local/bin")
        if os.path.isdir(d) and d not in parts
    ]
    if extras:
        os.environ["PATH"] = os.pathsep.join(extras + parts)


_ensure_cli_tools_path()


def is_skipped_media_filename(name: str) -> bool:
    """macOS AppleDouble(._파일명), 숨김 파일 등 — 확장자만 맞고 실제 미디어가 아닌 경우가 많음."""
    return name.startswith(".")


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    cp = subprocess.run(cmd, capture_output=True, text=True, **kw)
    if cp.returncode != 0:
        se = (cp.stderr or "").strip()
        so = (cp.stdout or "").strip()
        parts: list[str] = []
        if se:
            parts.append(se)
        if so and so != se:
            parts.append("— stdout —\n" + so)
        err = "\n\n".join(parts) if parts else f"(코드 {cp.returncode}, stderr/stdout 비어 있음)"
        fc_extra = ""
        try:
            i = cmd.index("-filter_complex")
            if i + 1 < len(cmd):
                fc_extra = f"\n\n— filter_complex —\n{cmd[i + 1]}"
        except ValueError:
            pass
        raise RuntimeError(
            f"ffmpeg 실패 (종료 {cp.returncode})\n{err}{fc_extra}\n\n명령: {' '.join(cmd[:8])}{' …' if len(cmd) > 8 else ''}"
        )
    return cp


def check_ffmpeg() -> str | None:
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        return "ffmpeg / ffprobe 가 PATH에 없습니다. brew install ffmpeg 후 다시 실행하세요."
    return None


def ffprobe_duration(path: Path) -> float:
    out = run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ]
    ).stdout.strip()
    return float(out)


# 몽타주에 넣지 않음: 이 길이(초) 이하 클립은 제외
MIN_MONTAGE_VIDEO_DURATION_SEC = 2.0


def drop_videos_too_short(
    videos: list[Path],
    *,
    min_sec: float = MIN_MONTAGE_VIDEO_DURATION_SEC,
    log: Callable[[str], None] | None = None,
) -> list[Path]:
    """ffprobe 길이가 min_sec 이하인 클립은 빼고, 실패한 파일도 제외."""
    kept: list[Path] = []
    for vp in videos:
        try:
            d = ffprobe_duration(vp)
        except (OSError, ValueError, RuntimeError):
            if log:
                log(f"길이 확인 실패·제외: {vp.name}")
            continue
        if d <= min_sec + 1e-9:
            if log:
                log(f"2초 이하 제외: {vp.name} ({d:.2f}s)")
            continue
        kept.append(vp)
    return kept


def is_video_too_short_for_montage(
    path: Path, *, min_sec: float = MIN_MONTAGE_VIDEO_DURATION_SEC
) -> bool | None:
    """True=합본에서 제외되는 짧은 클립, False=사용 가능, None=길이 확인 실패(제외 대상과 동일 처리)."""
    try:
        return ffprobe_duration(path) <= min_sec + 1e-9
    except (OSError, ValueError, RuntimeError):
        return None


# --- 자동 노출(히스토그램 최빈 밝기) + FFmpeg exposure / unsharp 선명도 -----------------

# 밝기 0~100% 축에서 최빈값이 이 구간 밖이면 FFmpeg exposure 로 보정 (GUI·CLI에서 덮어쓸 수 있음)
AUTO_EXPOSURE_MODE_DARK_LT: float = 50.0
AUTO_EXPOSURE_MODE_BRIGHT_GE: float = 70.0
# unsharp 기본 luma_amount=1.0 대비 약 +10%
MONTAGE_UNSHARP_VF: str = "unsharp=5:5:1.1:5:5:0.0"


def clamp_auto_exposure_mode_thresholds(dark_lt: float, bright_ge: float) -> tuple[float, float]:
    """0~100 클램프, 하한 < 상한 이 되도록(겹치면 1%p 간격)."""
    d = max(0.0, min(100.0, float(dark_lt)))
    b = max(0.0, min(100.0, float(bright_ge)))
    if d >= b:
        d = max(0.0, b - 1.0)
    if d >= b:
        b = min(100.0, d + 1.0)
    return d, b


def clamp_auto_exposure_strength(strength_0_1: float) -> float:
    """노출 EV 배율 0~1."""
    return max(0.0, min(1.0, float(strength_0_1)))


def clamp_auto_wb_strength(strength_0_1: float) -> float:
    """grayworld 적용 비율 0~1(원본과 블렌드)."""
    return clamp_auto_exposure_strength(strength_0_1)


# FFmpeg colortemperature: 중립 6500K 근처는 필터 생략
MONTAGE_CT_NEUTRAL_K: float = 6500.0
MONTAGE_CT_K_MIN: int = 3000
MONTAGE_CT_K_MAX: int = 10000


def clamp_color_temperature_k(k: float) -> float:
    return max(float(MONTAGE_CT_K_MIN), min(float(MONTAGE_CT_K_MAX), float(k)))


def _grade_map_lookup(by: dict[str, object] | None, vp: Path) -> object | None:
    """
    웹·세션은 NFC 정규화 경로 키를 쓰고, macOS Path.resolve()는 NFD를 줄 수 있어
    auto_*_by_clip / manual_clip_grade 조회가 실패하는 경우를 막는다.
    """
    if not by:
        return None
    try:
        r = str(vp.resolve())
    except OSError:
        return None
    if r in by:
        return by[r]
    for cand in (
        unicodedata.normalize("NFC", r),
        unicodedata.normalize("NFD", r),
    ):
        if cand != r and cand in by:
            return by[cand]
    try:
        rp = vp.resolve()
        for k, v in by.items():
            if not k:
                continue
            try:
                if Path(str(k)).expanduser().resolve() == rp:
                    return v
            except OSError:
                continue
    except OSError:
        pass
    return None


def montage_colortemperature_vf(kelvin: float) -> str | None:
    """FFmpeg colortemperature. 6500K≈중립이면 생략."""
    k = clamp_color_temperature_k(kelvin)
    if abs(k - MONTAGE_CT_NEUTRAL_K) < 0.6:
        return None
    return f"colortemperature=temperature={k:.1f}:mix=1.0"


def montage_wb_spot_channel_vf(rr: float, gg: float, bb: float) -> str | None:
    """
    스포이드(중립점) 화이트밸런스: R/G/B 채널 독립 배율.
    FFmpeg colorchannelmixer 대각 성분만 사용.
    """
    if (
        abs(rr - 1.0) < 1e-4
        and abs(gg - 1.0) < 1e-4
        and abs(bb - 1.0) < 1e-4
    ):
        return None
    r = max(0.3, min(3.0, float(rr)))
    g = max(0.3, min(3.0, float(gg)))
    b = max(0.3, min(3.0, float(bb)))
    return (
        f"colorchannelmixer="
        f"rr={r:.5f}:rg=0:rb=0:"
        f"gr=0:gg={g:.5f}:gb=0:"
        f"br=0:bg=0:bb={b:.5f}"
    )


def montage_grayworld_blend_vf(wb_strength_0_1: float) -> str | None:
    """
    FFmpeg grayworld(회색 세계 가정 자동 화이트밸런스).
    강도 1=순수 grayworld, 그 사이는 원본과 선형 블렌드.
    """
    s = clamp_auto_wb_strength(wb_strength_0_1)
    if s < 1e-6:
        return None
    if s >= 1.0 - 1e-9:
        return "grayworld"
    a = 1.0 - s
    b = s
    return (
        f"split=2[gw_a][gw_b];[gw_b]grayworld[gw_c];"
        f"[gw_a][gw_c]blend=all_expr=A*{a:.6f}+B*{b:.6f}"
    )


def montage_grade_probe_sec(trim_eff: float, avail: float) -> float:
    """앞건너뜸 이후 본문 구간 안 샘플 시각."""
    usable = max(0.02, float(avail))
    off = min(max(0.08, usable * 0.22), max(0.04, usable * 0.45))
    return float(trim_eff) + off


def _parse_ppm6_header_and_pixels(data: bytes) -> tuple[int, int, int, memoryview] | None:
    if len(data) < 32 or not data.startswith(b"P6"):
        return None
    i = 2

    def _skip_space() -> None:
        nonlocal i
        while i < len(data) and data[i] in (9, 10, 13, 32):
            i += 1

    nums: list[int] = []
    cur = bytearray()
    while len(nums) < 3 and i < len(data):
        _skip_space()
        if i >= len(data):
            break
        if data[i] == 35:
            while i < len(data) and data[i] != 10:
                i += 1
            continue
        if 48 <= data[i] <= 57:
            cur.clear()
            while i < len(data) and 48 <= data[i] <= 57:
                cur.append(data[i])
                i += 1
            if cur:
                nums.append(int(cur.decode()))
        else:
            i += 1
    if len(nums) != 3:
        return None
    w, h, maxv = nums[0], nums[1], nums[2]
    if w <= 0 or h <= 0 or maxv <= 0:
        return None
    _skip_space()
    need = w * h * 3
    if i + need > len(data):
        return None
    return w, h, maxv, memoryview(data)[i : i + need]


def probe_luminance_mode_percent(
    video: Path,
    at_sec: float,
    *,
    timeout: float = 75.0,
) -> float | None:
    """
    한 프레임에서 (R+G+B)/3 히스토그램의 최빈 구간 중심을 0~100% 밝기로 반환.
    실패 시 None.
    """
    try:
        ss = max(0.0, float(at_sec))
        cp = subprocess.run(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{ss:.4f}",
                "-i",
                str(video),
                "-frames:v",
                "1",
                "-vf",
                "scale='min(480,iw)':-2",
                "-f",
                "image2pipe",
                "-vcodec",
                "ppm",
                "pipe:1",
            ],
            capture_output=True,
            timeout=timeout,
        )
    except (OSError, subprocess.TimeoutExpired, ValueError):
        return None
    if cp.returncode != 0 or not cp.stdout:
        return None
    parsed = _parse_ppm6_header_and_pixels(cp.stdout)
    if parsed is None:
        return None
    w, h, maxv, pix = parsed
    mv = float(maxv)
    n = w * h
    if n <= 0 or mv <= 0:
        return None
    nb = 256
    hist = [0] * nb
    step = max(1, n // 100_000)
    j = 0
    while j + 2 < len(pix):
        y = (pix[j] + pix[j + 1] + pix[j + 2]) / (3.0 * mv)
        bi = min(nb - 1, int(y * nb))
        hist[bi] += 1
        j += 3 * step
    if sum(hist) <= 0:
        return None
    max_i = int(max(range(nb), key=lambda i: hist[i]))
    return (max_i + 0.5) / float(nb) * 100.0


def exposure_ev_from_mode_percent(
    mode_pct: float,
    *,
    mode_dark_lt: float = AUTO_EXPOSURE_MODE_DARK_LT,
    mode_bright_ge: float = AUTO_EXPOSURE_MODE_BRIGHT_GE,
) -> float | None:
    """최빈 밝기(0~100)에 따라 FFmpeg exposure 필터 EV. 하한 미만·상한 이상만 보정."""
    lo, hi = clamp_auto_exposure_mode_thresholds(mode_dark_lt, mode_bright_ge)
    m = float(mode_pct)
    if m < lo:
        t = (lo - m) / max(lo, 1e-6)
        return min(0.9, 0.1 + t * 0.75)
    if m >= hi:
        t = (m - hi) / max(100.0 - hi, 1e-6)
        return max(-0.9, -0.1 - t * 0.75)
    return None


def montage_auto_grade_vf_prefix(
    video: Path,
    trim_eff: float,
    avail: float,
    *,
    enabled: bool,
    mode_dark_lt: float = AUTO_EXPOSURE_MODE_DARK_LT,
    mode_bright_ge: float = AUTO_EXPOSURE_MODE_BRIGHT_GE,
    exposure_strength: float = 1.0,
    wb_enabled: bool = False,
    wb_strength: float = 1.0,
    ct_enabled: bool = False,
    ct_kelvin: float = MONTAGE_CT_NEUTRAL_K,
    wb_spot_mul: tuple[float, float, float] | None = None,
    log: Callable[[str], None] | None = None,
) -> str | None:
    """
    wb_enabled: FFmpeg grayworld(강도 wb_strength 0~1, 원본과 블렌드).
    ct_enabled: FFmpeg colortemperature(K), 6500K 근처는 생략.
    wb_spot_mul: 스포이드 채널 배율 (grayworld 앞에 적용).
    enabled: 히스토그램 기반 exposure + 항상 unsharp(MONTAGE_UNSHARP_VF).
    exposure_strength: 0~1, 산출 EV에 곱함(0이면 노출 필터 생략).
    필터 순서: 스포이드 colorchannelmixer → grayworld → colortemperature → exposure → unsharp.
    """
    spot_vf = (
        montage_wb_spot_channel_vf(wb_spot_mul[0], wb_spot_mul[1], wb_spot_mul[2])
        if wb_spot_mul is not None
        else None
    )
    sm_wb = clamp_auto_wb_strength(wb_strength) if wb_enabled else 0.0
    gw = montage_grayworld_blend_vf(sm_wb) if wb_enabled else None
    ct_vf = montage_colortemperature_vf(ct_kelvin) if ct_enabled else None
    if not enabled and not gw and not ct_vf and not spot_vf:
        return None
    lo, hi = clamp_auto_exposure_mode_thresholds(mode_dark_lt, mode_bright_ge)
    sm = clamp_auto_exposure_strength(exposure_strength)
    _lg = log or (lambda _s: None)
    at = montage_grade_probe_sec(trim_eff, avail)
    mode = probe_luminance_mode_percent(video, at) if enabled else None
    chunks: list[str] = []
    if spot_vf:
        chunks.append(spot_vf)
        if wb_spot_mul is not None:
            sr, sg, sb = wb_spot_mul
            _lg(
                f"  스포이드 WB {video.name}: R×{sr:.3f} G×{sg:.3f} B×{sb:.3f}"
            )
    if gw:
        chunks.append(gw)
        if wb_enabled and sm_wb > 1e-6:
            _lg(
                f"  자동 화이트밸런스 {video.name}: grayworld "
                f"({'100%' if sm_wb >= 1.0 - 1e-9 else f'원본 {100-sm_wb*100:.0f}% + 보정 {sm_wb*100:.0f}%'})"
            )
    if ct_vf:
        chunks.append(ct_vf)
        if ct_enabled:
            _lg(f"  색온도 {video.name}: {clamp_color_temperature_k(ct_kelvin):.0f}K")
    if enabled and mode is not None and sm > 1e-6:
        ev = exposure_ev_from_mode_percent(mode, mode_dark_lt=lo, mode_bright_ge=hi)
        if ev is not None:
            ev_s = ev * sm
            if abs(ev_s) >= 1e-5:
                chunks.append(f"exposure={ev_s:.4f}")
                _lg(
                    f"  자동 노출 {video.name}: 최빈≈{mode:.1f}% (기준 {lo:.0f}%·{hi:.0f}%, 강도 {sm*100:.0f}%) "
                    f"→ exposure={ev_s:+.3f}EV"
                )
    if enabled:
        chunks.append(MONTAGE_UNSHARP_VF)
    return ",".join(chunks) if chunks else None


def montage_tone_curves_vf(
    shadows_pct: int,
    highlights_pct: int,
    whites_pct: int,
    blacks_pct: int,
) -> str | None:
    """
    하이라이트·섀도·화이트·블랙 슬라이더(-100~100)를 FFmpeg curves=all 로 근사.
    colortemperature·스포이드와는 별도(이미 앞 단에서 적용된 뒤 이어서 붙음).
    """
    sh = max(-100, min(100, int(shadows_pct)))
    hi = max(-100, min(100, int(highlights_pct)))
    wh = max(-100, min(100, int(whites_pct)))
    bl = max(-100, min(100, int(blacks_pct)))
    if sh == 0 and hi == 0 and wh == 0 and bl == 0:
        return None
    xs = [0.0, 0.22, 0.45, 0.65, 0.82, 1.0]
    ys: list[float] = []
    for xi in xs:
        y = float(xi)
        if sh != 0:
            w = max(0.0, min(1.0, 1.0 - xi * 1.4))
            y += (sh / 100.0) * 0.26 * w
        if hi != 0:
            w = max(0.0, min(1.0, (xi - 0.38) * 1.7))
            y += (hi / 100.0) * 0.22 * w
        if wh != 0:
            w = max(0.0, min(1.0, (xi - 0.62) * 2.8))
            y += (wh / 100.0) * 0.16 * w
        if bl != 0:
            w = max(0.0, min(1.0, 1.0 - xi * 1.05))
            y += (bl / 100.0) * 0.14 * w
        y = max(0.0, min(1.0, y))
        ys.append(y)
    for i in range(1, len(ys)):
        if ys[i] < ys[i - 1]:
            ys[i] = ys[i - 1]
    inner = " ".join(f"{xs[i]:.4f}/{ys[i]:.4f}" for i in range(len(xs)))
    return f"curves=all='{inner}'"


def montage_manual_clip_grade_vf(grade: dict | None) -> str | None:
    """
    웹/GUI clip_grade_preview(정규화 dict)에서 FFmpeg 자동 체인에 없는 항목만 vf 문자열로 변환.
    노출 강도·색온도·스포이드는 montage_auto_grade_vf_prefix 에서 이미 처리.
    """
    if not isinstance(grade, dict):
        return None
    g = grade
    chunks: list[str] = []

    tint = int(g.get("tint_pct", 0) or 0)
    if abs(tint) >= 1:
        gm = max(-0.12, min(0.12, (tint / 100.0) * 0.12))
        chunks.append(f"colorbalance=gm={gm:.5f}")

    hue = max(-100, min(100, int(g.get("hue_pct", 0) or 0)))
    if abs(hue) >= 1:
        deg = (hue / 100.0) * 45.0
        rad = deg * math.pi / 180.0
        chunks.append(f"hue=h={rad:.6f}")

    cu = montage_tone_curves_vf(
        int(g.get("shadows_pct", 0) or 0),
        int(g.get("highlights_pct", 0) or 0),
        int(g.get("whites_pct", 0) or 0),
        int(g.get("blacks_pct", 0) or 0),
    )
    if cu:
        chunks.append(cu)

    contrast = int(g.get("contrast_pct", 100) or 100)
    sat = int(g.get("saturation_pct", 100) or 100)
    wb_legacy = int(g.get("wb_pct", 0) or 0)
    vib = int(g.get("vibrance_pct", 0) or 0)
    dehaze = int(g.get("dehaze_pct", 0) or 0)

    c_f = 1.0
    s_f = 1.0
    g_f = 1.0
    br = 0.0
    if abs(contrast - 100) >= 1:
        c_f *= max(0.48, min(1.68, 1.0 + (contrast - 100) / 100.0 * 0.58))
    if abs(sat - 100) >= 1:
        s_f *= max(0.28, min(1.78, 1.0 + (sat - 100) / 100.0 * 0.62))
    if wb_legacy > 0 and abs(sat - 100) < 1:
        s_f *= max(0.72, min(1.45, 0.88 + 0.0022 * float(wb_legacy)))
    if abs(vib) >= 1:
        s_f *= max(0.84, min(1.3, 1.0 + vib / 125.0))
    if dehaze > 0:
        c_f *= min(1.15, 1.0 + dehaze / 250.0)
        s_f *= min(1.2, 1.0 + dehaze / 300.0)
        g_f *= max(0.86, min(1.06, 1.0 - dehaze / 400.0))
    elif dehaze < 0:
        c_f *= max(0.86, 1.0 + dehaze / 270.0)
        s_f *= max(0.88, 1.0 + dehaze / 380.0)

    if (
        abs(c_f - 1.0) > 1e-3
        or abs(s_f - 1.0) > 1e-3
        or abs(g_f - 1.0) > 1e-3
        or abs(br) > 1e-6
    ):
        chunks.append(
            f"eq=contrast={c_f:.4f}:saturation={s_f:.4f}:gamma={g_f:.4f}:brightness={br:.4f}"
        )

    tex = int(g.get("texture_pct", 0) or 0)
    if tex > 0:
        amt = min(1.85, 0.32 + tex / 88.0)
        chunks.append(f"unsharp=3:3:{amt:.3f}:3:3:0.0")
    elif tex < 0:
        sig = min(2.4, (-tex) / 50.0)
        chunks.append(f"gblur=sigma={sig:.3f}")

    clr = int(g.get("clarity_pct", 0) or 0)
    if clr > 0:
        amt = min(2.05, 0.75 + clr / 68.0)
        chunks.append(f"unsharp=5:5:{amt:.3f}:5:5:0.0")
    elif clr < 0:
        sig = min(3.0, (-clr) / 34.0)
        chunks.append(f"gblur=sigma={sig:.3f}")

    return ",".join(chunks) if chunks else None


def sanitize_output_filename_tag(raw: str) -> str:
    """파일명에 넣을 짧은 태그(한글·숫자·밑줄만)."""
    s = re.sub(r"[^\w가-힣]", "", str(raw), flags=re.UNICODE)
    return (s[:40] or "").strip()


def montage_output_tag_from_preset(p: dict) -> str:
    """기본 프리셋 라벨·해상도·레이아웃으로 저장 파일명 접두 태그."""
    ly = str(p.get("layout") or "").strip().lower()
    if ly == "tri_stack":
        return "3컷세로형"
    lab = str(p.get("label", ""))
    try:
        w, h = int(p["w"]), int(p["h"])
    except (KeyError, TypeError, ValueError):
        w, h = 0, 0
    try:
        ch = int(p.get("content_h") or 0)
    except (TypeError, ValueError):
        ch = 0
    if "시네마" in lab or (w == 1920 and h in (817, 850)) or (
        w == 1920 and h == 1080 and ch == 850
    ):
        return "시네마"
    if "가로" in lab:
        return "가로형"
    if "세로" in lab:
        return "세로형"
    if w == 1920 and h == 1080:
        return "가로형"
    if w == 1080 and h == 1920:
        return "세로형"
    if w > 0 and h > 0:
        if w >= h:
            return "가로형"
        return "세로형"
    slug = sanitize_output_filename_tag(lab.replace(" ", ""))
    return slug or "preset"


def infer_output_path(
    videos: list[Path],
    videos_dir: Path | None,
    preset_tag: str | None = None,
) -> Path:
    """영상 출력 폴더에 「폴더명_출력크기태그.mp4」로 저장(montage 접두 없음). 중복 시에만 시각 붙임."""
    if videos_dir is not None:
        base = Path(videos_dir).resolve()
        folder_key = base.name
    else:
        base = videos[0].resolve().parent
        folder_key = base.name
    fk = sanitize_output_filename_tag(folder_key) or "folder"
    tg = sanitize_output_filename_tag(preset_tag) if preset_tag else ""
    tg = tg or "출력"
    stem = f"{fk}_{tg}"
    candidate = base / f"{stem}.mp4"
    if not candidate.exists():
        return candidate
    return base / f"{stem}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.mp4"


def extract_mono_wav(src: Path, dst_wav: Path, sr: int = 44100) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-vn",
            "-ac",
            "1",
            "-ar",
            str(sr),
            "-acodec",
            "pcm_s16le",
            str(dst_wav),
        ]
    )


def list_sorted_videos(folder: Path) -> list[Path]:
    files = [
        p
        for p in folder.iterdir()
        if p.is_file()
        and not is_skipped_media_filename(p.name)
        and p.suffix.lower() in VIDEO_EXTS
    ]
    files.sort(key=lambda p: p.name.lower())
    return files


def resolve_music_file(music_path: Path) -> Path:
    p = music_path.resolve()
    if p.is_file():
        if is_skipped_media_filename(p.name):
            raise ValueError(
                f"숨김/메타데이터 파일은 음악으로 쓸 수 없습니다: {p.name} "
                f"(macOS의 ._파일은 실제 mp3가 아닙니다. 같은 이름에서 '._' 없는 파일을 고르세요.)"
            )
        if p.suffix.lower() not in AUDIO_EXTS:
            raise ValueError(f"지원하지 않는 음악 형식입니다: {p.suffix}")
        return p
    if not p.is_dir():
        raise FileNotFoundError(f"경로가 없습니다: {music_path}")
    files = [
        x
        for x in p.iterdir()
        if x.is_file()
        and not is_skipped_media_filename(x.name)
        and x.suffix.lower() in AUDIO_EXTS
    ]
    if not files:
        raise ValueError(f"폴더에 음악 파일이 없습니다. 지원: {AUDIO_EXTS}")
    return random.choice(files)


def resolve_videos(videos_dir: Path | None, video_files: list[Path] | None) -> list[Path]:
    if video_files:
        out: list[Path] = []
        samples: list[str] = []
        for p in video_files:
            r = Path(p).expanduser().resolve()
            if r.is_file() and r.suffix.lower() in VIDEO_EXTS:
                out.append(r)
            elif len(samples) < 4:
                if r.is_file():
                    samples.append(f"{r.name} (확장자 {r.suffix!r})")
                else:
                    samples.append(f"{p} (파일 없음)")
        if out:
            return out
        # 목록만 있고 전부 깨짐(이동·삭제·대기열에 남은 옛 경로): 폴더가 있으면 폴더로 진행
        if videos_dir is not None:
            d = Path(videos_dir).expanduser().resolve()
            if d.is_dir():
                v = list_sorted_videos(d)
                if v:
                    return v
        ext_hint = ", ".join(sorted(VIDEO_EXTS))
        hint = " · ".join(samples) if samples else "목록이 비었거나 경로를 확인할 수 없습니다"
        raise ValueError(
            "영상 파일 목록에서 사용할 수 있는 클립이 없습니다. "
            f"(지원 확장자: {ext_hint}) "
            f"예: {hint}"
        )
    if videos_dir is None:
        raise ValueError("영상 폴더 또는 영상 파일 목록이 필요합니다.")
    d = Path(videos_dir).expanduser().resolve()
    if not d.is_dir():
        raise NotADirectoryError(f"영상 폴더가 아닙니다: {videos_dir}")
    v = list_sorted_videos(d)
    if not v:
        raise ValueError(f"폴더에 영상이 없습니다. 지원: {VIDEO_EXTS}")
    return v


def rms_envelope(y: np.ndarray, sr: int, frame_sec: float = 0.05, hop_sec: float = 0.02):
    frame = max(1, int(sr * frame_sec))
    hop = max(1, int(sr * hop_sec))
    rms_list = []
    times = []
    for start in range(0, len(y) - frame + 1, hop):
        chunk = y[start : start + frame]
        rms_list.append(float(np.sqrt(np.mean(chunk**2) + 1e-12)))
        times.append((start + frame / 2) / sr)
    if not rms_list:
        return np.array([float(np.sqrt(np.mean(y**2) + 1e-12))]), np.array([len(y) / (2 * sr)])
    return np.array(rms_list), np.array(times)


def compute_cut_times(
    y: np.ndarray,
    sr: int,
    num_clips: int,
    window_sec: float = 4.0,
    min_seg: float = 0.4,
    peak_band_start: float = 3.0,
) -> list[float]:
    """
    각 클립 구간은 음악 타임라인에서 [w0, w1] (길이 최대 window_sec).
    컷(다음 클립 시작)은 **이 구간 안에서만** 보되, 기본은 윈도우 시작 기준
    peak_band_start 초 ~ w1 까지(예: 4초 창이면 3~4초 구간)에서 RMS 최대 지점.
    너무 이른 피크로 클립이 짧아지는 것을 줄입니다.
    """
    duration = len(y) / sr
    rms, t_centers = rms_envelope(y, sr)
    cuts = [0.0]
    for _ in range(num_clips - 1):
        w0 = cuts[-1]
        if w0 >= duration - 1e-6:
            break
        w1 = min(w0 + window_sec, duration)
        span = w1 - w0
        if span <= 1e-6:
            break
        # 피크 탐색 구간 [band_lo, band_hi]
        if span >= peak_band_start + 0.08:
            band_lo = w0 + peak_band_start
        else:
            # 남은 길이가 peak_band_start 보다 짧으면 뒤쪽에서만 탐색
            band_lo = w0 + max(span * 0.45, min_seg)
        band_hi = w1
        if band_lo >= band_hi - 0.04:
            band_lo = w0 + span * 0.5
        mask = (t_centers >= band_lo) & (t_centers <= band_hi)
        if not np.any(mask):
            mask = (t_centers >= w0) & (t_centers <= w1)
        if not np.any(mask):
            nxt = min(w0 + max(span * 0.65, min_seg), duration)
        else:
            idxs = np.where(mask)[0]
            peak_i = idxs[int(np.argmax(rms[mask]))]
            nxt = float(t_centers[peak_i])
        nxt = max(nxt, w0 + min_seg)
        nxt = min(nxt, w1, duration)
        if nxt <= cuts[-1] + 1e-6:
            nxt = min(w0 + min_seg, duration)
        cuts.append(min(max(nxt, cuts[-1] + 1e-3), duration))
    remain = (num_clips + 1) - len(cuts)
    a = cuts[-1]
    if remain > 1:
        for k in range(1, remain):
            cuts.append(a + (duration - a) * k / remain)
    if len(cuts) < num_clips + 1:
        cuts.append(duration)
    cuts[-1] = duration
    return cuts


def build_segment(
    video: Path,
    duration: float,
    out_path: Path,
    width: int,
    height: int,
    vf_prefix: str | None = None,
    trim_start_sec: float = 0.0,
) -> None:
    """vf_prefix: scale 전에 붙이는 vf. trim_start_sec>0 이면 원본 앞부분 건너뜀(-ss, 초 단위)."""
    pre = f"{vf_prefix}," if vf_prefix else ""
    vf = (
        pre
        + f"scale={width}:{height}:force_original_aspect_ratio=increase:force_divisible_by=2,"
        + f"crop={width}:{height}:(iw-ow)/2:(ih-oh)/2,setsar=1,format=yuv420p"
    )
    cmd: list[str] = [
        "ffmpeg",
        "-y",
        "-i",
        str(video),
    ]
    ts = float(trim_start_sec)
    if ts > 1e-6:
        cmd.extend(["-ss", f"{ts:.6f}"])
    cmd.extend(
        [
            "-vf",
            vf,
            "-t",
            f"{duration:.6f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            str(out_path),
        ]
    )
    run(cmd)


# 3컷 세로: 각 칸 1080×640, 위·중·아래 동시 재생 후 다음 3개로 진행
TRI_STACK_W = 1080
TRI_STACK_H = 1920
TRI_STACK_CELL_W = 1080
TRI_STACK_CELL_H = 640


def _cell_scale_crop_vf(pre: str, cw: int, ch: int) -> str:
    cw2 = max(2, cw - (cw % 2))
    ch2 = max(2, ch - (ch % 2))
    return (
        f"{pre}scale={cw2}:{ch2}:force_original_aspect_ratio=increase:force_divisible_by=2,"
        f"crop={cw2}:{ch2}:(iw-ow)/2:(ih-oh)/2,setsar=1,format=yuv420p"
    )


def build_tri_stack_segment(
    v0: Path,
    v1: Path,
    v2: Path,
    duration: float,
    out_path: Path,
    *,
    cell_w: int = TRI_STACK_CELL_W,
    cell_h: int = TRI_STACK_CELL_H,
    vf_prefix: str | None = None,
    vf_prefix_per_input: tuple[str | None, str | None, str | None] | None = None,
    trim_start_sec: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> None:
    """세 영상을 각각 cell 크기로 재단한 뒤 세로로 이어 한 화면에 동시 출력."""
    if vf_prefix_per_input is not None:
        p0, p1, p2 = vf_prefix_per_input
        pre0 = f"{p0}," if p0 else ""
        pre1 = f"{p1}," if p1 else ""
        pre2 = f"{p2}," if p2 else ""
    else:
        pre = f"{vf_prefix}," if vf_prefix else ""
        pre0 = pre1 = pre2 = pre
    c0 = _cell_scale_crop_vf(pre0, cell_w, cell_h)
    c1 = _cell_scale_crop_vf(pre1, cell_w, cell_h)
    c2 = _cell_scale_crop_vf(pre2, cell_w, cell_h)
    fc = f"[0:v]{c0}[t0];[1:v]{c1}[t1];[2:v]{c2}[t2];[t0][t1][t2]vstack=inputs=3[outv]"
    cmd: list[str] = ["ffmpeg", "-y"]
    for vp, ts in zip((v0, v1, v2), trim_start_sec):
        tsv = float(ts)
        if tsv > 1e-6:
            cmd.extend(["-ss", f"{tsv:.6f}"])
        cmd.extend(["-i", str(vp)])
    cmd.extend(
        [
            "-filter_complex",
            fc,
            "-map",
            "[outv]",
            "-t",
            f"{duration:.6f}",
            "-an",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            str(out_path),
        ]
    )
    run(cmd)


def concat_segments(seg_paths: list[Path], out_path: Path) -> None:
    lst = out_path.parent / "concat_list.txt"
    with open(lst, "w", encoding="utf-8") as f:
        for p in seg_paths:
            f.write(f"file '{p.resolve().as_posix()}'\n")
    run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(lst),
            "-c",
            "copy",
            str(out_path),
        ]
    )


def _letterbox_h_expression(duration: float, open_sec: float, close_sec: float) -> tuple[str, float, float]:
    """구 레터박스용 scale 식 + (실제 open/close 초). 합본에서는 식은 쓰지 않고 open/close만 검은 페이드 길이 클램프에 사용."""
    o_in = float(open_sec)
    c_in = float(close_sec)
    if o_in <= 0 and c_in <= 0:
        return "ih", 0.0, 0.0
    d = max(float(duration), 0.01)
    if d < 0.35:
        return "ih", 0.0, 0.0
    o = 0.0
    c = 0.0
    if o_in > 0:
        o = min(max(0.2, o_in), d * 0.48)
    if c_in > 0:
        c = min(max(0.2, c_in), d * 0.48)
    if o > 0 and c > 0 and o + c > d - 0.12:
        half = max(0.15, (d - 0.1) / 2.0)
        o = half
        c = half
    elif o > 0:
        o = min(o, d - 0.12)
    elif c > 0:
        c = min(c, d - 0.12)
    ds = f"{d:.6f}"
    if o > 0 and c > 0:
        os_, cs = f"{o:.6f}", f"{c:.6f}"
        tail = f"{d - c:.6f}"
        h_expr = (
            f"if(lt(t\\,{os_})\\,max(2\\,ih*t/{os_})\\,"
            f"if(gt(t\\,{tail})\\,max(2\\,ih*({ds}-t)/{cs})\\,ih))"
        )
    elif o > 0:
        os_ = f"{o:.6f}"
        h_expr = f"if(lt(t\\,{os_})\\,max(2\\,ih*t/{os_})\\,ih)"
    else:
        cs = f"{c:.6f}"
        tail = f"{d - c:.6f}"
        h_expr = f"if(gt(t\\,{tail})\\,max(2\\,ih*({ds}-t)/{cs})\\,ih)"
    return h_expr, o, c


def mux_final_output(
    video_only: Path,
    music: Path,
    out_path: Path,
    *,
    content_duration: float,
    width: int,
    height: int,
    pad_input_to_output: bool = False,
    audio_fade_out_sec: float = 5.0,
    letterbox_enabled: bool = True,
    letterbox_open_sec: float = 2.0,
    letterbox_close_sec: float = 2.0,
    tail_black_sec: float = 2.0,
    logo_path: Path | None = None,
    log: Callable[[str], None] | None = None,
) -> None:
    """
    합본 영상: 선택 시 맨 앞·끝을 검은 화면으로 페이드(구 레터박스 슬롯) → tail → 선택 로고 → 오디오.
    content_duration D = 몽타주 본문 길이(검은 tail 제외). 최종 영상 길이 D + tail_black_sec.
    """
    _log = log or (lambda _s: None)
    d = max(float(content_duration), 0.01)
    tail = max(0.0, float(tail_black_sec))
    d_tot = d + tail
    w, h = int(width), int(height)
    wv = max(2, w - (w % 2))
    hv = max(2, h - (h % 2))
    # 페이드는 최종 길이(본문+끝 검은 화면) 끝을 기준
    fade = min(max(0.0, float(audio_fade_out_sec)), max(0.0, d_tot - 0.04))
    lo = max(0.0, float(letterbox_open_sec))
    lc = max(0.0, float(letterbox_close_sec))
    pre_pad = (
        f"pad={wv}:{hv}:(ow-iw)/2:(oh-ih)/2:black," if pad_input_to_output else ""
    )
    if pad_input_to_output:
        _log(f"시네마 레터박스: 입력을 {wv}×{hv} 캔버스에 가운데 맞춤(상·하 검은 띠).")

    chunks: list[str] = []
    if letterbox_enabled and (lo > 0 or lc > 0):
        # 구 레터박스(세로 막대 애니)는 FFmpeg 8에서 불안정 → 검은 화면 페이드 인/아웃으로 대체
        _, o_u, c_u = _letterbox_h_expression(d, lo, lc)
        if o_u > 0.05 or c_u > 0.05:
            _log(f"오프닝·클로징(검은 페이드): 앞 {o_u:.2f}s 밝아짐 · 끝 {c_u:.2f}s 어두워짐")
        if o_u < 0.05 and c_u < 0.05:
            chunks.append(
                f"[0:v]{pre_pad}fps=30,format=yuv420p,setpts=PTS-STARTPTS[vb]"
            )
        else:
            fade_parts: list[str] = []
            if o_u >= 0.05:
                fade_parts.append(f"fade=t=in:st=0:d={o_u:.6f}:color=black")
            if c_u >= 0.05:
                st_close = max(0.0, d - c_u)
                fade_parts.append(f"fade=t=out:st={st_close:.6f}:d={c_u:.6f}:color=black")
            chunks.append(
                f"[0:v]{pre_pad}{','.join(fade_parts)},fps=30,format=yuv420p,setpts=PTS-STARTPTS[vb]"
            )
    else:
        if not letterbox_enabled:
            _log("오프닝·클로징(검은 페이드): 끔")
        chunks.append(f"[0:v]{pre_pad}fps=30,format=yuv420p,setpts=PTS-STARTPTS[vb]")

    if tail > 1e-6:
        chunks.append(
            f"color=c=black:s={wv}x{hv}:d={tail:.6f},format=yuv420p,fps=30[blk];"
            f"[vb][blk]concat=n=2:v=1:a=0[vext]"
        )
        v_base = "[vext]"
    else:
        v_base = "[vb]"

    logo = Path(logo_path).resolve() if logo_path else None
    use_logo = logo is not None and logo.is_file()
    v_final = v_base
    _logo_h = min(MONTAGE_LOGO_HEIGHT_PX, max(120, hv - 40))

    if use_logo:
        t_open_lo = 3.0
        t_open_hi = 10.0
        t_es = max(0.0, d - 5.0)
        t_ee = d_tot
        use_end = d >= 6.0
        fd = float(MONTAGE_LOGO_FADE_SEC)
        open_span = max(0.01, t_open_hi - t_open_lo)
        fi_o = fo_o = min(fd, max(0.12, (open_span - 0.08) / 2.2))
        st_fo_o = t_open_hi - fo_o
        seg_e = max(0.01, t_ee - t_es) if use_end else 0.0
        fi_e = fo_e = min(fd, max(0.12, (seg_e - 0.08) / 2.2)) if use_end else 0.0
        st_fo_e = (t_ee - fo_e) if use_end else t_ee
        if use_end and fi_e + fo_e > seg_e - 0.06:
            fi_e = fo_e = max(0.1, (seg_e - 0.06) / 2.0)
            st_fo_e = t_ee - fo_e
        _log(
            f"로고: 도입 {t_open_lo:.0f}~{t_open_hi:.0f}s (페이드 약 {fi_o:.2f}s) · 엔딩 "
            + (
                f"{t_es:.2f}s~끝 (페이드 약 {fi_e:.2f}s)"
                if use_end
                else "생략(본문 짧음)"
            )
        )
        if use_end:
            chunks.append(
                f"[1:v]split[lg0][lg1];"
                f"[lg0]scale=-2:{_logo_h},format=rgba[lg0s];"
                f"[lg0s]fade=t=in:st={t_open_lo:.6f}:d={fi_o:.6f}:alpha=1[lg0a];"
                f"[lg0a]fade=t=out:st={st_fo_o:.6f}:d={fo_o:.6f}:alpha=1[loa];"
                f"{v_base}[loa]overlay=(W-w)/2:(H-h)/2:enable='between(t\\,{t_open_lo:.6f}\\,{t_open_hi:.6f})'[vop];"
                f"[lg1]scale=-2:{_logo_h},format=rgba[lg1s];"
                f"[lg1s]fade=t=in:st={t_es:.6f}:d={fi_e:.6f}:alpha=1[lg1a];"
                f"[lg1a]fade=t=out:st={st_fo_e:.6f}:d={fo_e:.6f}:alpha=1[lob];"
                f"[vop][lob]overlay=(W-w)/2:(H-h)/2:enable='between(t\\,{t_es:.6f}\\,{t_ee:.6f})'[vovl]"
            )
            v_final = "[vovl]"
        else:
            chunks.append(
                f"[1:v]scale=-2:{_logo_h},format=rgba[lg0s];"
                f"[lg0s]fade=t=in:st={t_open_lo:.6f}:d={fi_o:.6f}:alpha=1[lg0a];"
                f"[lg0a]fade=t=out:st={st_fo_o:.6f}:d={fo_o:.6f}:alpha=1[loa];"
                f"{v_base}[loa]overlay=(W-w)/2:(H-h)/2:enable='between(t\\,{t_open_lo:.6f}\\,{t_open_hi:.6f})'[vop]"
            )
            v_final = "[vop]"
        chunks.append(f"{v_final}format=yuv420p[vfv]")
        v_final = "[vfv]"
    else:
        if logo_path:
            _log(f"로고: 파일 없음 — 건너뜀 ({logo_path})")

    fc_video = ";".join(chunks)
    _log("영상만 1차 인코딩 후 음악은 -af 로 합칩니다 (FFmpeg 8 filter_complex+MP3 EINVAL 회피).")

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_v = out_path.parent / f".montage_v_{out_path.stem}_{datetime.now().strftime('%H%M%S%f')}.mp4"
    try:
        cmd1: list[str] = [
            "ffmpeg",
            "-y",
            "-i",
            str(video_only),
        ]
        if use_logo:
            cmd1.extend(
                [
                    "-loop",
                    "1",
                    "-framerate",
                    "30",
                    "-t",
                    f"{d_tot:.6f}",
                    "-i",
                    str(logo),
                ]
            )
        cmd1.extend(
            [
                "-filter_complex",
                fc_video,
                "-map",
                v_final,
                "-an",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-crf",
                "20",
                "-pix_fmt",
                "yuv420p",
                "-t",
                f"{d_tot:.6f}",
                str(tmp_v),
            ]
        )
        run(cmd1)

        # 음원: 최대 d_tot까지 사용 → 짧으면 묵음으로 맞춤 → 끝(d_tot) 기준 페이드아웃
        af_parts: list[str] = [
            f"atrim=start=0:end={d_tot:.6f}",
            f"apad=whole_dur={d_tot:.6f}",
        ]
        if fade >= 0.12:
            st_a = max(0.0, d_tot - fade)
            af_parts.append(f"afade=t=out:st={st_a:.6f}:d={fade:.6f}")

        cmd2: list[str] = [
            "ffmpeg",
            "-y",
            "-i",
            str(tmp_v),
            "-i",
            str(music),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
        ]
        if af_parts:
            cmd2.extend(["-af", ",".join(af_parts)])
        cmd2.extend(
            [
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-b:a",
                "192k",
                "-t",
                f"{d_tot:.6f}",
                str(out_path),
            ]
        )
        run(cmd2)
    finally:
        try:
            if tmp_v.is_file():
                tmp_v.unlink()
        except OSError:
            pass

    if tail > 1e-6:
        _log(f"끝 검은 화면 +{tail:.1f}s · 총 길이 {d_tot:.2f}s")
    if fade >= 0.12 and d_tot > fade:
        _log(f"오디오: 영상 끝 기준 약 {fade:.2f}s 페이드아웃 (총 {d_tot:.2f}s까지, 검은 tail 포함)")


def run_montage(
    music_path: Path,
    output_path: Path | None,
    *,
    videos_dir: Path | None = None,
    video_files: list[Path] | None = None,
    window_sec: float = 4.0,
    peak_band_start: float = 3.0,
    width: int = 1920,
    height: int = 850,
    content_height: int | None = None,
    output_preset_tag: str | None = None,
    audio_fade_out_sec: float = 5.0,
    clip_trim_start_sec: float = 0.5,
    letterbox_open_sec: float = 2.0,
    letterbox_close_sec: float = 2.0,
    letterbox_open_enabled: bool = True,
    letterbox_close_enabled: bool = True,
    tail_black_sec: float = 2.0,
    logo_path: Path | str | None = None,
    layout: str = "fullframe",
    auto_exposure_grade: bool = False,
    auto_exposure_mode_dark_lt: float = AUTO_EXPOSURE_MODE_DARK_LT,
    auto_exposure_mode_bright_ge: float = AUTO_EXPOSURE_MODE_BRIGHT_GE,
    auto_exposure_strength: float = 1.0,
    auto_exposure_strength_by_clip: dict[str, float] | None = None,
    auto_wb_grade: bool = False,
    auto_wb_strength: float = 1.0,
    auto_wb_strength_by_clip: dict[str, float] | None = None,
    auto_wb_spot_mul_by_clip: dict[str, object] | None = None,
    auto_ct_grade: bool = False,
    auto_ct_kelvin: float = MONTAGE_CT_NEUTRAL_K,
    auto_ct_kelvin_by_clip: dict[str, float] | None = None,
    manual_clip_grade_by_clip: dict[str, dict] | None = None,
    log: Callable[[str], None] = print,
) -> Path:
    msg = check_ffmpeg()
    if msg:
        raise RuntimeError(msg)

    videos = resolve_videos(videos_dir, video_files)
    n_in = len(videos)
    videos = drop_videos_too_short(videos, log=log)
    if not videos:
        raise ValueError(
            f"몽타주에 쓸 영상이 없습니다. 길이가 {MIN_MONTAGE_VIDEO_DURATION_SEC}초보다 긴 클립이 필요합니다 "
            f"(2초 이하는 자동 제외, 길이 확인 실패 파일도 제외)."
        )
    if len(videos) < n_in:
        log(f"→ 실제 사용 클립 {len(videos)}개 (2초 이하·길이 미확인 {n_in - len(videos)}개 제외)")

    layout_norm = (layout or "fullframe").strip().lower()
    pad_mux = False
    if layout_norm == "tri_stack":
        out_w, out_h = TRI_STACK_W, TRI_STACK_H
        n_drop = len(videos) % 3
        if n_drop:
            log(f"3컷 세로: 맨 뒤 {n_drop}개는 3개 미만 분이라 제외했습니다.")
        videos = videos[: len(videos) // 3 * 3]
        if not videos:
            raise ValueError("3컷 세로 모드는 영상이 3개 이상(3개 단위로 사용) 필요합니다.")
        log(
            f"3컷 세로: {len(videos)}개 → {len(videos) // 3}구간 (각 구간 위·중·아래 동시, 칸 {TRI_STACK_CELL_W}×{TRI_STACK_CELL_H})"
        )
    else:
        out_w, out_h = int(width), int(height)
        seg_w, seg_h = out_w, out_h
        if content_height is not None:
            try:
                ch = int(content_height)
            except (TypeError, ValueError):
                ch = 0
            ch = max(0, ch)
            if 0 < ch < out_h:
                seg_h = ch
                pad_mux = True
                log(
                    f"출력 {out_w}×{out_h}: 클립·합본은 {seg_w}×{seg_h}, "
                    f"최종 합성에서 상·하 검은 레터박스로 {out_w}×{out_h}로 맞춥니다."
                )
    music_src = music_path.resolve()
    music_file = resolve_music_file(music_path)
    if output_path is None:
        tag = ""
        if output_preset_tag and str(output_preset_tag).strip():
            tag = sanitize_output_filename_tag(str(output_preset_tag))
        if not tag:
            tag = montage_output_tag_from_preset(
                {"layout": layout_norm, "w": out_w, "h": out_h, "label": ""}
            )
        out = infer_output_path(videos, videos_dir, preset_tag=tag)
        log(f"출력(자동, 영상 폴더): {out}")
    else:
        out = Path(output_path).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    pb = float(peak_band_start)
    if pb < 0:
        pb = 0.0
    if pb >= window_sec:
        pb = max(0.0, window_sec - 0.1)
        log(f"피크 탐색 시작을 창 길이에 맞게 {pb:.2f}초로 조정했습니다.")

    log(f"영상 {len(videos)}개")
    if music_src.is_dir():
        log(f"음악(폴더에서 무작위): {music_file.name}")
    else:
        log(f"음악: {music_file.name}")

    with tempfile.TemporaryDirectory(prefix="montage_") as tmp:
        tmp = Path(tmp)
        wav = tmp / "music_mono.wav"
        extract_mono_wav(music_file, wav)
        y, sr = librosa.load(wav, sr=None, mono=True)
        log(f"음악 길이(분석): {len(y) / sr:.2f}초")
        log(
            f"컷 규칙: {window_sec}초 창마다, 창 시작 +{pb:.2f}초 ~ 창 끝 구간에서 RMS 최대 지점에 맞춤"
        )
        n_units = len(videos) // 3 if layout_norm == "tri_stack" else len(videos)
        cuts = compute_cut_times(
            y,
            sr,
            n_units,
            window_sec=window_sec,
            min_seg=0.4,
            peak_band_start=pb,
        )
        log("컷 시각(초): " + ", ".join(f"{c:.2f}" for c in cuts))
        durs = [cuts[i + 1] - cuts[i] for i in range(n_units)]
        if layout_norm == "tri_stack":
            log("각 3컷 구간 길이(초): " + ", ".join(f"{d:.2f}" for d in durs))
        else:
            log("각 클립 길이(초): " + ", ".join(f"{d:.2f}" for d in durs))

        want_trim = max(0.0, float(clip_trim_start_sec))
        if want_trim > 1e-6:
            log(f"각 클립 앞 {want_trim:.2f}초 건너뛴 뒤 사용(원본이 짧으면 자동으로 줄임)")

        grade_on = bool(auto_exposure_grade)
        wb_on = bool(auto_wb_grade)
        ct_on = bool(auto_ct_grade)
        ct_default_k = clamp_color_temperature_k(float(auto_ct_kelvin))
        sm_wb = clamp_auto_wb_strength(auto_wb_strength)
        grade_lo, grade_hi = clamp_auto_exposure_mode_thresholds(
            auto_exposure_mode_dark_lt, auto_exposure_mode_bright_ge
        )
        grade_sm = clamp_auto_exposure_strength(auto_exposure_strength)
        by_clip_raw = auto_exposure_strength_by_clip or {}
        if grade_on:
            n_ov = len(by_clip_raw)
            if n_ov:
                log(
                    f"자동 노출·선명도: 최빈 밝기 < {grade_lo:.0f}% 또는 ≥ {grade_hi:.0f}% 인 클립만 FFmpeg exposure "
                    f"(기본 강도 {grade_sm*100:.0f}%, {n_ov}개 클립은 개별 강도), 모든 클립에 약한 unsharp(선명도 +10% 느낌)"
                )
            else:
                log(
                    f"자동 노출·선명도: 최빈 밝기 < {grade_lo:.0f}% 또는 ≥ {grade_hi:.0f}% 인 클립만 "
                    f"FFmpeg exposure(강도 {grade_sm*100:.0f}%), 모든 클립에 약한 unsharp(선명도 +10% 느낌)"
                )
        by_wb_raw = auto_wb_strength_by_clip or {}
        by_spot_raw: dict[str, tuple[float, float, float]] = {}
        for sk, sv in (auto_wb_spot_mul_by_clip or {}).items():
            if not isinstance(sv, (list, tuple)) or len(sv) != 3:
                continue
            try:
                rr, gg, bb = float(sv[0]), float(sv[1]), float(sv[2])
            except (TypeError, ValueError):
                continue
            by_spot_raw[str(sk)] = (rr, gg, bb)

        by_manual_raw: dict[str, dict] = {}
        for sk, mv in (manual_clip_grade_by_clip or {}).items():
            if isinstance(mv, dict):
                by_manual_raw[str(sk)] = mv

        by_ct_raw = auto_ct_kelvin_by_clip or {}

        def _manual_vf_for(vp: Path) -> str | None:
            d = _grade_map_lookup(by_manual_raw, vp)
            return montage_manual_clip_grade_vf(d) if isinstance(d, dict) else None

        def _parse_spot_tuple(obj: object) -> tuple[float, float, float] | None:
            if not isinstance(obj, (list, tuple)) or len(obj) != 3:
                return None
            try:
                return (float(obj[0]), float(obj[1]), float(obj[2]))
            except (TypeError, ValueError):
                return None

        def _spot_mul_for(vp: Path) -> tuple[float, float, float] | None:
            raw = _grade_map_lookup(by_spot_raw, vp)
            t = _parse_spot_tuple(raw) if raw is not None else None
            if t is None:
                md = _grade_map_lookup(by_manual_raw, vp)
                if isinstance(md, dict):
                    t = _parse_spot_tuple(md.get("spot_mul"))
            if t is None:
                return None
            rr, gg, bb = t
            if abs(rr - 1.0) < 0.002 and abs(gg - 1.0) < 0.002 and abs(bb - 1.0) < 0.002:
                return None
            return t

        spot_grade_on = any(
            _spot_mul_for(vp) is not None for vp in videos
        )

        manual_grade_on = any(_manual_vf_for(vp) is not None for vp in videos)
        if manual_grade_on:
            log(
                "수동 보정: 클립별 JSON의 색조·톤(curves)·대비·채도·생동감·디헤이즈·텍스처·클래리티를 "
                "자동 노출/색온도/스포이드 뒤에 FFmpeg 필터로 이어 붙입니다."
            )

        def _log_wb_summary() -> None:
            if not wb_on or sm_wb <= 1e-6:
                return
            n_ov = len(by_wb_raw)
            if n_ov:
                log(
                    f"자동 화이트밸런스: FFmpeg grayworld (기본 {sm_wb*100:.0f}%, "
                    f"{n_ov}개 클립은 개별 강도), 강도 0% 클립은 생략"
                )
            else:
                log(
                    f"자동 화이트밸런스: FFmpeg grayworld (기본 {sm_wb*100:.0f}%, 원본과 블렌드)"
                )

        _log_wb_summary()

        def _log_ct_summary() -> None:
            if not ct_on:
                return
            n_ov = len(by_ct_raw)
            if n_ov:
                log(
                    f"색온도: FFmpeg colortemperature (기본 {ct_default_k:.0f}K, "
                    f"{n_ov}개 클립 개별 K), 6500K 근처 클립은 생략"
                )
            else:
                log(f"색온도: FFmpeg colortemperature (기본 {ct_default_k:.0f}K, 6500K≈중립 생략)")

        _log_ct_summary()

        def _ct_k_explicit(vp: Path) -> float | None:
            v = _grade_map_lookup(by_ct_raw, vp)
            if v is not None:
                try:
                    return clamp_color_temperature_k(float(v))
                except (TypeError, ValueError):
                    pass
            md = _grade_map_lookup(by_manual_raw, vp)
            if isinstance(md, dict) and "ct_k" in md:
                try:
                    return clamp_color_temperature_k(float(md["ct_k"]))
                except (TypeError, ValueError):
                    return None
            return None

        def _ct_k_for(vp: Path) -> float:
            ex = _ct_k_explicit(vp)
            if ex is not None:
                return ex
            return ct_default_k

        def _ct_enabled_for(vp: Path) -> bool:
            if ct_on:
                return True
            ex = _ct_k_explicit(vp)
            if ex is None:
                return False
            return montage_colortemperature_vf(ex) is not None

        def _strength_for(vp: Path) -> float:
            v = _grade_map_lookup(by_clip_raw, vp)
            if v is None:
                return grade_sm
            return clamp_auto_exposure_strength(float(v))

        def _wb_strength_for(vp: Path) -> float:
            v = _grade_map_lookup(by_wb_raw, vp)
            if v is None:
                return sm_wb
            return clamp_auto_wb_strength(float(v))

        def _clip_grade_vf(vp: Path, trim_eff: float, avail: float) -> str | None:
            wbs = _wb_strength_for(vp) if wb_on else 0.0
            ctk = _ct_k_for(vp)
            ct_eff = _ct_enabled_for(vp)
            spot = _spot_mul_for(vp)
            man_v = _manual_vf_for(vp)
            use_log = log if (
                grade_on or wb_on or ct_eff or spot is not None or man_v
            ) else None
            auto = montage_auto_grade_vf_prefix(
                vp,
                trim_eff,
                avail,
                enabled=grade_on,
                mode_dark_lt=grade_lo,
                mode_bright_ge=grade_hi,
                exposure_strength=_strength_for(vp),
                wb_enabled=wb_on,
                wb_strength=wbs,
                ct_enabled=ct_eff,
                ct_kelvin=ctk,
                wb_spot_mul=spot,
                log=use_log,
            )
            parts = [x for x in (auto, man_v) if x]
            return ",".join(parts) if parts else None

        per_clip_ct_spot = spot_grade_on
        if not per_clip_ct_spot:
            for vp in videos:
                ex = _ct_k_explicit(vp)
                if ex is not None and montage_colortemperature_vf(ex) is not None:
                    per_clip_ct_spot = True
                    break

        if layout_norm == "tri_stack":
            w, h = out_w, out_h
        else:
            w, h = seg_w, seg_h
        segs: list[Path] = []

        def _trim_and_avail(vp: Path, d: float, clip_idx: int) -> tuple[float, float]:
            try:
                vdur = ffprobe_duration(vp)
            except (subprocess.CalledProcessError, ValueError, RuntimeError, OSError):
                vdur = d
            trim_eff = want_trim
            if trim_eff > 1e-6:
                if vdur <= trim_eff + 0.06:
                    trim_eff = max(0.0, vdur - 0.08)
                    if trim_eff < want_trim - 1e-6:
                        log(
                            f"  [{clip_idx}] {vp.name}: 길이 {vdur:.2f}s 로 앞 {want_trim:.2f}s 생략 불가 → "
                            f"{trim_eff:.2f}s 만큼만 건너뜀"
                        )
                avail = max(0.0, vdur - trim_eff)
            else:
                avail = vdur
            return trim_eff, avail

        if layout_norm == "tri_stack":
            cw, ch = TRI_STACK_CELL_W, TRI_STACK_CELL_H
            for g in range(n_units):
                triple = (videos[3 * g], videos[3 * g + 1], videos[3 * g + 2])
                d = durs[g]
                trims: list[float] = []
                avails: list[float] = []
                for k, vp in enumerate(triple):
                    teff, av = _trim_and_avail(vp, d, 3 * g + k + 1)
                    trims.append(teff)
                    avails.append(av)
                per_cap = [min(d, max(av, 0.02)) for av in avails]
                use_d = min(per_cap)
                if use_d < d - 1e-3:
                    log(
                        f"  [구간 {g + 1}: 3컷] 음악 구간 {d:.2f}s → 세로 중 짧은 쪽에 맞춰 {use_d:.2f}s"
                    )
                seg = tmp / f"seg_{g:04d}.mp4"
                vpt: tuple[str | None, str | None, str | None] | None = None
                if (
                    grade_on
                    or wb_on
                    or ct_on
                    or spot_grade_on
                    or manual_grade_on
                    or per_clip_ct_spot
                ):
                    vpt = (
                        _clip_grade_vf(triple[0], trims[0], avails[0]),
                        _clip_grade_vf(triple[1], trims[1], avails[1]),
                        _clip_grade_vf(triple[2], trims[2], avails[2]),
                    )
                build_tri_stack_segment(
                    triple[0],
                    triple[1],
                    triple[2],
                    use_d,
                    seg,
                    cell_w=cw,
                    cell_h=ch,
                    vf_prefix=None,
                    vf_prefix_per_input=vpt,
                    trim_start_sec=(trims[0], trims[1], trims[2]),
                )
                segs.append(seg)
        else:
            for i, (vp, d) in enumerate(zip(videos, durs)):
                trim_eff, avail = _trim_and_avail(vp, d, i + 1)
                use_d = min(d, max(avail, 0.02))
                if use_d < d - 1e-3:
                    log(f"  [{i + 1}] {vp.name}: 원본이 짧아 {d:.2f}s → {use_d:.2f}s 로 사용")
                seg = tmp / f"seg_{i:04d}.mp4"
                gv = (
                    _clip_grade_vf(vp, trim_eff, avail)
                    if (
                        grade_on
                        or wb_on
                        or ct_on
                        or spot_grade_on
                        or manual_grade_on
                        or per_clip_ct_spot
                    )
                    else None
                )
                build_segment(vp, use_d, seg, w, h, vf_prefix=gv, trim_start_sec=trim_eff)
                segs.append(seg)

        vconcat = tmp / "video_only.mp4"
        concat_segments(segs, vconcat)
        vlen = ffprobe_duration(vconcat)
        af = max(0.0, float(audio_fade_out_sec))
        lo_raw = max(0.0, float(letterbox_open_sec))
        lc_raw = max(0.0, float(letterbox_close_sec))
        lo = lo_raw if letterbox_open_enabled else 0.0
        lc = lc_raw if letterbox_close_enabled else 0.0
        lb_on = lo > 0 or lc > 0
        logo_resolved: Path | None = None
        if logo_path is not None and str(logo_path).strip():
            lp_try = Path(logo_path).expanduser()
            try:
                lp_abs = lp_try.resolve()
                if lp_abs.is_file():
                    logo_resolved = lp_abs
                else:
                    log(f"로고: 파일 없음 — 생략 ({logo_path})")
            except OSError:
                log(f"로고: 경로 오류 — 생략 ({logo_path})")
        tb = max(0.0, float(tail_black_sec))
        mux_final_output(
            vconcat,
            music_file,
            out,
            content_duration=vlen,
            width=out_w,
            height=out_h,
            pad_input_to_output=pad_mux,
            audio_fade_out_sec=af,
            letterbox_enabled=lb_on,
            letterbox_open_sec=lo,
            letterbox_close_sec=lc,
            tail_black_sec=tb,
            logo_path=logo_resolved,
            log=log,
        )

    log(f"완료: {out}")
    return out
