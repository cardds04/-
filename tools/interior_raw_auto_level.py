#!/usr/bin/env python3
"""
소니/캐논 등 RAW → 수직·수평 자동 교정만 (OpenCV 직선 검출) → 16-bit TIFF.

색·노출·화이트밸런스는 라이트룸에서 하도록, rawpy 디모자이크는 **카메라 WB**·
**자동 밝기 보정 끔**·**16-bit**로 두어 관용도를 최대한 유지합니다.

출력은 RAW로 되돌릴 수 없으므로 16-bit TIFF를 권장합니다. Adobe DNG로의 직접
인코딩은 공개 파이썬 스택에서 사실상 지원되지 않으며, 라이트룸은 **렌즈 프로필을
EXIF(렌즈명·초점거리·조리개 등)로 찾는 경우가 많아** 본 스크립트는 **원본 RAW의
메타데이터를 TIFF로 복사**합니다 (ExifTool 권장).

  pip install -r requirements-interior-raw.txt
  brew install exiftool   # macOS — EXIF 유지에 강력히 권장

  python3 tools/interior_raw_auto_level.py photo.arw -o photo_leveled.tif
  python3 tools/interior_raw_auto_level.py ./raws -o ./out_tiffs

ExifTool이 없으면 TIFF만 저장되고, 경고 후 종료 코드 0입니다.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import tifffile

ROOT_TOOLS = Path(__file__).resolve().parent
if str(ROOT_TOOLS) not in sys.path:
    sys.path.insert(0, str(ROOT_TOOLS))

import interior_opencv_auto_level as ial  # noqa: E402

RAW_SUFFIXES = frozenset(
    {
        ".arw",
        ".srf",
        ".sr2",
        ".cr2",
        ".cr3",
        ".crw",
        ".dng",
        ".nef",
        ".nrw",
        ".orf",
        ".raf",
        ".rw2",
        ".pef",
        ".ptx",
        ".x3f",
    },
)


def _read_raw_rgb16(path: Path) -> np.ndarray:
    """
    rawpy로 16-bit RGB (H,W,3) uint16.
    카메라 WB·자동 밝기 끔으로 이후 라이트룸에서 색을 잡을 여지를 남김.
    (기본 출력은 디스플레이용 sRGB 계열; 선형 RAW가 필요하면 rawpy 옵션을 바꾸세요.)
    """
    import rawpy

    with rawpy.imread(str(path)) as raw:
        rgb = raw.postprocess(
            use_camera_wb=True,
            no_auto_bright=True,
            output_bps=16,
        )
    return np.asarray(rgb, dtype=np.uint16)


def _write_tiff_rgb16(path: Path, rgb_u16: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tifffile.imwrite(
        path,
        rgb_u16,
        photometric="rgb",
        compression="deflate",
        metadata={"Software": "interior_raw_auto_level.py"},
    )


def _copy_metadata_exiftool(src_raw: Path, dst_tiff: Path) -> tuple[bool, str]:
    """
    원본 RAW의 EXIF/IPTC/XMP 등을 TIFF로 이식. 렌즈 프로필·촬영 파라미터 유지에 필요.
    """
    tool = shutil.which("exiftool")
    if not tool:
        return False, "ExifTool이 PATH에 없습니다. brew install exiftool 등으로 설치하세요."

    # -P: 날짜 보존, -m: minor error 무시(일부 태그 충돌), 세로/방향 태그는 재계산될 수 있음
    cmd = [
        tool,
        "-TagsFromFile",
        str(src_raw),
        "-all:all",
        "-unsafe",
        "-m",
        "-overwrite_original",
        str(dst_tiff),
    ]
    try:
        r = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
    except OSError as e:
        return False, str(e)

    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip() or f"exit {r.returncode}"
        return False, err

    # 회전은 이미 픽셀에 반영했으므로 세로보기 플래그만 정상(1)으로
    r2 = subprocess.run(
        [tool, "-overwrite_original", "-Orientation=1", str(dst_tiff)],
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if r2.returncode != 0:
        err = (r2.stderr or r2.stdout or "").strip() or f"exit {r2.returncode}"
        return False, f"Orientation 정리 실패: {err}"

    return True, ""


def process_one(
    src: Path,
    dst: Path,
    *,
    skip_exif: bool,
) -> tuple[bool, str]:
    """
    반환: (성공 여부, 메시지).
    """
    try:
        rgb = _read_raw_rgb16(src)
    except Exception as e:  # noqa: BLE001
        return False, f"RAW 읽기 실패: {e}"

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    leveled, rot_deg = ial.auto_level_rotate_and_crop(bgr)
    out_rgb = cv2.cvtColor(leveled, cv2.COLOR_BGR2RGB)

    try:
        _write_tiff_rgb16(dst, out_rgb)
    except Exception as e:  # noqa: BLE001
        return False, f"TIFF 저장 실패: {e}"

    msg = f"회전 {rot_deg:.2f}° → {dst.name}"
    if skip_exif:
        return True, msg + " (EXIF 복사 생략)"

    ok, err = _copy_metadata_exiftool(src, dst)
    if ok:
        return True, msg + " · EXIF 복사됨 (ExifTool)"
    return True, msg + f" · EXIF 복사 실패: {err}"


def _default_out_path(src: Path, out_dir: Path) -> Path:
    stem = src.stem
    return out_dir / f"{stem}_leveled.tif"


def main() -> None:
    ap = argparse.ArgumentParser(
        description="RAW → 수평·수직 자동 교정 → 16-bit TIFF (+ EXIF)",
    )
    ap.add_argument(
        "input",
        type=Path,
        help="RAW 파일 또는 RAW가 들어 있는 폴더",
    )
    ap.add_argument(
        "-o",
        "--output",
        type=Path,
        required=True,
        help="출력 TIFF 경로(파일) 또는 출력 폴더",
    )
    ap.add_argument(
        "--no-exif",
        action="store_true",
        help="ExifTool로 메타데이터 복사하지 않음",
    )
    args = ap.parse_args()
    src = args.input
    out = args.output
    skip_exif = args.no_exif

    if not src.exists():
        print(f"없음: {src}", file=sys.stderr)
        sys.exit(1)

    if src.is_file():
        if out.suffix.lower() not in (".tif", ".tiff"):
            print("-o 는 .tif / .tiff 파일이어야 합니다.", file=sys.stderr)
            sys.exit(1)
        ok, msg = process_one(src, out, skip_exif=skip_exif)
        print(msg)
        sys.exit(0 if ok else 1)

    if not src.is_dir():
        print("입력이 파일도 폴더도 아닙니다.", file=sys.stderr)
        sys.exit(1)

    out.mkdir(parents=True, exist_ok=True)
    files = sorted(
        p
        for p in src.iterdir()
        if p.is_file() and p.suffix.lower() in RAW_SUFFIXES
    )
    if not files:
        print(f"RAW로 보이는 파일이 없습니다: {src}", file=sys.stderr)
        sys.exit(1)

    failed = 0
    for p in files:
        dst = _default_out_path(p, out)
        ok, msg = process_one(p, dst, skip_exif=skip_exif)
        print(msg)
        if not ok:
            failed += 1

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
