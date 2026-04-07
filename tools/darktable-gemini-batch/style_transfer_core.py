from __future__ import annotations

"""
참조 이미지 스타일 복제 — rawpy 현상 + OpenCV 톤·왜곡.

색 채널: RAW·참조는 rawpy / PIL 로 **RGB** 유지. OpenCV(BGR)는 ``cvtColor(RGB2BGR)``
직전에만 사용한다. ``cv2.imread`` 는 이 파이프라인에서 쓰지 않는다.

참조 **히스토그램 매칭**은 NumPy로 채널별 CDF(누적 분포)를 맞춘 뒤,
현상·게인 적용 **이후** ``match_histograms_channelwise`` 로 ``alpha`` 만큼 블렌드한다.
리사이즈만 OpenCV(``cv2.resize``)를 쓴다.
"""

import base64
import io
import json
import logging
import math
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Any

import numpy as np
import rawpy
from PIL import Image

# 웹 UI·/health 와 맞추려면 style-transfer-web.html 의 STYLE_TRANSFER_UI_BUILD(시:분) 도 함께 갱신
STYLE_TRANSFER_BUILD = "25:03"

_LOG = logging.getLogger(__name__)

# Inlog 인테리어 멀티에이전트 토론용 페르소나 (Gemini·Grok 공통 지시)
INLOG_INTERIOR_EXPERT_PERSONA_EN = (
    "You are an Inlog interior photography color specialist. "
    "Keep white walls fresh and airy without clipping highlights or losing wall texture. "
    "Prefer natural WB and restrained exposure for architectural interiors."
)
INLOG_INTERIOR_EXPERT_PERSONA_KO = (
    "당신은 Inlog 인테리어 사진 보정 전문가입니다. "
    "흰 벽의 화사함을 살리되 하이라이트가 날아가지 않도록(질감·디테일 유지) 노출과 WB를 다룹니다."
)

# Phase1 2단계: 1차(XMP+평균) 미리보기 후 Gemini가 수치 재제안 → 최종과 블렌드
PHASE1_GEMINI_REFINE_BLEND = 0.68

# xAI Grok — OpenAI 호환 Chat Completions (공식: POST https://api.x.ai/v1/chat/completions)
XAI_CHAT_COMPLETIONS_URL = "https://api.x.ai/v1/chat/completions"
# 모델 ID는 콘솔(https://console.x.ai/) 팀 설정에 따라 다를 수 있음. grok-2-latest 는 API에서 미지원인 경우가 많음.
DEFAULT_GROK_MODEL = "grok-2"
# 대안: 레거시/베타 계정에서는 "grok-beta" 를 입력해 보세요.

# Adobe Camera Raw / Lightroom Classic XMP (crs) 네임스페이스
CRS_NS = "http://ns.adobe.com/camera-raw-settings/1.0/"
RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#"
XMPMETA_NS = "adobe:ns:meta/"

PHASE1_VARIANT_COUNT = 1
PHASE1_VARIANT_KEYS = [f"{i:02d}" for i in range(1, PHASE1_VARIANT_COUNT + 1)]

GAIN_SAFETY_MIN = 0.5
GAIN_SAFETY_MAX = 2.0

# 참조 히스토그램 매칭 블렌드: 노출·WB 수치 정렬 후 톤 곡선을 참조에 더 가깝게
DEFAULT_HISTOGRAM_MATCH_ALPHA = 0.35

DEFAULT_LENS_K1 = -0.028
DEFAULT_LENS_K2 = 0.004

# Gemini 노출·밝기가 보수적으로 나올 때 전체적으로 밝게 (선형 스케일은 develop_raw_to_rgb 에서 적용)
EXPOSURE_EV_SCALE = 1.22
EXPOSURE_EV_BIAS = 0.38
EXPOSURE_EV_MAX = 5.5
BRIGHT_SCALE = 1.1
# LibRaw: 창 밖 하이라이트 살리기(블렌드). rawpy Params 는 highlight_mode 키만 받음(highlight 아님).
POST_HIGHLIGHT_MODE = rawpy.HighlightMode.Blend
POST_NO_AUTO_BRIGHT = True

# 켈빈 보정을 RGB에서 R/B만 건드림 (G는 건드리지 않음). LibRaw 후 미세 보정.
POST_KELVIN_RGB_ANCHOR_K = 5200.0
POST_KELVIN_RGB_STRENGTH = 0.12

# 초록 번짐 진단: 1.0 이면 비활성. 0.7 은 G 채널만 선형 감쇠.
POST_DEVELOP_GREEN_DIAG_SCALE = 0.7


def kelvin_to_rawpy_user_wb(kelvin: float) -> tuple[float, float, float, float]:
    """상관색온도(K)를 rawpy ``user_wb`` [R, G1, B, G2] 배율로 근사.

    G1·G2는 항상 1.0 유지(녹 채널 LibRaw 가중 이상 방지). 미세 톤은
    ``post_kelvin_rgb_rb_gains`` 가 R·B만 조정한다.
    """
    k = float(kelvin)
    k = max(2500.0, min(12000.0, k))
    t = k / 100.0
    if t <= 66:
        r = 255.0
        g = 99.4708025861 * math.log(t) - 161.1195681661
        g = max(0.0, min(255.0, g))
        if t <= 19:
            b = 0.0
        else:
            b = 138.5177312231 * math.log(t - 10) - 305.0447937307
            b = max(0.0, min(255.0, b))
    else:
        r = 329.698727446 * ((t - 60) ** -0.1332047592)
        g = 288.1221695283 * ((t - 60) ** -0.0755148492)
        b = 255.0
        r = max(0.0, min(255.0, r))
        g = max(0.0, min(255.0, g))
    r = max(r, 1e-3)
    g = max(g, 1e-3)
    b = max(b, 1e-3)
    mr = g / r
    mb = g / b
    mr = max(0.06, min(3.5, mr))
    mb = max(0.06, min(3.5, mb))
    return (mr, 1.0, mb, 1.0)


def post_kelvin_rgb_rb_gains(kelvin: float | None) -> tuple[float, float, float]:
    """sRGB 선형 공간에서 **R·B만** 조정. 켈빈↑ → 차갑게(R↓ B↑). G는 항상 1.0."""
    if kelvin is None:
        return (1.0, 1.0, 1.0)
    k = max(2500.0, min(12000.0, float(kelvin)))
    t = (k - POST_KELVIN_RGB_ANCHOR_K) / 3500.0
    t = max(-1.0, min(1.0, t))
    s = POST_KELVIN_RGB_STRENGTH
    r_mul = 1.0 - s * t
    b_mul = 1.0 + s * t
    r_mul = float(np.clip(r_mul, 0.82, 1.18))
    b_mul = float(np.clip(b_mul, 0.82, 1.18))
    return (r_mul, 1.0, b_mul)

RAW_EXTS = {
    ".arw",
    ".cr2",
    ".cr3",
    ".nef",
    ".nrw",
    ".raf",
    ".orf",
    ".rw2",
    ".pef",
    ".dng",
    ".raw",
}
REF_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}


def _ensure_rgb_uint8(image: np.ndarray) -> np.ndarray:
    """rawpy/LibRaw 출력을 항상 연속 메모리 uint8 RGB (H,W,3)로 정규화.

    float(0~1), float HDR, uint16 등에서 잘못 clip 만 하면 채널이 깨지거나
    형광색처럼 보일 수 있어 스케일을 명시적으로 맞춘다.
    """
    rgb = np.ascontiguousarray(np.copy(np.asarray(image)))
    if rgb.ndim != 3 or rgb.shape[2] != 3:
        raise ValueError(f"postprocess 결과 shape 오류(3채널 RGB 기대): {rgb.shape}")
    dt = rgb.dtype
    if dt == np.uint8:
        return rgb
    x = rgb.astype(np.float64, copy=False)
    if not np.isfinite(x).all():
        x = np.nan_to_num(x, nan=0.0, posinf=255.0, neginf=0.0)
    xmax = float(x.max()) if x.size else 0.0
    if dt == np.uint16:
        x = np.clip(x * (255.0 / 65535.0), 0.0, 255.0)
    elif dt in (np.float32, np.float64):
        if xmax <= 1.0 + 1e-5:
            x = np.clip(x * 255.0, 0.0, 255.0)
        elif xmax > 255.0:
            x = np.clip(x * (255.0 / max(xmax, 1e-9)), 0.0, 255.0)
        else:
            x = np.clip(x, 0.0, 255.0)
    else:
        x = np.clip(x, 0.0, 255.0)
    return np.rint(x).astype(np.uint8)


def postprocess_raw_to_rgb_u8(raw: rawpy.RawPy, **kwargs) -> np.ndarray:
    """``raw.postprocess`` 결과를 **RawPy가 열린 동안** 복사해 독립적인 uint8 RGB (H,W,3).

    LibRaw 출력 버퍼는 ``with raw`` 종료 후 무효일 수 있어 즉시 복사한다.
    ``output_color=sRGB`` 로 채널 의미를 고정한다. OpenCV BGR 연산 전에만
    ``COLOR_RGB2BGR`` 를 사용한다.
    """
    kw = dict(kwargs)
    if "output_color" not in kw:
        kw["output_color"] = rawpy.ColorSpace.sRGB
    arr = raw.postprocess(**kw)
    return _ensure_rgb_uint8(arr)


def is_skippable_sidecar_file(path: Path) -> bool:
    name = path.name
    if name.startswith("._"):
        return True
    if name == ".DS_Store" or name.upper() == "THUMBS.DB":
        return True
    return False


def collect_raw_files(folder: Path) -> list[Path]:
    out: list[Path] = []
    for p in sorted(folder.iterdir()):
        if (
            p.is_file()
            and p.suffix.lower() in RAW_EXTS
            and not is_skippable_sidecar_file(p)
        ):
            out.append(p)
    return out


def raw_preview_pil(path: Path, max_side: int) -> Image.Image:
    with rawpy.imread(str(path)) as raw:
        thumb = None
        try:
            thumb = raw.extract_thumb()
        except Exception:
            thumb = None
        if thumb is not None:
            if thumb.format == rawpy.ThumbFormat.JPEG:
                im = Image.open(io.BytesIO(thumb.data))
            elif thumb.format == rawpy.ThumbFormat.BITMAP:
                bm = np.ascontiguousarray(np.copy(np.asarray(thumb.data)))
                im = Image.fromarray(bm, mode="RGB")
            else:
                im = None
            if im is not None:
                im = im.convert("RGB")
                im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
                return im
        rgb = postprocess_raw_to_rgb_u8(
            raw,
            use_camera_wb=False,
            use_auto_wb=True,
            half_size=True,
            output_bps=8,
            no_auto_bright=POST_NO_AUTO_BRIGHT,
            highlight_mode=POST_HIGHLIGHT_MODE,
        )
    im = Image.fromarray(rgb, mode="RGB")
    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return im


def load_reference_pil(path: Path, max_side: int) -> Image.Image:
    """참조 이미지는 PIL RGB (OpenCV ``imread``/BGR 경로 없음)."""
    im = Image.open(path).convert("RGB")
    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return im


def open_reference_rgb_histogram_source(path: Path) -> Image.Image:
    """히스토그램 통계용: 썸네일 없이 RGB로 연 뒤, 호출 측에서 출력 (H,W)에 맞게 리사이즈."""
    return Image.open(path).convert("RGB")


def _crs_qname(local: str) -> str:
    return f"{{{CRS_NS}}}{local}"


def _rdf_qname(local: str) -> str:
    return f"{{{RDF_NS}}}{local}"


def _xmpmeta_qname(local: str) -> str:
    return f"{{{XMPMETA_NS}}}{local}"


def find_sidecar_xmp_path(reference_image_path: Path) -> Path | None:
    """참조 이미지와 같은 폴더·같은 stem 의 ``.xmp`` 가 있으면 그 경로."""
    if not reference_image_path.is_file():
        return None
    cand = reference_image_path.with_suffix(".xmp")
    return cand if cand.is_file() else None


def parse_lightroom_xmp(xmp_path: Path) -> dict[str, str]:
    """Lightroom / Camera Raw 사이드카에서 ``crs:*`` 속성을 로컬 이름 → 값 문자열로 수집.

    ``crs:Exposure2012``, ``crs:Temperature``, ``crs:Tint``, ``crs:Shadows2012`` 등은
    보통 ``rdf:Description`` 의 속성으로 들어 있다.
    """
    if not xmp_path.is_file():
        return {}
    try:
        tree = ET.parse(xmp_path)
    except ET.ParseError:
        return {}
    out: dict[str, str] = {}
    for el in tree.iter(_rdf_qname("Description")):
        for attr, val in el.attrib.items():
            if attr.startswith(f"{{{CRS_NS}}}"):
                local = attr.split("}", 1)[-1]
                out[local] = str(val).strip()
    return out


