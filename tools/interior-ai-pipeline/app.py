"""
🪟 Window Pull AI  —  Gemini 영역 감지 + 이미지 생성 합성
────────────────────────────────────────────────────────────
워크플로우:
  1. 인테리어 Base 이미지 업로드
  2. Gemini에게 자연어 프롬프트로 영역 지정 ("창문 영역 선택해줘" 등)
  3. Gemini 이미지 생성 모델로 해당 영역을 새로 생성
  4. 원본과 합성 → 다운로드
"""

from __future__ import annotations

import io
import json
import os
import re
from pathlib import Path

import cv2
import numpy as np
import streamlit as st
from PIL import Image

# ── Gemini API 키 자동 탐색 경로 ─────────────────────────────────────────────
_ENV_SEARCH = [
    Path(__file__).parents[2] / "lightroom-ai-controller" / ".env",
    Path(__file__).parents[2] / ".env",
    Path(__file__).parent / ".env",
]

# ── 기본 프롬프트 ─────────────────────────────────────────────────────────────
DEFAULT_GROK_DETECT_PROMPT = (
    "이 사진의 창문을 먼저 찾고 샷시를 제외한 창문 밖 모든 부분을 선택하라"
)

DEFAULT_GEN_PROMPT = (
    "Make the outdoor view appear as if it was photographed directly outside, "
    "not through a window. Remove any window glare, reflections, tint, haze, or "
    "light distortion. Ensure the scene looks clear, sharp, and naturally detailed, "
    "as if captured in open air with direct outdoor lighting."
)

PREVIEW_MAX_W = 900

# ── 페이지 설정 ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Window Pull AI",
    page_icon="🪟",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown("""
<style>
.wp-title  { font-size:2.2rem; font-weight:800; color:#e8eaf6; margin-bottom:0; }
.wp-sub    { color:#9fa8da; margin-top:0; margin-bottom:1.5rem; font-size:1rem; }
.step-card {
    background:#161b2e;
    border:1px solid #252d4a;
    border-radius:12px;
    padding:1.4rem 1.6rem 1.2rem;
    margin-bottom:1.2rem;
}
.step-badge {
    background:#3949ab;
    color:#fff;
    border-radius:50%;
    padding:2px 9px;
    font-weight:700;
    margin-right:8px;
}
.gen-prompt-box {
    background:#0d1117;
    border:1px solid #30363d;
    border-radius:8px;
    padding:0.8rem 1rem;
    font-size:0.85rem;
    color:#8b949e;
    white-space:pre-wrap;
}
</style>
""", unsafe_allow_html=True)


# ══════════════════════════════════════════════════════════════════════════════
# 유틸
# ══════════════════════════════════════════════════════════════════════════════

def to_rgb(f) -> np.ndarray:
    return np.array(Image.open(f).convert("RGB"), dtype=np.uint8)

def to_pil(arr: np.ndarray) -> Image.Image:
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def encode_jpg(arr: np.ndarray, quality: int = 97) -> bytes:
    buf = io.BytesIO()
    to_pil(arr).save(buf, format="JPEG", quality=quality, subsampling=0)
    return buf.getvalue()

def np_to_jpg_bytes(arr: np.ndarray, quality: int = 90) -> bytes:
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="JPEG", quality=quality)
    return buf.getvalue()

def feather(mask: np.ndarray, radius: int) -> np.ndarray:
    if radius <= 0:
        return mask.astype(np.float32)
    k = radius * 2 + 1
    return cv2.GaussianBlur(mask.astype(np.float32), (k, k), radius * 0.5)

