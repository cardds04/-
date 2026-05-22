"""사진 편집 — RAW/JPG/PNG decode, preview/thumbnail 생성, 보정 적용 JPG export.

영상 탭의 .cube LUT 파이프라인을 그대로 재사용 → 색감이 영상과 동일하게 일치.
"""
from __future__ import annotations

import hashlib
import io
import subprocess
from pathlib import Path

import numpy as np
import rawpy
from PIL import Image, ImageOps


# rawpy 가 다루는 RAW 확장자 (대표적인 카메라 RAW 포맷)
RAW_EXTS = {
    ".arw", ".cr2", ".cr3", ".nef", ".dng", ".raf", ".orf",
    ".pef", ".rw2", ".x3f", ".srw", ".sr2", ".3fr", ".raw",
}
# PIL 로 바로 열 수 있는 표준 이미지 확장자
STD_IMG_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}
PHOTO_EXTS = RAW_EXTS | STD_IMG_EXTS


def is_raw(p: Path) -> bool:
    return p.suffix.lower() in RAW_EXTS


def is_photo(p: Path) -> bool:
    return p.suffix.lower() in PHOTO_EXTS


def list_photos(folder: Path) -> list[Path]:
    if not folder.is_dir():
        return []
    out: list[Path] = []
    for p in sorted(folder.iterdir(), key=lambda x: x.name.lower()):
        if p.name.startswith(".") or p.name.startswith("._"):
            continue
        if p.is_file() and is_photo(p):
            out.append(p)
    return out


def _decode_raw(p: Path, *, half_size: bool = False, output_bps: int = 8) -> np.ndarray:
    """RAW → RGB ndarray.

    품질 향상 설정 — 라이트룸/ACR 디코드에 한 발 더 가까이:
      · AHD demosaic (Adaptive Homogeneity-Directed) — LINEAR 보다 훨씬 선명
      · FBDD Light noise reduction — RAW 노이즈 감쇄
      · highlight_mode=Blend — 클리핑된 하이라이트 영역을 부드럽게 복구
      · output_bps=16 으로 부르면 내부 16비트 정밀도 (export 시 사용)
    """
    with rawpy.imread(str(p)) as raw:
        return raw.postprocess(
            output_bps=int(output_bps),
            use_camera_wb=True,
            no_auto_bright=True,
            half_size=half_size,
            gamma=(2.222, 4.5),       # sRGB
            output_color=rawpy.ColorSpace.sRGB,
            demosaic_algorithm=rawpy.DemosaicAlgorithm.AHD,
            fbdd_noise_reduction=rawpy.FBDDNoiseReductionMode.Light,
            highlight_mode=rawpy.HighlightMode.Blend,
            median_filter_passes=0,
        )


def _load_std_image(p: Path) -> np.ndarray:
    """JPG/PNG/TIFF → uint8 RGB ndarray. EXIF orientation 자동 적용."""
    img = Image.open(p)
    img = ImageOps.exif_transpose(img).convert("RGB")
    return np.array(img)


def load_photo_array(p: Path, *, half_size_for_raw: bool = False) -> np.ndarray:
    if is_raw(p):
        return _decode_raw(p, half_size=half_size_for_raw)
    return _load_std_image(p)


def _save_jpg_array(arr: np.ndarray, out_path: Path, *, quality: int = 92) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(arr).save(
        out_path, "JPEG", quality=int(quality), optimize=True, subsampling=0
    )


def _fingerprint(p: Path) -> str:
    """src 파일의 path + size + mtime 으로 캐시 키."""
    try:
        st = p.stat()
        s = f"{p.resolve()}|{st.st_size}|{int(st.st_mtime)}"
    except OSError:
        s = str(p)
    return hashlib.sha1(s.encode("utf-8")).hexdigest()[:16]


def thumb_cache_path(src: Path, cache_dir: Path) -> Path:
    return cache_dir / f"thumb_{_fingerprint(src)}.jpg"


def preview_cache_path(src: Path, cache_dir: Path) -> Path:
    return cache_dir / f"prev_{_fingerprint(src)}.jpg"


