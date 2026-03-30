"""영상 중간 프레임 JPG 캐시 + Pillow 기반 등급 미리보기(FFmpeg 미리보기 대체)."""

from __future__ import annotations

import hashlib
import shutil
import subprocess
from collections.abc import Callable
from pathlib import Path

from montage_lib import (
    MONTAGE_CT_K_MAX,
    MONTAGE_CT_K_MIN,
    MONTAGE_CT_NEUTRAL_K,
    ffprobe_duration,
)


def preview_frame_cache_dir() -> Path:
    d = Path.home() / ".music_montage_preview_frames"
    d.mkdir(parents=True, exist_ok=True)
    return d


def cache_jpg_path_for_video(video: Path, cache_dir: Path | None = None) -> Path:
    cache_dir = cache_dir or preview_frame_cache_dir()
    try:
        st = video.stat()
        raw = f"{video.resolve()}|{st.st_size}|{int(st.st_mtime_ns)}".encode(
            "utf-8", errors="replace"
        )
    except OSError:
        raw = str(video).encode("utf-8", errors="replace")
    key = hashlib.sha256(raw).hexdigest()[:28]
    return cache_dir / f"{key}.jpg"


def extract_mid_frame_jpg(
    video: Path,
    dest: Path,
    *,
    timeout: float = 180.0,
    log_fail: Callable[[str], None] | None = None,
) -> bool:
    """FFmpeg으로 영상 길이의 약 중간에서 고화질 JPG 1장 추출."""
    tmp: Path | None = None
    try:
        if not video.is_file():
            if log_fail:
                log_fail(f"파일 없음 또는 접근 불가: {video}")
            return False
        ff = shutil.which("ffmpeg")
        if not ff:
            if log_fail:
                log_fail("ffmpeg 가 PATH에 없습니다. 터미널에서 `which ffmpeg` 로 확인하세요.")
            return False
        dur = max(0.1, float(ffprobe_duration(video)))
        mid = max(0.0, dur * 0.5 - 0.04)
        dest.parent.mkdir(parents=True, exist_ok=True)
        tmp = dest.with_suffix(".part.jpg")
        cp = subprocess.run(
            [
                ff,
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{mid:.4f}",
                "-i",
                str(video),
                "-frames:v",
                "1",
                "-q:v",
                "2",
                "-y",
                str(tmp),
            ],
            capture_output=True,
            timeout=timeout,
        )
        if cp.returncode != 0 or not tmp.is_file():
            err = (cp.stderr or b"").decode("utf-8", errors="replace").strip()
            if log_fail:
                log_fail(
                    f"ffmpeg 종료 {cp.returncode}: {err[:1800]}"
                    if err
                    else f"ffmpeg 종료 {cp.returncode} (stderr 비어 있음)"
                )
            tmp.unlink(missing_ok=True)
            return False
        tmp.replace(dest)
        return True
    except (OSError, subprocess.TimeoutExpired, ValueError, RuntimeError) as ex:
        if log_fail:
            log_fail(f"{type(ex).__name__}: {ex}")
        if tmp is not None:
            try:
                tmp.unlink(missing_ok=True)
            except OSError:
                pass
        return False


def _resample():
    from PIL import Image

    try:
        return Image.Resampling.LANCZOS
    except AttributeError:
        return Image.LANCZOS  # type: ignore[attr-defined]