def draw_boxes(img: np.ndarray, boxes: list[dict],
               color=(50, 220, 110), thickness=3) -> np.ndarray:
    out = img.copy()
    for i, b in enumerate(boxes):
        cv2.rectangle(out, (b["xmin"], b["ymin"]), (b["xmax"], b["ymax"]),
                      color, thickness)
        label = f"#{i+1}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 1.0, 2)
        cv2.rectangle(out, (b["xmin"], b["ymin"] - th - 10),
                      (b["xmin"] + tw + 10, b["ymin"]), color, -1)
        cv2.putText(out, label, (b["xmin"] + 5, b["ymin"] - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    return out


# 꼭지점 색상 팔레트 (영역별로 다른 색)
_QUAD_COLORS = [
    (80, 200, 120),   # 초록
    (80, 160, 255),   # 파랑
    (255, 180, 50),   # 노랑
    (220, 80, 200),   # 보라
    (255, 100, 80),   # 빨강
]

def draw_quad_preview(
    img: np.ndarray,
    corner_points: list[list[int]],
) -> np.ndarray:
    """
    찍힌 꼭지점들을 이미지에 시각화.
    - 4개 완성된 세트: 채워진 반투명 사각형 + 테두리 + 번호
    - 현재 진행 중인 세트: 점 + 점 잇는 선 + 번호
    """
    out = img.copy()
    n = len(corner_points)
    completed_quads = n // 4       # 완성된 사각형 수
    in_progress_pts = corner_points[completed_quads * 4:]  # 현재 찍는 중

    # ── 완성된 사각형 그리기 ──────────────────────────────────────────────
    for qi in range(completed_quads):
        pts = corner_points[qi * 4 : qi * 4 + 4]
        color = _QUAD_COLORS[qi % len(_QUAD_COLORS)]
        poly = np.array(pts, dtype=np.int32)

        # 반투명 채우기
        overlay = out.copy()
        cv2.fillPoly(overlay, [poly], color)
        cv2.addWeighted(overlay, 0.25, out, 0.75, 0, out)

        # 테두리
        cv2.polylines(out, [poly], isClosed=True, color=color, thickness=3)

        # 꼭지점 점 + 번호
        for pi, (px, py) in enumerate(pts):
            global_idx = qi * 4 + pi + 1
            cv2.circle(out, (px, py), 10, color, -1)
            cv2.circle(out, (px, py), 11, (0, 0, 0), 2)
            cv2.putText(out, str(global_idx), (px + 14, py + 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        # 중앙에 영역 번호
        cx = int(np.mean([p[0] for p in pts]))
        cy = int(np.mean([p[1] for p in pts]))
        label = f"ROI {qi+1}"
        cv2.putText(out, label, (cx - 30, cy + 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 3)
        cv2.putText(out, label, (cx - 30, cy + 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, color, 2)

    # ── 현재 진행 중인 점들 ───────────────────────────────────────────────
    if in_progress_pts:
        color = _QUAD_COLORS[completed_quads % len(_QUAD_COLORS)]
        for pi, (px, py) in enumerate(in_progress_pts):
            global_idx = completed_quads * 4 + pi + 1
            # 점 사이 선
            if pi > 0:
                prev = in_progress_pts[pi - 1]
                cv2.line(out, (prev[0], prev[1]), (px, py), color, 2)
            cv2.circle(out, (px, py), 10, color, -1)
            cv2.circle(out, (px, py), 11, (0, 0, 0), 2)
            cv2.putText(out, str(global_idx), (px + 14, py + 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        # 마지막 점 → 첫 점 점선 힌트 (4번째 찍기 직전 가이드)
        if len(in_progress_pts) == 3:
            p0 = in_progress_pts[0]
            p3 = in_progress_pts[2]
            for t in np.linspace(0, 1, 12)[1::2]:
                ix = int(p0[0] * (1-t) + p3[0] * t)
                iy = int(p0[1] * (1-t) + p3[1] * t)
                cv2.circle(out, (ix, iy), 3, color, -1)

    return out


def warp_quad_crop(img: np.ndarray, pts4: list[list[int]]):
    """
    4개 꼭지점으로 정의된 사각형 영역을 투시 변환으로 정방형으로 펴서 크롭.
    반환: (warped_img, M, out_w, out_h)  — M은 원본→정방형 변환 행렬
    """
    src = np.array(pts4, dtype=np.float32)
    # 출력 크기: 각 변의 최대 길이
    w1 = np.linalg.norm(src[1] - src[0])
    w2 = np.linalg.norm(src[2] - src[3])
    h1 = np.linalg.norm(src[3] - src[0])
    h2 = np.linalg.norm(src[2] - src[1])
    out_w = max(int(max(w1, w2)), 1)
    out_h = max(int(max(h1, h2)), 1)
    dst = np.array([[0, 0], [out_w, 0], [out_w, out_h], [0, out_h]], dtype=np.float32)
    M = cv2.getPerspectiveTransform(src, dst)
    warped = cv2.warpPerspective(img, M, (out_w, out_h))
    return warped, M, out_w, out_h


def composite_quad_regions(
    base: np.ndarray,
    quads: list[list[list[int]]],  # list of [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]
    gen_images: list[np.ndarray],
    feather_px: int = 20,
) -> np.ndarray:
    """
    생성된 이미지를 각 4-꼭지점 영역에 역투시 변환으로 합성
    """
    h, w = base.shape[:2]
    result = base.copy().astype(np.float32)

    for pts4, gen_img in zip(quads, gen_images):
        src = np.array(pts4, dtype=np.float32)
        gh, gw = gen_img.shape[:2]

        # 생성 이미지 모서리 → 원본 꼭지점으로 역투시 변환
        dst_corners = np.array([[0, 0], [gw, 0], [gw, gh], [0, gh]], dtype=np.float32)
        M_inv = cv2.getPerspectiveTransform(dst_corners, src)
        gen_warped = cv2.warpPerspective(gen_img, M_inv, (w, h))

        # 폴리곤 마스크
        mask = np.zeros((h, w), dtype=np.float32)
        cv2.fillPoly(mask, [src.astype(np.int32)], 1.0)

        # 페더링
        if feather_px > 0:
            k = feather_px * 2 + 1
            mask = cv2.GaussianBlur(mask, (k, k), feather_px * 0.4)

        for c in range(3):
            result[:, :, c] = (
                result[:, :, c] * (1 - mask) +
                gen_warped[:, :, c].astype(np.float32) * mask
            )

    return np.clip(result, 0, 255).astype(np.uint8)


# ══════════════════════════════════════════════════════════════════════════════
# Gemini 유틸
# ══════════════════════════════════════════════════════════════════════════════

def _load_gemini_key() -> str:
    for env_path in _ENV_SEARCH:
        if not env_path.exists():
            continue
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith("GEMINI_API_KEY"):
                val = line.split("=", 1)[-1].strip().strip("'\"`")
                if val and "your_" not in val.lower():
                    return val
    return os.environ.get("GEMINI_API_KEY", "")


def gemini_detect_region(
    img_np: np.ndarray, user_prompt: str, api_key: str
) -> list[dict]:
    """
    자연어 프롬프트로 이미지 영역 감지 → bounding box 목록 반환
    반환 형식: [{"xmin":int, "ymin":int, "xmax":int, "ymax":int}, ...]
    좌표: 원본 픽셀 단위
    """
    from google import genai
    from google.genai import types

    h, w = img_np.shape[:2]
    max_side = 1024
    scale = min(1.0, max_side / max(w, h))
    sw, sh = int(w * scale), int(h * scale)
    send_img = cv2.resize(img_np, (sw, sh), interpolation=cv2.INTER_AREA)
    img_bytes = np_to_jpg_bytes(send_img)

    system_prompt = (
        f"사용자 요청: {user_prompt}\n\n"
        "규칙:\n"
        "1. 창문 유리를 통해 보이는 실외 풍경 영역만 감지해."
        " (Detect the outdoor scenery visible through the window panes ONLY.)\n"
        "2. 창문 프레임, 샷시(sash), 창틀, 실내 벽면은 절대 포함하지 마."
        " (Exclude all window frames, sashes, mullions, and interior elements.)\n"
        "3. 좌표는 유리면 안쪽 픽셀만 포함하도록 최대한 타이트하게 잡아.\n"
        "4. 각 영역의 bounding box를 아래 JSON 형식으로만 반환해 (다른 설명 없이):\n"
        '{"regions": [[ymin, xmin, ymax, xmax], ...]}\n'
        "- 좌표 스케일: 0~1000 (이미지 전체를 1000 기준)\n"
        '- 여러 개면 모두 포함. 없으면: {"regions": []}'
    )

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Content(role="user", parts=[
                types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                types.Part.from_text(text=system_prompt),
            ])
        ],
    )

    text = response.text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return []
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        return []

    raw = data.get("regions", data.get("windows", data.get("boxes", [])))
    result = []
    for b in raw:
        try:
            if isinstance(b, (list, tuple)) and len(b) >= 4:
                ymin_r, xmin_r, ymax_r, xmax_r = b[0], b[1], b[2], b[3]
            elif isinstance(b, dict):
                xmin_r = b.get("xmin", b.get("x_min", b.get("left", 0)))
                ymin_r = b.get("ymin", b.get("y_min", b.get("top", 0)))
                xmax_r = b.get("xmax", b.get("x_max", b.get("right", 1000)))
                ymax_r = b.get("ymax", b.get("y_max", b.get("bottom", 1000)))
            else:
                continue
            result.append({
                "xmin": max(0, int(xmin_r / 1000 * w)),
                "ymin": max(0, int(ymin_r / 1000 * h)),
                "xmax": min(w, int(xmax_r / 1000 * w)),
                "ymax": min(h, int(ymax_r / 1000 * h)),
            })
        except Exception:
            continue
    return result


def gemini_detect_polygon(
    img_np: np.ndarray, user_prompt: str, api_key: str
) -> np.ndarray:
    """
    Gemini에게 폴리곤 좌표를 요청 → (H,W) uint8 마스크 반환.
    채팅과 동일하게 샷시를 제외한 유리면 풍경 영역만 픽셀 수준으로 표현.
    """
    from google import genai
    from google.genai import types

    h, w = img_np.shape[:2]
    max_side = 1024
    scale = min(1.0, max_side / max(w, h))
    sw, sh = int(w * scale), int(h * scale)
    send_img = cv2.resize(img_np, (sw, sh), interpolation=cv2.INTER_AREA)
    img_bytes = np_to_jpg_bytes(send_img)

    system_prompt = (
        f"사용자 요청: {user_prompt}\n\n"
        "각 유리창 패널마다 정확한 경계 폴리곤(꼭지점 좌표 목록)을 반환해.\n"
        "규칙:\n"
        "1. 창문 유리를 통해 보이는 실외 풍경 영역만 포함."
        " (outdoor scenery through glass ONLY)\n"
        "2. 창틀·샷시·프레임·실내 요소는 절대 포함하지 마.\n"
        "3. 각 유리 패널 경계를 최소 6개 꼭지점 폴리곤으로 정밀하게 표현.\n"
        "4. 아래 JSON 형식으로만 반환 (다른 설명 없이):\n"
        '{"regions": [[[y1,x1],[y2,x2],...], ...]}\n'
        "- 좌표 순서: [y, x] (세로 먼저, 가로 두 번째)\n"
        "- 좌표 스케일: 0~1000 (이미지 전체 기준)\n"
        '- 여러 패널이면 모두 포함. 없으면: {"regions": []}'
    )

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            types.Content(role="user", parts=[
                types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg"),
                types.Part.from_text(text=system_prompt),
            ])
        ],
    )

    text = response.text.strip()
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return np.zeros((h, w), dtype=np.uint8)
    try:
        data = json.loads(match.group())
    except json.JSONDecodeError:
        return np.zeros((h, w), dtype=np.uint8)

    raw_regions = data.get("regions", [])
    mask = np.zeros((h, w), dtype=np.uint8)

    # ── 좌표 스케일 자동 감지 ─────────────────────────────────────────
    # Gemini는 다음 세 가지 중 하나로 좌표를 반환할 수 있음:
    #   A) 0-1000 정규화 (이미지 전체 기준)
    #   B) 전송된 이미지의 실제 픽셀 좌표 (sw, sh 기준)
    #   C) 원본 이미지의 실제 픽셀 좌표 (w, h 기준)
    #
    # 첫 번째 점의 최댓값으로 어느 스케일인지 판별
    all_vals = []
    for poly_raw in raw_regions[:2]:
        for pt in poly_raw[:4]:
            if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                all_vals.extend([float(pt[0]), float(pt[1])])

    max_val = max(all_vals) if all_vals else 1000.0

    if max_val <= 1.0:
        coord_scale = 1.0        # 0-1 normalized → multiply by dimension
        norm_base_h, norm_base_w = 1.0, 1.0
    elif max_val <= 1000.0:
        coord_scale = 1000.0     # 0-1000 normalized
        norm_base_h, norm_base_w = 1000.0, 1000.0
    elif max_val <= max(sw, sh) * 1.05:
        coord_scale = None       # 전송 이미지 픽셀 좌표
        norm_base_h, norm_base_w = float(sh), float(sw)
    else:
        coord_scale = None       # 원본 픽셀 좌표
        norm_base_h, norm_base_w = float(h), float(w)

    def _to_px(val_a, val_b):
        """(a=첫번째값, b=두번째값) → (px, py) 원본 픽셀"""
        if norm_base_h == norm_base_w and norm_base_h in (1.0, 1000.0):
            # 정규화 좌표: Gemini가 [y,x] 순서로 반환
            py = max(0, min(h - 1, int(val_a / norm_base_h * h)))
            px = max(0, min(w - 1, int(val_b / norm_base_w * w)))
        else:
            # 픽셀 좌표: [y,x] 픽셀 → 원본 스케일로 변환
            py = max(0, min(h - 1, int(val_a / norm_base_h * h)))
            px = max(0, min(w - 1, int(val_b / norm_base_w * w)))
        return px, py

    for poly_raw in raw_regions:
        if not isinstance(poly_raw, list) or len(poly_raw) < 3:
            continue
        try:
            pts = []
            for pt in poly_raw:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    px, py = _to_px(pt[0], pt[1])
                    pts.append([px, py])
            if len(pts) >= 3:
                cv2.fillPoly(mask, [np.array(pts, dtype=np.int32)], 255)
        except Exception:
            continue

    # ── 전송 이미지 크기 기준 미리보기 마스크 생성 ──────────────────
    # Gemini 좌표 → 전송 이미지(sw×sh) 픽셀로 직접 변환해서 검증용 오버레이 생성
    sent_mask = np.zeros((sh, sw), dtype=np.uint8)
    for poly_raw in raw_regions:
        if not isinstance(poly_raw, list) or len(poly_raw) < 3:
            continue
        try:
            pts_sent = []
            for pt in poly_raw:
                if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                    # 0-1000 → 전송 이미지 픽셀 (y, x 순서)
                    spy = max(0, min(sh - 1, int(pt[0] / norm_base_h * sh)))
                    spx = max(0, min(sw - 1, int(pt[1] / norm_base_w * sw)))
                    pts_sent.append([spx, spy])
            if len(pts_sent) >= 3:
                cv2.fillPoly(sent_mask, [np.array(pts_sent, dtype=np.int32)], 255)
        except Exception:
            continue

    # 전송 이미지 + 마스크 오버레이
    sent_overlay = send_img.copy().astype(np.float32)
    m_sent = sent_mask > 127
    sent_overlay[m_sent] = (
        sent_overlay[m_sent] * 0.4
        + np.array([30, 144, 255], dtype=np.float32) * 0.6
    )
    sent_preview = sent_overlay.astype(np.uint8)

    # ── 디버그 정보 session_state에 저장 ─────────────────────────────
    try:
        import streamlit as _st
        _st.session_state["_poly_debug"] = {
            "원본_이미지_크기": f"{w}×{h}",
            "전송_이미지_크기": f"{sw}×{sh}",
            "스케일_팩터": round(scale, 4),
            "감지된_좌표_스케일": (
                "0-1 정규화" if norm_base_h == 1.0
                else "0-1000 정규화" if norm_base_h == 1000.0
                else f"전송이미지 픽셀({sw}×{sh})" if norm_base_h == sh
                else f"원본이미지 픽셀({w}×{h})"
            ),
            "max_좌표값": round(max_val, 1),
            "폴리곤수": len(raw_regions),
            "raw_첫3개": raw_regions[:3],
        }
        _st.session_state["_poly_sent_preview"] = sent_preview  # 검증용 이미지
    except Exception:
        pass

    return mask


# ══════════════════════════════════════════════════════════════════════════════
# Grok (xAI) 유틸
# ══════════════════════════════════════════════════════════════════════════════

def _load_grok_key() -> str:
    for env_path in _ENV_SEARCH:
        if not env_path.exists():
            continue
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line.startswith(("XAI_API_KEY", "GROK_API_KEY")):
                val = line.split("=", 1)[-1].strip().strip("'\"`")
                if val and "your_" not in val.lower():
                    return val
    return os.environ.get("XAI_API_KEY", os.environ.get("GROK_API_KEY", ""))


def grok_detect_region(
    img_np: np.ndarray, user_prompt: str, api_key: str
) -> list[dict]:
    """
    Grok Vision으로 자연어 프롬프트 영역 감지 → bounding box 목록 반환
    반환 형식: [{"xmin":int, "ymin":int, "xmax":int, "ymax":int}, ...]
    """
    import base64 as _b64
    import json as _json
    import urllib.error
    import urllib.request

    h, w = img_np.shape[:2]
    # xAI 권장: 768px 이하
    max_side = 768
    scale = min(1.0, max_side / max(w, h))
    sw, sh = int(w * scale), int(h * scale)
    send_img = cv2.resize(img_np, (sw, sh), interpolation=cv2.INTER_AREA)
    img_bytes = np_to_jpg_bytes(send_img, quality=85)
    b64_data = _b64.b64encode(img_bytes).decode()

    system_prompt = (
        f"사용자 요청: {user_prompt}\n\n"
        "위 요청에 해당하는 영역을 이미지에서 정확히 찾아.\n"
        "각 영역의 bounding box를 아래 JSON 형식으로만 반환해 (다른 설명 없이):\n"
        '{"regions": [[ymin, xmin, ymax, xmax], ...]}\n'
        "- 좌표 스케일: 0~1000 (이미지 전체를 1000 기준)\n"
        "- 창문 프레임/샷시는 제외하고 유리 안쪽 바깥 풍경 영역만 포함할 것\n"
        '- 여러 개면 모두 포함. 없으면: {"regions": []}'
    )

    # ── Step 1: 사용 가능한 모델 자동 탐색 ─────────────────────────────
    def _grok_all_models() -> list[str]:
        """xAI /v1/models 에서 전체 모델 ID 목록 반환. 실패 시 빈 리스트."""
        try:
            mreq = urllib.request.Request(
                "https://api.x.ai/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                method="GET",
            )
            with urllib.request.urlopen(mreq, timeout=10) as r:
                mdata = _json.loads(r.read())
            return [m["id"] for m in mdata.get("data", [])]
        except Exception:
            return []

    def _grok_pick_models(all_ids: list[str]) -> list[str]:
        """Vision / 최신 텍스트 모델 우선 정렬. 이미지 생성·영상 전용 모델 제외."""
        _EXCLUDE = {"imagine", "video"}
        filtered = [m for m in all_ids
                    if not any(x in m.lower() for x in _EXCLUDE)]
        vision_first = sorted(
            filtered,
            key=lambda m: (0 if "vision" in m.lower() else 1,
                           0 if "3" in m else 1)
        )
        # 항상 후보군 포함 (API가 목록을 내려주지 않을 경우 대비)
        fallback = ["grok-3", "grok-3-mini", "grok-2-1212",
                    "grok-2-vision-1212", "grok-2"]
        seen: set[str] = set()
        result = []
        for m in vision_first + fallback:
            if m not in seen:
                seen.add(m)
                result.append(m)
        return result

    _all_ids   = _grok_all_models()
    _GROK_MODELS = _grok_pick_models(_all_ids)
    all_errors: list[str] = []
    text: str = ""

    for model_name in _GROK_MODELS:
        body = {
            "model": model_name,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{b64_data}",
                            },
                        },
                        {"type": "text", "text": system_prompt},
                    ],
                }
            ],
            "temperature": 0.01,
            "max_tokens": 512,
        }

        req = urllib.request.Request(
            "https://api.x.ai/v1/chat/completions",
            data=_json.dumps(body).encode(),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                resp_data = _json.loads(resp.read())
            text = resp_data["choices"][0]["message"]["content"].strip()
            break  # 성공
        except urllib.error.HTTPError as e:
            err_body = e.read().decode(errors="replace")
            all_errors.append(f"{model_name} → HTTP {e.code}: {err_body[:200]}")
            continue
        except Exception as e:
            all_errors.append(f"{model_name} → {e}")
            continue
    else:
        raise RuntimeError(
            "Grok Vision 모델 전체 실패:\n" + "\n".join(all_errors)
        )

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return []
    try:
        parsed = _json.loads(match.group())
    except _json.JSONDecodeError:
        return []

    raw = parsed.get("regions", parsed.get("windows", parsed.get("boxes", [])))
    result = []
    for b in raw:
        try:
            if isinstance(b, (list, tuple)) and len(b) >= 4:
                ymin_r, xmin_r, ymax_r, xmax_r = b[0], b[1], b[2], b[3]
            elif isinstance(b, dict):
                xmin_r = b.get("xmin", b.get("x_min", b.get("left", 0)))
                ymin_r = b.get("ymin", b.get("y_min", b.get("top", 0)))
                xmax_r = b.get("xmax", b.get("x_max", b.get("right", 1000)))
                ymax_r = b.get("ymax", b.get("y_max", b.get("bottom", 1000)))
            else:
                continue
            result.append({
                "xmin": max(0, int(xmin_r / 1000 * w)),
                "ymin": max(0, int(ymin_r / 1000 * h)),
                "xmax": min(w, int(xmax_r / 1000 * w)),
                "ymax": min(h, int(ymax_r / 1000 * h)),
            })
        except Exception:
            continue
    return result


def gemini_generate_region(
    crop_np: np.ndarray, gen_prompt: str, api_key: str
) -> np.ndarray | None:
    """
    크롭된 영역 이미지 + 프롬프트 → Gemini 이미지 생성
    반환: 생성된 이미지 (RGB numpy), 실패 시 None
    """
    from google import genai
    from google.genai import types

    crop_bytes = np_to_jpg_bytes(crop_np, quality=92)

    # 나노바나나2(gemini-3.1-flash-image-preview) 우선, 이후 폴백
    _GEN_MODELS = [
        "gemini-3.1-flash-image-preview",   # 나노바나나2
        "gemini-3-pro-image-preview",
        "gemini-2.5-flash-image",
    ]

    import urllib.request

    last_err = None
    for model_name in _GEN_MODELS:
        try:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model_name}:generateContent?key={api_key}"
            )
            import base64 as _b64
            b64_data = _b64.b64encode(crop_bytes).decode()

            body_dict = {
                "contents": [{"role": "user", "parts": [
                    {"text": gen_prompt},
                    {"inlineData": {"mimeType": "image/jpeg", "data": b64_data}},
                ]}],
                "generationConfig": {
                    "responseModalities": ["TEXT", "IMAGE"],
                    "imageConfig": {"imageSize": "4K"},
                },
            }
            import urllib.request, json as _json
            req_obj = urllib.request.Request(
                url,
                data=_json.dumps(body_dict).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req_obj, timeout=120) as resp:
                resp_data = _json.loads(resp.read())

            candidates = resp_data.get("candidates", [])
            for cand in candidates:
                for part in (cand.get("content") or {}).get("parts", []):
                    inline = part.get("inlineData") or part.get("inline_data")
                    if inline and inline.get("data"):
                        raw_bytes = _b64.b64decode(inline["data"])
                        gen_pil = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
                        return np.array(gen_pil, dtype=np.uint8)
        except Exception as e:
            last_err = e
            continue

    raise RuntimeError(f"나노바나나2 이미지 생성 실패 (모든 모델 시도): {last_err}")