def make_thumbnail(src: Path, out_path: Path, *, max_side: int = 256, quality: int = 70) -> Path:
    """리스트용 작은 썸네일 (~256px). RAW 는 embedded JPEG 가 있으면 그걸 우선 사용."""
    if out_path.is_file():
        return out_path
    if is_raw(src):
        # 1) 카메라가 RAW 안에 묻어둔 embedded JPEG (보통 풀해상도) 가 있으면 그걸로 빠르게
        try:
            with rawpy.imread(str(src)) as raw:
                thumb = raw.extract_thumb()
            if thumb.format == rawpy.ThumbFormat.JPEG:
                img = Image.open(io.BytesIO(thumb.data))
                img = ImageOps.exif_transpose(img).convert("RGB")
            else:  # BITMAP
                img = Image.fromarray(thumb.data)
        except (rawpy.LibRawError, rawpy.LibRawNoThumbnailError, OSError, ValueError):
            img = Image.fromarray(_decode_raw(src, half_size=True))
    else:
        img = Image.open(src)
        img = ImageOps.exif_transpose(img).convert("RGB")
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "JPEG", quality=int(quality), optimize=True)
    return out_path


def make_preview(src: Path, out_path: Path, *, max_side: int = 2880, quality: int = 95) -> Path:
    """미리보기용 고해상도 (~2880px) JPG. WebGL 셰이더가 이 파일을 텍스처 소스로 사용.

    품질 향상:
      · RAW 풀해상도 디코드 + AHD demosaic 후 LANCZOS 로 다운샘플 (half_size 보다 훨씬 선명)
      · 2880px 까지 키워 레티나 디스플레이에서도 또렷
      · JPEG 95 quality + 4:4:4 subsampling (색번짐 최소화)
    """
    if out_path.is_file():
        return out_path
    arr = load_photo_array(src, half_size_for_raw=False)
    img = Image.fromarray(arr)
    img.thumbnail((max_side, max_side), Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "JPEG", quality=int(quality), optimize=True, subsampling=0)
    return out_path


