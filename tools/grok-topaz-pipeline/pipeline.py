#!/usr/bin/env python3
"""
사진 → Grok Imagine(grok-imagine-video) 영상 생성 → (선택) Topaz Video AI FFmpeg 후처리 → 출력 폴더.

필수:
  export XAI_API_KEY='xai-...'

Topaz 후처리:
  Topaz Video AI에서 미리 로그인한 뒤, 같은 영상으로 「프로세스 →보내기 명령 표시」(또는 미리보기 명령)로
  생성된 ffmpeg 명령의 -vf 이후 부분을 확인하세요. 슬로우 4x·FHD 업스케일은 모델/버전마다 문자열이 다릅니다.

  번들 FFmpeg 기본 경로: topaz_preset.TOPAZ_FFMPEG_PATH (고정, SSD의 Topaz Video.app).
  환경 변수 예시 (모델 경로 — 필요 시):
    export TVAI_MODEL_DATA_DIR="/Volumes/ssd/Applications/Topaz Video.app/Contents/Resources/models"
    export TVAI_MODEL_DIR="$TVAI_MODEL_DATA_DIR"
    export TOPAZ_VF='<Topaz가 생성한 -vf 내용 전체>'

  --no-topaz 를 주면 Grok 결과만 저장합니다.

SSL 오류(CERTIFICATE_VERIFY_FAILED) 시: pip install certifi 후 재시도.
python.org 맥용 Python이면 「Applications/Python 3.x/Install Certificates.command」 실행.
(비권장) GROK_SSL_VERIFY=0 으로 검증 끄기 — 보안에 좋지 않음.
"""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Callable

import certifi
import requests
from topaz_preset import TOPAZ_FFMPEG_PATH

XAI_GENERATIONS = "https://api.x.ai/v1/videos/generations"
XAI_VIDEO_STATUS = "https://api.x.ai/v1/videos/{request_id}"
XAI_IMAGES_GENERATIONS = "https://api.x.ai/v1/images/generations"
XAI_IMAGES_EDITS = "https://api.x.ai/v1/images/edits"

DEFAULT_TOPAZ_FFMPEG_MAC = TOPAZ_FFMPEG_PATH
DEFAULT_TVAI_MODELS_MAC = (
    "/Applications/Topaz Video AI.app/Contents/Resources/models"
)


def _ssl_verify():
    """맥에서 python.org 빌드 등이 시스템 CA를 못 쓸 때 certifi 번들로 검증."""
    if os.environ.get("GROK_SSL_VERIFY", "1").strip().lower() in ("0", "false", "no"):
        return False
    return certifi.where()


def file_to_image_data_uri(path: Path) -> str:
    mime, _ = mimetypes.guess_type(path.name)
    if not mime or not mime.startswith("image/"):
        mime = "image/jpeg"
    raw = path.read_bytes()
    b64 = base64.standard_b64encode(raw).decode("ascii")
    return f"data:{mime};base64,{b64}"


# xAI 문서: 1:1, 16:9/9:16, 4:3/3:4, 3:2/2:3 — auto/원본 미지원
_XAI_VIDEO_ASPECTS = frozenset(
    {"16:9", "9:16", "1:1", "4:3", "3:2", "2:3", "3:4"}
)


def _normalize_xai_video_aspect_ratio(aspect_ratio: str) -> str:
    s = (aspect_ratio or "").strip().lower().replace("∶", ":")
    if s in _XAI_VIDEO_ASPECTS:
        return s
    return "16:9"


def start_generation(
    api_key: str,
    prompt: str,
    image_path: Path,
    duration: int,
    aspect_ratio: str,
    resolution: str,
) -> str:
    ar = _normalize_xai_video_aspect_ratio(aspect_ratio)
    body = {
        "model": "grok-imagine-video",
        "prompt": prompt,
        "duration": duration,
        "aspect_ratio": ar,
        "resolution": resolution,
        "image": {"url": file_to_image_data_uri(image_path)},
    }
    r = requests.post(
        XAI_GENERATIONS,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        json=body,
        timeout=120,
        verify=_ssl_verify(),
    )
    if not r.ok:
        raise RuntimeError(f"Grok 영상 요청 실패 HTTP {r.status_code}: {r.text}")
    data = r.json()
    rid = data.get("request_id")
    if not rid:
        raise RuntimeError(f"request_id 없음: {data}")
    return rid