def composite_regions(
    base: np.ndarray,
    boxes: list[dict],
    gen_images: list[np.ndarray],
    feather_px: int = 20,
) -> np.ndarray:
    """
    생성된 이미지들을 각 bounding box 위치에 페더링 합성
    """
    result = base.copy().astype(np.float32)
    h, w = base.shape[:2]

    for box, gen_img in zip(boxes, gen_images):
        bx1, by1, bx2, by2 = box["xmin"], box["ymin"], box["xmax"], box["ymax"]
        bw, bh = bx2 - bx1, by2 - by1
        if bw <= 0 or bh <= 0:
            continue

        # 생성 이미지를 박스 크기에 맞게 리사이즈
        gen_resized = cv2.resize(gen_img, (bw, bh), interpolation=cv2.INTER_LANCZOS4)

        # 사각형 마스크 생성
        mask_box = np.zeros((h, w), dtype=np.float32)
        mask_box[by1:by2, bx1:bx2] = 1.0

        # 페더링 (경계 자연스럽게)
        if feather_px > 0:
            k = feather_px * 2 + 1
            mask_box = cv2.GaussianBlur(mask_box, (k, k), feather_px * 0.4)

        # 합성
        gen_full = np.zeros_like(result)
        gen_full[by1:by2, bx1:bx2] = gen_resized.astype(np.float32)

        for c in range(3):
            result[:, :, c] = (
                result[:, :, c] * (1 - mask_box) +
                gen_full[:, :, c] * mask_box
            )

    return np.clip(result, 0, 255).astype(np.uint8)


