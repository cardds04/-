#!/usr/bin/env python3
"""Before/After LUT 매칭 — 라이트룸(또는 임의 편집기) 렌더 결과를 영상에 전이.

워크플로우:
  1) extract_repr_frame(clip) : 각 클립에서 ffmpeg 로 대표 프레임 1장 추출
     (영상 디코드와 동일 색 베이스 → 밝기/색이 정확히 일치)
  2) 사용자가 그 프레임을 라이트룸에서 보정 후 같은 이름으로 export
  3) fit_lut_cube(orig_frame, rendered_frame, out.cube) : (원본→렌더) 픽셀쌍으로
     33³ 3D LUT 피팅 후 .cube 작성 (write_grade_cube_lut 와 동일 포맷/순서)
  4) 그 .cube 를 클립 grade 의 lut_file 로 지정 → 기존 ffmpeg lut3d 경로로 클립 전체 적용
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

LUT_SIZE = 33
_FIT_W, _FIT_H = 480, 270   # 피팅 샘플 해상도 (16:9)


def extract_repr_frame(clip: Path, out_path: Path, *, at_sec: float | None = None,
                       trim_in: float = 0.0, trim_out: float = 0.0) -> Path | None:
    """클립에서 대표 프레임 1장 추출 (sRGB JPEG). at_sec 없으면 (트림 반영) 중간 지점."""
    clip = Path(clip)
    if not clip.is_file():
        return None
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if at_sec is None:
        dur = _probe_duration(clip)
        usable_lo = max(0.0, trim_in)
        usable_hi = max(usable_lo + 0.1, dur - max(0.0, trim_out))
        at_sec = (usable_lo + usable_hi) / 2.0 if dur > 0 else 1.0
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{max(0.0, at_sec):.3f}", "-i", str(clip),
        "-frames:v", "1", "-q:v", "2", str(out_path),
    ]
    try:
        subprocess.run(cmd, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None
    return out_path if out_path.is_file() else None


def _probe_duration(p: Path) -> float:
    try:
        cp = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", str(p)],
            capture_output=True, text=True, check=True,
        )
        return float((cp.stdout or "0").strip() or 0)
    except (subprocess.CalledProcessError, ValueError, FileNotFoundError):
        return 0.0


def _load_rgb01(path: Path, size: tuple[int, int] | None = None) -> np.ndarray:
    img = Image.open(path).convert("RGB")
    if size is not None:
        img = img.resize(size, Image.LANCZOS)
    return np.asarray(img, dtype=np.float32) / 255.0


def fit_lut(orig: np.ndarray, rendered: np.ndarray, *,
            n_samples: int = 4000, smoothing: float = 0.02,
            neighbors: int = 48, epsilon: float = 0.22,
            identity_pull: float = 0.0) -> np.ndarray:
    """(orig→rendered) 픽셀쌍 → (LUT_SIZE³,3) 격자값. orig/rendered: (h,w,3) 0..1 정렬."""
    from scipy.interpolate import RBFInterpolator
    S = orig.reshape(-1, 3)
    R = rendered.reshape(-1, 3)
    rng = np.random.default_rng(0)
    idx = rng.choice(len(S), size=min(n_samples, len(S)), replace=False)
    Xs, Ys = S[idx], R[idx]
    # 무채색 군집(회색축) 안정화: degree=0 + 가우시안 커널
    rbf = RBFInterpolator(Xs, Ys, kernel="gaussian", epsilon=epsilon, degree=0,
                          smoothing=smoothing, neighbors=min(neighbors, len(Xs)))
    g = np.linspace(0.0, 1.0, LUT_SIZE)
    bb, gg, rr = np.meshgrid(g, g, g, indexing="ij")
    grid = np.stack([rr.ravel(), gg.ravel(), bb.ravel()], axis=1)  # RGB
    out = rbf(grid)
    if identity_pull > 0.0:
        # 데이터에서 먼(채도 높은) 색은 항등 쪽으로 — extrapolation 폭주 방지
        out = (1.0 - identity_pull) * out + identity_pull * grid
    return np.clip(out, 0.0, 1.0)


def write_cube(lut_flat: np.ndarray, out_path: Path, *, title: str = "LR match") -> Path:
    """(LUT_SIZE³,3) 격자값 → .cube (write_grade_cube_lut 와 동일: b-outer, g, r-inner)."""
    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# {title}",
        f"LUT_3D_SIZE {LUT_SIZE}",
        "DOMAIN_MIN 0.0 0.0 0.0",
        "DOMAIN_MAX 1.0 1.0 1.0",
    ]
    # grid 는 meshgrid(indexing='ij') 로 bb,gg,rr → ravel 시 b 가 가장 바깥, r 가 가장 안쪽.
    # 즉 lut_flat 행 순서 = for ib: for ig: for ir.  .cube 도 r 이 가장 빠름 → 그대로 기록.
    for row in lut_flat:
        lines.append(f"{row[0]:.6f} {row[1]:.6f} {row[2]:.6f}")
    out_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return out_path


def fit_lut_cube(orig_path: Path, rendered_path: Path, out_cube: Path, **kw) -> Path:
    """원본 프레임 + 렌더 프레임 경로 → .cube 작성. 두 이미지 크기 자동 정렬."""
    orig = _load_rgb01(orig_path, (_FIT_W, _FIT_H))
    rendered = _load_rgb01(rendered_path, (_FIT_W, _FIT_H))
    lut = fit_lut(orig, rendered, **kw)
    return write_cube(lut, out_cube, title=f"LR match {Path(orig_path).stem}")


def apply_lut_to_image(img01: np.ndarray, lut_flat: np.ndarray) -> np.ndarray:
    """미리보기용 trilinear 적용 (서버 썸네일 확인용). img01:(h,w,3)0..1."""
    lut = lut_flat.reshape(LUT_SIZE, LUT_SIZE, LUT_SIZE, 3)  # 행순서 b,g,r → 인덱스 [ib,ig,ir]
    x = np.clip(img01, 0, 1) * (LUT_SIZE - 1)
    i0 = np.floor(x).astype(int)
    i1 = np.minimum(i0 + 1, LUT_SIZE - 1)
    f = x - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    r1, g1, b1 = i1[..., 0], i1[..., 1], i1[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]

    def L(ri, gi, bi):
        return lut[bi, gi, ri]   # 행순서 b-outer,g,r-inner

    c000 = L(r0, g0, b0); c100 = L(r1, g0, b0)
    c010 = L(r0, g1, b0); c110 = L(r1, g1, b0)
    c001 = L(r0, g0, b1); c101 = L(r1, g0, b1)
    c011 = L(r0, g1, b1); c111 = L(r1, g1, b1)
    c00 = c000 * (1 - fr) + c100 * fr
    c10 = c010 * (1 - fr) + c110 * fr
    c01 = c001 * (1 - fr) + c101 * fr
    c11 = c011 * (1 - fr) + c111 * fr
    c0 = c00 * (1 - fg) + c10 * fg
    c1 = c01 * (1 - fg) + c11 * fg
    return np.clip(c0 * (1 - fb) + c1 * fb, 0, 1)