def export_jpg_with_lut(
    src: Path,
    out_path: Path,
    *,
    lut_path: Path | None = None,
    quality: int = 95,
    long_side_px: int | None = None,
    rotate_deg: int = 0,           # 0/90/180/270 (CW)
    flip_h: bool = False,
    flip_v: bool = False,
) -> Path:
    """원본(RAW/JPG/PNG) 풀해상도 디코드 → 회전/뒤집기 → LUT 적용 → JPG 저장.

    품질 향상 — RAW 는 **16비트 깊이로 디코드** 한 뒤 16비트 TIFF 로 ffmpeg 에 넘김.
    ffmpeg lut3d 가 16비트 입력에서 16비트로 처리하므로 LUT 보간 정밀도가
    8비트일 때보다 훨씬 부드러워짐 (특히 그라데이션·하이라이트 영역).
    lut_path 가 None 이면 LUT 적용 없이 그대로 변환.
    """
    # 1) RAW 는 16비트 깊이로 풀해상도 디코드 — LUT 가 있는 경우엔 ffmpeg 가 16비트로 보간.
    #    LUT 가 없으면 그대로 8비트로 변환해 단순 JPG 저장.
    has_lut = lut_path is not None and Path(lut_path).is_file()
    if is_raw(src):
        arr = _decode_raw(src, half_size=False, output_bps=16 if has_lut else 8)
    else:
        arr = _load_std_image(src)                                # uint8 (h,w,3)
    depth = 16 if arr.dtype == np.uint16 else 8

    # 2) 회전/뒤집기 — numpy 단계에서 처리해 bit depth 유지
    if rotate_deg % 360:
        k = (-(int(rotate_deg) // 90)) % 4
        if k:
            arr = np.rot90(arr, k=k)
    if flip_h:
        arr = arr[:, ::-1, :]
    if flip_v:
        arr = arr[::-1, :, :]

    # 3) 긴변 리사이즈 필요 여부 — 실제 리사이즈는 ffmpeg/PIL 에 위임
    need_resize = False
    target_w = target_h = None
    if long_side_px and long_side_px > 0:
        h, w = arr.shape[:2]
        ls = max(w, h)
        if ls > long_side_px:
            scale = long_side_px / ls
            target_w, target_h = max(2, int(w * scale)), max(2, int(h * scale))
            need_resize = True

    out_path.parent.mkdir(parents=True, exist_ok=True)

    # 4-A) LUT 없으면 단순 변환 (PIL 8비트 JPEG)
    if lut_path is None or not Path(lut_path).is_file():
        arr8 = (arr >> 8).astype(np.uint8) if depth == 16 else arr
        img8 = Image.fromarray(arr8)
        if need_resize:
            img8 = img8.resize((target_w, target_h), Image.LANCZOS)
        img8.save(out_path, "JPEG", quality=int(quality), optimize=True, subsampling=0)
        return out_path

    # 4-B) LUT 적용:
    #   ① 16비트 TIFF 로 ffmpeg 에 넘김 (입력 정밀도 ↑)
    #   ② ffmpeg lut3d 가 16비트로 보간해서 PNG 로 출력 (출력도 16비트 무손실)
    #   ③ PIL 로 PNG 읽어 → JPEG 인코딩 (PIL 의 JPEG 품질 컨트롤이 ffmpeg mjpeg 보다 정확)
    import tifffile
    tmp_tif = out_path.with_suffix(".__tmp_in.tiff")
    tmp_png = out_path.with_suffix(".__tmp_out.png")
    try:
        tifffile.imwrite(str(tmp_tif), arr, photometric="rgb", compression=None)
        vf_parts = [f"lut3d=file='{str(lut_path)}'"]
        if need_resize:
            vf_parts.append(f"scale={target_w}:{target_h}:flags=lanczos")
        # ffmpeg lut3d 는 입력이 16비트면 내부 보간을 16비트로 수행 → 8비트 출력해도
        # 8비트 단계 보간보다 훨씬 부드러움. PNG 출력 단계만 8비트로 떨궈 속도 확보.
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(tmp_tif),
            "-vf", ",".join(vf_parts),
            "-pix_fmt", "rgb24",              # 8비트 PNG 출력 (속도 ↑, 보간은 내부 16비트)
            str(tmp_png),
        ]
        subprocess.run(cmd, check=True)
        # PIL 로 PNG → JPG (16비트 PNG 는 자동으로 8비트로 다운컨버트)
        with Image.open(tmp_png) as pim:
            pim.load()
            if pim.mode != "RGB":
                pim = pim.convert("RGB")
            pim.save(out_path, "JPEG", quality=int(quality), optimize=True, subsampling=0)
    finally:
        for tmp in (tmp_tif, tmp_png):
            try:
                tmp.unlink(missing_ok=True)
            except OSError:
                pass
    return out_path


def _qscale_from_quality(quality: int) -> int:
    """JPG quality 0~100 → ffmpeg mjpeg -q:v 31~2 (낮을수록 고품질)."""
    q = max(1, min(100, int(quality)))
    # 100 → 2, 90 → ~3, 80 → ~6, 50 → ~16, 0 → 31
    return max(2, min(31, int(round(31 - (q / 100.0) * 29))))


def find_unique_name(folder: Path, stem: str, suffix: str = ".jpg") -> Path:
    """겹치지 않는 파일 경로 반환 (folder/stem.suffix, 있으면 _1, _2 …)."""
    folder.mkdir(parents=True, exist_ok=True)
    base = folder / f"{stem}{suffix}"
    if not base.exists():
        return base
    i = 1
    while True:
        cand = folder / f"{stem}_{i}{suffix}"
        if not cand.exists():
            return cand
        i += 1


__all__ = [
    "RAW_EXTS", "STD_IMG_EXTS", "PHOTO_EXTS",
    "is_raw", "is_photo", "list_photos",
    "load_photo_array",
    "make_thumbnail", "make_preview",
    "export_jpg_with_lut", "find_unique_name",
    "thumb_cache_path", "preview_cache_path",
]
