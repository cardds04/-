"""
로컬 웹 UI: 이미지 업로드 → Grok 영상 → (선택) Topaz.

실행 (이 폴더에서):
  pip install -r requirements.txt
  python web_app.py
  (API 키는 웹 화면에 입력하거나, 선택적으로 export XAI_API_KEY='xai-...')

브라우저: http://127.0.0.1:5055

온라인/다른 기기에서 쓰려면:
  GROK_WEB_HOST=0.0.0.0 GROK_WEB_PORT=5055 python web_app.py
  같은 Wi‑Fi의 휴대폰 등에서는 http://<이 PC의 LAN IP>:5055 로 접속.
  리버스 프록시로 경로 prefix를 쓰는 경우: GROK_WEB_PUBLIC_PATH=/grok (끝 슬래시 없음)
  정적 호스트와 API 호스트이 다를 때만: GROK_WEB_CORS_ORIGINS=https://your-site.vercel.app
"""

from __future__ import annotations

import io
import json
import os
import shutil
import sys
import tempfile
import zipfile
import threading
import uuid
from pathlib import Path

from urllib.parse import quote

from flask import Flask, Response, jsonify, make_response, render_template, request, send_file
from werkzeug.utils import secure_filename

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import batch_aspect_ratio as BAR
import pipeline as P
import topaz_preset as TP

try:
    import pan_static_video as PV
except ImportError:
    PV = None  # type: ignore

OUTPUT_ROOT = Path(os.environ.get("GROK_WEB_OUTPUT", ROOT / "web_output")).expanduser().resolve()

# 리버스 프록시 하위 경로(예: /grok)에서 정적·API fetch가 맞게 가도록 브라우저에 넘김
_GROK_WEB_PUBLIC_PATH = (os.environ.get("GROK_WEB_PUBLIC_PATH") or "").strip().rstrip("/")
_CORS_ORIGINS = frozenset(
    x.strip()
    for x in (os.environ.get("GROK_WEB_CORS_ORIGINS") or "").split(",")
    if x.strip()
)

# Grok: 폼 비어 있을 때 사용 (우선순위: XAI_API_KEY → GROK_WEB_DEFAULT_XAI_KEY). 비밀은 코드에 넣지 말고 env만 사용.
def _resolve_xai_key(form_key: str) -> str:
    k = (form_key or "").strip()
    if k:
        return k
    k = (os.environ.get("XAI_API_KEY") or "").strip()
    if k:
        return k
    k = (os.environ.get("GROK_WEB_DEFAULT_XAI_KEY") or "").strip()
    if k:
        return k
    return ""


def _resolve_gemini_key(form_key: str) -> str:
    k = (form_key or "").strip()
    if k:
        return k
    return (os.environ.get("GEMINI_API_KEY") or "").strip()


app = Flask(
    __name__,
    template_folder=str(ROOT / "templates"),
    static_folder=str(ROOT / "static"),
)
_MAX_MB = int(os.environ.get("GROK_WEB_MAX_UPLOAD_MB", "800"))
app.config["MAX_CONTENT_LENGTH"] = max(30, _MAX_MB) * 1024 * 1024
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


def _asset_version() -> int:
    """템플릿·정적 파일이 바뀔 때마다 URL 쿼리가 달라지게 해 브라우저 캐시를 무력화."""
    mtimes = []
    for rel in (
        "templates/index.html",
        "static/app.js",
        "static/style.css",
        "pan_static_video.py",
        "pipeline.py",
        "batch_aspect_ratio.py",
    ):
        p = ROOT / rel
        if p.is_file():
            mtimes.append(p.stat().st_mtime)
    return int(max(mtimes) if mtimes else 0)


@app.before_request
def _cors_preflight() -> Response | None:
    if request.method != "OPTIONS" or not _CORS_ORIGINS:
        return None
    origin = (request.headers.get("Origin") or "").strip()
    if origin not in _CORS_ORIGINS:
        return None
    r = Response(status=204)
    r.headers["Access-Control-Allow-Origin"] = origin
    r.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    r.headers["Access-Control-Allow-Headers"] = "Content-Type"
    r.headers["Access-Control-Max-Age"] = "86400"
    return r


@app.after_request
def _response_headers(response):
    if request.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    if _CORS_ORIGINS:
        origin = (request.headers.get("Origin") or "").strip()
        if origin in _CORS_ORIGINS:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response

_jobs_lock = threading.Lock()
_jobs: dict[str, dict] = {}
# Topaz(FFmpeg)는 GPU/라이선스 부담으로 동시 1건만 실행
_topaz_run_lock = threading.Lock()


def _job_dir(job_id: str) -> Path:
    d = OUTPUT_ROOT / job_id
    d.mkdir(parents=True, exist_ok=True)
    return d


def _set_job(job_id: str, **kwargs) -> None:
    with _jobs_lock:
        j = _jobs.setdefault(job_id, {})
        j.update(kwargs)