def _parse_lr_scalar(s: str) -> float:
    t = (s or "").strip().replace(",", ".")
    if not t:
        return 0.0
    try:
        return float(t)
    except ValueError:
        return 0.0


def _format_lr_signed_slider(x: float) -> str:
    """톤 슬라이더류 (-100~100 등)용 부호 있는 문자열."""
    if abs(x - round(x)) < 1e-5:
        return f"{int(round(x)):+d}"
    s = f"{x:+.4f}".rstrip("0").rstrip(".")
    if s in ("+", "-"):
        return s + "0"
    return s


def _format_lr_ev(x: float) -> str:
    s = f"{x:+.6f}".rstrip("0").rstrip(".")
    if s in ("+", "-"):
        return s + "0"
    return s


def _find_primary_rdf_description(root: ET.Element) -> ET.Element | None:
    best: ET.Element | None = None
    best_n = -1
    for el in root.iter(_rdf_qname("Description")):
        n = sum(1 for k in el.attrib if k.startswith(f"{{{CRS_NS}}}"))
        if n > best_n:
            best_n = n
            best = el
    if best is not None:
        return best
    for el in root.iter(_rdf_qname("Description")):
        return el
    return None


def _new_empty_xmp_tree() -> tuple[ET.ElementTree, ET.Element]:
    root_el = ET.Element(_xmpmeta_qname("xmpmeta"))
    root_el.set(_xmpmeta_qname("xmptk"), "schedule-site style_transfer_core")
    rdf = ET.SubElement(root_el, _rdf_qname("RDF"))
    desc = ET.SubElement(rdf, _rdf_qname("Description"))
    desc.set(_rdf_qname("about"), "")
    return ET.ElementTree(root_el), desc


def write_lightroom_sidecar_xmp(
    raw_path: Path,
    crs_attributes: dict[str, str],
    *,
    default_crs_version: str = "15.0",
) -> Path:
    """RAW 와 동일 stem 의 ``.xmp`` 를 같은 폴더에 기록. 기존 파일이 있으면 같은 Description 에 crs 속성을 갱신·추가."""
    sidecar = raw_path.with_suffix(".xmp")
    sidecar.parent.mkdir(parents=True, exist_ok=True)

    ET.register_namespace("crs", CRS_NS)
    ET.register_namespace("rdf", RDF_NS)
    ET.register_namespace("x", XMPMETA_NS)

    tree: ET.ElementTree
    desc: ET.Element
    if sidecar.is_file():
        try:
            tree = ET.parse(sidecar)
            root_el = tree.getroot()
            found = _find_primary_rdf_description(root_el)
            if found is None:
                tree, desc = _new_empty_xmp_tree()
            else:
                desc = found
        except (ET.ParseError, OSError):
            tree, desc = _new_empty_xmp_tree()
    else:
        tree, desc = _new_empty_xmp_tree()

    for k, v in crs_attributes.items():
        if not k or k.startswith("{") or not str(v).strip():
            continue
        desc.set(_crs_qname(k), str(v).strip())

    if _crs_qname("Version") not in desc.attrib:
        desc.set(_crs_qname("Version"), default_crs_version)
    if _crs_qname("ProcessVersion") not in desc.attrib:
        desc.set(_crs_qname("ProcessVersion"), default_crs_version)

    try:
        ET.indent(tree.getroot(), space="  ")
    except AttributeError:
        pass
    tree.write(sidecar, encoding="utf-8", xml_declaration=True)
    return sidecar


def _cdf_channel_u8(channel_u8: np.ndarray) -> np.ndarray:
    """단일 uint8 채널의 정규화된 누적 분포 F(i), i=0..255."""
    h = np.bincount(channel_u8.ravel(), minlength=256).astype(np.float64)
    c = np.cumsum(h)
    den = float(c[-1]) if c.size and c[-1] > 0 else 1.0
    return c / den


def match_histograms_channelwise(
    source: np.ndarray,
    reference: np.ndarray,
    alpha: float,
) -> np.ndarray:
    """채널별 CDF 히스토그램 매칭 후 ``alpha`` 로 원본과 선형 블렌드.

    RAW 현상 결과(또는 게인 적용 후) ``source``에 참조 ``reference``의 밝기·색 분포(톤)를
    옮기며, ``alpha``로 매칭 강도를 조절한다. (노출·색감은 히스토그램 정렬로 간접 반영.)

    - ``source``, ``reference``: (H, W, 3) ``uint8`` RGB.
    - 해상도가 다르면 ``reference`` 를 ``cv2.resize`` 로 ``source`` (W, H)에 맞춘다.
    - ``alpha`` ∈ [0, 1]: 0이면 ``source`` 유지, 1이면 순수 매칭 픽셀만.
    """
    try:
        import cv2
    except ImportError as e:
        raise RuntimeError("opencv-python 필요: pip install opencv-python-headless") from e

    a = float(np.clip(alpha, 0.0, 1.0))
    src = np.ascontiguousarray(np.clip(np.rint(source), 0, 255).astype(np.uint8))
    if a <= 1e-9:
        return src
    if src.ndim != 3 or src.shape[2] != 3:
        raise ValueError(f"source 는 (H,W,3) uint8 RGB 기대: {src.shape}")
    ref = np.ascontiguousarray(np.clip(np.rint(reference), 0, 255).astype(np.uint8))
    if ref.ndim != 3 or ref.shape[2] != 3:
        raise ValueError(f"reference 는 (H,W,3) uint8 RGB 기대: {ref.shape}")

    h, w = src.shape[:2]
    if ref.shape[0] != h or ref.shape[1] != w:
        ref = cv2.resize(ref, (w, h), interpolation=cv2.INTER_AREA)

    levels = np.arange(256, dtype=np.float64)
    matched = np.empty_like(src)
    for c in range(3):
        cdf_s = _cdf_channel_u8(src[:, :, c])
        cdf_r = _cdf_channel_u8(ref[:, :, c])
        lut = np.interp(cdf_s, cdf_r, levels)
        lut_u = np.clip(np.rint(lut), 0, 255).astype(np.uint8)
        matched[:, :, c] = lut_u[src[:, :, c]]

    if a >= 1.0 - 1e-9:
        return matched
    blended = (1.0 - a) * src.astype(np.float32) + a * matched.astype(np.float32)
    return np.ascontiguousarray(np.clip(np.rint(blended), 0, 255).astype(np.uint8))


def extract_json_object(text: str) -> dict[str, Any]:
    t = (text or "").strip()
    if not t:
        raise ValueError("빈 응답")
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", t, re.IGNORECASE)
    if fence:
        t = fence.group(1).strip()
    i0 = t.find("{")
    i1 = t.rfind("}")
    if i0 < 0 or i1 <= i0:
        raise ValueError(f"JSON 객체를 찾지 못했습니다: {t[:300]!r}")
    return json.loads(t[i0 : i1 + 1])


def _clamp_gain(x: float) -> float:
    return float(np.clip(float(x), GAIN_SAFETY_MIN, GAIN_SAFETY_MAX))


def pil_rgb_mean(pil: Image.Image) -> tuple[float, float, float]:
    arr = np.asarray(pil.convert("RGB"), dtype=np.float64)
    m = arr.reshape(-1, 3).mean(axis=0)
    return float(m[0]), float(m[1]), float(m[2])


def implied_rgb_ratio(
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
) -> tuple[float, float, float]:
    """참조/RAW RGB 평균 비율 (채널별). 0으로 나눔 방지 + Safety clamp."""
    r0, r1, r2 = ref_mean
    b0 = max(raw_mean[0], 1.0)
    b1 = max(raw_mean[1], 1.0)
    b2 = max(raw_mean[2], 1.0)
    return (
        _clamp_gain(r0 / b0),
        _clamp_gain(r1 / b1),
        _clamp_gain(r2 / b2),
    )


def simple_params_align_ref_raw(
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
) -> SimpleGainParams:
    """참조·RAW RGB **평균**으로 채널 게인(화이트밸런스)과 전체 **노출**(명도 스케일)을 맞춘다.

    RAW 현상은 자동 WB 기준이므로, 여기서는 미리보기 평균 대비 참조 평균의 비율로 보정한다.
    """
    ir, ig, ib = implied_rgb_ratio(ref_mean, raw_mean)
    rs = float(ref_mean[0] + ref_mean[1] + ref_mean[2])
    ys = float(raw_mean[0] + raw_mean[1] + raw_mean[2])
    exp = _clamp_gain(rs / max(ys, 1e-3))
    return SimpleGainParams(
        r_gain=ir,
        g_gain=ig,
        b_gain=ib,
        exposure_mul=exp,
        label="참조 노출·WB 정렬",
    )


@dataclass
class SimpleGainParams:
    """Zero-base: 매 호출 시 1.0에서만 시작해 이 값으로 덮어씀. OpenCV split/merge 게인."""

    r_gain: float = 1.0
    g_gain: float = 1.0
    b_gain: float = 1.0
    exposure_mul: float = 1.0
    label: str = ""

    @staticmethod
    def from_dict(d: dict[str, Any]) -> SimpleGainParams:
        r = g = b = e = 1.0
        r = float(d.get("r_gain", d.get("r_ratio", 1.0)))
        g = float(d.get("g_gain", d.get("g_ratio", 1.0)))
        b = float(d.get("b_gain", d.get("b_ratio", 1.0)))
        e = float(d.get("exposure_mul", d.get("brightness_mul", 1.0)))
        lab = str(d.get("label", "") or "")
        return SimpleGainParams(
            r_gain=_clamp_gain(r),
            g_gain=_clamp_gain(g),
            b_gain=_clamp_gain(b),
            exposure_mul=_clamp_gain(e),
            label=lab,
        )

    @staticmethod
    def from_implied_ratio(implied: tuple[float, float, float]) -> SimpleGainParams:
        return SimpleGainParams(
            r_gain=_clamp_gain(implied[0]),
            g_gain=_clamp_gain(implied[1]),
            b_gain=_clamp_gain(implied[2]),
            exposure_mul=1.0,
            label="평균비율폴백",
        )


def _is_identity_simple_gain(p: SimpleGainParams, eps: float = 1e-4) -> bool:
    """폼 기본값(1,1,1,1)과 같으면 True — 반영 강도 1이어도 이걸 쓰면 정렬이 무려화된다."""
    return (
        abs(float(p.r_gain) - 1.0) < eps
        and abs(float(p.g_gain) - 1.0) < eps
        and abs(float(p.b_gain) - 1.0) < eps
        and abs(float(p.exposure_mul) - 1.0) < eps
    )


def parse_gain_overrides_from_plain_text(text: str) -> dict[str, float]:
    """채팅/코드 블록에서 ``r_gain`` 등 또는 ``exposure``(EV) 단서를 느슨하게 추출.

    JSON이 아닌 ```python`` 답변에도 대응하기 위한 보조 파서이다.
    """
    t = (text or "").strip()
    if not t:
        return {}
    out: dict[str, float] = {}
    pairs = [
        (r"\br_gain\s*[:=]\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)", "r_gain"),
        (r"\bg_gain\s*[:=]\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)", "g_gain"),
        (r"\bb_gain\s*[:=]\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)", "b_gain"),
        (r"\bexposure_mul\s*[:=]\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)", "exposure_mul"),
        (r"\bbrightness_mul\s*[:=]\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)", "exposure_mul"),
    ]
    for pat, key in pairs:
        m = re.search(pat, t, flags=re.IGNORECASE)
        if not m:
            continue
        try:
            out[key] = float(m.group(1))
        except ValueError:
            pass
    if "exposure_mul" not in out:
        m = re.search(r"['\"]exposure['\"]\s*:\s*([+-]?\d*\.?\d+)", t)
        if m:
            try:
                out["exposure_mul"] = float(2.0 ** float(m.group(1)))
            except ValueError:
                pass
    if "exposure_mul" not in out:
        for line in t.splitlines():
            ln = line.lower()
            if "exposure" not in ln or "=" not in line:
                continue
            if "+" not in line:
                continue
            m = re.search(r"\+\s*([+-]?\d*\.?\d+)", line)
            if not m:
                continue
            try:
                delta_ev = float(m.group(1))
                out["exposure_mul"] = float(2.0**delta_ev)
            except ValueError:
                pass
            break
    return out


