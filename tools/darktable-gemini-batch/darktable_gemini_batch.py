#!/usr/bin/env python3
"""
폴더 안 RAW(.ARW 등)를 rawpy로 읽고, Gemini가 JSON으로 제안하는
노출·밝기·화이트밸런스·(선택) 렌즈 왜곡 계수를 적용해 JPG로 저장합니다.

darktable-cli / XMP 는 사용하지 않습니다.

  export GEMINI_API_KEY=...
  python darktable_gemini_batch.py --config ./darktable_gemini_config.json

  python darktable_gemini_batch.py -i ./in -o ./out \\
      --fixed-params-file ./fixed.json

GUI: python darktable_gemini_batch_gui.py
"""

from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import imageio.v3 as iio
import numpy as np
import rawpy
from PIL import Image

from style_transfer_core import postprocess_raw_to_rgb_u8

GEMINI_API_KEY = ""
MODEL = "gemini-2.5-flash"

DEFAULT_PROMPT = """첨부는 RAW에서 뽑은 저해상도 미리보기입니다. 현상 파라미터만 제안하세요.

반드시 JSON 한 덩어리만 출력하세요(설명·마크다운 금지). 키:
- exposure_ev: float, 선형광 기준 노출 보정(스톱). 보통 -2.0 ~ +2.0. 0.0 이 중립.
- bright: float, rawpy postprocess 의 bright(LibRaw). 보통 0.25 ~ 4.0, 기본에 가깝게 1.0.
- user_wb: null 또는 길이 4인 배열 [R, G1, B, G2] 배율(대략 0.3~3.0). 잘 모르겠으면 null.
- lens: null 또는 { "k1": float, "k2": float } OpenCV 방사 왜곡 계수(작은 값). 직선이 볼록이면 약한 음수 등. 왜곡 없으면 null 또는 0,0.

예: {"exposure_ev":0.3,"bright":1.1,"user_wb":null,"lens":null}
"""

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