def _run_pipeline(
    job_id: str,
    api_key: str,
    image_path: Path,
    stem: str,
    prompt: str,
    duration: int,
    aspect_ratio: str,
    resolution: str,
    run_topaz: bool,
    topaz_vf: str,
    topaz_filter_complex: str,
    topaz_ffmpeg: str | None,
    topaz_extra: str,
    use_topaz_preset: bool = False,
) -> None:
    out = _job_dir(job_id)
    raw_path = out / f"{stem}_grok_raw.mp4"
    final_path = out / f"{stem}_fhd_topaz.mp4"
    try:
        _set_job(
            job_id,
            phase="grok_submit",
            message="Grok에 요청 보내는 중…",
            grok_progress=None,
            error=None,
        )
        rid = P.start_generation(
            api_key, prompt, image_path, duration, aspect_ratio, resolution
        )
        _set_job(
            job_id,
            phase="grok_wait",
            xai_request_id=rid,
            message="영상 생성 중입니다. 보통 1~5분 걸릴 수 있어요.",
        )

        def on_poll(data: dict) -> None:
            st = data.get("status")
            prog = data.get("progress")
            msg = "영상 생성 중…"
            if prog is not None:
                msg = f"영상 생성 중… (약 {prog}%)"
            elif st == "pending":
                msg = "대기열에서 처리 중…"
            _set_job(job_id, grok_progress=prog, message=msg)

        result = P.poll_until_done(api_key, rid, 5.0, on_poll=on_poll)
        video = result.get("video") or {}
        vurl = video.get("url")
        if not vurl:
            raise RuntimeError("응답에 영상 URL이 없습니다.")

        _set_job(job_id, phase="download", message="파일 받는 중…")
        P.download_video(vurl, raw_path)

        _set_job(
            job_id,
            phase="grok_done",
            message="Grok 영상 저장 완료",
            raw_mp4=str(raw_path),
            final_mp4=None,
        )

        if not run_topaz:
            _set_job(
                job_id,
                phase="done",
                message="완료 (Topaz 생략)",
                final_mp4=None,
            )
            return

        vf_s = (topaz_vf or "").strip()
        fc_s = (topaz_filter_complex or "").strip()
        # 수동 필터가 없으면 저장된 프리셋 (플래그 누락 시에도 Grok 원본만 넘어가지 않게)
        use_preset_eff = bool(use_topaz_preset) or (not vf_s and not fc_s)

        with _topaz_run_lock:
            if use_preset_eff:
                ff = Path(topaz_ffmpeg) if topaz_ffmpeg else TP.ffmpeg_path()
                if not ff.is_file():
                    raise FileNotFoundError(
                        f"프리셋 FFmpeg 없음: {ff}. "
                        "topaz_preset.TOPAZ_FFMPEG_PATH 및 Topaz Video.app 경로를 확인하세요."
                    )
                _set_job(
                    job_id,
                    phase="topaz",
                    message="Topaz FFmpeg 실행 중… (저장된 프리셋)",
                )
                P.run_topaz_ffmpeg(
                    ff,
                    raw_path,
                    final_path,
                    TP.extra_after_filter(),
                    vf=None,
                    filter_complex=TP.filter_complex(),
                    post_input_args=TP.post_input_args(),
                    segment_start_sec=TP.segment_start_sec_for_ffmpeg(),
                    segment_duration_sec=TP.segment_duration_sec_for_ffmpeg(),
                )
            else:
                if not vf_s and not fc_s:
                    _set_job(
                        job_id,
                        phase="done",
                        message="Topaz 필터가 비어 있어 Grok 원본만 저장했습니다.",
                        final_mp4=None,
                    )
                    return
                if vf_s and fc_s:
                    raise ValueError("-vf와 -filter_complex를 동시에 지정할 수 없습니다.")

                ff = Path(topaz_ffmpeg) if topaz_ffmpeg else TP.ffmpeg_path()

                extra = topaz_extra.split() if topaz_extra.strip() else []

                _set_job(job_id, phase="topaz", message="Topaz FFmpeg 실행 중…")
                P.run_topaz_ffmpeg(
                    ff,
                    raw_path,
                    final_path,
                    extra,
                    vf=vf_s or None,
                    filter_complex=fc_s or None,
                )
        _set_job(
            job_id,
            phase="done",
            message="완료 (Topaz 포함)",
            final_mp4=str(final_path),
        )
    except Exception as e:
        _set_job(
            job_id,
            phase="failed",
            error=str(e),
            message="오류가 발생했습니다.",
        )


_VIDEO_EXT_OK = frozenset({".mp4", ".mov", ".mkv", ".m4v", ".avi", ".webm"})
_PAN_IMG_EXT = frozenset({".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"})
_MAX_PAN_IMAGES = 50