def parse_relative_exposure_ev_delta_from_text(text: str) -> float | None:
    """``params['exposure'] = ... - 0.1`` 처럼 **노출 EV 상대 변화**만 있는 답변에서 ΔEV 추출.

    반환값은 EV 단위(양수면 밝게, 음수면 어둡게). 파싱 실패 시 None.
    """
    for line in (text or "").splitlines():
        low = line.lower()
        if "exposure" not in low or "=" not in line:
            continue
        if not re.search(r"params\s*\[\s*['\"]exposure['\"]\s*\]\s*=", line, re.I):
            continue
        rhs = line.split("=", 1)[-1].strip()
        m = re.search(r"-\s*([0-9]*\.?[0-9]+)\s*(?:#.*)?$", rhs)
        if m:
            try:
                return -float(m.group(1))
            except ValueError:
                return None
        m2 = re.search(r"\+\s*([0-9]*\.?[0-9]+)\s*(?:#.*)?$", rhs)
        if m2:
            try:
                return float(m2.group(1))
            except ValueError:
                return None
    return None


def _blend_simple_gain_params(
    base: SimpleGainParams,
    override: SimpleGainParams,
    strength: float,
) -> SimpleGainParams:
    """base(평균 정렬)와 override(사용자/LLM 제안)를 strength(0~1)로 블렌드."""
    s = float(np.clip(float(strength), 0.0, 1.0))
    if s <= 1e-9:
        return base
    if s >= 1.0 - 1e-9:
        return override
    r = (1.0 - s) * float(base.r_gain) + s * float(override.r_gain)
    g = (1.0 - s) * float(base.g_gain) + s * float(override.g_gain)
    b = (1.0 - s) * float(base.b_gain) + s * float(override.b_gain)
    # 노출은 곱 스케일이라 기하 보간이 더 자연스럽다.
    e0 = max(float(base.exposure_mul), 1e-6)
    e1 = max(float(override.exposure_mul), 1e-6)
    e = e0 * (e1 / e0) ** s
    return replace(
        base,
        r_gain=_clamp_gain(r),
        g_gain=_clamp_gain(g),
        b_gain=_clamp_gain(b),
        exposure_mul=_clamp_gain(e),
        label=(override.label or base.label or "")[:120],
    )


def merge_reference_crs_with_simple_gains(
    ref_crs: dict[str, str],
    p: SimpleGainParams,
) -> dict[str, str]:
    """참조 XMP의 ``crs:*`` 값을 복사한 뒤, ``SimpleGainParams`` 로 노출·WB를 덧쌓는다.

    - ``Exposure2012``: 참조 EV + ``log2(exposure_mul)``
    - ``Temperature``: 참조(없으면 5200K 근처)에 R/B 게인 비율을 거듭제곱으로 반영
    - ``Tint``: 참조에 G 대비 R·B 기하평균으로 초록·자주 편차 반영
    그 외 키(``Shadows2012`` 등)는 참조 값이 있으면 그대로 유지한다.
    """
    out = dict(ref_crs)
    r = max(float(p.r_gain), 1e-6)
    g = max(float(p.g_gain), 1e-6)
    b = max(float(p.b_gain), 1e-6)
    em = max(float(p.exposure_mul), 1e-6)

    ev0 = _parse_lr_scalar(out.get("Exposure2012", "0"))
    ev1 = ev0 + math.log2(em)
    out["Exposure2012"] = _format_lr_ev(ev1)

    t0 = _parse_lr_scalar(out.get("Temperature", ""))
    if t0 < 500.0:
        t0 = 5200.0
    t1 = t0 * (r / b) ** 0.22
    t1 = max(2000.0, min(50000.0, t1))
    if abs(t1 - round(t1)) < 0.01:
        out["Temperature"] = str(int(round(t1)))
    else:
        out["Temperature"] = f"{t1:.1f}"

    tint0 = _parse_lr_scalar(out.get("Tint", "0"))
    geom = max(math.sqrt(r * b), 1e-6)
    tint1 = tint0 + 35.0 * math.log2(g / geom)
    tint1 = max(-150.0, min(150.0, tint1))
    out["Tint"] = _format_lr_signed_slider(tint1)

    return out


def _compose_simple_gains(a: SimpleGainParams, b: SimpleGainParams) -> SimpleGainParams:
    """두 SimpleGainParams를 곱으로 합성 (게인·노출 모두 multiplicative)."""
    return SimpleGainParams(
        r_gain=_clamp_gain(float(a.r_gain) * float(b.r_gain)),
        g_gain=_clamp_gain(float(a.g_gain) * float(b.g_gain)),
        b_gain=_clamp_gain(float(a.b_gain) * float(b.b_gain)),
        exposure_mul=_clamp_gain(float(a.exposure_mul) * float(b.exposure_mul)),
        label=(b.label or a.label or "")[:120],
    )


def simple_gains_from_reference_crs(ref_crs: dict[str, str]) -> SimpleGainParams:
    """Lightroom XMP의 핵심 파라미터를 Phase1용 `SimpleGainParams`로 근사 변환.

    목표는 “미리보기 JPG가 너무 어둡게 나오는 문제”를 줄이고, 참조 JPG(이미 XMP가 반영된 것)에
    더 가깝게 보이도록 **노출(Exposure2012)** 및 **WB(Temperature/Tint)** 방향을 반영하는 것이다.

    주의: Lightroom의 Temperature/Tint는 카메라 프로파일·색공간·현상 엔진에 따라 비선형이므로,
    여기서는 RAW 현상 후 RGB 채널 게인으로 **완만하게** 근사한다.
    """
    if not ref_crs:
        return SimpleGainParams(label="참조XMP(없음)")

    # 1) Exposure2012 (EV) → exposure_mul
    ev = _parse_lr_scalar(ref_crs.get("Exposure2012", "0"))
    exp_mul = float(np.clip(2.0**ev, GAIN_SAFETY_MIN, GAIN_SAFETY_MAX))

    # 2) Temperature (Kelvin-like) → R/B 비율 게인 (완만한 거듭제곱)
    #    LR에서 Temperature↑는 보통 warmer(노란/주황)로 인지되므로 R↑, B↓ 방향.
    t = _parse_lr_scalar(ref_crs.get("Temperature", ""))
    if t < 500.0:
        t = 5200.0
    t = max(2000.0, min(50000.0, t))
    anchor = 5200.0
    rb = (t / anchor) ** 0.18
    r_mul = float(np.clip(rb, GAIN_SAFETY_MIN, GAIN_SAFETY_MAX))
    b_mul = float(np.clip(1.0 / rb, GAIN_SAFETY_MIN, GAIN_SAFETY_MAX))

    # 3) Tint (green↔magenta) → G 채널 중심 보정 (완만)
    tint = _parse_lr_scalar(ref_crs.get("Tint", "0"))
    tint = max(-150.0, min(150.0, tint))
    # tint +면 마젠타(=그린 감소)로 보고, g_gain을 조금 낮춤.
    g_mul = float(np.clip(2.0 ** (-tint / 150.0 * 0.12), GAIN_SAFETY_MIN, GAIN_SAFETY_MAX))

    return SimpleGainParams(
        r_gain=_clamp_gain(r_mul),
        g_gain=_clamp_gain(g_mul),
        b_gain=_clamp_gain(b_mul),
        exposure_mul=_clamp_gain(exp_mul),
        label="참조XMP(근사)",
    )


def develop_raw_zero_base_split_gains(
    path: Path,
    p: SimpleGainParams,
    *,
    half_size: bool,
    log_tag: str = "",
    reference_pil_histogram: Image.Image | None = None,
    histogram_match_alpha: float = DEFAULT_HISTOGRAM_MATCH_ALPHA,
    write_sidecar_xmp: bool = False,
    reference_crs_map: dict[str, str] | None = None,
) -> np.ndarray:
    """rawpy 중립 현상 후 exposure_mul, cv2.split(BGR)·채널 게인·merge.

    선택적으로 참조 이미지(PIL RGB)를 ``match_histograms_channelwise`` 로 섞는다 (게인 적용 **이후**).
    """
    try:
        import cv2
    except ImportError as e:
        raise RuntimeError("opencv-python 필요: pip install opencv-python-headless") from e

    r_gain = g_gain = b_gain = 1.0
    exposure_mul = 1.0
    r_gain = _clamp_gain(p.r_gain)
    g_gain = _clamp_gain(p.g_gain)
    b_gain = _clamp_gain(p.b_gain)
    exposure_mul = _clamp_gain(p.exposure_mul)

    if log_tag:
        print(
            f"[style-transfer] {log_tag} file={path.name} "
            f"split_gains R={r_gain:.4f} G={g_gain:.4f} B={b_gain:.4f} exp_mul={exposure_mul:.4f}",
            file=sys.stderr,
            flush=True,
        )

    with rawpy.imread(str(path)) as raw:
        u8 = postprocess_raw_to_rgb_u8(
            raw,
            use_camera_wb=False,
            use_auto_wb=True,
            user_wb=None,
            bright=1.0,
            output_bps=8,
            no_auto_bright=False,
            highlight_mode=POST_HIGHLIGHT_MODE,
            half_size=half_size,
        )

    rgb = np.clip(u8.astype(np.float32) * exposure_mul, 0.0, 255.0)
    u8b = np.ascontiguousarray(np.rint(rgb).astype(np.uint8))
    bgr = cv2.cvtColor(u8b, cv2.COLOR_RGB2BGR)
    ch_b, ch_g, ch_r = cv2.split(bgr)
    ch_b = np.clip(ch_b.astype(np.float32) * b_gain, 0.0, 255.0)
    ch_g = np.clip(ch_g.astype(np.float32) * g_gain, 0.0, 255.0)
    ch_r = np.clip(ch_r.astype(np.float32) * r_gain, 0.0, 255.0)
    out_bgr = cv2.merge(
        [
            np.rint(ch_b).astype(np.uint8),
            np.rint(ch_g).astype(np.uint8),
            np.rint(ch_r).astype(np.uint8),
        ]
    )
    out_rgb = cv2.cvtColor(out_bgr, cv2.COLOR_BGR2RGB)
    out_rgb = np.ascontiguousarray(np.clip(out_rgb, 0, 255).astype(np.uint8))
    if reference_pil_histogram is not None and histogram_match_alpha > 1e-9:
        h, w = out_rgb.shape[:2]
        ref_rgba = reference_pil_histogram.convert("RGB").resize(
            (w, h), Image.Resampling.LANCZOS
        )
        ref_u8 = np.asarray(ref_rgba, dtype=np.uint8)
        out_rgb = match_histograms_channelwise(out_rgb, ref_u8, histogram_match_alpha)
        if log_tag:
            print(
                f"[style-transfer] {log_tag} histogram_match_alpha={histogram_match_alpha:.4f}",
                file=sys.stderr,
                flush=True,
            )
    if write_sidecar_xmp:
        crs_merged = merge_reference_crs_with_simple_gains(reference_crs_map or {}, p)
        side = write_lightroom_sidecar_xmp(path, crs_merged)
        if log_tag:
            print(
                f"[style-transfer] {log_tag} sidecar_xmp={side}",
                file=sys.stderr,
                flush=True,
            )
    return out_rgb


def _normalize_variant_key(key: Any) -> str | None:
    k = str(key).strip()
    if k.isdigit():
        n = int(k)
        if 1 <= n <= PHASE1_VARIANT_COUNT:
            return f"{n:02d}"
    if k in PHASE1_VARIANT_KEYS:
        return k
    return None