def poll_until_done(
    api_key: str,
    request_id: str,
    interval: float,
    on_poll: Callable[[dict], None] | None = None,
) -> dict:
    headers = {"Authorization": f"Bearer {api_key}"}
    url = XAI_VIDEO_STATUS.format(request_id=request_id)
    while True:
        r = requests.get(url, headers=headers, timeout=60, verify=_ssl_verify())
        if not r.ok:
            raise RuntimeError(f"상태 조회 실패 HTTP {r.status_code}: {r.text}")
        data = r.json()
        if on_poll:
            on_poll(data)
        status = data.get("status")
        if status == "done":
            return data
        if status == "failed":
            err = data.get("error", data)
            raise RuntimeError(f"영상 생성 실패: {err}")
        if status == "expired":
            raise RuntimeError("영상 요청이 만료되었습니다.")
        prog = data.get("progress")
        if prog is not None:
            print(f"  … 진행 중 ({prog}%)", flush=True)
        time.sleep(interval)


def infer_tvai_models_dir(ffmpeg_bin: Path) -> Path | None:
    """Topaz 번들 ffmpeg 경로에서 Resources/models 폴더를 위로 올라가며 찾습니다 (SSD 등 비표준 설치 경로 대응)."""
    try:
        p = ffmpeg_bin.resolve().parent
        for _ in range(10):
            cand = p / "Resources" / "models"
            if cand.is_dir():
                return cand
            parent = p.parent
            if parent == p:
                break
            p = parent
    except OSError:
        pass
    return None


def apply_tvai_env_for_ffmpeg(ffmpeg_bin: Path) -> None:
    """TVAI_MODEL_DIR 등이 비어 있으면, ffmpeg와 같은 앱 번들의 models 경로를 넣습니다."""
    inferred = infer_tvai_models_dir(ffmpeg_bin)
    inferred_s = str(inferred) if inferred else ""
    for key in ("TVAI_MODEL_DATA_DIR", "TVAI_MODEL_DIR"):
        if (os.environ.get(key) or "").strip():
            continue
        if inferred_s:
            os.environ[key] = inferred_s
        elif Path(DEFAULT_TVAI_MODELS_MAC).is_dir():
            os.environ[key] = DEFAULT_TVAI_MODELS_MAC


def download_video(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": "grok-topaz-pipeline/1.0"}
    with requests.get(
        url,
        headers=headers,
        timeout=600,
        stream=True,
        verify=_ssl_verify(),
    ) as r:
        r.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)


def _write_image_bytes_detect_ext(data: bytes, dest_base: Path) -> Path:
    """dest_base는 확장자 없는 경로. 시그니처로 png/jpg/webp 구분."""
    dest_base.parent.mkdir(parents=True, exist_ok=True)
    if len(data) >= 8 and data[:8] == b"\x89PNG\r\n\x1a\n":
        dest = dest_base.with_suffix(".png")
    elif len(data) >= 2 and data[:2] == b"\xff\xd8":
        dest = dest_base.with_suffix(".jpg")
    elif len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        dest = dest_base.with_suffix(".webp")
    else:
        dest = dest_base.with_suffix(".png")
    dest.write_bytes(data)
    return dest


def download_image_from_url(url: str, dest_base: Path) -> Path:
    """임시 URL에서 이미지를 받아 저장. dest_base는 확장자 없음."""
    headers = {"User-Agent": "grok-topaz-pipeline/1.0"}
    r = requests.get(url, headers=headers, timeout=600, verify=_ssl_verify())
    r.raise_for_status()
    ct = (r.headers.get("Content-Type") or "").lower()
    buf = r.content
    if "jpeg" in ct or "jpg" in ct:
        dest = dest_base.with_suffix(".jpg")
    elif "png" in ct:
        dest = dest_base.with_suffix(".png")
    elif "webp" in ct:
        dest = dest_base.with_suffix(".webp")
    else:
        return _write_image_bytes_detect_ext(buf, dest_base)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(buf)
    return dest