def cover_display_xy_to_base_xy(
    dx: int,
    dy: int,
    base_w: int,
    base_h: int,
    disp_w: int,
    disp_h: int,
) -> tuple[int, int]:
    """
    pil_cover_resize(원본, disp_w, disp_h) 결과에서의 화면 좌표 (dx,dy) →
    cover 적용 전(같은 비율) 원본 픽셀 인덱스.
    """
    w, h = max(1, int(base_w)), max(1, int(base_h))
    tw, th = max(1, int(disp_w)), max(1, int(disp_h))
    scale = max(tw / w, th / h)
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    left = max(0, (nw - tw) // 2)
    top = max(0, (nh - th) // 2)
    cx = left + int(dx)
    cy = top + int(dy)
    ox = int(cx * w / nw)
    oy = int(cy * h / nh)
    ox = max(0, min(w - 1, ox))
    oy = max(0, min(h - 1, oy))
    return ox, oy


def suggested_kelvin_from_rgb_sample(r: int, g: int, b: int) -> int:
    """
    스포이드로 찍은 RGB를 FFmpeg colortemperature K로 옮길 때 쓸 근사값.
    주황(웜) 쪽이면 K를 올리고, 푸른(쿨) 쪽이면 K를 내림(6500 근처가 중립).
    """
    rf = max(0.0, min(255.0, float(r))) / 255.0
    gf = max(0.0, min(255.0, float(g))) / 255.0
    bf = max(0.0, min(255.0, float(b))) / 255.0
    mx, mn = max(rf, gf, bf), min(rf, gf, bf)
    if mx - mn > 0.38:
        return 6500
    warm = (rf + gf) * 0.5 - bf
    k = 6500.0 + warm * 9000.0
    return int(max(3000, min(10000, round(k))))


def suggested_tint_from_rgb_sample(r: int, g: int, b: int) -> int:
    """
    초록 ↔ 마젠타 축을 tint_pct(-100~100)로 근사. montage_lib의 colorbalance gm과 동일 부호:
    양수 → 녹색 보강(마젠타 캐스트 보정), 음수 → 마젠타 쪽(녹색 캐스트 보정).
    """
    rr = float(r)
    gg = float(g)
    bb = float(b)
    if rr + gg + bb < 24.0:
        return 0
    mid_rb = 0.5 * (max(1.0, rr) + max(1.0, bb))
    ratio = max(1.0, gg) / mid_rb
    # 중립(회색): ratio ≈ 1 → 0. 마젠타 캐스트(g 낮음): ratio<1 → 양의 tint.
    span = 1.0 - ratio
    t = int(round(100.0 * max(-1.0, min(1.0, span * 1.65))))
    return max(-100, min(100, t))


def neutral_point_wb_multipliers(r: int, g: int, b: int) -> tuple[float, float, float]:
    """
    클릭한 색이 중립 회색이라 가정할 때의 R/G/B 채널 배율(라이트룸 스포이드에 가깝게).
    (R+G+B)/3 이 각 채널이 되도록 맞춤.
    """
    rf, gf, bf = float(r), float(g), float(b)
    avg = (rf + gf + bf) / 3.0
    if avg < 8.0:
        return (1.0, 1.0, 1.0)
    rr = avg / max(rf, 1.0)
    gg = avg / max(gf, 1.0)
    bb = avg / max(bf, 1.0)
    lo, hi = 0.35, 2.8
    return (
        max(lo, min(hi, rr)),
        max(lo, min(hi, gg)),
        max(lo, min(hi, bb)),
    )


def apply_rgb_channel_mul_pil(im, rr: float, gg: float, bb: float):
    """각 채널에 곱(스포이드 WB)."""
    from PIL import Image

    if (
        abs(rr - 1.0) < 1e-5
        and abs(gg - 1.0) < 1e-5
        and abs(bb - 1.0) < 1e-5
    ):
        return im
    r, g, b = im.convert("RGB").split()
    r = r.point(lambda i, m=rr: min(255, int(round(i * m))))
    g = g.point(lambda i, m=gg: min(255, int(round(i * m))))
    b = b.point(lambda i, m=bb: min(255, int(round(i * m))))
    return Image.merge("RGB", (r, g, b))


def pil_cover_resize(im, out_w: int, out_h: int):
    """비율 유지 후 중앙 크롭(cover)."""
    from PIL import Image

    tw = max(32, int(out_w))
    th = max(32, int(out_h))
    w, h = im.size
    if w <= 0 or h <= 0:
        return im
    scale = max(tw / w, th / h)
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    im = im.resize((nw, nh), _resample())
    left = max(0, (nw - tw) // 2)
    top = max(0, (nh - th) // 2)
    return im.crop((left, top, left + tw, top + th))


# 노출 % 상한 (100=기존과 동일 감도, 101~200=더 밝게)
GRADE_EXPOSURE_PCT_MAX = 200

# 웹·JSON 확장 슬라이더 (몽타주 GUI는 미리보기·사이드카에만 반영; FFmpeg는 노출·색온도·스포이드 중심)
GRADE_WEB_EXTRA_KEYS: tuple[str, ...] = (
    "tint_pct",
    "hue_pct",
    "contrast_pct",
    "saturation_pct",
    "highlights_pct",
    "shadows_pct",
    "whites_pct",
    "blacks_pct",
    "texture_pct",
    "clarity_pct",
    "dehaze_pct",
    "vibrance_pct",
    "wb_pct",
)


def _smoothstep01(t: float) -> float:
    t = max(0.0, min(1.0, float(t)))
    return t * t * (3.0 - 2.0 * t)


def _build_tone_lut(
    highlights_pct: int,
    shadows_pct: int,
    whites_pct: int,
    blacks_pct: int,
) -> list[int]:
    """각 값 -100..100, 0=변화 없음. RGB 공통 LUT(빠른 미리보기용)."""
    hi = max(-100, min(100, int(highlights_pct)))
    sh = max(-100, min(100, int(shadows_pct)))
    wh = max(-100, min(100, int(whites_pct)))
    bk = max(-100, min(100, int(blacks_pct)))
    lut: list[int] = []
    for i in range(256):
        x = i / 255.0
        if sh != 0:
            wgt = _smoothstep01(max(0.0, 1.0 - x * 1.35))
            x = min(1.0, max(0.0, x + (sh / 100.0) * 0.28 * wgt))
        if hi != 0:
            wgt = _smoothstep01(max(0.0, (x - 0.42) * 1.8))
            x = min(1.0, max(0.0, x + (hi / 100.0) * 0.22 * wgt))
        if wh != 0:
            wgt = _smoothstep01(max(0.0, (x - 0.72) * 3.5))
            x = min(1.0, max(0.0, x + (wh / 100.0) * 0.2 * wgt))
        if bk != 0:
            wgt = _smoothstep01(max(0.0, 1.0 - x * 1.12))
            x = min(1.0, max(0.0, x + (bk / 100.0) * 0.18 * wgt))
        lut.append(int(max(0, min(255, round(x * 255)))))
    return lut


def _apply_lut_rgb_triple(im: "Image.Image", lut: list[int]) -> "Image.Image":
    from PIL import Image

    r, g, b = im.split()
    r = r.point(lut)
    g = g.point(lut)
    b = b.point(lut)
    return Image.merge("RGB", (r, g, b))


def _apply_hue_shift_deg_pil(im: "Image.Image", hue_pct: int) -> "Image.Image":
    """HSV 색상환 회전(±100 → 약 ±45°). numpy 없으면 생략."""
    hp = max(-100, min(100, int(hue_pct)))
    if abs(hp) < 1:
        return im
    try:
        import numpy as np
    except ImportError:
        return im
    from PIL import Image

    deg = (hp / 100.0) * 45.0
    rgb = np.asarray(im.convert("RGB"), dtype=np.float32) / 255.0
    r = rgb[..., 0]
    g = rgb[..., 1]
    b = rgb[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    delt = maxc - minc
    eps = 1e-8
    mask = delt > eps
    h = np.zeros_like(maxc)
    h = np.where(
        mask & (maxc == r),
        np.mod((g - b) / (delt + eps), 6.0),
        h,
    )
    h = np.where(mask & (maxc == g), (b - r) / (delt + eps) + 2.0, h)
    h = np.where(mask & (maxc == b), (r - g) / (delt + eps) + 4.0, h)
    h = np.where(mask, h / 6.0, 0.0)
    s = np.where(maxc > eps, delt / (maxc + eps), 0.0)
    v = maxc
    h = np.mod(h + deg / 360.0, 1.0)
    i = np.floor(h * 6.0).astype(np.int32)
    i = np.clip(i, 0, 5)
    f = h * 6.0 - i.astype(np.float32)
    p = v * (1.0 - s)
    q = v * (1.0 - f * s)
    t = v * (1.0 - (1.0 - f) * s)
    rf = np.choose(
        i,
        [v, q, p, p, t, v],
        mode="clip",
    )
    gf = np.choose(
        i,
        [t, v, v, q, p, p],
        mode="clip",
    )
    bf = np.choose(
        i,
        [p, p, t, v, v, q],
        mode="clip",
    )
    out = np.stack([rf, gf, bf], axis=-1)
    out = np.clip(out * 255.0, 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def _apply_tint_pil(im: "Image.Image", tint_pct: int) -> "Image.Image":
    """색조: +면 녹색 보강(FFmpeg colorbalance gm>0와 동일), -면 마젠타 쪽. -100..100."""
    from PIL import Image

    t = max(-100, min(100, int(tint_pct))) / 100.0
    if abs(t) < 0.002:
        return im
    g_mul = 1.0 + t * 0.26
    r_mul = 1.0 - t * 0.10
    b_mul = 1.0 - t * 0.10
    r, g, b = im.split()
    r = r.point(lambda i, m=r_mul: min(255, int(round(i * m))))
    g = g.point(lambda i, m=g_mul: min(255, int(round(i * m))))
    b = b.point(lambda i, m=b_mul: min(255, int(round(i * m))))
    return Image.merge("RGB", (r, g, b))


def normalize_clip_grade(
    raw: dict | None,
    *,
    neutral_k: float = MONTAGE_CT_NEUTRAL_K,
    exposure_max: int = GRADE_EXPOSURE_PCT_MAX,
    ct_min: int = MONTAGE_CT_K_MIN,
    ct_max: int = MONTAGE_CT_K_MAX,
) -> dict[str, object]:
    """클립 등급 dict를 기본값·범위로 정규화(웹·GUI·저장 공통)."""
    g = raw if isinstance(raw, dict) else {}

    def _i(key: str, default: int, lo: int | None = None, hi: int | None = None) -> int:
        try:
            v = int(g.get(key, default))
        except (TypeError, ValueError):
            v = default
        if lo is not None:
            v = max(lo, v)
        if hi is not None:
            v = min(hi, v)
        return v

    e = _i("exposure_pct", 100, 0, exposure_max)
    ct = _i("ct_k", int(neutral_k), ct_min, ct_max)
    sm = g.get("spot_mul")
    if isinstance(sm, (list, tuple)) and len(sm) == 3:
        try:
            spot: list[float] = [float(sm[0]), float(sm[1]), float(sm[2])]
        except (TypeError, ValueError):
            spot = [1.0, 1.0, 1.0]
    else:
        spot = [1.0, 1.0, 1.0]
    return {
        "exposure_pct": e,
        "ct_k": ct,
        "spot_mul": spot,
        "wb_pct": _i("wb_pct", 0, 0, 100),
        "tint_pct": _i("tint_pct", 0, -100, 100),
        "hue_pct": _i("hue_pct", 0, -100, 100),
        "contrast_pct": _i("contrast_pct", 100, 0, 200),
        "saturation_pct": _i("saturation_pct", 100, 0, 200),
        "highlights_pct": _i("highlights_pct", 0, -100, 100),
        "shadows_pct": _i("shadows_pct", 0, -100, 100),
        "whites_pct": _i("whites_pct", 0, -100, 100),
        "blacks_pct": _i("blacks_pct", 0, -100, 100),
        "texture_pct": _i("texture_pct", 0, -100, 100),
        "clarity_pct": _i("clarity_pct", 0, -100, 100),
        "dehaze_pct": _i("dehaze_pct", 0, -100, 100),
        "vibrance_pct": _i("vibrance_pct", 0, -100, 100),
    }


def apply_grade_preview_pil(
    im,
    *,
    exposure_pct: int,
    wb_pct: int,
    ct_k: int,
    neutral_k: float = MONTAGE_CT_NEUTRAL_K,
    wb_spot_mul: tuple[float, float, float] | None = None,
    tint_pct: int = 0,
    hue_pct: int = 0,
    contrast_pct: int = 100,
    saturation_pct: int = 100,
    highlights_pct: int = 0,
    shadows_pct: int = 0,
    whites_pct: int = 0,
    blacks_pct: int = 0,
    texture_pct: int = 0,
    clarity_pct: int = 0,
    dehaze_pct: int = 0,
    vibrance_pct: int = 0,
) -> "Image.Image":
    """
    FFmpeg와 1:1은 아니지만, 슬라이더/스핀 조절 시 빠른 시각 피드백용.
    exposure_pct 0이면 밝기 보정 생략, 1~100은 예전 곡선, 101~200은 추가로 밝게.
    wb_pct>0 이고 saturation_pct==100 이면 구버전 채도 곡선(호환).
    """
    from PIL import Image, ImageEnhance, ImageFilter

    out = im.convert("RGB").copy()
    if wb_spot_mul is not None:
        rr, gg, bb = wb_spot_mul
        out = apply_rgb_channel_mul_pil(out, rr, gg, bb)
    ck = float(ct_k)
    if abs(ck - neutral_k) >= 1.0:
        d = (ck - neutral_k) / max(neutral_k, 1.0)
        d = max(-1.0, min(1.0, d * 2.2))
        r, g, b = out.split()
        rm = 1.0 + 0.18 * max(0.0, -d)
        bm = 1.0 + 0.18 * max(0.0, d)
        gm = 1.0 - 0.06 * abs(d)
        r = r.point(lambda i, m=rm: min(255, int(round(i * m))))
        g = g.point(lambda i, m=gm: min(255, int(round(i * m))))
        b = b.point(lambda i, m=bm: min(255, int(round(i * m))))
        out = Image.merge("RGB", (r, g, b))
    out = _apply_tint_pil(out, tint_pct)
    out = _apply_hue_shift_deg_pil(out, hue_pct)
    e = max(0, min(GRADE_EXPOSURE_PCT_MAX, int(exposure_pct)))
    if e > 0:
        if e <= 100:
            fac = 0.5 + 0.0055 * float(e)
        else:
            fac = 1.05 + 0.011 * float(e - 100)
        out = ImageEnhance.Brightness(out).enhance(min(2.35, max(0.28, fac)))
    cp = max(0, min(200, int(contrast_pct)))
    if abs(cp - 100) >= 1:
        fac = 1.0 + (cp - 100) / 100.0 * 0.65
        out = ImageEnhance.Contrast(out).enhance(max(0.35, min(1.9, fac)))
    if any(
        int(x) != 0
        for x in (highlights_pct, shadows_pct, whites_pct, blacks_pct)
    ):
        lut = _build_tone_lut(highlights_pct, shadows_pct, whites_pct, blacks_pct)
        out = _apply_lut_rgb_triple(out, lut)
    tex = max(-100, min(100, int(texture_pct)))
    if tex > 0:
        out = out.filter(
            ImageFilter.UnsharpMask(
                radius=0.55, percent=min(120, int(tex * 0.85)), threshold=0
            )
        )
    elif tex < 0:
        r = min(2.2, (-tex) / 55.0)
        try:
            out = out.filter(ImageFilter.GaussianBlur(radius=r))
        except Exception:
            out = out.filter(ImageFilter.BoxBlur(max(1, int(r))))
    dh = max(-100, min(100, int(dehaze_pct)))
    if dh > 0:
        out = ImageEnhance.Contrast(out).enhance(min(1.35, 1.0 + dh / 220.0))
        out = ImageEnhance.Color(out).enhance(min(1.25, 1.0 + dh / 320.0))
    elif dh < 0:
        out = ImageEnhance.Contrast(out).enhance(max(0.82, 1.0 + dh / 250.0))
    vib = max(-100, min(100, int(vibrance_pct)))
    if abs(vib) >= 1:
        fac = 1.0 + vib / 130.0
        out = ImageEnhance.Color(out).enhance(max(0.82, min(1.38, fac)))
    sat = max(0, min(200, int(saturation_pct)))
    wbp = max(0, min(100, int(wb_pct)))
    if abs(sat - 100) >= 1:
        fac = 1.0 + (sat - 100) / 100.0 * 0.58
        out = ImageEnhance.Color(out).enhance(max(0.32, min(1.68, fac)))
    elif wbp > 0:
        c = 0.88 + 0.0020 * float(wbp)
        out = ImageEnhance.Color(out).enhance(min(1.4, max(0.75, c)))
    clr = max(-100, min(100, int(clarity_pct)))
    if clr > 0:
        p = int(max(1, min(160, clr * 1.35)))
        out = out.filter(ImageFilter.UnsharpMask(radius=1.15, percent=p, threshold=2))
    elif clr < 0:
        r = min(2.4, (-clr) / 48.0)
        try:
            out = out.filter(ImageFilter.GaussianBlur(radius=r))
        except Exception:
            out = out.filter(ImageFilter.BoxBlur(max(1, int(r))))
    return out


def apply_clip_grade_pil(
    im: "Image.Image",
    grade: dict,
    *,
    neutral_k: float = MONTAGE_CT_NEUTRAL_K,
) -> "Image.Image":
    """normalize_clip_grade 결과 또는 부분 dict."""
    g = normalize_clip_grade(grade, neutral_k=neutral_k)
    sm = g["spot_mul"]
    if not isinstance(sm, (list, tuple)) or len(sm) != 3:
        spot_t: tuple[float, float, float] | None = None
    else:
        spot_t = (float(sm[0]), float(sm[1]), float(sm[2]))
        if all(abs(spot_t[i] - 1.0) < 1e-3 for i in range(3)):
            spot_t = None
    return apply_grade_preview_pil(
        im,
        exposure_pct=int(g["exposure_pct"]),
        wb_pct=int(g["wb_pct"]),
        ct_k=int(g["ct_k"]),
        neutral_k=float(neutral_k),
        wb_spot_mul=spot_t,
        tint_pct=int(g["tint_pct"]),
        hue_pct=int(g["hue_pct"]),
        contrast_pct=int(g["contrast_pct"]),
        saturation_pct=int(g["saturation_pct"]),
        highlights_pct=int(g["highlights_pct"]),
        shadows_pct=int(g["shadows_pct"]),
        whites_pct=int(g["whites_pct"]),
        blacks_pct=int(g["blacks_pct"]),
        texture_pct=int(g["texture_pct"]),
        clarity_pct=int(g["clarity_pct"]),
        dehaze_pct=int(g["dehaze_pct"]),
        vibrance_pct=int(g["vibrance_pct"]),
    )