def _run_topaz_only(
    job_id: str,
    video_path: Path,
    stem: str,
    topaz_vf: str,
    topaz_filter_complex: str,
    topaz_ffmpeg: str | None,
    topaz_extra: str,
    use_topaz_preset: bool = False,
) -> None:
    out = _job_dir(job_id)
    final_path = out / f"{stem}_topaz_out.mp4"
    vf_s = (topaz_vf or "").strip()
    fc_s = (topaz_filter_complex or "").strip()
    try:
        _set_job(
            job_id,
            phase="topaz",
            message="Topaz FFmpeg 실행 중…",
            grok_progress=None,
            xai_request_id=None,
            error=None,
        )
        with _topaz_run_lock:
            if use_topaz_preset:
                ff = Path(topaz_ffmpeg) if topaz_ffmpeg else TP.ffmpeg_path()
                if not ff.is_file():
                    raise FileNotFoundError(
                        f"프리셋 FFmpeg 없음: {ff}. "
                        "topaz_preset.TOPAZ_FFMPEG_PATH 및 /Volumes/ssd 마운트를 확인하세요."
                    )
                _set_job(job_id, message="Topaz FFmpeg 실행 중… (저장된 프리셋)")
                P.run_topaz_ffmpeg(
                    ff,
                    video_path,
                    final_path,
                    TP.extra_after_filter(),
                    vf=None,
                    filter_complex=TP.filter_complex(),
                    post_input_args=TP.post_input_args(),
                    segment_start_sec=TP.segment_start_sec_for_ffmpeg(),
                    segment_duration_sec=TP.segment_duration_sec_for_ffmpeg(),
                )
            else:
                ff = Path(topaz_ffmpeg) if topaz_ffmpeg else TP.ffmpeg_path()
                extra = topaz_extra.split() if topaz_extra.strip() else []
                if vf_s and fc_s:
                    raise ValueError("-vf와 -filter_complex를 동시에 지정할 수 없습니다.")
                P.run_topaz_ffmpeg(
                    ff,
                    video_path,
                    final_path,
                    extra,
                    vf=vf_s or None,
                    filter_complex=fc_s or None,
                )
        _set_job(
            job_id,
            phase="done",
            message="완료 (Topaz만)",
            final_mp4=str(final_path),
        )
    except Exception as e:
        _set_job(
            job_id,
            phase="failed",
            error=str(e),
            message="오류가 발생했습니다.",
        )


def _run_grok_image(
    job_id: str,
    image_provider: str,
    api_key: str,
    prompt: str,
    aspect_ratio: str,
    resolution: str,
    reference_paths: list[Path] | None,
) -> None:
    out = _job_dir(job_id)
    dest_base = out / "grok_image"
    try:
        if image_provider == "gemini":
            _set_job(
                job_id,
                phase="grok_image",
                message="Gemini 나노바나나2 이미지 생성 중…",
                grok_progress=None,
                error=None,
            )
            final = P.generate_gemini_nano_banana2_to_file(
                api_key,
                prompt,
                aspect_ratio,
                resolution,
                reference_paths,
                dest_base,
            )
            _set_job(
                job_id,
                phase="done",
                message="완료 (Gemini 나노바나나2)",
                grok_image_outputs=[str(final.resolve())],
            )
        else:
            _set_job(
                job_id,
                phase="grok_image",
                message="Grok 이미지 생성 중… (Imagine)",
                grok_progress=None,
                error=None,
            )
            final = P.generate_grok_image_to_file(
                api_key,
                prompt,
                aspect_ratio,
                resolution,
                reference_paths,
                dest_base,
            )
            _set_job(
                job_id,
                phase="done",
                message="완료 (Grok 이미지)",
                grok_image_outputs=[str(final.resolve())],
            )
    except Exception as e:
        _set_job(
            job_id,
            phase="failed",
            error=str(e),
            message="오류가 발생했습니다.",
        )


def _run_pan_batch(
    job_id: str, items: list[tuple[Path, str]], pan_mode: str = "lr"
) -> None:
    if PV is None:
        _set_job(
            job_id,
            phase="failed",
            error="MoviePy 등이 설치되지 않았습니다. pip install -r requirements.txt",
            message="오류",
        )
        return
    out = _job_dir(job_id)
    outputs: list[str] = []
    n = len(items)
    stem_counts: dict[str, int] = {}
    try:
        for i, (src, stem) in enumerate(items):
            _set_job(
                job_id,
                phase="pan",
                message=f"팬 영상 {i + 1}/{n} 생성 중… (MoviePy)",
                pan_done=i,
                pan_total=n,
            )
            c = stem_counts.get(stem, 0) + 1
            stem_counts[stem] = c
            fname = f"{stem}_pan.mp4" if c == 1 else f"{stem}_{c}_pan.mp4"
            out_mp4 = out / fname
            PV.render_pan_mp4_from_path(src, out_mp4, mode=pan_mode)
            outputs.append(str(out_mp4.resolve()))
            _set_job(job_id, pan_done=i + 1, pan_outputs=list(outputs))
        _set_job(
            job_id,
            phase="done",
            message="완료 (팬 영상)",
            pan_done=n,
            pan_total=n,
        )
    except Exception as e:
        _set_job(
            job_id,
            phase="failed",
            error=str(e),
            message="오류가 발생했습니다.",
        )


@app.route("/")
def index():
    av = _asset_version()
    r = make_response(
        render_template(
            "index.html",
            asset_v=av,
            grok_web_api_base_json=json.dumps(_GROK_WEB_PUBLIC_PATH),
        )
    )
    r.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    r.headers["Pragma"] = "no-cache"
    return r


@app.route("/api/ready")
def api_ready():
    key_ok = bool(_resolve_xai_key(""))
    gemini_ok = bool(_resolve_gemini_key(""))
    return jsonify(
        {
            "env_has_xai_key": bool(os.environ.get("XAI_API_KEY")),
            "grok_key_ready": key_ok,
            "env_has_gemini_key": bool(os.environ.get("GEMINI_API_KEY")),
            "gemini_key_ready": gemini_ok,
            "output_dir": str(OUTPUT_ROOT),
            "pan_moviepy_ok": PV is not None,
        }
    )