def generate_grok_image_to_file(
    api_key: str,
    prompt: str,
    aspect_ratio: str,
    resolution: str,
    image_paths: list[Path] | None,
    dest_base: Path,
) -> Path:
    """
    grok-imagine-image: 프롬프트만(생성) 또는 참조 이미지+프롬프트(편집).
    참조가 2장 이상이면 /images/edits 의 `images` 배열(최대 5장, 문서 기준).
    프롬프트에서 \\1, \\2 로 각 참조를 지정할 수 있음(xAI).
    dest_base는 확장자 없는 경로; 반환은 실제 저장 경로.
    """
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    ar = (aspect_ratio or "auto").strip() or "auto"
    res = (resolution or "1k").strip().lower()
    if res not in ("1k", "2k"):
        res = "1k"

    ref_paths = [p for p in (image_paths or []) if p is not None and p.is_file()]

    if len(ref_paths) >= 2:
        ep = XAI_IMAGES_EDITS
        imgs = [
            {"url": file_to_image_data_uri(p), "type": "image_url"}
            for p in ref_paths[:5]
        ]
        body = {
            "model": "grok-imagine-image",
            "prompt": prompt,
            "aspect_ratio": ar,
            "resolution": res,
            "images": imgs,
        }
        data_uri = None
    elif len(ref_paths) == 1:
        ep = XAI_IMAGES_EDITS
        data_uri = file_to_image_data_uri(ref_paths[0])
        body = {
            "model": "grok-imagine-image",
            "prompt": prompt,
            "aspect_ratio": ar,
            "resolution": res,
            "image": {"url": data_uri, "type": "image_url"},
        }
    else:
        ep = XAI_IMAGES_GENERATIONS
        data_uri = None
        body = {
            "model": "grok-imagine-image",
            "prompt": prompt,
            "aspect_ratio": ar,
            "resolution": res,
        }

    r = requests.post(
        ep,
        headers=headers,
        json=body,
        timeout=600,
        verify=_ssl_verify(),
    )
    if not r.ok and ep == XAI_IMAGES_EDITS and len(ref_paths) == 1 and data_uri is not None:
        body_alt = {
            "model": "grok-imagine-image",
            "prompt": prompt,
            "aspect_ratio": ar,
            "resolution": res,
            "image": {"url": data_uri},
        }
        r = requests.post(
            ep,
            headers=headers,
            json=body_alt,
            timeout=600,
            verify=_ssl_verify(),
        )
    if (
        not r.ok
        and ep == XAI_IMAGES_EDITS
        and len(ref_paths) >= 2
    ):
        imgs_alt = [{"url": file_to_image_data_uri(p)} for p in ref_paths[:5]]
        body_alt = {
            "model": "grok-imagine-image",
            "prompt": prompt,
            "aspect_ratio": ar,
            "resolution": res,
            "images": imgs_alt,
        }
        r = requests.post(
            ep,
            headers=headers,
            json=body_alt,
            timeout=600,
            verify=_ssl_verify(),
        )
    if not r.ok:
        raise RuntimeError(f"Grok 이미지 요청 실패 HTTP {r.status_code}: {r.text}")
    data = r.json()
    arr = data.get("data")
    if not arr:
        raise RuntimeError(f"응답에 이미지가 없습니다: {data}")
    item = arr[0]
    u = item.get("url")
    b64 = item.get("b64_json")
    if u:
        return download_image_from_url(str(u), dest_base)
    if b64:
        raw = base64.standard_b64decode(b64)
        return _write_image_bytes_detect_ext(raw, dest_base)
    raise RuntimeError(f"url/b64_json 없음: {item}")