# ══════════════════════════════════════════════════════════════════════════════
# Meta SAM 2 유틸
# ══════════════════════════════════════════════════════════════════════════════

@st.cache_resource(show_spinner="SAM 2 모델 로딩 중...")
def _get_sam2_segmenter():
    from models.segmentation import SAM2WindowSegmenter
    return SAM2WindowSegmenter()


def gemini_sam2_hybrid_mask(
    base: np.ndarray,
    gemini_prompt: str,
    api_key: str,
    segmenter,
) -> tuple[np.ndarray, list[dict]]:
    """
    Gemini로 창문 유리 bounding box를 감지하고,
    각 box 중심점을 SAM 2 positive prompt로 사용해 정밀 마스크 생성.

    Returns:
        mask   : (H,W) uint8  — 유리 풍경 영역=255, 나머지=0
        boxes  : Gemini가 반환한 bbox 목록 (시각화용)
    """
    import torch

    h, w = base.shape[:2]
    rgb = base if base.shape[2] == 3 else cv2.cvtColor(base, cv2.COLOR_BGR2RGB)
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)

    # ── Step 1: Gemini bbox ──────────────────────────────────────────
    boxes = gemini_detect_region(base, gemini_prompt, api_key)
    if not boxes:
        # Gemini 실패 → SAM 2 단독
        return segmenter.generate_window_mask(base), []

    # ── Step 2: SAM 2 정밀 마스킹 ────────────────────────────────────
    if not segmenter.model_loaded:
        # SAM 2 없음 → Gemini 박스를 마스크로 변환
        mask = np.zeros((h, w), dtype=np.uint8)
        for b in boxes:
            mask[b["ymin"]:b["ymax"], b["xmin"]:b["xmax"]] = 255
        return mask, boxes

    combined = np.zeros((h, w), dtype=np.uint8)

    with torch.inference_mode():
        segmenter._predictor.set_image(rgb)

        for box in boxes:
            cx = (box["xmin"] + box["xmax"]) // 2
            cy = (box["ymin"] + box["ymax"]) // 2

            # Gemini 박스 영역의 상하좌우 중간 → 음성 포인트 (샷시/프레임 위치)
            neg_pts = [
                [box["xmin"] + 4,  cy],          # 좌측 프레임
                [box["xmax"] - 4,  cy],          # 우측 프레임
                [cx,               box["ymin"] + 4],  # 상단 프레임
                [cx,               box["ymax"] - 4],  # 하단 프레임
            ]
            pts = np.array([[cx, cy]] + neg_pts, dtype=np.float32)
            # 1=positive(유리중심), 0=negative(프레임)
            lbls = np.array([1, 0, 0, 0, 0], dtype=np.int32)

            # box 힌트를 SAM 2에 전달
            sam_box = np.array(
                [box["xmin"], box["ymin"], box["xmax"], box["ymax"]],
                dtype=np.float32,
            )

            try:
                masks, scores, _ = segmenter._predictor.predict(
                    point_coords=pts,
                    point_labels=lbls,
                    box=sam_box,
                    multimask_output=True,
                )
            except TypeError:
                # box 파라미터 미지원 버전 폴백
                masks, scores, _ = segmenter._predictor.predict(
                    point_coords=pts,
                    point_labels=lbls,
                    multimask_output=True,
                )

            # Gemini 박스와 IoU가 가장 높고 밝은 마스크 선택
            box_region = np.zeros((h, w), dtype=bool)
            box_region[box["ymin"]:box["ymax"], box["xmin"]:box["xmax"]] = True

            best_mask, best_score = None, -1.0
            for m, s in zip(masks, scores):
                # SAM 2 버전에 따라 dtype이 다를 수 있음 → bool로 통일
                m_bool = m.astype(bool)
                area = float(m_bool.sum())
                if area < 100:
                    continue
                intersection = float((m_bool & box_region).sum())
                union = float((m_bool | box_region).sum())
                iou = intersection / max(union, 1)
                brightness = float(gray[m_bool].mean()) / 255.0 if area > 0 else 0
                # 바닥 비율 페널티
                bottom_r = float(m_bool[int(h * 0.75):].sum()) / max(area, 1)
                combined_s = iou * 0.5 + float(s) * 0.2 + brightness * 0.2 - bottom_r * 0.5
                if combined_s > best_score:
                    best_score = combined_s
                    best_mask = m_bool

            if best_mask is not None:
                combined = np.where(best_mask, 255, combined).astype(np.uint8)
            else:
                # 폴백: Gemini 박스 그대로
                combined[box["ymin"]:box["ymax"], box["xmin"]:box["xmax"]] = 255

    return combined, boxes