@app.route("/api/pan-jobs", methods=["POST"])
def create_pan_job():
    if PV is None:
        return jsonify(
            {
                "error": "MoviePy가 없습니다. 터미널에서 pip install -r requirements.txt 후 서버를 다시 실행하세요.",
            }
        ), 503
    files = request.files.getlist("images")
    if not files or not any(f and getattr(f, "filename", None) for f in files):
        return jsonify({"error": "이미지를 하나 이상 선택하세요."}), 400
    items: list[tuple[Path, str]] = []
    job_id = uuid.uuid4().hex
    job_out = _job_dir(job_id)
    idx = 0
    for f in files:
        if not f or not f.filename:
            continue
        if len(items) >= _MAX_PAN_IMAGES:
            break
        safe = secure_filename(f.filename) or f"img{idx}.jpg"
        ext = Path(safe).suffix.lower() or ".jpg"
        if ext not in _PAN_IMG_EXT:
            continue
        stem = Path(safe).stem or f"img{idx}"
        dest = job_out / f"source_{idx}_{stem}{ext}"
        f.save(dest)
        items.append((dest, stem))
        idx += 1
    if not items:
        return jsonify(
            {"error": "지원 형식(.jpg .png .webp 등) 이미지를 올려 주세요."}
        ), 400
    pan_mode = (request.form.get("pan_mode") or "lr").strip().lower()
    if pan_mode not in ("lr", "rl", "forward", "random"):
        pan_mode = "lr"
    with _jobs_lock:
        _jobs[job_id] = {
            "phase": "queued",
            "message": "곧 시작합니다…",
            "kind": "pan_photo",
            "grok_progress": None,
            "xai_request_id": None,
            "raw_mp4": None,
            "final_mp4": None,
            "pan_outputs": [],
            "pan_done": 0,
            "pan_total": len(items),
            "error": None,
        }
    t = threading.Thread(
        target=_run_pan_batch,
        kwargs={"job_id": job_id, "items": items, "pan_mode": pan_mode},
        daemon=True,
    )
    t.start()
    return jsonify({"job_id": job_id, "kind": "pan_photo"})


_MAX_BATCH_ASPECT = int(os.environ.get("GROK_BATCH_ASPECT_MAX", "200"))


@app.route("/api/batch-aspect-ratio", methods=["POST"])
def api_batch_aspect_ratio():
    """여러 이미지를 동일 화면비로 중앙 크롭 후 ZIP 반환 (API 키 불필요)."""
    files = request.files.getlist("images")
    if not files or not any(f and getattr(f, "filename", None) for f in files):
        return jsonify({"error": "이미지를 하나 이상 선택하세요."}), 400
    aspect = (request.form.get("aspect") or "3:2").strip()
    if aspect not in ("16:9", "4:3", "3:2"):
        aspect = "3:2"
    orientation = (request.form.get("orientation") or "landscape").strip().lower()
    if orientation not in ("landscape", "portrait"):
        orientation = "landscape"

    tmp = tempfile.mkdtemp(prefix="batch_ar_")
    try:
        paths: list[Path] = []
        idx = 0
        for f in files:
            if not f or not f.filename:
                continue
            if len(paths) >= _MAX_BATCH_ASPECT:
                break
            safe = secure_filename(f.filename) or f"img{idx}.jpg"
            ext = Path(safe).suffix.lower() or ".jpg"
            if ext not in BAR.INPUT_EXT:
                continue
            dest = Path(tmp) / f"in_{idx}_{safe}"
            f.save(dest)
            paths.append(dest)
            idx += 1
        if not paths:
            return jsonify(
                {
                    "error": "지원 형식(.jpg .png .webp 등) 이미지를 올려 주세요.",
                },
            ), 400
        zip_bytes = BAR.build_zip_bytes(paths, aspect, orientation)
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

    buf = io.BytesIO(zip_bytes)
    buf.seek(0)
    tag = f"{aspect.replace(':', '')}_{orientation[:1]}"
    return send_file(
        buf,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"batch_aspect_{tag}.zip",
    )


_GROK_IMAGE_EXT_OK = frozenset({".png", ".jpg", ".jpeg", ".webp"})