@dataclass
class StyleDevelopParams:
    exposure_ev: float = 0.0
    bright: float = 1.0
    color_temp_k: float | None = None  # K; 있으면 켈빈→user_wb (카메라/자동 WB 미사용)
    user_wb: tuple[float, float, float, float] | None = None
    lens_k1: float | None = None
    lens_k2: float | None = None
    contrast: float = 1.0
    saturation: float = 1.0
    yellow_pull: float = 0.0  # 0이면 끔. LAB b축 보정은 G와 섞일 수 있어 기본 비활성
    use_default_lens_if_missing: bool = True

    def effective_lens(self) -> tuple[float, float]:
        if self.lens_k1 is None or self.lens_k2 is None:
            if self.use_default_lens_if_missing:
                return DEFAULT_LENS_K1, DEFAULT_LENS_K2
            return 0.0, 0.0
        return self.lens_k1, self.lens_k2

    @staticmethod
    def from_dict(d: dict[str, Any]) -> StyleDevelopParams:
        ev = float(d.get("exposure_ev", 0.0))
        bright = float(d.get("bright", 1.0))
        contrast = float(d.get("contrast", 1.12))
        saturation = float(d.get("saturation", 1.0))
        ctk = d.get("color_temp_k")
        color_temp_k: float | None = None
        if ctk is not None:
            color_temp_k = float(ctk)
            color_temp_k = max(2500.0, min(12000.0, color_temp_k))
        wb = d.get("user_wb")
        user_wb: tuple[float, float, float, float] | None = None
        if isinstance(wb, list) and len(wb) == 4:
            user_wb = tuple(float(x) for x in wb)
        yp = d.get("yellow_pull", 0.0)
        yellow_pull = float(yp) if yp is not None else 0.0
        yellow_pull = max(0.0, min(0.65, yellow_pull))
        lens = d.get("lens")
        k1: float | None = None
        k2: float | None = None
        use_def = True
        if lens is None:
            k1, k2 = None, None
        elif isinstance(lens, dict):
            if lens.get("disabled") is True:
                use_def = False
                k1, k2 = 0.0, 0.0
            else:
                k1 = float(lens.get("k1", 0.0))
                k2 = float(lens.get("k2", 0.0))
                use_def = False
        return StyleDevelopParams(
            exposure_ev=max(-4.0, min(EXPOSURE_EV_MAX, ev)),
            bright=max(0.05, min(8.0, bright)),
            color_temp_k=color_temp_k,
            user_wb=user_wb,
            lens_k1=k1,
            lens_k2=k2,
            contrast=max(0.25, min(2.5, contrast)),
            saturation=max(0.0, min(2.5, saturation)),
            yellow_pull=yellow_pull,
            use_default_lens_if_missing=use_def and (lens is None),
        )


