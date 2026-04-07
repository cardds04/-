#!/usr/bin/env python3
"""
참조 이미지 스타일 복제 — Phase1(샘플 1장, 노출·WB 정렬) / Phase2(일괄 JPG).

  export GEMINI_API_KEY=...

  # 1) 참조 JPG + RAW 1장 → 샘플 폴더에 sample_01.jpg + variants_ABC.json
  python style_transfer_batch.py phase1 \\
      --reference ./ref.jpg --raw-one ./DSC0001.ARW --samples-dir ./samples \\
      --model gemini-2.5-flash

  # 2) 번호(01) 등으로 입력 폴더 전체 RAW → 각 RAW 옆 .xmp 사이드카 (기본). JPG 는 --jpeg
  python style_transfer_batch.py phase2 \\
      --variants ./samples/variants_ABC.json --choice 01 \\
      --input-dir ./raw_in --output-dir ./export_out

GUI(시각화·대화): python style_transfer_gui.py
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from style_transfer_core import (
    DEFAULT_HISTOGRAM_MATCH_ALPHA,
    PHASE1_VARIANT_KEYS,
    load_variant_choice_from_pack,
    run_phase1_samples,
    run_phase2_batch,
)

_PHASE2_CHOICES = tuple(PHASE1_VARIANT_KEYS) + ("A", "B", "C", "a", "b", "c")


def _key() -> str:
    return (os.environ.get("GEMINI_API_KEY") or "").strip()


def cmd_phase1(ap: argparse.Namespace) -> None:
    key = ap.gemini_api_key.strip() or _key()
    if not key:
        sys.exit("GEMINI_API_KEY 또는 --gemini-api-key 가 필요합니다.")
    ref = Path(os.path.expanduser(ap.reference))
    raw_one = Path(os.path.expanduser(ap.raw_one))
    samples = Path(os.path.expanduser(ap.samples_dir))
    if not ref.is_file():
        sys.exit(f"참조 이미지 없음: {ref}")
    if not raw_one.is_file():
        sys.exit(f"RAW 없음: {raw_one}")
    if float(ap.histogram_match_alpha) < 0:
        hm_a = float(DEFAULT_HISTOGRAM_MATCH_ALPHA)
    else:
        hm_a = max(0.0, min(1.0, float(ap.histogram_match_alpha)))
    analysis, _variants, pack = run_phase1_samples(
        reference_path=ref,
        raw_one_path=raw_one,
        sample_dir=samples,
        api_key=key,
        model_name=ap.model,
        preview_max=ap.preview_max,
        sample_quality=ap.sample_quality,
        half_size=not ap.full_res_samples,
        histogram_match_alpha=hm_a,
    )
    print(analysis)
    print(f"\n샘플 및 패키지 저장: {samples}\n  → {pack}")


def cmd_phase2(ap: argparse.Namespace) -> None:
    pack = Path(os.path.expanduser(ap.variants))
    if not pack.is_file():
        sys.exit(f"variants 파일 없음: {pack}")
    params = load_variant_choice_from_pack(pack, ap.choice)
    ind = Path(os.path.expanduser(ap.input_dir))
    outd = Path(os.path.expanduser(ap.output_dir))
    if not ind.is_dir():
        sys.exit(f"입력 폴더 없음: {ind}")
    n = run_phase2_batch(
        input_dir=ind,
        output_dir=outd,
        params=params,
        jpeg_quality=ap.jpeg_quality,
        verbose=ap.verbose,
        pack_path=pack,
        reference_for_histogram=ap.histogram_reference,
        histogram_match_alpha=ap.histogram_match_alpha,
        write_jpeg=ap.jpeg,
        write_sidecar_xmp=not ap.no_sidecar_xmp,
    )
    print(f"완료: {n}장 (XMP: RAW 옆, JPG: {'예' if ap.jpeg else '아니오'}) → {outd}")


def main() -> None:
    root = argparse.ArgumentParser(description="참조 스타일 복제 배치")
    sub = root.add_subparsers(dest="cmd", required=True)

    p1 = sub.add_parser("phase1", help="Gemini 분석 + 샘플 JPG 1장 (노출·WB 정렬)")
    p1.add_argument("--reference", "-r", required=True, type=Path, help="참조 JPG/PNG")
    p1.add_argument("--raw-one", required=True, type=Path, help="원본 RAW 1장")
    p1.add_argument("--samples-dir", "-s", required=True, type=Path, help="샘플 출력 폴더")
    p1.add_argument("--model", default="gemini-2.5-flash")
    p1.add_argument("--gemini-api-key", default="")
    p1.add_argument("--preview-max", type=int, default=1536)
    p1.add_argument("--sample-quality", type=int, default=82)
    p1.add_argument(
        "--full-res-samples",
        action="store_true",
        help="샘플도 풀 해상도(느림)",
    )
    p1.add_argument(
        "--histogram-match-alpha",
        type=float,
        default=-1.0,
        metavar="A",
        help="히스토그램 블렌드 0~1 (-1이면 코어 기본값, 보통 0.35)",
    )
    p1.set_defaults(func=cmd_phase1)

    p2 = sub.add_parser("phase2", help="선택 안으로 폴더 일괄 — 기본은 RAW 옆 XMP 사이드카")
    p2.add_argument("--variants", "-v", required=True, type=Path, help="variants_ABC.json")
    p2.add_argument(
        "--choice",
        "-c",
        required=True,
        choices=_PHASE2_CHOICES,
        help="01 (또는 구 JSON용 A/B/C)",
    )
    p2.add_argument("--input-dir", "-i", required=True, type=Path)
    p2.add_argument("--output-dir", "-o", required=True, type=Path)
    p2.add_argument("--jpeg-quality", type=int, default=95)
    p2.add_argument(
        "--jpeg",
        action="store_true",
        help="출력 폴더에 미리보기용 JPG 도 저장 (기본은 XMP 만)",
    )
    p2.add_argument(
        "--no-sidecar-xmp",
        action="store_true",
        help="RAW 와 같은 경로에 .xmp 를 쓰지 않음",
    )
    p2.add_argument("--verbose", action="store_true")
    p2.add_argument(
        "--histogram-reference",
        type=Path,
        default=None,
        help="히스토그램용 참조 JPG/PNG (미지정 시 variants JSON 내 경로)",
    )
    p2.add_argument(
        "--histogram-match-alpha",
        type=float,
        default=None,
        metavar="A",
        help="히스토그램 블렌드 0~1 (미지정 시 JSON에 저장된 값)",
    )
    p2.set_defaults(func=cmd_phase2)

    args = root.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