@app.route("/api/grok-image-jobs", methods=["POST"])
def create_grok_image_job():
    image_provider = (request.form.get("image_provider") or "xai").strip().lower()
    if image_provider not in ("xai", "gemini"):
        image_provider = "xai"

    if image_provider == "gemini":
        api_key = _resolve_gemini_key((request.form.get("gemini_api_key") or "").strip())
        if not api_key:
            return jsonify(
                {
                    "error": "Gemini API 키가 필요합니다. Gemini API 키 칸에 넣거나 터미널에 GEMINI_API_KEY를 설정하세요.",
                }
            ), 400
    else:
        form_key = (request.form.get("xai_api_key") or "").strip()
        api_key = _resolve_xai_key(form_key)
        if not api_key:
            return jsonify(
                {
                    "error": "Grok API 키를 사용할 수 없습니다. Grok 설정에서 키를 넣거나 환경 변수를 확인하세요.",
                }
            ), 400

    prompt = (request.form.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"error": "프롬프트를 입력하세요."}), 400

    aspect_ratio = (request.form.get("aspect_ratio") or "16:9").strip()
    resolution = (request.form.get("image_resolution") or "1k").strip().lower()
    if resolution not in ("1k", "2k", "4k"):
        resolution = "1k"
    if image_provider == "xai" and resolution == "4k":
        return jsonify(
            {
                "error": "Grok(xAI) 이미지는 1k·2k만 지원합니다. 4k는 Gemini(나노바나나2)만 선택할 수 있습니다.",
            }
        ), 400

    job_id = uuid.uuid4().hex
    job_out = _job_dir(job_id)
    reference_paths: list[Path] = []
    for field_name, stem in (
        ("image", "source_ref"),
        ("image2", "source_ref2"),
    ):
        if field_name not in request.files:
            continue
        f = request.files[field_name]
        if f and f.filename:
            safe = secure_filename(f.filename) or "ref.jpg"
            ext = Path(safe).suffix.lower() or ".jpg"
            if ext not in _GROK_IMAGE_EXT_OK:
                ext = ".jpg"
            dest = job_out / f"{stem}{ext}"
            f.save(dest)
            reference_paths.append(dest)

    with _jobs_lock:
        _jobs[job_id] = {
            "phase": "queued",
            "message": "곧 시작합니다…",
            "kind": "grok_image",
            "image_provider": image_provider,
            "grok_progress": None,
            "xai_request_id": None,
            "error": None,
            "grok_image_outputs": [],
        }

    t = threading.Thread(
        target=_run_grok_image,
        kwargs={
            "job_id": job_id,
            "image_provider": image_provider,
            "api_key": api_key,
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "reference_paths": reference_paths or None,
        },
        daemon=True,
    )
    t.start()
    return jsonify({"job_id": job_id, "kind": "grok_image"})


@app.route("/api/jobs", methods=["POST"])
def create_job():
    mode = (request.form.get("pipeline_mode") or "grok").strip().lower()
    topaz_vf = request.form.get("topaz_vf") or ""
    topaz_filter_complex = (request.form.get("topaz_filter_complex") or "").strip()
    topaz_ffmpeg = (request.form.get("topaz_ffmpeg") or "").strip() or None
    topaz_extra = request.form.get("topaz_extra") or ""

    if mode == "topaz_only":
        use_preset = request.form.get("use_topaz_preset") == "1"
        vf = topaz_vf.strip()
        if not use_preset:
            if not vf and not topaz_filter_complex:
                return jsonify(
                    {"error": "프리셋을 끈 경우 Topaz -vf 또는 -filter_complex 중 하나를 입력하세요."}
                ), 400
            if vf and topaz_filter_complex:
                return jsonify(
                    {"error": "-vf와 -filter_complex를 동시에 넣을 수 없습니다. 하나만 비우세요."}
                ), 400
        if "video" not in request.files:
            return jsonify({"error": "영상 파일을 선택하세요."}), 400
        fv = request.files["video"]
        if not fv or not fv.filename:
            return jsonify({"error": "영상 파일을 선택하세요."}), 400

        job_id = uuid.uuid4().hex
        job_out = _job_dir(job_id)
        safe = secure_filename(fv.filename) or "video"
        ext = Path(safe).suffix.lower() or ".mp4"
        if ext not in _VIDEO_EXT_OK:
            ext = ".mp4"
        stem = Path(safe).stem or "video"
        dest = job_out / f"input{ext}"
        fv.save(dest)

        with _jobs_lock:
            _jobs[job_id] = {
                "phase": "queued",
                "message": "곧 Topaz 처리를 시작합니다…",
                "grok_progress": None,
                "xai_request_id": None,
                "raw_mp4": str(dest),
                "final_mp4": None,
                "error": None,
                "kind": "topaz_only",
            }

        t = threading.Thread(
            target=_run_topaz_only,
            kwargs={
                "job_id": job_id,
                "video_path": dest,
                "stem": stem,
                "topaz_vf": vf,
                "topaz_filter_complex": topaz_filter_complex,
                "topaz_ffmpeg": topaz_ffmpeg,
                "topaz_extra": topaz_extra,
                "use_topaz_preset": use_preset,
            },
            daemon=True,
        )
        t.start()
        return jsonify({"job_id": job_id, "kind": "topaz_only"})

    form_key = (request.form.get("xai_api_key") or "").strip()
    api_key = _resolve_xai_key(form_key)
    if not api_key:
        return jsonify(
            {"error": "Grok API 키를 사용할 수 없습니다. Grok 설정에서 키를 넣거나 환경 변수를 확인하세요."}
        ), 400

    if "image" not in request.files:
        return jsonify({"error": "이미지 파일을 선택하세요."}), 400
    f = request.files["image"]
    if not f or not f.filename:
        return jsonify({"error": "이미지 파일을 선택하세요."}), 400

    prompt = (request.form.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"error": "프롬프트를 입력하세요."}), 400

    try:
        duration = max(1, min(15, int(request.form.get("duration", 2))))
    except ValueError:
        duration = 2

    aspect_ratio = request.form.get("aspect_ratio") or "16:9"
    resolution = request.form.get("resolution") or "720p"
    if resolution not in ("480p", "720p"):
        resolution = "720p"

    run_topaz = request.form.get("run_topaz") == "1"
    use_preset_grok = request.form.get("use_topaz_preset") == "1"
    # 이어서 Topaz인데 수동 필터가 비어 있으면 저장된 프리셋으로 간주 (클라이언트 플래그 불일치 방지)
    if run_topaz and not use_preset_grok:
        if not topaz_vf.strip() and not topaz_filter_complex:
            use_preset_grok = True
    if run_topaz and not use_preset_grok:
        vg = topaz_vf.strip()
        if not vg and not topaz_filter_complex:
            return jsonify(
                {
                    "error": "프리셋을 끈 경우 Topaz 후처리에 -vf 또는 -filter_complex 중 하나를 입력하세요.",
                }
            ), 400
        if vg and topaz_filter_complex:
            return jsonify(
                {"error": "-vf와 -filter_complex를 동시에 넣을 수 없습니다."}
            ), 400

    job_id = uuid.uuid4().hex
    job_out = _job_dir(job_id)
    safe = secure_filename(f.filename) or "upload"
    ext = Path(safe).suffix or ".jpg"
    stem = Path(safe).stem or "image"
    dest = job_out / f"source{ext}"
    f.save(dest)

    with _jobs_lock:
        _jobs[job_id] = {
            "phase": "queued",
            "message": "곧 시작합니다…",
            "grok_progress": None,
            "xai_request_id": None,
            "raw_mp4": None,
            "final_mp4": None,
            "error": None,
            "kind": "grok",
        }

    t = threading.Thread(
        target=_run_pipeline,
        kwargs={
            "job_id": job_id,
            "api_key": api_key,
            "image_path": dest,
            "stem": stem,
            "prompt": prompt,
            "duration": duration,
            "aspect_ratio": aspect_ratio,
            "resolution": resolution,
            "run_topaz": run_topaz,
            "topaz_vf": topaz_vf,
            "topaz_filter_complex": topaz_filter_complex,
            "topaz_ffmpeg": topaz_ffmpeg,
            "topaz_extra": topaz_extra,
            "use_topaz_preset": use_preset_grok,
        },
        daemon=True,
    )
    t.start()

    return jsonify({"job_id": job_id, "kind": "grok"})