def sam2_click_mask(
    base: np.ndarray,
    click_points: list[list[int]],
    click_labels: list[int],
    segmenter,
) -> np.ndarray:
    """
    사용자가 클릭한 점들을 SAM 2 포인트 프롬프트로 사용해 마스크 생성.

    Args:
        click_points : [[x, y], ...]  — 원본 픽셀 좌표
        click_labels : [1=positive(창문), 0=negative(배제)]
        segmenter    : SAM2WindowSegmenter 인스턴스

    Returns:
        (H, W) uint8 마스크, 창문=255
    """
    import torch

    h, w = base.shape[:2]
    rgb = base if base.shape[2] == 3 else cv2.cvtColor(base, cv2.COLOR_BGR2RGB)

    if not segmenter.model_loaded:
        return np.zeros((h, w), dtype=np.uint8)

    pts  = np.array(click_points, dtype=np.float32)   # (N, 2) x,y 순서
    lbls = np.array(click_labels,  dtype=np.int32)

    with torch.inference_mode():
        segmenter._predictor.set_image(rgb)
        masks, scores, _ = segmenter._predictor.predict(
            point_coords=pts,
            point_labels=lbls,
            multimask_output=True,
        )

    # 점수 가장 높은 마스크 선택
    best_idx  = int(np.argmax(scores))
    best_mask = masks[best_idx].astype(bool)
    return (best_mask.astype(np.uint8) * 255)