def apply_lens_distortion_rgb(rgb: np.ndarray, k1: float, k2: float) -> np.ndarray:
    if abs(k1) < 1e-8 and abs(k2) < 1e-8:
        return rgb
    try:
        import cv2
    except ImportError:
        print("경고: opencv 가 없어 렌즈 보정을 건너뜁니다.", file=sys.stderr)
        return rgb
    u8 = np.ascontiguousarray(np.clip(np.rint(rgb), 0, 255).astype(np.uint8))
    bgr = cv2.cvtColor(u8, cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    fx = float(max(w, h))
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    k = np.array([[fx, 0.0, cx], [0.0, fx, cy], [0.0, 0.0, 1.0]], dtype=np.float64)
    d = np.array([k1, k2, 0.0, 0.0, 0.0], dtype=np.float64)
    new_k, _ = cv2.getOptimalNewCameraMatrix(k, d, (w, h), 1.0, (w, h))
    out = cv2.undistort(bgr, k, d, None, new_k)
    rgb_out = cv2.cvtColor(out, cv2.COLOR_BGR2RGB)
    return np.ascontiguousarray(np.clip(np.rint(rgb_out.astype(np.float32)), 0.0, 255.0).astype(np.uint8))


def apply_contrast_saturation_rgb(rgb: np.ndarray, contrast: float, saturation: float) -> np.ndarray:
    if abs(contrast - 1.0) < 1e-6 and abs(saturation - 1.0) < 1e-6:
        return rgb
    try:
        import cv2
    except ImportError:
        return rgb
    f = np.clip(rgb.astype(np.float32), 0.0, 255.0)
    f = np.clip((f - 128.0) * contrast + 128.0, 0.0, 255.0)
    u8 = np.ascontiguousarray(np.rint(f).astype(np.uint8))
    hsv = cv2.cvtColor(u8, cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * saturation, 0, 255)
    out = cv2.cvtColor(np.rint(hsv).astype(np.uint8), cv2.COLOR_HSV2RGB)
    return np.ascontiguousarray(np.clip(np.rint(out.astype(np.float32)), 0.0, 255.0).astype(np.uint8))


def apply_yellow_suppress_rgb(rgb: np.ndarray, yellow_pull: float) -> np.ndarray:
    """LAB 공간에서 b(노랑–파랑)를 중립 쪽으로 당겨 잔여 웜·노란기를 완화.

    RGB→BGR→LAB→BGR→RGB 이중 변환은 실수 시 채널이 뒤바뀌기 쉬우므로
    ``RGB2LAB`` / ``LAB2RGB`` 로 직접 처리한다.
    """
    if yellow_pull < 0.02:
        return rgb
    try:
        import cv2
    except ImportError:
        return rgb
    u8 = np.ascontiguousarray(np.clip(np.rint(rgb), 0, 255).astype(np.uint8))
    lab = cv2.cvtColor(u8, cv2.COLOR_RGB2LAB).astype(np.float32)
    nb = 128.0
    t = float(yellow_pull)
    lab[:, :, 2] = nb + (lab[:, :, 2] - nb) * (1.0 - t)
    lab_u8 = np.clip(np.rint(lab), 0.0, 255.0).astype(np.uint8)
    out = cv2.cvtColor(lab_u8, cv2.COLOR_LAB2RGB)
    return np.ascontiguousarray(np.clip(np.rint(out.astype(np.float32)), 0.0, 255.0).astype(np.uint8))


def _resolve_wb_for_postprocess(
    p: StyleDevelopParams,
) -> tuple[list[float] | None, bool]:
    """(user_wb 리스트 또는 None, use_auto_wb). user_wb 가 있으면 켈빈보다 우선."""
    if p.user_wb is not None:
        return list(p.user_wb), False
    if p.color_temp_k is not None:
        mul = kelvin_to_rawpy_user_wb(p.color_temp_k)
        return list(mul), False
    return None, True


def develop_raw_to_rgb(
    path: Path,
    p: StyleDevelopParams,
    *,
    half_size: bool = False,
    log_tag: str = "",
) -> np.ndarray:
    user_wb_list, use_auto = _resolve_wb_for_postprocess(p)
    ev = max(-4.0, min(EXPOSURE_EV_MAX, p.exposure_ev * EXPOSURE_EV_SCALE + EXPOSURE_EV_BIAS))
    br = min(8.0, max(0.05, p.bright * BRIGHT_SCALE))
    if br < 1.02:
        br = max(br, 1.02)

    if log_tag:
        if use_auto or not user_wb_list:
            wb_part = "WB=auto (LibRaw)"
        else:
            r_m, g1_m, b_m, g2_m = user_wb_list
            wb_part = (
                f"WB=user_mul R={r_m:.4f} G1={g1_m:.4f} B={b_m:.4f} G2={g2_m:.4f} "
                f"(녹색 관련 G1·G2)"
            )
        ctk = p.color_temp_k
        ctk_s = f"{ctk:.0f}K" if ctk is not None else "—"
        pr, pg, pb = post_kelvin_rgb_rb_gains(p.color_temp_k)
        print(
            f"[style-transfer] {log_tag} file={path.name} color_temp_k={ctk_s} {wb_part} "
            f"post_RGB_mul R={pr:.4f} G={pg:.4f} B={pb:.4f} green_diag={POST_DEVELOP_GREEN_DIAG_SCALE} "
            f"ev_eff={ev:.3f} bright={br:.4f}",
            file=sys.stderr,
            flush=True,
        )

    with rawpy.imread(str(path)) as raw:
        u8 = postprocess_raw_to_rgb_u8(
            raw,
            use_camera_wb=False,
            use_auto_wb=use_auto,
            user_wb=user_wb_list,
            bright=br,
            output_bps=8,
            no_auto_bright=POST_NO_AUTO_BRIGHT,
            highlight_mode=POST_HIGHLIGHT_MODE,
            half_size=half_size,
        )
    rgb = u8.astype(np.float32)
    r_mul, _g_mul, b_mul = post_kelvin_rgb_rb_gains(p.color_temp_k)
    rgb[:, :, 0] *= r_mul
    rgb[:, :, 2] *= b_mul
    rgb = np.clip(rgb * float(2.0**ev), 0.0, 255.0)
    out = np.rint(rgb).astype(np.uint8)
    k1, k2 = p.effective_lens()
    out = apply_lens_distortion_rgb(out, k1, k2)
    out = apply_contrast_saturation_rgb(out, p.contrast, p.saturation)
    out = apply_yellow_suppress_rgb(out, p.yellow_pull)
    out_f = out.astype(np.float32)
    out_f[:, :, 1] *= POST_DEVELOP_GREEN_DIAG_SCALE
    return np.ascontiguousarray(np.clip(np.rint(out_f), 0, 255).astype(np.uint8))


def save_jpeg(rgb: np.ndarray, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    u8 = np.ascontiguousarray(np.clip(np.rint(rgb), 0, 255).astype(np.uint8))
    Image.fromarray(u8, mode="RGB").save(path, format="JPEG", quality=int(quality), optimize=True)


def _phase1_system_hint_numeric(
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
    implied: tuple[float, float, float],
) -> str:
    rr, rg, rb = ref_mean
    ar, ag, ab = raw_mean
    ir, ig, ib = implied
    keys_csv = ", ".join(f'"{k}"' for k in PHASE1_VARIANT_KEYS)
    return f"""당신은 사진 색 보정 어시스턴트입니다. 목표는 **참조 이미지와 RAW 출력의 전체 밝기(노출)** 및 **화이트밸런스(RGB 상대 균형)** 를 최대한 같게 만드는 것입니다.

아래 RGB 평균·비율은 Python으로 이미 계산되었고, **실제 보정 수치는 서버에서 이 값으로 확정**합니다. 당신은 **시각적 분석 문장**과 JSON 형식만 제공하면 됩니다.

[수치 — 검증용으로 그대로 반복]
- 참조 RGB 평균: R={rr:.2f}, G={rg:.2f}, B={rb:.2f}
- RAW 미리보기 RGB 평균: R={ar:.2f}, G={ag:.2f}, B={ab:.2f}
- 채널별 비율 clamp(참조/RAW, 0.5~2.0): R={ir:.4f}, G={ig:.4f}, B={ib:.4f}

[규칙]
1) **참조 대비** 밝기·색온도·그림자·하이라이트·색캐스트를 구체적으로 설명하세요.
2) 출력은 **오직** JSON. variants 키는 **{keys_csv} 만** (변형 1개).
3) variants["01"] 에는 **label**(한글 짧게, 예: "따뜻하게") 과 r_gain, g_gain, b_gain, exposure_mul 를 제안할 수 있습니다. 서버는 기본 평균 정렬값과 사용자가 지정한 반영 강도에 따라 이 값을 **블렌드**할 수 있습니다.

출력 스키마:
- analysis_ko: 한국어 2~5문장 (노출·WB·색감 비교 중심)
- ref_rgb_mean, raw_rgb_mean: [R,G,B] 위와 동일
- implied_ratio_rgb: [{ir:.6f}, {ig:.6f}, {ib:.6f}]
- variants: 객체, 키 {keys_csv} 하나. 값: label 필수, 나머지 선택

[이미지]
"""


def parse_simple_variants_response(text: str) -> tuple[str, dict[str, SimpleGainParams]]:
    data = extract_json_object(text)
    if not isinstance(data, dict):
        raise ValueError("최상위는 JSON 객체여야 합니다.")
    analysis = str(data.get("analysis_ko", "")).strip()
    variants = data.get("variants")
    if not isinstance(variants, dict):
        raise ValueError('응답에 "variants" 객체가 없습니다.')
    out: dict[str, SimpleGainParams] = {}
    for raw_key, block in variants.items():
        nk = _normalize_variant_key(raw_key)
        if nk is None or not isinstance(block, dict):
            continue
        out[nk] = SimpleGainParams.from_dict(block)
    return analysis, out


def merge_phase1_variants(
    parsed: dict[str, SimpleGainParams],
    implied: tuple[float, float, float],
) -> dict[str, SimpleGainParams]:
    fb = SimpleGainParams.from_implied_ratio(implied)
    return {k: parsed.get(k, fb) for k in PHASE1_VARIANT_KEYS}


def _phase1_refine_prompt_after_preview(
    stage1: SimpleGainParams,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
) -> str:
    rr, rg, rb = ref_mean
    ar, ag, ab = raw_mean
    k = PHASE1_VARIANT_KEYS[0]
    return f"""{INLOG_INTERIOR_EXPERT_PERSONA_KO}
({INLOG_INTERIOR_EXPERT_PERSONA_EN})

당신은 위 원칙을 따르는 사진 보정 수치 어시스턴트입니다.

이미지 3장이 순서대로 있습니다:
1) **참조(목표 스타일)** — 이미 보정된 참조
2) **RAW 미리보기** — 자동 현상된 RAW 썸네일
3) **1차 파이프라인 결과** — 참조 XMP(있으면) + 평균 기반 정렬을 적용한 **중간 결과**

현재 1차 결과에 적용된 수치(곱):
- r_gain={stage1.r_gain:.6f}, g_gain={stage1.g_gain:.6f}, b_gain={stage1.b_gain:.6f}, exposure_mul={stage1.exposure_mul:.6f}

참조·RAW RGB 평균(검증용):
- 참조: R={rr:.2f}, G={rg:.2f}, B={rb:.2f}
- RAW: R={ar:.2f}, G={ag:.2f}, B={ab:.2f}

[과제]
3번 이미지를 보며 참조 1번과 **노출·전체 밝기·색캐스트**가 자연스럽게 맞도록
`r_gain`, `g_gain`, `b_gain`, `exposure_mul` 을 **최종 권장 절대값**으로 다시 제안하세요.
(0.5~2.0 범위를 벗어나면 안 됩니다. 미세 조정을 선호합니다.)

[출력]
오직 JSON 하나. 스키마:
- analysis_ko: 한국어 2~5문장 (무엇을 어떻게 바꿀지)
- variants: 키는 **"{k}" 하나만**. 값에 label(한글 짧게) + r_gain, g_gain, b_gain, exposure_mul 필수
"""


def _parse_refine_variant_json(
    text: str, fallback: SimpleGainParams
) -> tuple[str, SimpleGainParams]:
    """2차 Gemini 응답에서 variants['01'] 만 읽는다."""
    try:
        data = extract_json_object(text)
    except Exception:
        return "", fallback
    if not isinstance(data, dict):
        return "", fallback
    analysis = str(data.get("analysis_ko", "")).strip()
    variants = data.get("variants")
    if not isinstance(variants, dict):
        return analysis, fallback
    for raw_key, block in variants.items():
        nk = _normalize_variant_key(raw_key)
        if nk is None or not isinstance(block, dict):
            continue
        if nk != PHASE1_VARIANT_KEYS[0]:
            continue
        try:
            return analysis, SimpleGainParams.from_dict(block)
        except Exception:
            return analysis, fallback
    return analysis, fallback


def call_gemini_preview_refine(
    ref_pil: Image.Image,
    raw_preview_pil: Image.Image,
    stage1_preview_pil: Image.Image,
    stage1_params: SimpleGainParams,
    api_key: str,
    *,
    model_name: str,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
) -> tuple[str, SimpleGainParams, str]:
    import google.generativeai as genai

    hint = _phase1_refine_prompt_after_preview(stage1_params, ref_mean, raw_mean)
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    parts: list[Any] = [
        hint,
        "\n[이미지 1: 참조]\n",
        ref_pil,
        "\n[이미지 2: RAW 미리보기]\n",
        raw_preview_pil,
        "\n[이미지 3: 1차 파이프라인 결과]\n",
        stage1_preview_pil,
    ]
    response = model.generate_content(parts)
    try:
        text = (response.text or "").strip()
    except ValueError as e:
        raise RuntimeError("Gemini 2차 응답 텍스트를 읽을 수 없습니다.") from e
    a, p = _parse_refine_variant_json(text, stage1_params)
    return a, p, text


def _pil_to_jpeg_data_url(im: Image.Image, *, quality: int = 82) -> str:
    buf = io.BytesIO()
    rgb = im.convert("RGB")
    rgb.save(buf, format="JPEG", quality=quality, optimize=True)
    b64 = base64.standard_b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{b64}"


def _xai_grok_chat_messages(
    api_key: str,
    *,
    model: str,
    messages: list[dict[str, Any]],
    temperature: float = 0.35,
    max_tokens: int = 3072,
    timeout_s: int = 180,
) -> str:
    body = json.dumps(
        {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        },
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        XAI_CHAT_COMPLETIONS_URL,
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": f"Bearer {api_key}",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_b = e.read().decode("utf-8", errors="replace")[:2000]
        raise RuntimeError(f"xAI HTTP {e.code}: {err_b}") from e
    choices = payload.get("choices") or []
    if not choices:
        raise RuntimeError(f"xAI 응답 형식 오류: {str(payload)[:500]}")
    msg = choices[0].get("message") or {}
    content = (msg.get("content") or "").strip()
    if not content:
        raise RuntimeError("xAI 빈 응답")
    return content


def _xai_grok_chat_completion(
    api_key: str,
    *,
    model: str,
    system: str,
    user: str,
    timeout_s: int = 120,
) -> str:
    return _xai_grok_chat_messages(
        api_key,
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        timeout_s=timeout_s,
    )


def _parse_strict_variant_01_json(text: str) -> tuple[str, SimpleGainParams]:
    """토론 라운드에서 ``variants['01']`` JSON을 엄격히 파싱."""
    data = extract_json_object(text)
    if not isinstance(data, dict):
        raise ValueError("최상위 JSON 객체 아님")
    variants = data.get("variants")
    if not isinstance(variants, dict):
        raise ValueError('"variants" 객체 필요')
    p01: SimpleGainParams | None = None
    for raw_key, block in variants.items():
        nk = _normalize_variant_key(raw_key)
        if nk is None or nk != PHASE1_VARIANT_KEYS[0] or not isinstance(block, dict):
            continue
        p01 = SimpleGainParams.from_dict(block)
        break
    if p01 is None:
        raise ValueError("variants['01'] 없음 또는 파싱 실패")
    analysis = str(data.get("analysis_ko", "")).strip()
    return analysis, p01


def _average_simple_gain_params(a: SimpleGainParams, b: SimpleGainParams) -> SimpleGainParams:
    lab = (a.label or b.label or "Gemini+Grok 합의 평균").strip()[:120]
    return SimpleGainParams(
        r_gain=_clamp_gain((float(a.r_gain) + float(b.r_gain)) / 2.0),
        g_gain=_clamp_gain((float(a.g_gain) + float(b.g_gain)) / 2.0),
        b_gain=_clamp_gain((float(a.b_gain) + float(b.b_gain)) / 2.0),
        exposure_mul=_clamp_gain((float(a.exposure_mul) + float(b.exposure_mul)) / 2.0),
        label=lab,
    )


def _phase1_debate_round1_prompt(stage1: SimpleGainParams, ref_mean: tuple[float, float, float], raw_mean: tuple[float, float, float]) -> str:
    rr, rg, rb = ref_mean
    ar, ag, ab = raw_mean
    k = PHASE1_VARIANT_KEYS[0]
    return f"""{INLOG_INTERIOR_EXPERT_PERSONA_KO}
{INLOG_INTERIOR_EXPERT_PERSONA_EN}

이미지 3장 순서: (1) 참조 목표 (2) RAW 미리보기 (3) 1차(XMP+정렬) 파이프라인 결과.

현재 1차에 적용된 곱: r_gain={stage1.r_gain:.6f}, g_gain={stage1.g_gain:.6f}, b_gain={stage1.b_gain:.6f}, exposure_mul={stage1.exposure_mul:.6f}
참조 RGB 평균(0~255): R={rr:.2f}, G={rg:.2f}, B={rb:.2f}
RAW RGB 평균: R={ar:.2f}, G={ag:.2f}, B={ab:.2f}

[과제] 3번 이미지를 참고·RAW와 비교해 참조에 가깝게, 단 인테리어로 자연스럽게 보정안을 제시하세요.
출력은 JSON 하나뿐 (코드펜스 금지):
{{"analysis_ko":"한국어 2~5문장","variants":{{"{k}":{{"label":"한글 짧게","r_gain":1,"g_gain":1,"b_gain":1,"exposure_mul":1}}}}}}
모든 gain·exposure_mul은 0.5~2.0.
"""


def call_gemini_debate_round1_independent(
    ref_pil: Image.Image,
    raw_preview_pil: Image.Image,
    stage1_preview_pil: Image.Image,
    stage1_params: SimpleGainParams,
    api_key: str,
    *,
    model_name: str,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
) -> tuple[str, SimpleGainParams, str]:
    import google.generativeai as genai

    hint = _phase1_debate_round1_prompt(stage1_params, ref_mean, raw_mean)
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    parts: list[Any] = [
        hint,
        "\n[이미지 1: 참조]\n",
        ref_pil,
        "\n[이미지 2: RAW 미리보기]\n",
        raw_preview_pil,
        "\n[이미지 3: 1차 파이프라인 결과]\n",
        stage1_preview_pil,
    ]
    response = model.generate_content(parts)
    try:
        text = (response.text or "").strip()
    except ValueError as e:
        raise RuntimeError("Gemini 토론 R1 응답 없음") from e
    a, p = _parse_strict_variant_01_json(text)
    return a, p, text


def call_grok_debate_round1_independent(
    ref_pil: Image.Image,
    raw_preview_pil: Image.Image,
    stage1_preview_pil: Image.Image,
    stage1_params: SimpleGainParams,
    grok_api_key: str,
    *,
    grok_model: str,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
) -> tuple[str, SimpleGainParams, str, str]:
    """Grok R1. (text, params, raw_response, mode) — mode 는 ``vision`` 또는 ``text_fallback``."""
    rr, rg, rb = ref_mean
    ar, ag, ab = raw_mean
    k = PHASE1_VARIANT_KEYS[0]
    schema_tail = (
        f'{{"analysis_ko":"Korean 2-5 sentences","variants":{{"{k}":'
        '{{"label":"short Korean","r_gain":1,"g_gain":1,"b_gain":1,"exposure_mul":1}}}}}}'
    )
    system = (
        f"{INLOG_INTERIOR_EXPERT_PERSONA_EN} {INLOG_INTERIOR_EXPERT_PERSONA_KO}\n"
        "Output ONLY one JSON object, no markdown fences, no extra text."
    )
    user_intro = _phase1_debate_round1_prompt(stage1_params, ref_mean, raw_mean)
    user_en = (
        f"{user_intro}\nSame schema in JSON keys as above (analysis_ko + variants.{k}). "
        f"Example shape: {schema_tail}"
    )
    url_ref = _pil_to_jpeg_data_url(ref_pil)
    url_raw = _pil_to_jpeg_data_url(raw_preview_pil)
    url_s1 = _pil_to_jpeg_data_url(stage1_preview_pil)
    mm_user: list[dict[str, Any]] = [
        {"type": "text", "text": user_en},
        {"type": "text", "text": "[Image 1: reference target]"},
        {"type": "image_url", "image_url": {"url": url_ref}},
        {"type": "text", "text": "[Image 2: RAW preview]"},
        {"type": "image_url", "image_url": {"url": url_raw}},
        {"type": "text", "text": "[Image 3: stage-1 pipeline output]"},
        {"type": "image_url", "image_url": {"url": url_s1}},
    ]
    try:
        raw = _xai_grok_chat_messages(
            grok_api_key,
            model=grok_model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": mm_user},
            ],
        )
        a, p = _parse_strict_variant_01_json(raw)
        return a, p, raw, "vision"
    except Exception:
        user_fb = (
            f"{user_en}\n\nNumeric context: ref_mean=({rr:.2f},{rg:.2f},{rb:.2f}), "
            f"raw_mean=({ar:.2f},{ag:.2f},{ab:.2f}). "
            "You cannot see pixels; infer conservatively for interior whites / highlights."
        )
        raw = _xai_grok_chat_completion(
            grok_api_key, model=grok_model, system=system, user=user_fb, timeout_s=180
        )
        a, p = _parse_strict_variant_01_json(raw)
        return a, p, raw, "text_fallback"


def call_gemini_debate_round2_critique_grok(
    api_key: str,
    model_name: str,
    *,
    stage1_params: SimpleGainParams,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
    gemini_r1: SimpleGainParams,
    grok_r1: SimpleGainParams,
    grok_analysis_ko: str,
) -> tuple[dict[str, str], str]:
    import google.generativeai as genai

    system = (
        f"{INLOG_INTERIOR_EXPERT_PERSONA_KO}\n{INLOG_INTERIOR_EXPERT_PERSONA_EN}\n"
        "You are in a structured debate. Output ONLY valid JSON, no markdown.\n"
        'Schema: {"critique_of_grok_ko":"3-7 Korean sentences about Grok proposal risks",'
        '"defend_gemini_r1_ko":"2-5 Korean sentences why your round-1 numbers are reasonable"}\n'
    )
    user = (
        f"1차 적용 수치: {json.dumps(_simple_variant_to_json_dict(stage1_params), ensure_ascii=False)}\n"
        f"내(Gemini) R1 제안: {json.dumps(_simple_variant_to_json_dict(gemini_r1), ensure_ascii=False)}\n"
        f"Grok R1 분석: {grok_analysis_ko}\n"
        f"Grok R1 제안: {json.dumps(_simple_variant_to_json_dict(grok_r1), ensure_ascii=False)}\n"
        f"ref_mean={list(ref_mean)}, raw_mean={list(raw_mean)}\n"
        "Critique Grok's numbers (highlights, WB, walls). Defend yours where you disagree."
    )
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    resp = model.generate_content(system + "\n\n" + user)
    try:
        text = (resp.text or "").strip()
    except ValueError as e:
        raise RuntimeError("Gemini R2 응답 없음") from e
    data = extract_json_object(text)
    if not isinstance(data, dict):
        raise ValueError("Gemini R2 JSON 아님")
    cg = str(data.get("critique_of_grok_ko", "")).strip()
    dg = str(data.get("defend_gemini_r1_ko", "")).strip()
    if not cg and not dg:
        raise ValueError("Gemini R2 빈 필드")
    return {"critique_of_grok_ko": cg, "defend_gemini_r1_ko": dg}, text


def call_grok_debate_round2_rebut_gemini(
    grok_api_key: str,
    grok_model: str,
    *,
    stage1_params: SimpleGainParams,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
    gemini_r1: SimpleGainParams,
    grok_r1: SimpleGainParams,
    gemini_analysis_ko: str,
    gemini_r2: dict[str, str],
) -> tuple[dict[str, str], str]:
    system = (
        f"{INLOG_INTERIOR_EXPERT_PERSONA_EN} {INLOG_INTERIOR_EXPERT_PERSONA_KO}\n"
        "Structured debate: output ONLY one JSON object, no markdown."
    )
    user = (
        "Gemini round-1 proposal: "
        f"{json.dumps(_simple_variant_to_json_dict(gemini_r1), ensure_ascii=False)}\n"
        f"Gemini R1 analysis (KO): {gemini_analysis_ko}\n"
        "Your (Grok) round-1 proposal: "
        f"{json.dumps(_simple_variant_to_json_dict(grok_r1), ensure_ascii=False)}\n"
        f"Stage-1 params: {json.dumps(_simple_variant_to_json_dict(stage1_params), ensure_ascii=False)}\n"
        f"ref_mean={list(ref_mean)}, raw_mean={list(raw_mean)}\n"
        "Gemini criticized you and defended its numbers:\n"
        f"- critique_of_grok: {gemini_r2.get('critique_of_grok_ko', '')}\n"
        f"- defend_gemini: {gemini_r2.get('defend_gemini_r1_ko', '')}\n\n"
        'Reply in JSON: {"critique_of_gemini_ko":"3-7 Korean sentences",'
        '"rebuttal_ko":"3-7 Korean sentences rebutting Gemini and restating your position"}\n'
    )
    raw = _xai_grok_chat_completion(
        grok_api_key, model=grok_model, system=system, user=user, timeout_s=180
    )
    data = extract_json_object(raw)
    if not isinstance(data, dict):
        raise ValueError("Grok R2 JSON 아님")
    cg = str(data.get("critique_of_gemini_ko", "")).strip()
    rb = str(data.get("rebuttal_ko", "")).strip()
    if not cg and not rb:
        raise ValueError("Grok R2 빈 필드")
    return {"critique_of_gemini_ko": cg, "rebuttal_ko": rb}, raw


def call_gemini_debate_round3_consensus(
    api_key: str,
    model_name: str,
    *,
    stage1_params: SimpleGainParams,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
    gemini_r1: SimpleGainParams,
    grok_r1: SimpleGainParams,
    transcript_ko: str,
) -> tuple[str, SimpleGainParams, str, str]:
    """(analysis_ko, params, raw_text, consensus_summary_ko)"""
    import google.generativeai as genai

    system = (
        f"{INLOG_INTERIOR_EXPERT_PERSONA_KO}\n{INLOG_INTERIOR_EXPERT_PERSONA_EN}\n"
        "Final consensus round. Output ONLY valid JSON, no markdown.\n"
        'Schema: {"consensus_summary_ko":"4-10 Korean sentences: what you agreed with Grok, '
        'what you compromised, highlight safety",'
        '"analysis_ko":"short Korean note",'
        '"variants":{"01":{"label":"short","r_gain":1,"g_gain":1,"b_gain":1,"exposure_mul":1}}}\n'
        "Single final absolute gains 0.5~2.0 for merge into Lightroom XMP crs."
    )
    user = (
        f"Stage-1: {json.dumps(_simple_variant_to_json_dict(stage1_params), ensure_ascii=False)}\n"
        f"Gemini R1: {json.dumps(_simple_variant_to_json_dict(gemini_r1), ensure_ascii=False)}\n"
        f"Grok R1: {json.dumps(_simple_variant_to_json_dict(grok_r1), ensure_ascii=False)}\n"
        f"ref_mean={list(ref_mean)}, raw_mean={list(raw_mean)}\n\n"
        "[Debate transcript]\n"
        f"{transcript_ko}\n\n"
        "Produce ONE agreed variants['01'] for interior reference matching."
    )
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    resp = model.generate_content(system + "\n\n" + user)
    try:
        text = (resp.text or "").strip()
    except ValueError as e:
        raise RuntimeError("Gemini R3 응답 없음") from e
    data = extract_json_object(text)
    if not isinstance(data, dict):
        raise ValueError("Gemini R3 JSON 아님")
    summary = str(data.get("consensus_summary_ko", "")).strip()
    variants = data.get("variants")
    if not isinstance(variants, dict):
        raise ValueError("Gemini R3 variants 없음")
    p01: SimpleGainParams | None = None
    for raw_key, block in variants.items():
        nk = _normalize_variant_key(raw_key)
        if nk is None or nk != PHASE1_VARIANT_KEYS[0] or not isinstance(block, dict):
            continue
        p01 = SimpleGainParams.from_dict(block)
        break
    if p01 is None:
        raise ValueError("Gemini R3 variants 01 없음")
    analysis = str(data.get("analysis_ko", "")).strip()
    return analysis, p01, text, summary


def call_grok_debate_round3_consensus(
    grok_api_key: str,
    grok_model: str,
    *,
    stage1_params: SimpleGainParams,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
    gemini_r1: SimpleGainParams,
    grok_r1: SimpleGainParams,
    transcript_ko: str,
) -> tuple[str, SimpleGainParams, str, str]:
    system = (
        f"{INLOG_INTERIOR_EXPERT_PERSONA_EN} {INLOG_INTERIOR_EXPERT_PERSONA_KO}\n"
        "Final consensus. Output ONLY one JSON object, no markdown."
    )
    user = (
        "You and Gemini debated. Now output the SAME schema as Gemini for one final agreed correction.\n"
        'Schema: {"consensus_summary_ko":"4-10 Korean sentences",'
        '"analysis_ko":"short",'
        '"variants":{"01":{"label":"short Korean","r_gain":1,"g_gain":1,"b_gain":1,"exposure_mul":1}}}\n'
        f"Stage-1: {json.dumps(_simple_variant_to_json_dict(stage1_params), ensure_ascii=False)}\n"
        f"Your R1: {json.dumps(_simple_variant_to_json_dict(grok_r1), ensure_ascii=False)}\n"
        f"Gemini R1: {json.dumps(_simple_variant_to_json_dict(gemini_r1), ensure_ascii=False)}\n"
        f"ref_mean={list(ref_mean)}, raw_mean={list(raw_mean)}\n\n"
        "[Debate transcript]\n"
        f"{transcript_ko}\n"
    )
    raw = _xai_grok_chat_completion(
        grok_api_key, model=grok_model, system=system, user=user, timeout_s=180
    )
    data = extract_json_object(raw)
    if not isinstance(data, dict):
        raise ValueError("Grok R3 JSON 아님")
    summary = str(data.get("consensus_summary_ko", "")).strip()
    variants = data.get("variants")
    if not isinstance(variants, dict):
        raise ValueError("Grok R3 variants 없음")
    p01: SimpleGainParams | None = None
    for raw_key, block in variants.items():
        nk = _normalize_variant_key(raw_key)
        if nk is None or nk != PHASE1_VARIANT_KEYS[0] or not isinstance(block, dict):
            continue
        p01 = SimpleGainParams.from_dict(block)
        break
    if p01 is None:
        raise ValueError("Grok R3 variants 01 없음")
    analysis = str(data.get("analysis_ko", "")).strip()
    return analysis, p01, raw, summary


def _format_debate_summary_ko(debate_meta: dict[str, Any]) -> str:
    """웹 UI·로그용 토론 요약 (한국어)."""
    r1 = debate_meta.get("round1") if isinstance(debate_meta.get("round1"), dict) else {}
    r2 = debate_meta.get("round2") if isinstance(debate_meta.get("round2"), dict) else {}
    r3 = debate_meta.get("round3") if isinstance(debate_meta.get("round3"), dict) else {}
    g2 = r2.get("gemini") if isinstance(r2.get("gemini"), dict) else {}
    gr2 = r2.get("grok") if isinstance(r2.get("grok"), dict) else {}
    lines: list[str] = [
        "【R1 · 독립 제안】",
        "· Gemini: " + str(r1.get("gemini_analysis_ko", "")).strip(),
        "· Grok: " + str(r1.get("grok_analysis_ko", "")).strip(),
        "",
        "【R2 · 교차 피드백】",
        "· Gemini → Grok 비판: " + str(g2.get("critique_of_grok_ko", "")).strip(),
        "· Gemini 자기 방어: " + str(g2.get("defend_gemini_r1_ko", "")).strip(),
        "· Grok → Gemini 비판: " + str(gr2.get("critique_of_gemini_ko", "")).strip(),
        "· Grok 반박: " + str(gr2.get("rebuttal_ko", "")).strip(),
        "",
        "【R3 · 합의】",
        "· Gemini 합의 요약: "
        + str(r3.get("gemini_consensus_summary_ko", "")).strip(),
        "· Grok 합의 요약: "
        + str(r3.get("grok_consensus_summary_ko", "")).strip(),
        "· R3 수치 병합: "
        + json.dumps(r3.get("merged_simple_params", {}), ensure_ascii=False),
    ]
    return "\n".join(lines).strip()


def run_inlog_multi_agent_debate(
    ref_pil: Image.Image,
    raw_preview_pil: Image.Image,
    stage1_preview_pil: Image.Image,
    stage1_params: SimpleGainParams,
    *,
    gemini_api_key: str,
    gemini_model: str,
    grok_api_key: str,
    grok_model: str,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
) -> tuple[SimpleGainParams, dict[str, Any], str]:
    """Inlog 멀티에이전트 3라운드 토론 → 합의 ``SimpleGainParams`` 와 메타·로그 문자열."""
    meta: dict[str, Any] = {
        "debate_version": 1,
        "grok_round1_mode": "",
        "round1": {},
        "round2": {},
        "round3": {},
        "merged_method": "",
    }
    lines: list[str] = [
        "======== Inlog multi-agent debate (Gemini × Grok) ========",
    ]

    g1_a, g1_p, g1_raw = call_gemini_debate_round1_independent(
        ref_pil,
        raw_preview_pil,
        stage1_preview_pil,
        stage1_params,
        gemini_api_key,
        model_name=gemini_model,
        ref_mean=ref_mean,
        raw_mean=raw_mean,
    )
    gr1_a, gr1_p, gr1_raw, gr_mode = call_grok_debate_round1_independent(
        ref_pil,
        raw_preview_pil,
        stage1_preview_pil,
        stage1_params,
        grok_api_key,
        grok_model=grok_model,
        ref_mean=ref_mean,
        raw_mean=raw_mean,
    )
    meta["grok_round1_mode"] = gr_mode
    meta["round1"] = {
        "gemini_analysis_ko": g1_a,
        "gemini_proposal": _simple_variant_to_json_dict(g1_p),
        "gemini_response_excerpt": g1_raw[:8000],
        "grok_analysis_ko": gr1_a,
        "grok_proposal": _simple_variant_to_json_dict(gr1_p),
        "grok_response_excerpt": gr1_raw[:8000],
    }
    lines.append("[R1] Gemini 제안: " + json.dumps(_simple_variant_to_json_dict(g1_p), ensure_ascii=False))
    lines.append("[R1] Grok 제안: " + json.dumps(_simple_variant_to_json_dict(gr1_p), ensure_ascii=False))

    g2_d, g2_raw = call_gemini_debate_round2_critique_grok(
        gemini_api_key,
        gemini_model,
        stage1_params=stage1_params,
        ref_mean=ref_mean,
        raw_mean=raw_mean,
        gemini_r1=g1_p,
        grok_r1=gr1_p,
        grok_analysis_ko=gr1_a,
    )
    gr2_d, gr2_raw = call_grok_debate_round2_rebut_gemini(
        grok_api_key,
        grok_model,
        stage1_params=stage1_params,
        ref_mean=ref_mean,
        raw_mean=raw_mean,
        gemini_r1=g1_p,
        grok_r1=gr1_p,
        gemini_analysis_ko=g1_a,
        gemini_r2=g2_d,
    )
    meta["round2"] = {
        "gemini": g2_d,
        "gemini_response_excerpt": g2_raw[:8000],
        "grok": gr2_d,
        "grok_response_excerpt": gr2_raw[:8000],
    }
    lines.append("[R2] Gemini → Grok 비판: " + (g2_d.get("critique_of_grok_ko") or "")[:500])
    lines.append("[R2] Grok 반박: " + (gr2_d.get("rebuttal_ko") or "")[:500])

    transcript = (
        f"[R1 Gemini 분석] {g1_a}\n"
        f"[R1 Grok 분석] {gr1_a}\n"
        f"[R2 Gemini: Grok 비판] {g2_d.get('critique_of_grok_ko', '')}\n"
        f"[R2 Gemini: 자기 방어] {g2_d.get('defend_gemini_r1_ko', '')}\n"
        f"[R2 Grok: Gemini 비판] {gr2_d.get('critique_of_gemini_ko', '')}\n"
        f"[R2 Grok: 반박] {gr2_d.get('rebuttal_ko', '')}\n"
    )

    g3_a, g3_p, g3_raw, g3_sum = call_gemini_debate_round3_consensus(
        gemini_api_key,
        gemini_model,
        stage1_params=stage1_params,
        ref_mean=ref_mean,
        raw_mean=raw_mean,
        gemini_r1=g1_p,
        grok_r1=gr1_p,
        transcript_ko=transcript,
    )
    gr3_a, gr3_p, gr3_raw, gr3_sum = call_grok_debate_round3_consensus(
        grok_api_key,
        grok_model,
        stage1_params=stage1_params,
        ref_mean=ref_mean,
        raw_mean=raw_mean,
        gemini_r1=g1_p,
        grok_r1=gr1_p,
        transcript_ko=transcript,
    )
    merged = _average_simple_gain_params(g3_p, gr3_p)
    meta["round3"] = {
        "gemini_analysis_ko": g3_a,
        "gemini_consensus_summary_ko": g3_sum,
        "gemini_proposal": _simple_variant_to_json_dict(g3_p),
        "gemini_response_excerpt": g3_raw[:8000],
        "grok_analysis_ko": gr3_a,
        "grok_consensus_summary_ko": gr3_sum,
        "grok_proposal": _simple_variant_to_json_dict(gr3_p),
        "grok_response_excerpt": gr3_raw[:8000],
        "merged_simple_params": _simple_variant_to_json_dict(merged),
    }
    meta["merged_method"] = "average_gemini_grok_round3"
    lines.append("[R3] Gemini 합의 요약: " + (g3_sum or g3_a)[:600])
    lines.append("[R3] Grok 합의 요약: " + (gr3_sum or gr3_a)[:600])
    lines.append("[R3] 병합(평균) SimpleGainParams: " + json.dumps(_simple_variant_to_json_dict(merged), ensure_ascii=False))
    lines.append("======== Debate end ========")
    meta["debate_summary_ko"] = _format_debate_summary_ko(meta)
    log_blob = "\n".join(lines)
    return merged, meta, log_blob


def read_histogram_options_from_pack(
    pack_path: Path,
) -> tuple[float, Path | None, dict[str, str], bool]:
    """variants 패키지 JSON에서 히스토그램 옵션과 참조 ``crs`` 맵을 읽는다.

    ``reference_xmp_path`` 가 있으면 그 파일을 우선 파싱하고, 없으면
    ``reference_image_for_histogram`` 과 같은 stem 의 ``.xmp`` 를 찾는다.

    반환하는 네 번째 값은 **명시적** ``reference_xmp_path`` 로 ``crs`` 를 읽었는지 여부이다.
    이 경우 Phase2 에서 히스토그램용 참조 이미지 옆 사이드카로 덮어쓰지 않는다.
    """
    empty: dict[str, str] = {}
    try:
        data = json.loads(pack_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return DEFAULT_HISTOGRAM_MATCH_ALPHA, None, empty, False
    if not isinstance(data, dict):
        return DEFAULT_HISTOGRAM_MATCH_ALPHA, None, empty, False
    a = float(data.get("histogram_match_alpha", DEFAULT_HISTOGRAM_MATCH_ALPHA))
    a = float(np.clip(a, 0.0, 1.0))
    ref_crs: dict[str, str] = {}
    ref_path: Path | None = None
    ref_s = data.get("reference_image_for_histogram")
    if isinstance(ref_s, str) and ref_s.strip():
        rp = Path(ref_s).expanduser()
        if rp.is_file():
            ref_path = rp
    xmp_explicit = data.get("reference_xmp_path")
    if isinstance(xmp_explicit, str) and xmp_explicit.strip():
        xp = Path(xmp_explicit).expanduser()
        if xp.is_file():
            ref_crs = parse_lightroom_xmp(xp)
            return a, ref_path, ref_crs, True
    if ref_path is not None:
        xp2 = find_sidecar_xmp_path(ref_path)
        if xp2 is not None:
            ref_crs = parse_lightroom_xmp(xp2)
    return a, ref_path, ref_crs, False


def call_gemini_style_variants(
    ref_pil: Image.Image,
    raw_preview_pil: Image.Image,
    api_key: str,
    *,
    model_name: str,
    ref_mean: tuple[float, float, float],
    raw_mean: tuple[float, float, float],
    implied: tuple[float, float, float],
    extra_instruction: str = "",
) -> tuple[str, dict[str, SimpleGainParams], str]:
    import google.generativeai as genai

    hint = _phase1_system_hint_numeric(ref_mean, raw_mean, implied)
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    parts: list[Any] = [
        hint + ("\n\n" + extra_instruction if extra_instruction else ""),
        "\n[이미지 1: 참조]\n",
        ref_pil,
        "\n[이미지 2: RAW 미리보기]\n",
        raw_preview_pil,
    ]
    response = model.generate_content(parts)
    try:
        text = (response.text or "").strip()
    except ValueError as e:
        raise RuntimeError("Gemini 응답 텍스트를 읽을 수 없습니다.") from e
    analysis, variants = parse_simple_variants_response(text)
    variants = merge_phase1_variants(variants, implied)
    return analysis, variants, text


def _simple_variant_to_json_dict(p: SimpleGainParams) -> dict[str, Any]:
    return {
        "r_gain": p.r_gain,
        "g_gain": p.g_gain,
        "b_gain": p.b_gain,
        "exposure_mul": p.exposure_mul,
    }


def run_phase1_samples(
    *,
    reference_path: Path,
    raw_one_path: Path,
    sample_dir: Path,
    api_key: str,
    model_name: str,
    preview_max: int = 1536,
    sample_quality: int = 82,
    half_size: bool = True,
    histogram_match_alpha: float = DEFAULT_HISTOGRAM_MATCH_ALPHA,
    override_simple_params: dict[str, Any] | None = None,
    override_strength: float = 0.0,
    grok_api_key: str | None = None,
    grok_model: str = DEFAULT_GROK_MODEL,
    multi_agent_review: bool = False,
) -> tuple[str, dict[str, SimpleGainParams], Path]:
    ref_pil = load_reference_pil(reference_path, preview_max)
    ref_hist_pil = open_reference_rgb_histogram_source(reference_path)
    raw_pil = raw_preview_pil(raw_one_path, preview_max)
    ref_mean = pil_rgb_mean(ref_pil)
    raw_mean = pil_rgb_mean(raw_pil)
    implied = implied_rgb_ratio(ref_mean, raw_mean)
    hm_alpha = float(np.clip(histogram_match_alpha, 0.0, 1.0))
    analysis, variants, raw_text = call_gemini_style_variants(
        ref_pil,
        raw_pil,
        api_key,
        model_name=model_name,
        ref_mean=ref_mean,
        raw_mean=raw_mean,
        implied=implied,
    )
    aligned = simple_params_align_ref_raw(ref_mean, raw_mean)
    only_key = PHASE1_VARIANT_KEYS[0]
    gem = variants.get(only_key)
    if gem is not None and (gem.label or "").strip():
        aligned = replace(aligned, label=(gem.label or "").strip()[:120])

    # 참조 XMP가 있으면 Phase1 미리보기에도 “기본 노출/WB”를 근사 반영해 더 비슷하게 보이게 한다.
    ref_xmp = find_sidecar_xmp_path(reference_path)
    ref_crs = parse_lightroom_xmp(ref_xmp) if ref_xmp is not None else {}
    ref_xmp_gains = simple_gains_from_reference_crs(ref_crs)
    aligned_with_xmp = _compose_simple_gains(ref_xmp_gains, aligned)

    # --- 1차: 참조 XMP + 평균 정렬만 (Gemini 수치는 아직 샘플에 쓰지 않음)
    stage1_params = aligned_with_xmp

    sample_dir.mkdir(parents=True, exist_ok=True)
    stage1_np = develop_raw_zero_base_split_gains(
        raw_one_path,
        stage1_params,
        half_size=half_size,
        log_tag="Phase1[1차·XMP+정렬]",
        reference_pil_histogram=ref_hist_pil,
        histogram_match_alpha=hm_alpha,
    )
    only_name = PHASE1_VARIANT_KEYS[0]
    stage1_jpg = sample_dir / f"sample_{only_name}_stage1.jpg"
    save_jpeg(stage1_np, stage1_jpg, sample_quality)

    analysis_refine_ko = ""
    raw_refine_text = ""
    refine_ok = False
    refined_merged = stage1_params
    gemini2_merged = stage1_params
    multi_agent_ok = False
    debate_extra: dict[str, Any] = {}
    debate_log_excerpt = ""
    grok_model_used = (grok_model or DEFAULT_GROK_MODEL).strip() or DEFAULT_GROK_MODEL

    s1u8 = np.ascontiguousarray(np.clip(np.rint(stage1_np), 0, 255).astype(np.uint8))
    s1p = Image.fromarray(s1u8, mode="RGB")
    s1p.thumbnail((preview_max, preview_max), Image.Resampling.LANCZOS)

    # 2차 미리보기용 (토론: Gemini R1 블렌드 / 단일: Gemini 재조정 블렌드 / 실패: 1차와 동일)
    params_round2_preview: SimpleGainParams | None = None

    if multi_agent_review and (grok_api_key or "").strip():
        try:
            consensus_p, debate_extra, debate_log = run_inlog_multi_agent_debate(
                ref_pil,
                raw_pil,
                s1p,
                stage1_params,
                gemini_api_key=api_key,
                gemini_model=model_name,
                grok_api_key=grok_api_key.strip(),
                grok_model=grok_model_used,
                ref_mean=ref_mean,
                raw_mean=raw_mean,
            )
            for ln in debate_log.splitlines():
                _LOG.info("[Phase1-Debate] %s", ln)
            refined_merged = _blend_simple_gain_params(
                stage1_params,
                consensus_p,
                PHASE1_GEMINI_REFINE_BLEND,
            )
            gemini2_merged = refined_merged
            refine_ok = True
            multi_agent_ok = True
            debate_log_excerpt = debate_log[:12000]
            r3 = debate_extra.get("round3") if isinstance(debate_extra.get("round3"), dict) else {}
            gsum = str(r3.get("gemini_consensus_summary_ko", "")).strip()
            grsum = str(r3.get("grok_consensus_summary_ko", "")).strip()
            analysis_refine_ko = (
                "[멀티에이전트 토론] R1에서 Gemini·Grok 각각 독립 제안 → R2 교차 비판 → "
                "R3에서 각자 합의안 제시 후 수치 평균으로 병합했습니다.\n"
                f"Gemini 합의 요약: {gsum}\nGrok 합의 요약: {grsum}".strip()
            )
            raw_refine_text = debate_log_excerpt
            try:
                r1d = (
                    debate_extra.get("round1")
                    if isinstance(debate_extra.get("round1"), dict)
                    else {}
                )
                gp = r1d.get("gemini_proposal")
                if isinstance(gp, dict) and gp:
                    p_g1 = SimpleGainParams.from_dict(gp)
                    params_round2_preview = _blend_simple_gain_params(
                        stage1_params,
                        p_g1,
                        PHASE1_GEMINI_REFINE_BLEND,
                    )
            except Exception as ex2:
                _LOG.warning("토론 2차 수치 파싱 생략: %s", ex2)
        except Exception as ex:
            _LOG.warning("멀티에이전트 토론 실패, 단일 Gemini 2차로 폴백: %s", ex)
            try:
                analysis_refine_ko, refined_guess, raw_refine_text = call_gemini_preview_refine(
                    ref_pil,
                    raw_pil,
                    s1p,
                    stage1_params,
                    api_key,
                    model_name=model_name,
                    ref_mean=ref_mean,
                    raw_mean=raw_mean,
                )
                refined_merged = _blend_simple_gain_params(
                    stage1_params,
                    refined_guess,
                    PHASE1_GEMINI_REFINE_BLEND,
                )
                gemini2_merged = refined_merged
                refine_ok = True
                params_round2_preview = refined_merged
            except Exception:
                refined_merged = stage1_params
                gemini2_merged = stage1_params
                params_round2_preview = stage1_params
    else:
        try:
            analysis_refine_ko, refined_guess, raw_refine_text = call_gemini_preview_refine(
                ref_pil,
                raw_pil,
                s1p,
                stage1_params,
                api_key,
                model_name=model_name,
                ref_mean=ref_mean,
                raw_mean=raw_mean,
            )
            refined_merged = _blend_simple_gain_params(
                stage1_params,
                refined_guess,
                PHASE1_GEMINI_REFINE_BLEND,
            )
            gemini2_merged = refined_merged
            refine_ok = True
            params_round2_preview = refined_merged
        except Exception:
            refined_merged = stage1_params
            gemini2_merged = stage1_params
            params_round2_preview = stage1_params

    if params_round2_preview is None:
        params_round2_preview = stage1_params
    try:
        rgb_r2 = develop_raw_zero_base_split_gains(
            raw_one_path,
            params_round2_preview,
            half_size=half_size,
            log_tag="Phase1[2차 미리보기]",
            reference_pil_histogram=ref_hist_pil,
            histogram_match_alpha=hm_alpha,
        )
        save_jpeg(
            rgb_r2,
            sample_dir / f"sample_{only_name}_round2.jpg",
            sample_quality,
        )
    except Exception as ex_r2:
        _LOG.warning("2차 미리보기 JPG 저장 실패: %s", ex_r2)

    if override_simple_params is not None and isinstance(override_simple_params, dict):
        try:
            ov = SimpleGainParams.from_dict(override_simple_params)
            if _is_identity_simple_gain(ov):
                final_params = refined_merged
            else:
                final_params = _blend_simple_gain_params(
                    refined_merged, ov, override_strength
                )
        except Exception:
            final_params = refined_merged
    else:
        final_params = refined_merged

    final_xmp_crs_preview = merge_reference_crs_with_simple_gains(ref_crs, final_params)

    for k in PHASE1_VARIANT_KEYS:
        variants[k] = final_params

    full_analysis = analysis
    if (analysis_refine_ko or "").strip():
        sec_title = (
            "--- 멀티에이전트 토론(Gemini×Grok, R1→R2→R3) ---"
            if multi_agent_ok
            else "--- 2차(1차 미리보기 기반 재조정) ---"
        )
        full_analysis = (
            analysis.rstrip() + "\n\n" + sec_title + "\n" + (analysis_refine_ko or "").strip()
        ).strip()

    multi_agent_meta: dict[str, Any] = {
        "requested": bool(multi_agent_review),
        "grok_key_configured": bool((grok_api_key or "").strip()),
        "grok_model": grok_model_used,
        "pipeline_complete_ok": multi_agent_ok,
        "debate": debate_extra,
        "debate_log_excerpt": debate_log_excerpt,
        "debate_summary_ko": str(debate_extra.get("debate_summary_ko", "")).strip()
        if multi_agent_ok
        else "",
    }

    meta_path = sample_dir / "variants_meta.json"
    meta = {
        "analysis_ko": full_analysis,
        "reference": str(reference_path),
        "reference_image_for_histogram": str(reference_path.resolve()),
        "reference_xmp_path": str(ref_xmp.resolve()) if ref_xmp is not None else "",
        "reference_xmp_crs_keys": sorted(ref_crs.keys()) if ref_crs else [],
        "histogram_match_alpha": hm_alpha,
        "raw_source": str(raw_one_path),
        "model": model_name,
        "ref_rgb_mean": list(ref_mean),
        "raw_rgb_mean": list(raw_mean),
        "implied_ratio_rgb": list(implied),
        "raw_response_excerpt": raw_text[:12000],
        "phase1_two_stage": True,
        "phase1_gemini_refine_ok": refine_ok,
        "phase1_gemini_refine_blend": PHASE1_GEMINI_REFINE_BLEND,
        "phase1_stage1_params": _simple_variant_to_json_dict(stage1_params),
        "phase1_gemini2_merged_params": _simple_variant_to_json_dict(gemini2_merged),
        "phase1_after_refine_params": _simple_variant_to_json_dict(refined_merged),
        "final_xmp_crs_preview": final_xmp_crs_preview,
        "multi_agent": multi_agent_meta,
        "gemini_refine_response_excerpt": raw_refine_text[:12000] if raw_refine_text else "",
        "override_strength": float(np.clip(float(override_strength), 0.0, 1.0)),
        "override_simple_params": override_simple_params if override_simple_params is not None else {},
        "variants": {},
    }
    raw_obj = extract_json_object(raw_text)
    labels: dict[str, str] = {}
    if isinstance(raw_obj.get("variants"), dict):
        for raw_k, vb in raw_obj["variants"].items():
            nk = _normalize_variant_key(raw_k)
            if nk and isinstance(vb, dict) and vb.get("label") is not None:
                labels[nk] = str(vb.get("label", ""))
    for name in PHASE1_VARIANT_KEYS:
        params = variants[name]
        rgb = develop_raw_zero_base_split_gains(
            raw_one_path,
            params,
            half_size=half_size,
            log_tag=f"Phase1[{name}]",
            reference_pil_histogram=ref_hist_pil,
            histogram_match_alpha=hm_alpha,
        )
        out_jpg = sample_dir / f"sample_{name}.jpg"
        save_jpeg(rgb, out_jpg, sample_quality)
        meta["variants"][name] = {
            "label": labels.get(name, params.label),
            **_simple_variant_to_json_dict(params),
        }
    meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    pack_path = sample_dir / "variants_ABC.json"
    serial: dict[str, Any] = {
        "analysis_ko": full_analysis,
        "ref_rgb_mean": list(ref_mean),
        "raw_rgb_mean": list(raw_mean),
        "implied_ratio_rgb": list(implied),
        "histogram_match_alpha": hm_alpha,
        "reference_image_for_histogram": str(reference_path.resolve()),
        "reference_xmp_path": str(ref_xmp.resolve()) if ref_xmp is not None else "",
        "final_xmp_crs_preview": final_xmp_crs_preview,
        "multi_agent": multi_agent_meta,
        "variants": {},
    }
    for key in PHASE1_VARIANT_KEYS:
        p = variants[key]
        serial["variants"][key] = {
            "label": labels.get(key, p.label),
            **_simple_variant_to_json_dict(p),
        }
    pack_path.write_text(json.dumps(serial, ensure_ascii=False, indent=2), encoding="utf-8")
    return full_analysis, variants, pack_path


def load_variant_choice_from_pack(
    pack_path: Path, choice: str
) -> SimpleGainParams | StyleDevelopParams:
    data = json.loads(pack_path.read_text(encoding="utf-8"))
    variants = data.get("variants")
    if not isinstance(variants, dict):
        raise ValueError("variants_ABC.json 형식 오류")
    c = choice.strip()
    if c.isdigit():
        c = f"{int(c):02d}"
    if len(c) == 1 and c.isalpha():
        cu = c.upper()
        if cu in variants:
            c = cu
    if c not in variants:
        raise ValueError(f'선택 "{choice}" 에 해당하는 변형이 없습니다 (01 또는 A/B/C).')
    block = variants[c]
    if not isinstance(block, dict):
        raise ValueError("variant 블록 오류")
    inner = {k: v for k, v in block.items() if k != "label"}
    if any(k in inner for k in ("r_gain", "g_gain", "b_gain", "exposure_mul")):
        return SimpleGainParams.from_dict(inner)
    return StyleDevelopParams.from_dict(inner)


def run_phase2_batch(
    input_dir: Path,
    output_dir: Path,
    params: SimpleGainParams | StyleDevelopParams,
    *,
    jpeg_quality: int = 95,
    verbose: bool = False,
    pack_path: Path | None = None,
    reference_for_histogram: Path | None = None,
    histogram_match_alpha: float | None = None,
    write_jpeg: bool = False,
    write_sidecar_xmp: bool = True,
) -> int:
    output_dir.mkdir(parents=True, exist_ok=True)
    alpha_eff = DEFAULT_HISTOGRAM_MATCH_ALPHA
    ref_file: Path | None = None
    ref_crs_map: dict[str, str] = {}
    ref_crs_from_explicit_xmp = False
    if pack_path is not None and pack_path.is_file():
        a0, rp, ref_crs_map, ref_crs_from_explicit_xmp = read_histogram_options_from_pack(
            pack_path
        )
        alpha_eff = a0
        ref_file = rp
    if histogram_match_alpha is not None:
        alpha_eff = float(np.clip(float(histogram_match_alpha), 0.0, 1.0))
    if reference_for_histogram is not None:
        rh = Path(reference_for_histogram).expanduser()
        if rh.is_file():
            ref_file = rh
        else:
            print(
                f"[style-transfer] Phase2 히스토그램 참조 파일 없음 → 건너뜀: {rh}",
                file=sys.stderr,
                flush=True,
            )
    if (
        not ref_crs_from_explicit_xmp
        and ref_file is not None
        and ref_file.is_file()
    ):
        xp_use = find_sidecar_xmp_path(ref_file)
        if xp_use is not None:
            ref_crs_map = parse_lightroom_xmp(xp_use)
    ref_hist_pil: Image.Image | None = None
    if (
        isinstance(params, SimpleGainParams)
        and alpha_eff > 1e-9
        and ref_file is not None
        and ref_file.is_file()
    ):
        ref_hist_pil = open_reference_rgb_histogram_source(ref_file)
    elif isinstance(params, SimpleGainParams) and alpha_eff > 1e-9:
        print(
            "[style-transfer] Phase2: histogram_match_alpha>0 이지만 참조 이미지 경로가 없어 "
            "히스토그램 매칭을 건너뜁니다.",
            file=sys.stderr,
            flush=True,
        )
        alpha_eff = 0.0

    n = 0
    for pth in collect_raw_files(input_dir):
        if isinstance(params, SimpleGainParams):
            rgb = develop_raw_zero_base_split_gains(
                pth,
                params,
                half_size=False,
                log_tag=f"Phase2[{pth.name}]",
                reference_pil_histogram=ref_hist_pil,
                histogram_match_alpha=alpha_eff if ref_hist_pil is not None else 0.0,
                write_sidecar_xmp=write_sidecar_xmp,
                reference_crs_map=ref_crs_map,
            )
        else:
            rgb = develop_raw_to_rgb(
                pth, params, half_size=False, log_tag=f"Phase2[{pth.name}]"
            )
        if write_jpeg:
            save_jpeg(rgb, output_dir / f"{pth.stem}.jpg", jpeg_quality)
        n += 1
        if verbose:
            print(pth.name, file=sys.stderr)
    return n