_GROK_BATCH_MAX_IMAGES = int(os.environ.get("GROK_BATCH_MAX_IMAGES", "30"))


@app.route("/api/jobs/batch-grok", methods=["POST"])
def create_batch_grok_jobs():
    """여러 장 사진을 같은 프롬프트·설정으로 Grok(+선택 Topaz) 처리. Topaz는 전역 락으로 한 번에 1건만."""
    files = request.files.getlist("images")
    if not files or not any(f and getattr(f, "filename", None) for f in files):
        return jsonify({"error": "이미지를 하나 이상 선택하세요."}), 400

    form_key = (request.form.get("xai_api_key") or "").strip()
    api_key = _resolve_xai_key(form_key)
    if not api_key:
        return jsonify(
            {
                "error": "Grok API 키를 사용할 수 없습니다. Grok 설정에서 키를 넣거나 환경 변수를 확인하세요.",
            },
        ), 400

    prompt = (request.form.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"error": "프롬프트를 입력하세요."}), 400

    try:
        duration = max(1, min(15, int(request.form.get("duration", 2))))
    except ValueError:
        duration = 2

    aspect_ratio = request.form.get("aspect_ratio") or "16:9"
    resolution = request.form.get("resolution") or "720p"
    if resolution not in ("480p", "720p"):
        resolution = "720p"

    run_topaz = request.form.get("run_topaz") == "1"
    use_preset_grok = request.form.get("use_topaz_preset") == "1"
    topaz_vf = request.form.get("topaz_vf") or ""
    topaz_filter_complex = (request.form.get("topaz_filter_complex") or "").strip()
    topaz_ffmpeg = (request.form.get("topaz_ffmpeg") or "").strip() or None
    topaz_extra = request.form.get("topaz_extra") or ""

    if run_topaz and not use_preset_grok:
        if not topaz_vf.strip() and not topaz_filter_complex:
            use_preset_grok = True
    if run_topaz and not use_preset_grok:
        vg = topaz_vf.strip()
        if not vg and not topaz_filter_complex:
            return jsonify(
                {
                    "error": "프리셋을 끈 경우 Topaz 후처리에 -vf 또는 -filter_complex 중 하나를 입력하세요.",
                },
            ), 400
        if vg and topaz_filter_complex:
            return jsonify(
                {"error": "-vf와 -filter_complex를 동시에 넣을 수 없습니다."},
            ), 400

    job_ids: list[str] = []
    idx = 0
    for f in files:
        if not f or not f.filename:
            continue
        if len(job_ids) >= _GROK_BATCH_MAX_IMAGES:
            break
        safe = secure_filename(f.filename) or f"upload{idx}.jpg"
        ext = Path(safe).suffix.lower() or ".jpg"
        if ext not in _PAN_IMG_EXT:
            continue
        stem = Path(safe).stem or f"image{idx}"
        job_id = uuid.uuid4().hex
        job_out = _job_dir(job_id)
        dest = job_out / f"source{ext}"
        f.save(dest)

        with _jobs_lock:
            _jobs[job_id] = {
                "phase": "queued",
                "message": "곧 시작합니다…",
                "grok_progress": None,
                "xai_request_id": None,
                "raw_mp4": None,
                "final_mp4": None,
                "error": None,
                "kind": "grok",
                "batch_index": idx,
                "batch_stem": stem,
            }

        t = threading.Thread(
            target=_run_pipeline,
            kwargs={
                "job_id": job_id,
                "api_key": api_key,
                "image_path": dest,
                "stem": stem,
                "prompt": prompt,
                "duration": duration,
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "run_topaz": run_topaz,
                "topaz_vf": topaz_vf,
                "topaz_filter_complex": topaz_filter_complex,
                "topaz_ffmpeg": topaz_ffmpeg,
                "topaz_extra": topaz_extra,
                "use_topaz_preset": use_preset_grok,
            },
            daemon=True,
        )
        t.start()
        job_ids.append(job_id)
        idx += 1

    if not job_ids:
        return jsonify(
            {"error": "지원 형식(.jpg .png .webp 등) 이미지를 올려 주세요."},
        ), 400

    return jsonify(
        {"job_ids": job_ids, "kind": "grok_batch", "count": len(job_ids)},
    )