def straighten_mask(mask: np.ndarray, mode: str = "rect", epsilon_ratio: float = 0.02) -> np.ndarray:
    """
    SAM 2 마스크의 자글자글한 경계를 직선 폴리곤으로 정리.

    Args:
        mask          : (H, W) uint8
        mode          : "rect"  — 각 덩어리를 최소 외접 사각형으로 변환
                        "poly"  — 볼록 외곽선(convex hull) + approxPolyDP 단순화
        epsilon_ratio : poly 모드에서 단순화 강도 (클수록 더 단순한 폴리곤)

    Returns:
        (H, W) uint8 정돈된 마스크
    """
    h, w = mask.shape[:2]
    # 먼저 모폴로지 닫기로 구멍/노이즈 제거
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (7, 7))
    closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    clean = np.zeros((h, w), dtype=np.uint8)
    total_area = h * w

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < total_area * 0.005:   # 이미지 면적 0.5% 미만 노이즈 제거
            continue

        if mode == "rect":
            # ── 최소 외접 사각형 (회전 허용) ────────────────────────
            rect  = cv2.minAreaRect(cnt)
            box   = cv2.boxPoints(rect).astype(np.int32)
            cv2.fillPoly(clean, [box], 255)
        else:
            # ── Convex Hull + approxPolyDP ───────────────────────────
            hull    = cv2.convexHull(cnt)
            epsilon = epsilon_ratio * cv2.arcLength(hull, True)
            approx  = cv2.approxPolyDP(hull, epsilon, True)
            cv2.fillPoly(clean, [approx], 255)

    return clean


def trim_sash(
    mask: np.ndarray,
    base_rgb: np.ndarray,
    mode: str = "auto",
    sensitivity: float = 0.55,
    inset_px: int = 0,
    max_scan_ratio: float = 0.25,
) -> np.ndarray:
    """
    직선화된 마스크에서 샷시(어두운 프레임)를 제거.

    Args:
        mask           : (H, W) uint8 — straighten_mask 결과
        base_rgb       : 원본 RGB 이미지
        mode           : "auto"   — 밝기 스캔으로 샷시 경계 자동 감지
                         "manual" — inset_px 만큼 일정하게 안쪽으로 축소
        sensitivity    : auto 모드 임계값 (0~1, 클수록 더 엄격하게 유리 판정)
        inset_px       : manual 모드 침식 픽셀 수
        max_scan_ratio : auto 모드에서 각 방향 최대 스캔 비율 (0~0.4)

    Returns:
        (H, W) uint8 — 샷시 제거된 마스크
    """
    h, w = mask.shape[:2]
    gray = cv2.cvtColor(base_rgb, cv2.COLOR_RGB2GRAY).astype(np.float32)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    result = np.zeros_like(mask)

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < h * w * 0.003:
            continue

        bx, by, bw, bh = cv2.boundingRect(cnt)
        bx = max(0, bx); by = max(0, by)
        bx2 = min(w, bx + bw); by2 = min(h, by + bh)
        bw = bx2 - bx; bh = by2 - by

        if mode == "manual":
            x1 = min(bx + inset_px,     bx2 - 1)
            y1 = min(by + inset_px,     by2 - 1)
            x2 = max(bx2 - inset_px,   x1 + 1)
            y2 = max(by2 - inset_px,   y1 + 1)
        else:
            # ── 자동 밝기 스캔 ────────────────────────────────────────
            region = gray[by:by2, bx:bx2]
            # 해당 영역 상위 25% 밝기를 유리 기준으로 삼음
            ref_bright = float(np.percentile(region, 75))
            threshold  = ref_bright * sensitivity

            max_sx = max(1, int(bw * max_scan_ratio))
            max_sy = max(1, int(bh * max_scan_ratio))

            def _scan(strip_fn, n) -> int:
                """안쪽으로 스캔 → 밝기 threshold 첫 도달 지점 반환."""
                for i in range(n):
                    strip = strip_fn(i)
                    if float(strip.mean()) >= threshold:
                        return i
                return n  # 다 어두우면 최대까지

            left_t   = _scan(lambda i: region[:, i],       max_sx)
            right_t  = _scan(lambda i: region[:, -1 - i],  max_sx)
            top_t    = _scan(lambda i: region[i, :],        max_sy)
            bottom_t = _scan(lambda i: region[-1 - i, :],  max_sy)

            x1 = bx + left_t
            y1 = by + top_t
            x2 = bx2 - right_t
            y2 = by2 - bottom_t

        if x2 > x1 + 4 and y2 > y1 + 4:
            result[y1:y2, x1:x2] = 255

    return result


def composite_sam2_region(
    base: np.ndarray,
    mask: np.ndarray,
    gen_img: np.ndarray,
    bbox: tuple[int, int, int, int],
    feather_px: int = 20,
) -> np.ndarray:
    """
    SAM 2 마스크 영역에 생성 이미지를 합성.
    gen_img 는 bbox 크롭 크기로 전달됩니다.
    """
    bx1, by1, bx2, by2 = bbox
    bw, bh = bx2 - bx1, by2 - by1
    h, w = base.shape[:2]

    gen_resized = cv2.resize(gen_img, (bw, bh), interpolation=cv2.INTER_LANCZOS4)
    gen_full = np.zeros_like(base, dtype=np.float32)
    gen_full[by1:by2, bx1:bx2] = gen_resized.astype(np.float32)

    soft_mask = mask.astype(np.float32) / 255.0
    if feather_px > 0:
        k = feather_px * 2 + 1
        soft_mask = cv2.GaussianBlur(soft_mask, (k, k), feather_px * 0.4)

    result = base.copy().astype(np.float32)
    for c in range(3):
        result[:, :, c] = (
            result[:, :, c] * (1 - soft_mask) +
            gen_full[:, :, c] * soft_mask
        )
    return np.clip(result, 0, 255).astype(np.uint8)