def generate_gemini_nano_banana2_to_file(
    api_key: str,
    prompt: str,
    aspect_ratio: str,
    resolution: str,
    image_paths: list[Path] | None,
    dest_base: Path,
) -> Path:
    """
    Google Gemini API — Nano Banana 2 (Gemini 3.1 Flash Image Preview).
    모델: 환경 변수 GEMINI_IMAGE_MODEL (기본 gemini-3.1-flash-image-preview).
    REST: https://ai.google.dev/gemini-api/docs/image-generation
    참조 이미지가 여러 장이면 parts에 텍스트 뒤 순서대로 inlineData 추가.
    """
    model = (
        os.environ.get("GEMINI_IMAGE_MODEL", "").strip()
        or "gemini-3.1-flash-image-preview"
    )
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent"
    )

    parts: list[dict] = [{"text": prompt}]
    ref_paths = [p for p in (image_paths or []) if p is not None and p.is_file()]
    for image_path in ref_paths[:8]:
        mime, _ = mimetypes.guess_type(image_path.name)
        if not mime or not mime.startswith("image/"):
            mime = "image/jpeg"
        raw = image_path.read_bytes()
        b64 = base64.standard_b64encode(raw).decode("ascii")
        parts.append({"inlineData": {"mimeType": mime, "data": b64}})

    img_cfg: dict[str, str] = {}
    ar = (aspect_ratio or "").strip()
    if ar and ar.lower() != "auto":
        img_cfg["aspectRatio"] = ar
    rs = (resolution or "1k").strip().lower()
    size_map = {"1k": "1K", "2k": "2K", "4k": "4K", "512": "512"}
    img_cfg["imageSize"] = size_map.get(rs, "1K")

    body: dict = {
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
        },
    }
    if img_cfg:
        body["generationConfig"]["imageConfig"] = img_cfg

    r = requests.post(
        url,
        params={"key": api_key},
        headers={"Content-Type": "application/json"},
        json=body,
        timeout=600,
        verify=_ssl_verify(),
    )
    if not r.ok:
        raise RuntimeError(f"Gemini 이미지 요청 실패 HTTP {r.status_code}: {r.text}")
    data = r.json()

    fb = data.get("promptFeedback") or {}
    if fb.get("blockReason"):
        raise RuntimeError(f"요청이 차단되었습니다: {fb}")

    cands = data.get("candidates") or []
    if not cands:
        raise RuntimeError(
            f"응답에 후보가 없습니다: {json.dumps(data, ensure_ascii=False)[:2500]}"
        )

    image_bytes: bytes | None = None
    for c in cands:
        for p in (c.get("content") or {}).get("parts") or []:
            inline = p.get("inlineData") or p.get("inline_data")
            if not inline:
                continue
            b64 = inline.get("data")
            if b64:
                image_bytes = base64.standard_b64decode(b64)
                break
        if image_bytes:
            break

    if not image_bytes:
        raise RuntimeError(
            f"응답에 이미지 데이터가 없습니다: {json.dumps(data, ensure_ascii=False)[:2500]}"
        )
    return _write_image_bytes_detect_ext(image_bytes, dest_base)


def augment_vf_for_tvai(vf: str) -> str:
    """
    tvai_fi는 입력 스트림의 프레임레이트가 0이거나 깨진 메타데이터(timescale not set)일 때
    'Unable to parse option value \"0\" as video rate' 로 죽는 경우가 있음.
    기본으로 앞에 fps= 필터를 붙임. 끄려면 GROK_TVAI_PREPEND_FPS=0
    """
    v = vf.strip()
    if "tvai_fi" not in v:
        return v
    fps_env = os.environ.get("GROK_TVAI_PREPEND_FPS", "24").strip()
    if fps_env.lower() in ("", "0", "off", "no", "false"):
        return v
    if v.startswith("fps="):
        return v
    if ",fps=" in v.split("tvai_fi")[0]:
        return v
    return f"fps={fps_env}," + v