@app.route("/api/jobs/<job_id>")
def job_status(job_id: str):
    with _jobs_lock:
        j = _jobs.get(job_id)
    if not j:
        return jsonify({"error": "작업을 찾을 수 없습니다."}), 404
    pan_outputs = j.get("pan_outputs") or []
    pan_files = []
    for p in pan_outputs:
        pp = Path(p)
        if pp.is_file():
            name = pp.name
            pan_files.append(
                {
                    "name": name,
                    "url": f"/api/jobs/{job_id}/download/pan/{quote(name, safe='')}",
                }
            )
    grok_image_outputs = j.get("grok_image_outputs") or []
    grok_image_files = []
    for p in grok_image_outputs:
        pp = Path(p)
        if pp.is_file():
            name = pp.name
            grok_image_files.append(
                {
                    "name": name,
                    "url": f"/api/jobs/{job_id}/download/grok-image/{quote(name, safe='')}",
                }
            )
    raw_path = j.get("raw_mp4")
    final_path = j.get("final_mp4")
    has_raw = bool(raw_path and Path(raw_path).is_file())
    has_final = bool(final_path and Path(final_path).is_file())
    raw_name = Path(raw_path).name if has_raw and raw_path else None
    final_name = Path(final_path).name if has_final and final_path else None

    return jsonify(
        {
            "phase": j.get("phase"),
            "message": j.get("message"),
            "grok_progress": j.get("grok_progress"),
            "xai_request_id": j.get("xai_request_id"),
            "error": j.get("error"),
            "has_raw": has_raw,
            "has_final": has_final,
            "raw_name": raw_name,
            "final_name": final_name,
            "kind": j.get("kind", "grok"),
            "image_provider": j.get("image_provider") or "xai",
            "pan_done": j.get("pan_done"),
            "pan_total": j.get("pan_total"),
            "pan_files": pan_files,
            "grok_image_files": grok_image_files,
            "batch_stem": j.get("batch_stem"),
            "batch_index": j.get("batch_index"),
        }
    )


@app.route("/api/batch-zip", methods=["POST"])
def batch_zip():
    """갤러리에 모인 출력물을 한 번에 ZIP으로 받기 (job_id + 역할)."""
    data = request.get_json(force=True) or {}
    items = data.get("items") or []
    if not items or len(items) > 300:
        return jsonify({"error": "항목이 없거나 너무 많습니다."}), 400
    buf = io.BytesIO()
    used_names: set[str] = set()
    n_written = 0
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for it in items:
            job_id = (it.get("job_id") or "").strip()
            role = (it.get("role") or "").strip()
            if not job_id or not role:
                continue
            with _jobs_lock:
                j = _jobs.get(job_id)
            if not j:
                continue
            path: Path | None = None
            arcname: str | None = None
            if role == "final":
                fp = j.get("final_mp4")
                if fp and Path(fp).is_file():
                    path = Path(fp)
                    arcname = path.name
            elif role == "raw":
                fp = j.get("raw_mp4")
                if fp and Path(fp).is_file():
                    path = Path(fp)
                    arcname = path.name
            elif role == "pan":
                pan_name = secure_filename((it.get("pan_name") or "").strip())
                if pan_name and pan_name.endswith(".mp4") and j.get("kind") == "pan_photo":
                    outs = j.get("pan_outputs") or []
                    allowed = {Path(p).name for p in outs}
                    if pan_name in allowed:
                        pth = _job_dir(job_id) / pan_name
                        if pth.is_file():
                            path = pth
                            arcname = pan_name
            elif role == "grok_image":
                img_name = secure_filename((it.get("image_name") or "").strip())
                suf = Path(img_name).suffix.lower()
                if (
                    img_name
                    and suf in _GROK_IMAGE_EXT_OK
                    and j.get("kind") == "grok_image"
                ):
                    outs = j.get("grok_image_outputs") or []
                    allowed = {Path(p).name for p in outs}
                    if img_name in allowed:
                        pth = _job_dir(job_id) / img_name
                        if pth.is_file():
                            path = pth
                            arcname = img_name
            if not path or not arcname:
                continue
            base_arc = arcname
            n = 2
            while arcname in used_names:
                stem = Path(base_arc).stem
                suf = Path(base_arc).suffix
                arcname = f"{stem}_{n}{suf}"
                n += 1
            used_names.add(arcname)
            zf.write(path, arcname=arcname)
            n_written += 1
    if n_written == 0:
        return jsonify({"error": "ZIP에 넣을 파일이 없습니다."}), 400
    buf.seek(0)
    return send_file(
        buf,
        mimetype="application/zip",
        as_attachment=True,
        download_name="outputs_batch.zip",
    )