# ══════════════════════════════════════════════════════════════════════════════
# 세션 상태
# ══════════════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════════════
# 세션 상태
# ══════════════════════════════════════════════════════════════════════════════

def _init():
    defs = dict(
        base=None,
        gemini_key=_load_gemini_key(),
        sam2_click_points=[],
        sam2_click_labels=[],
        sam2_click_last=None,
        sam2_mask=None,
        gen_images=None,
        result=None,
    )
    for k, v in defs.items():
        if k not in st.session_state:
            st.session_state[k] = v

def _reset():
    for k in ("sam2_mask", "sam2_click_points", "sam2_click_labels",
              "sam2_click_last", "gen_images", "result"):
        st.session_state[k] = None if k not in ("sam2_click_points",
                                                  "sam2_click_labels") else []


# ══════════════════════════════════════════════════════════════════════════════
# 메인
# ══════════════════════════════════════════════════════════════════════════════

def main():
    _init()

    st.markdown('<p class="wp-title">🪟 Window Pull AI</p>', unsafe_allow_html=True)
    st.markdown(
        '<p class="wp-sub">창문을 클릭하면 자동으로 선택되고, Gemini가 새 야외 뷰로 합성합니다</p>',
        unsafe_allow_html=True,
    )

    # ── API 키 ───────────────────────────────────────────────────────────────
    with st.sidebar:
        st.header("⚙️ 설정")
        st.subheader("Google Gemini")
        key_input = st.text_input(
            "Gemini API Key",
            value=st.session_state["gemini_key"],
            type="password",
            help="https://aistudio.google.com/app/apikey",
        )
        if key_input:
            st.session_state["gemini_key"] = key_input
        if st.session_state["gemini_key"]:
            st.success("Gemini 키 ✅")
        else:
            st.warning("Gemini 키 없음")

    api_key = st.session_state["gemini_key"]

    # ════════════════════════════════════════════════════════════════════════
    # STEP 1 — 이미지 업로드
    # ════════════════════════════════════════════════════════════════════════
    st.markdown('<div class="step-card">', unsafe_allow_html=True)
    st.markdown(
        '<span class="step-badge">1</span>**인테리어 이미지 업로드**',
        unsafe_allow_html=True,
    )

    base_f = st.file_uploader(
        "🌟 Base 이미지 (실내 노출 JPG/PNG)",
        type=["jpg", "jpeg", "png"], key="base_upload",
    )
    if base_f:
        arr = to_rgb(base_f)
        if st.session_state["base"] is None or \
                not np.array_equal(arr, st.session_state["base"]):
            st.session_state["base"] = arr
            _reset()

    if st.session_state["base"] is None:
        st.info("이미지를 업로드하면 시작됩니다.")
        st.markdown("</div>", unsafe_allow_html=True)
        return

    base: np.ndarray = st.session_state["base"]
    h, w = base.shape[:2]
    st.success(f"✅ 업로드 완료 — {w} × {h} px")

    scale_prev = min(1.0, 700 / w)
    thumb = cv2.resize(base, (int(w * scale_prev), int(h * scale_prev)),
                       interpolation=cv2.INTER_AREA)
    st.image(to_pil(thumb), use_container_width=False)
    st.markdown("</div>", unsafe_allow_html=True)

    # ════════════════════════════════════════════════════════════════════════
    # STEP 2 — 창문 클릭 선택
    # ════════════════════════════════════════════════════════════════════════
    st.markdown('<div class="step-card">', unsafe_allow_html=True)
    st.markdown(
        '<span class="step-badge">2</span>**창문 영역 선택**&nbsp;&nbsp;'
        '<small style="color:#9fa8da">창문 유리 안쪽을 클릭하세요 — 즉시 마스크가 생성됩니다</small>',
        unsafe_allow_html=True,
    )

    # SAM 2 로드
    try:
        segmenter = _get_sam2_segmenter()
        if not segmenter.model_loaded:
            st.warning("⚠️ SAM 2 가중치 없음 — weights/sam2_hiera_large.pt 를 확인하세요.")
    except Exception as _e:
        st.error(f"SAM 2 로드 오류: {_e}")
        st.markdown("</div>", unsafe_allow_html=True)
        return

    ck_pts  = st.session_state["sam2_click_points"]
    ck_lbls = st.session_state["sam2_click_labels"]

    def _draw_preview(img, pts, lbls, mask):
        out = img.copy().astype(np.float32)
        if mask is not None and mask.any():
            m = mask > 127
            out[m]  = out[m]  * 0.35 + np.array([30, 144, 255], np.float32) * 0.65
            out[~m] = out[~m] * 0.55 + np.array([10,  10,  10], np.float32) * 0.45
        out = out.clip(0, 255).astype(np.uint8)
        for i, ((px, py), _lbl) in enumerate(zip(pts, lbls)):
            is_last = (i == len(pts) - 1)
            color   = (50, 230, 80)
            if is_last:
                cv2.circle(out, (px, py), 30, (255, 255, 255), 2)
                cv2.circle(out, (px, py), 24, color, 2)
            cv2.circle(out, (px, py), 16, (0, 0, 0), -1)
            cv2.circle(out, (px, py), 14, color, -1)
            cv2.putText(out, "+", (px - 8, py + 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            num = str(i + 1)
            cv2.putText(out, num, (px + 18, py - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 4)
            cv2.putText(out, num, (px + 18, py - 12),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
        return out

    def _run_pipeline(pts, lbls):
        """SAM 2 → 직선 보정(최소 외접 사각형) → 샷시 제거(자동 밝기) → mask 저장."""
        if not pts:
            st.session_state["sam2_mask"] = None
            return
        with st.spinner("🧠 마스크 생성 중..."):
            try:
                m = sam2_click_mask(base, pts, lbls, segmenter)
                m = straighten_mask(m, mode="rect")
                if m.any():
                    m = trim_sash(m, base, mode="auto", sensitivity=0.55)
                st.session_state["sam2_mask"] = m
                st.session_state["gen_images"] = None
                st.session_state["result"] = None
            except Exception as _se:
                st.error(f"오류: {_se}")

    # 미리보기 이미지 생성
    live_mask = st.session_state.get("sam2_mask")
    scale_ck  = min(1.0, PREVIEW_MAX_W / w)
    prev_img  = _draw_preview(base, ck_pts, ck_lbls, live_mask)
    prev_pil  = to_pil(cv2.resize(prev_img,
                                   (int(w * scale_ck), int(h * scale_ck)),
                                   interpolation=cv2.INTER_AREA))

    try:
        from streamlit_image_coordinates import streamlit_image_coordinates
        ck_coords = streamlit_image_coordinates(prev_pil, key="sam2_click_img")
    except ImportError:
        st.error("pip install streamlit-image-coordinates 필요")
        ck_coords = None

    # 클릭 감지 → 즉시 SAM 2 실행
    if ck_coords and ck_coords != st.session_state["sam2_click_last"]:
        st.session_state["sam2_click_last"] = ck_coords
        ox = int(ck_coords["x"] / scale_ck)
        oy = int(ck_coords["y"] / scale_ck)
        new_pts  = ck_pts  + [[ox, oy]]
        new_lbls = ck_lbls + [1]
        st.session_state["sam2_click_points"] = new_pts
        st.session_state["sam2_click_labels"] = new_lbls
        _run_pipeline(new_pts, new_lbls)
        st.rerun()

    # 커버리지 + 포인트 목록
    if ck_pts:
        if live_mask is not None:
            cov = (live_mask > 127).sum() / (h * w) * 100
            st.success(f"✅ 마스크 커버리지: {cov:.1f}%  |  포인트 {len(ck_pts)}개")
        rows = []
        for i, (px, py) in enumerate(ck_pts):
            fresh = " ◀ 최근" if i == len(ck_pts) - 1 else ""
            rows.append(
                f"<span style='color:#aaa'>#{i+1}</span> "
                f"<span style='color:#32dc6e'>✅ 창문</span> "
                f"<span style='color:#666;font-size:0.82rem'>x={px}, y={py}</span>"
                f"<span style='color:#ffcc44;font-size:0.8rem'>{fresh}</span>"
            )
        st.markdown(
            "<div style='background:#0d1117;border:1px solid #30363d;"
            "border-radius:8px;padding:8px 12px;line-height:2.1;'>"
            + "<br>".join(rows) + "</div>",
            unsafe_allow_html=True,
        )
    else:
        st.info("창문 유리 안쪽을 클릭하세요. 클릭 즉시 마스크가 표시됩니다.")

    c1, c2 = st.columns([1, 1])
    with c1:
        if st.button("↩️ 마지막 포인트 취소", key="btn_undo") and ck_pts:
            rem_pts  = ck_pts[:-1]
            rem_lbls = ck_lbls[:-1]
            st.session_state["sam2_click_points"] = rem_pts
            st.session_state["sam2_click_labels"] = rem_lbls
            _run_pipeline(rem_pts, rem_lbls)
            st.rerun()
    with c2:
        if st.button("🗑️ 전체 초기화", key="btn_clear"):
            st.session_state["sam2_click_points"] = []
            st.session_state["sam2_click_labels"] = []
            st.session_state["sam2_click_last"]   = None
            st.session_state["sam2_mask"]         = None
            st.session_state["gen_images"]        = None
            st.session_state["result"]            = None
            st.rerun()

    st.markdown("</div>", unsafe_allow_html=True)

    # 마스크가 있어야 Step 3 진행
    sam2_ready = (live_mask is not None and bool((live_mask > 127).any()))
    if not sam2_ready:
        return

    # ════════════════════════════════════════════════════════════════════════
    # STEP 3 — Gemini 이미지 생성 + 합성
    # ════════════════════════════════════════════════════════════════════════
    st.markdown('<div class="step-card">', unsafe_allow_html=True)
    st.markdown(
        '<span class="step-badge">3</span>**Gemini 이미지 생성 및 합성**',
        unsafe_allow_html=True,
    )

    s2mask = st.session_state["sam2_mask"]
    cov    = (s2mask > 127).sum() / (h * w) * 100
    st.info(f"🧠 SAM 2 마스크 영역 (커버리지 {cov:.1f}%)을 사용합니다.")

    gen_prompt = st.text_area(
        "생성 프롬프트",
        value=DEFAULT_GEN_PROMPT,
        height=120,
        key="gen_prompt_input",
    )
    feather_px = st.slider("경계 페더링 (px)", 0, 60, 20, 5, key="feather_px")

    gen_btn = st.button(
        "🎨 Gemini로 이미지 생성 → 합성",
        type="primary", key="btn_generate",
        disabled=(not api_key),
    )

    if gen_btn:
        ys_g, xs_g = np.where(s2mask > 127)
        bx1_g, by1_g = int(xs_g.min()), int(ys_g.min())
        bx2_g, by2_g = int(xs_g.max()), int(ys_g.max())
        crop_g = base[by1_g:by2_g, bx1_g:bx2_g]

        progress = st.progress(0, text="🧠 SAM 2 영역 생성 중...")
        try:
            gen_img    = gemini_generate_region(crop_g, gen_prompt, api_key)
            gen_images = [gen_img if gen_img is not None else crop_g]
            if gen_img is None:
                st.warning("생성 결과 없음 → 원본 유지")
        except Exception as e:
            st.warning(f"생성 오류: {e} → 원본 유지")
            gen_images = [crop_g]

        progress.progress(1.0, text="합성 중...")
        result = composite_sam2_region(
            base, s2mask, gen_images[0],
            (bx1_g, by1_g, bx2_g, by2_g), feather_px
        )
        st.session_state["gen_images"] = gen_images
        st.session_state["result"]     = result
        progress.empty()
        st.rerun()

    if st.session_state["gen_images"]:
        with st.expander("🖼️ 생성된 영역 이미지 미리보기"):
            gcols = st.columns(min(len(st.session_state["gen_images"]), 4))
            for i, gi in enumerate(st.session_state["gen_images"]):
                with gcols[i % 4]:
                    st.image(to_pil(gi), caption=f"#{i+1} 생성",
                             use_container_width=True)

    st.markdown("</div>", unsafe_allow_html=True)

    # ════════════════════════════════════════════════════════════════════════
    # STEP 4 — 전후 비교 및 다운로드
    # ════════════════════════════════════════════════════════════════════════
    if st.session_state["result"] is None:
        return

    result = st.session_state["result"]

    st.markdown('<div class="step-card">', unsafe_allow_html=True)
    st.markdown(
        '<span class="step-badge">4</span>**전후 비교 및 저장**',
        unsafe_allow_html=True,
    )

    rc1, rc2 = st.columns(2)
    with rc1:
        st.caption("🌟 합성 전 (Base)")
        st.image(to_pil(base), use_container_width=True)
    with rc2:
        st.caption("✨ 합성 후 (Window Pull)")
        st.image(to_pil(result), use_container_width=True)

    st.download_button(
        label="⬇️ 최종 결과물 다운로드 (JPEG 97%)",
        data=encode_jpg(result, 97),
        file_name="window_pull_result.jpg",
        mime="image/jpeg",
        type="primary",
    )
    st.markdown("</div>", unsafe_allow_html=True)


if __name__ == "__main__":
    main()