def load_batch_config(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        raw = json.load(f)
    if not isinstance(raw, dict):
        raise ValueError(f"설정은 JSON 객체여야 합니다: {path}")
    return raw


def config_to_arg_defaults(cfg: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for k in ("input_dir", "output_dir", "gemini_reference", "fixed_params_file"):
        if k not in cfg:
            continue
        v = cfg[k]
        if v is None or v == "":
            out[k] = None
        else:
            out[k] = Path(os.path.expanduser(str(v).strip()))
    if "out_ext" in cfg and cfg["out_ext"] is not None:
        out["out_ext"] = str(cfg["out_ext"])
    if "prompt" in cfg and cfg["prompt"]:
        out["prompt"] = str(cfg["prompt"])
    if "model" in cfg and cfg["model"]:
        out["model"] = str(cfg["model"])
    if "gemini_api_key" in cfg and cfg["gemini_api_key"]:
        out["gemini_api_key"] = str(cfg["gemini_api_key"])
    if "preview_max_size" in cfg:
        out["preview_max_size"] = int(cfg["preview_max_size"])
    if "jpeg_quality" in cfg:
        out["jpeg_quality"] = int(cfg["jpeg_quality"])
    if "use_gemini" in cfg:
        out["use_gemini"] = bool(cfg["use_gemini"])
    if "fixed_params" in cfg and isinstance(cfg["fixed_params"], dict):
        out["fixed_params"] = cfg["fixed_params"]
    if "verbose" in cfg:
        out["verbose"] = bool(cfg["verbose"])
    return out


def _gemini_key(override: str | None = None) -> str:
    k = (override or "").strip() or (GEMINI_API_KEY or "").strip()
    if k:
        return k
    return (os.environ.get("GEMINI_API_KEY") or "").strip()


def is_skippable_sidecar_file(path: Path) -> bool:
    name = path.name
    if name.startswith("._"):
        return True
    if name == ".DS_Store" or name.upper() == "THUMBS.DB":
        return True
    return False


def collect_images(input_dir: Path) -> list[Path]:
    out: list[Path] = []
    for p in sorted(input_dir.iterdir()):
        if (
            p.is_file()
            and p.suffix.lower() in RAW_EXTS
            and not is_skippable_sidecar_file(p)
        ):
            out.append(p)
    return out


def pick_gemini_reference_image(images: list[Path]) -> Path:
    for p in images:
        if p.suffix.lower() in RAW_EXTS:
            return p
    raise ValueError("참조로 쓸 RAW가 없습니다.")


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
            use_camera_wb=True,
            half_size=True,
            output_bps=8,
            no_auto_bright=False,
        )
    im = Image.fromarray(rgb, mode="RGB")
    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    return im


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
        raise ValueError(f"JSON 객체를 찾지 못했습니다: {t[:200]!r}")
    return json.loads(t[i0 : i1 + 1])


@dataclass
class DevelopParams:
    exposure_ev: float = 0.0
    bright: float = 1.0
    user_wb: tuple[float, float, float, float] | None = None
    lens_k1: float = 0.0
    lens_k2: float = 0.0

    @staticmethod
    def from_dict(d: dict[str, Any]) -> DevelopParams:
        ev = float(d.get("exposure_ev", 0.0))
        bright = float(d.get("bright", 1.0))
        wb = d.get("user_wb")
        user_wb: tuple[float, float, float, float] | None = None
        if isinstance(wb, list) and len(wb) == 4:
            user_wb = tuple(float(x) for x in wb)
        lens = d.get("lens")
        k1 = k2 = 0.0
        if isinstance(lens, dict):
            k1 = float(lens.get("k1", 0.0))
            k2 = float(lens.get("k2", 0.0))
        return DevelopParams(
            exposure_ev=max(-4.0, min(4.0, ev)),
            bright=max(0.05, min(8.0, bright)),
            user_wb=user_wb,
            lens_k1=max(-0.5, min(0.5, k1)),
            lens_k2=max(-0.5, min(0.5, k2)),
        )


def ask_gemini_develop_params(
    pil_image: Image.Image,
    api_key: str,
    *,
    prompt: str,
    model_name: str,
) -> DevelopParams:
    import google.generativeai as genai

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content([prompt, pil_image])
    try:
        text = (response.text or "").strip()
    except ValueError as e:
        raise RuntimeError("Gemini 응답을 읽을 수 없습니다.") from e
    data = extract_json_object(text)
    if not isinstance(data, dict):
        raise ValueError("JSON 최상위는 객체여야 합니다.")
    return DevelopParams.from_dict(data)


def apply_lens_distortion_rgb(rgb: np.ndarray, k1: float, k2: float) -> np.ndarray:
    if abs(k1) < 1e-8 and abs(k2) < 1e-8:
        return rgb
    try:
        import cv2
    except ImportError:
        print(
            "경고: opencv-python 이 없어 lens k1/k2 를 건너뜁니다. pip install opencv-python-headless",
            file=sys.stderr,
        )
        return rgb
    u8 = np.ascontiguousarray(rgb, dtype=np.uint8)
    bgr = cv2.cvtColor(u8, cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    fx = float(max(w, h))
    cx, cy = (w - 1) / 2.0, (h - 1) / 2.0
    k = np.array([[fx, 0.0, cx], [0.0, fx, cy], [0.0, 0.0, 1.0]], dtype=np.float64)
    d = np.array([k1, k2, 0.0, 0.0, 0.0], dtype=np.float64)
    new_k, _ = cv2.getOptimalNewCameraMatrix(k, d, (w, h), 1.0, (w, h))
    out = cv2.undistort(bgr, k, d, None, new_k)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB)


def develop_raw_to_rgb(path: Path, p: DevelopParams) -> np.ndarray:
    with rawpy.imread(str(path)) as raw:
        use_auto = p.user_wb is None
        u8 = postprocess_raw_to_rgb_u8(
            raw,
            use_camera_wb=False,
            use_auto_wb=use_auto,
            user_wb=list(p.user_wb) if p.user_wb is not None else None,
            bright=p.bright,
            output_bps=8,
            no_auto_bright=False,
        )
    rgb = u8.astype(np.float32)
    mult = float(2.0 ** p.exposure_ev)
    rgb = np.clip(rgb * mult, 0.0, 255.0)
    out = rgb.astype(np.uint8)
    return apply_lens_distortion_rgb(out, p.lens_k1, p.lens_k2)


def save_jpeg(rgb: np.ndarray, path: Path, quality: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    iio.imwrite(path, rgb, extension=".jpg", quality=int(quality))


def run_batch(
    *,
    input_dir: Path,
    output_dir: Path,
    out_ext: str,
    params: DevelopParams,
    jpeg_quality: int,
    verbose: bool,
) -> int:
    images = collect_images(input_dir)
    if not images:
        return 0
    ext = out_ext.lstrip(".").lower()
    if ext not in ("jpg", "jpeg"):
        ext = "jpg"
    for src in images:
        dst = output_dir / f"{src.stem}.{ext}"
        if verbose:
            print(f"{src.name} -> {dst.name}")
        rgb = develop_raw_to_rgb(src, params)
        save_jpeg(rgb, dst, jpeg_quality)
    return len(images)


def main() -> None:
    pre = argparse.ArgumentParser(add_help=False)
    pre.add_argument("--config", type=Path, default=None, metavar="PATH")
    pre_args, _ = pre.parse_known_args()
    cfg_defaults: dict[str, Any] = {}
    if pre_args.config is not None:
        if not pre_args.config.is_file():
            sys.exit(f"설정 파일 없음: {pre_args.config}")
        cfg_defaults = config_to_arg_defaults(load_batch_config(pre_args.config))

    ap = argparse.ArgumentParser(
        description="Gemini JSON 현상 파라미터 + rawpy 일괄 JPG 출력",
    )
    ap.add_argument("--config", type=Path, default=None, metavar="PATH")
    ap.add_argument("--input-dir", "-i", type=Path, default=None)
    ap.add_argument("--output-dir", "-o", type=Path, default=None)
    ap.add_argument("--out-ext", default="jpg")
    ap.add_argument("--gemini-reference", type=Path, default=None)
    ap.add_argument("--preview-max-size", type=int, default=None)
    ap.add_argument("--jpeg-quality", type=int, default=None)
    ap.add_argument(
        "--fixed-params-file",
        type=Path,
        default=None,
        help="Gemini 대신 이 JSON 파일의 파라미터를 모든 장에 적용",
    )
    g = ap.add_mutually_exclusive_group()
    g.add_argument(
        "--use-gemini",
        dest="use_gemini",
        action="store_true",
        help="Gemini 로 파라미터 요청 (기본)",
    )
    g.add_argument(
        "--no-use-gemini",
        dest="use_gemini",
        action="store_false",
        help="고정 JSON 만 사용",
    )
    ap.set_defaults(use_gemini=True)
    ap.add_argument("--prompt", default=None)
    ap.add_argument("--model", default=None)
    ap.add_argument("--gemini-api-key", default=None, dest="gemini_api_key")
    ap.add_argument("-v", "--verbose", action="store_true")
    if cfg_defaults:
        ap.set_defaults(**cfg_defaults)
    args = ap.parse_args()

    if args.input_dir is None or args.output_dir is None:
        ap.print_help()
        sys.exit("필수: --input-dir, --output-dir (또는 설정 JSON)")

    if not args.input_dir.is_dir():
        sys.exit(f"입력 폴더 없음: {args.input_dir}")

    images = collect_images(args.input_dir)
    if not images:
        sys.exit(f"RAW 파일이 없습니다: {args.input_dir}")

    prompt = args.prompt if args.prompt is not None else DEFAULT_PROMPT
    model_name = args.model if args.model is not None else MODEL
    preview_max = int(args.preview_max_size if args.preview_max_size is not None else 1200)
    jpeg_q = int(args.jpeg_quality if args.jpeg_quality is not None else 92)

    use_gemini = bool(getattr(args, "use_gemini", True))
    fixed: dict[str, Any] | None = None
    if getattr(args, "fixed_params", None) is not None and isinstance(
        args.fixed_params, dict
    ):
        fixed = args.fixed_params
    if fixed is None and args.fixed_params_file is not None:
        if not args.fixed_params_file.is_file():
            sys.exit(f"fixed params 파일 없음: {args.fixed_params_file}")
        fixed = json.loads(args.fixed_params_file.read_text(encoding="utf-8"))
        if not isinstance(fixed, dict):
            sys.exit("fixed params JSON 최상위는 객체여야 합니다.")

    if use_gemini and fixed is None:
        key = _gemini_key(args.gemini_api_key)
        if not key:
            sys.exit(
                "GEMINI_API_KEY 또는 gemini_api_key 가 필요합니다. "
                "고정 파라미터만 쓰려면 --no-use-gemini 와 --fixed-params-file 을 쓰세요.",
            )
        ref = (
            args.gemini_reference
            if args.gemini_reference
            else pick_gemini_reference_image(images)
        )
        if not ref.is_file():
            sys.exit(f"참조 RAW 없음: {ref}")
        im = raw_preview_pil(ref, preview_max)
        params = ask_gemini_develop_params(
            im, key, prompt=prompt, model_name=model_name
        )
        print(f"Gemini 파라미터: {params}")
    else:
        if fixed is None:
            sys.exit(
                "Gemini 를 끄려면 설정 JSON 의 fixed_params 또는 --fixed-params-file 이 필요합니다.",
            )
        params = DevelopParams.from_dict(fixed)
        if args.verbose:
            print(f"고정 파라미터: {params}")

    n = run_batch(
        input_dir=args.input_dir,
        output_dir=args.output_dir,
        out_ext=args.out_ext,
        params=params,
        jpeg_quality=jpeg_q,
        verbose=args.verbose,
    )
    print(f"완료: {n}장 -> {args.output_dir}")


if __name__ == "__main__":
    main()