@app.route("/api/jobs/<job_id>/download/raw")
def download_raw(job_id: str):
    with _jobs_lock:
        j = _jobs.get(job_id)
    if not j or not j.get("raw_mp4"):
        return jsonify({"error": "파일 없음"}), 404
    p = Path(j["raw_mp4"])
    if not p.is_file():
        return jsonify({"error": "파일 없음"}), 404
    return send_file(p, as_attachment=True, download_name=p.name)


@app.route("/api/jobs/<job_id>/download/final")
def download_final(job_id: str):
    with _jobs_lock:
        j = _jobs.get(job_id)
    if not j or not j.get("final_mp4"):
        return jsonify({"error": "파일 없음"}), 404
    p = Path(j["final_mp4"])
    if not p.is_file():
        return jsonify({"error": "파일 없음"}), 404
    return send_file(p, as_attachment=True, download_name=p.name)


@app.route("/api/jobs/<job_id>/download/grok-image/<filename>")
def download_grok_image(job_id: str, filename: str):
    name = secure_filename(Path(filename).name)
    suf = Path(name).suffix.lower()
    if not name or suf not in _GROK_IMAGE_EXT_OK:
        return jsonify({"error": "파일 없음"}), 404
    with _jobs_lock:
        j = _jobs.get(job_id)
    if not j or j.get("kind") != "grok_image":
        return jsonify({"error": "파일 없음"}), 404
    outs = j.get("grok_image_outputs") or []
    allowed = {Path(p).name for p in outs}
    if name not in allowed:
        return jsonify({"error": "파일 없음"}), 404
    p = _job_dir(job_id) / name
    if not p.is_file():
        return jsonify({"error": "파일 없음"}), 404
    return send_file(p, as_attachment=True, download_name=name)


@app.route("/api/jobs/<job_id>/download/pan/<filename>")
def download_pan(job_id: str, filename: str):
    name = secure_filename(Path(filename).name)
    if not name or not name.endswith(".mp4"):
        return jsonify({"error": "파일 없음"}), 404
    with _jobs_lock:
        j = _jobs.get(job_id)
    if not j or j.get("kind") != "pan_photo":
        return jsonify({"error": "파일 없음"}), 404
    outs = j.get("pan_outputs") or []
    allowed = {Path(p).name for p in outs}
    if name not in allowed:
        return jsonify({"error": "파일 없음"}), 404
    p = _job_dir(job_id) / name
    if not p.is_file():
        return jsonify({"error": "파일 없음"}), 404
    return send_file(p, as_attachment=True, download_name=name)


@app.route("/api/jobs/<job_id>/download/pan-zip")
def download_pan_zip(job_id: str):
    with _jobs_lock:
        j = _jobs.get(job_id)
    if not j or j.get("kind") != "pan_photo":
        return jsonify({"error": "작업 없음"}), 404
    outs = j.get("pan_outputs") or []
    paths = [Path(p) for p in outs if Path(p).is_file()]
    if not paths:
        return jsonify({"error": "ZIP에 넣을 파일 없음"}), 404
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for pp in paths:
            zf.write(pp, arcname=pp.name)
    buf.seek(0)
    return send_file(
        buf,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"pan_videos_{job_id[:8]}.zip",
    )


@app.route("/api/jobs/<job_id>/pan/clear", methods=["POST"])
def pan_clear_after_download(job_id: str):
    """팬 MP4 목록 비우기 + 디스크에서 해당 파일 삭제."""
    with _jobs_lock:
        j = _jobs.get(job_id)
    if not j or j.get("kind") != "pan_photo":
        return jsonify({"error": "작업 없음"}), 404
    outs = list(j.get("pan_outputs") or [])
    for p in outs:
        pp = Path(p)
        if pp.is_file() and pp.suffix.lower() == ".mp4":
            try:
                pp.unlink()
            except OSError:
                pass
    with _jobs_lock:
        if job_id in _jobs:
            _jobs[job_id]["pan_outputs"] = []
    return jsonify({"ok": True})


if __name__ == "__main__":
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    host = (os.environ.get("GROK_WEB_HOST") or "127.0.0.1").strip()
    port = int(os.environ.get("GROK_WEB_PORT") or "5055")
    display_host = "127.0.0.1" if host in ("0.0.0.0", "::", "[::]") else host
    print(f"저장 폴더: {OUTPUT_ROOT}")
    print(f"템플릿 폴더: {app.template_folder}")
    print(f"listen: {host}:{port}")
    print(f"브라우저: http://{display_host}:{port}/  (팬 영상 / ① Grok+Topaz / ② Topaz만)")
    if host == "0.0.0.0":
        print(
            "  다른 기기(같은 네트워크 등)에서는 이 기기의 LAN IP로 접속하세요. "
            "인터넷에 노출 시 API·Topaz·디스크 접근 보호(방화벽·VPN·인증)를 권장합니다."
        )
    if _CORS_ORIGINS:
        print(f"  CORS 허용 Origin: {', '.join(sorted(_CORS_ORIGINS))}")
    app.run(host=host, port=port, debug=False, threaded=True)