def run_topaz_ffmpeg(
    ffmpeg: Path,
    input_mp4: Path,
    output_mp4: Path,
    extra_args: list[str],
    vf: str | None = None,
    filter_complex: str | None = None,
    post_input_args: list[str] | None = None,
    segment_start_sec: float | None = None,
    segment_duration_sec: float | None = None,
) -> None:
    if not ffmpeg.is_file():
        raise FileNotFoundError(f"Topaz ffmpeg 없음: {ffmpeg}")
    apply_tvai_env_for_ffmpeg(ffmpeg)
    fc = (filter_complex or "").strip()
    v = (vf or "").strip()
    if fc and v:
        raise ValueError("-vf와 -filter_complex를 동시에 지정할 수 없습니다. 하나만 넣으세요.")
    if not fc and not v:
        raise ValueError("Topaz 필터(-vf 또는 -filter_complex)가 비어 있습니다.")

    post = list(post_input_args) if post_input_args else []

    head = [
        str(ffmpeg),
        "-y",
        "-fflags",
        "+genpts",
    ]
    if segment_start_sec is not None and segment_start_sec > 0:
        head += ["-ss", str(segment_start_sec)]
    head += ["-i", str(input_mp4)]
    if segment_duration_sec is not None and segment_duration_sec > 0:
        head += ["-t", str(segment_duration_sec)]

    if fc:
        cmd = [
            *head,
            *post,
            "-filter_complex",
            fc,
            *extra_args,
            str(output_mp4),
        ]
        seg = ""
        if segment_start_sec is not None and segment_start_sec > 0:
            seg += f" -ss {segment_start_sec}"
        if segment_duration_sec is not None and segment_duration_sec > 0:
            seg += f" -t {segment_duration_sec}"
        print(
            "  Topaz FFmpeg (-filter_complex):",
            str(ffmpeg),
            "-i …" + seg,
            flush=True,
        )
    else:
        vf_use = augment_vf_for_tvai(v)
        if vf_use != v:
            print("  tvai_fi용 -vf 보정:", vf_use[:120] + ("…" if len(vf_use) > 120 else ""), flush=True)
        cmd = [
            *head,
            *post,
            "-vf",
            vf_use,
            *extra_args,
            str(output_mp4),
        ]
        print("  Topaz FFmpeg 실행:", " ".join(cmd[:6]), "…", flush=True)
    proc = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if proc.returncode != 0:
        tail = (proc.stderr or proc.stdout or "").strip()
        if len(tail) > 6000:
            tail = "…\n" + tail[-6000:]
        hint = ""
        if "Unknown encoder" in tail or "Encoder not found" in tail:
            hint = (
                "\n\n※ Topaz에 포함된 FFmpeg에는 libx264가 없는 경우가 많습니다. "
                "맥이면 추가 인자를 예: -c:v h264_videotoolbox -b:v 8M 처럼 바꿔 보세요."
            )
        elif "Unable to parse" in tail and "video rate" in tail:
            hint = (
                "\n\n※ 입력 영상 메타데이터(타임스탬프/프레임레이트) 문제일 수 있습니다. "
                "스크립트가 tvai_fi 앞에 fps=를 붙입니다. 그래도 안 되면 GROK_TVAI_PREPEND_FPS=30 등으로 바꿔 보세요. "
                "끄려면 GROK_TVAI_PREPEND_FPS=0"
            )
        elif "json" in tail.lower() and "null" in tail:
            hint = (
                "\n\n※ tvai 필터가 내부에서 잘못된 값(0/null)을 받았을 때 나는 경우가 많습니다. "
                "위 fps 보정·Topaz 앱에서 내보내기 명령을 다시 복사해 보세요."
            )
        elif "tvai" in tail.lower() or "model" in tail.lower():
            hint = "\n\n※ 모델 경로(TVAI_MODEL_DIR)·Topaz 앱 로그인·-vf 문법도 확인하세요."
        else:
            hint = ""
        raise RuntimeError(
            f"FFmpeg 종료 코드 {proc.returncode}.\n{tail}{hint}"
        )


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="이미지 → Grok 영상 → (선택) Topaz 후처리 → 출력 폴더",
    )
    p.add_argument("image", type=Path, help="입력 이미지 경로")
    p.add_argument(
        "--prompt",
        "-p",
        required=True,
        help="원하는 영상 스타일·움직임을 영어 또는 한국어로 설명 (Grok 프롬프트)",
    )
    p.add_argument(
        "--out-dir",
        "-o",
        type=Path,
        required=True,
        help="최종 파일을 둘 폴더",
    )
    p.add_argument("--duration", type=int, default=8, help="초 (1–15, 기본 8)")
    p.add_argument(
        "--aspect-ratio",
        default="16:9",
        help="16:9, 9:16, 1:1, 4:3, 3:4, 3:2, 2:3 (xAI 문서 기준)",
    )
    p.add_argument(
        "--resolution",
        choices=("480p", "720p"),
        default="720p",
        help="Grok 출력 해상도 (API 최대 720p)",
    )
    p.add_argument("--poll-interval", type=float, default=5.0)
    p.add_argument(
        "--no-topaz",
        action="store_true",
        help="Grok raw 영상만 저장하고 Topaz 단계 생략",
    )
    p.add_argument(
        "--topaz-ffmpeg",
        type=Path,
        default=None,
        help="Topaz 번들 ffmpeg (기본: topaz_preset.TOPAZ_FFMPEG_PATH 또는 환경 변수 TOPAZ_FFMPEG)",
    )
    p.add_argument(
        "--topaz-vf-file",
        type=Path,
        default=None,
        help="-vf 필터 한 줄을 담은 텍스트 파일 (TOPAZ_VF 보다 우선)",
    )
    p.add_argument(
        "--topaz-extra",
        default="",
        help='FFmpeg 출력 추가 인자. Topaz 번들 ffmpeg는 libx264 없음. 맥 예: -c:v h264_videotoolbox -b:v 8M',
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    api_key = os.environ.get("XAI_API_KEY")
    if not api_key:
        print("XAI_API_KEY 환경 변수를 설정하세요.", file=sys.stderr)
        return 1

    img = args.image.resolve()
    if not img.is_file():
        print(f"이미지를 찾을 수 없습니다: {img}", file=sys.stderr)
        return 1

    out_dir = args.out_dir.expanduser().resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = img.stem
    raw_path = out_dir / f"{stem}_grok_raw.mp4"
    final_path = out_dir / f"{stem}_fhd_topaz.mp4"

    print("1) Grok Imagine에 이미지·프롬프트 전송 중…", flush=True)
    rid = start_generation(
        api_key,
        args.prompt,
        img,
        max(1, min(15, args.duration)),
        args.aspect_ratio,
        args.resolution,
    )
    print(f"   request_id={rid}", flush=True)

    print("2) 생성 완료까지 대기…", flush=True)
    result = poll_until_done(api_key, rid, args.poll_interval)
    video = result.get("video") or {}
    vurl = video.get("url")
    if not vurl:
        print(f"완료 응답에 video.url 없음: {json.dumps(result, ensure_ascii=False)}", file=sys.stderr)
        return 1

    print(f"3) 다운로드 → {raw_path}", flush=True)
    download_video(vurl, raw_path)

    if args.no_topaz:
        print("완료 (--no-topaz):", raw_path)
        return 0

    vf = ""
    if args.topaz_vf_file and args.topaz_vf_file.is_file():
        vf = args.topaz_vf_file.read_text(encoding="utf-8").strip()
    if not vf:
        vf = os.environ.get("TOPAZ_VF", "").strip()

    if not vf:
        print(
            "Topaz -vf 가 비어 있습니다. TOPAZ_VF 또는 --topaz-vf-file 로 "
            "Topaz 앱에서 복사한 필터 문자열을 넣으세요. "
            f"Grok 원본은 저장됨: {raw_path}",
            file=sys.stderr,
        )
        return 0

    ffmpeg_path = args.topaz_ffmpeg
    if ffmpeg_path is None:
        env_ff = os.environ.get("TOPAZ_FFMPEG")
        ffmpeg_path = Path(env_ff) if env_ff else Path(DEFAULT_TOPAZ_FFMPEG_MAC)

    for key, default in (
        ("TVAI_MODEL_DATA_DIR", DEFAULT_TVAI_MODELS_MAC),
        ("TVAI_MODEL_DIR", DEFAULT_TVAI_MODELS_MAC),
    ):
        if key not in os.environ and Path(default).is_dir():
            os.environ[key] = default

    extra = args.topaz_extra.split() if args.topaz_extra.strip() else []

    print("4) Topaz FFmpeg 후처리 (슬로우/업스케일은 TOPAZ_VF에 맡김)…", flush=True)
    try:
        run_topaz_ffmpeg(ffmpeg_path, raw_path, final_path, extra, vf=vf)
    except (FileNotFoundError, RuntimeError) as e:
        print(e, file=sys.stderr)
        return 1

    print("완료:", final_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
