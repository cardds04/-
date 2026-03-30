#!/usr/bin/env python3
"""
공유 폴더(또는 복사해 둔 폴더)의 이미지를 읽어 용량을 줄인 뒤 내장 디스크 경로에 저장하고,
옵션으로 원본 중 일정 크기 이상인 파일만 삭제합니다.

  python shrink_photos.py --source "/Volumes/공유이름/Photos" --dest "$HOME/Pictures/blog_shrunk"

필요: pip install pillow
선택(HEIC): pip install pillow-heif
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    print("Pillow가 필요합니다: pip install pillow", file=sys.stderr)
    sys.exit(1)

try:
    import pillow_heif

    pillow_heif.register_heif_opener()
except ImportError:
    pass

IMAGE_EXTS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".bmp",
    ".tif",
    ".tiff",
    ".heic",
    ".heif",
}


def iter_images(root: Path):
    for p in sorted(root.rglob("*")):
        if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
            yield p


def dest_path_for(src: Path, source_root: Path, dest_root: Path) -> Path:
    rel = src.relative_to(source_root)
    out = dest_root / rel
    out = out.with_suffix(".jpg")
    return out


def load_image(path: Path) -> Image.Image:
    im = Image.open(path)
    im.load()
    return im


def to_rgb_jpeg_ready(im: Image.Image) -> Image.Image:
    if im.mode in ("RGBA", "P"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        if im.mode == "P":
            im = im.convert("RGBA")
        bg.paste(im, mask=im.split()[-1] if im.mode == "RGBA" else None)
        return bg
    if im.mode != "RGB":
        return im.convert("RGB")
    return im


def shrink_and_save(
    src: Path,
    dest: Path,
    max_side: int,
    jpeg_quality: int,
) -> int:
    """저장한 파일 크기(바이트) 반환."""
    im = load_image(src)
    im = ImageOps.exif_transpose(im)
    im = to_rgb_jpeg_ready(im)
    w, h = im.size
    if max(w, h) > max_side:
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(
        dest,
        format="JPEG",
        quality=jpeg_quality,
        optimize=True,
        progressive=True,
    )
    return dest.stat().st_size


def main() -> int:
    p = argparse.ArgumentParser(
        description="이미지 일괄 압축 후 목적지 저장, 옵션으로 대용량 원본 삭제",
    )
    p.add_argument(
        "--source",
        "-s",
        type=Path,
        required=True,
        help="원본이 있는 폴더 (공유폴더 마운트 경로 등)",
    )
    p.add_argument(
        "--dest",
        "-d",
        type=Path,
        required=True,
        help="압축본을 둘 내장 디스크 경로 (폴더가 없으면 만듦)",
    )
    p.add_argument(
        "--max-side",
        type=int,
        default=2560,
        help="긴 변 최대 픽셀 (기본 2560)",
    )
    p.add_argument(
        "--quality",
        type=int,
        default=82,
        help="JPEG 품질 1–95 (기본 82)",
    )
    p.add_argument(
        "--delete-originals",
        action="store_true",
        help="압축 저장 성공 후 원본 삭제(아래 크기 조건 적용)",
    )
    p.add_argument(
        "--delete-if-larger-mb",
        type=float,
        default=2.0,
        help="원본이 이 크기(MB) 이상일 때만 삭제 (기본 2.0)",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="실제 저장·삭제 없이 목록만 출력",
    )
    args = p.parse_args()

    source = args.source.expanduser().resolve()
    dest_root = args.dest.expanduser().resolve()

    if not source.is_dir():
        print(f"원본 폴더가 없습니다: {source}", file=sys.stderr)
        return 1

    delete_min_bytes = int(max(0.0, args.delete_if_larger_mb) * 1024 * 1024)

    files = list(iter_images(source))
    if not files:
        print("처리할 이미지가 없습니다.")
        return 0

    ok = 0
    deleted = 0
    errors = 0

    for src in files:
        out = dest_path_for(src, source, dest_root)
        src_size = src.stat().st_size
        try:
            if args.dry_run:
                print(f"[DRY] {src} -> {out} (원본 {src_size / 1e6:.2f} MB)")
                ok += 1
                continue

            new_size = shrink_and_save(
                src,
                out,
                max_side=args.max_side,
                jpeg_quality=min(95, max(1, args.quality)),
            )
            ok += 1
            ratio = (1.0 - new_size / src_size) * 100 if src_size else 0
            print(
                f"OK {src.name} -> {out.name}  "
                f"{src_size / 1e6:.2f} MB -> {new_size / 1e6:.2f} MB ({ratio:.0f}% 감소)",
            )

            if args.delete_originals and src_size >= delete_min_bytes:
                src.unlink()
                deleted += 1
                print(f"     삭제(원본 ≥ {args.delete_if_larger_mb} MB): {src}")
        except OSError as e:
            print(f"ERR {src}: {e}", file=sys.stderr)
            errors += 1
        except Exception as e:
            print(f"ERR {src}: {e}", file=sys.stderr)
            errors += 1

    print(
        f"\n완료: 성공 {ok}, 삭제 {deleted}, 오류 {errors}"
        + (" (dry-run)" if args.dry_run else ""),
    )
    return 0 if errors == 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
