#!/usr/bin/env python3
"""
로컬 전용: 브라우저에서 클립별 노출·스포이드·색온도 미리보기.
몽타주 GUI와 동일한 ~/.music_montage_clip_grade_preview.json 에 저장합니다.

실행 (music-montage 폴더에서):
  python3 grade_web/grade_web_server.py
"""

from __future__ import annotations

import argparse
import base64
import binascii
import io
import json
import sys
import threading
import traceback
import unicodedata
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import montage_lib  # noqa: E402

from montage_lib import (  # noqa: E402
    MONTAGE_CT_K_MAX,
    MONTAGE_CT_K_MIN,
    MONTAGE_CT_NEUTRAL_K,
    VIDEO_EXTS,
    check_ffmpeg,
    drop_videos_too_short,
    resolve_videos,
)
from preview_frame_cache import (  # noqa: E402
    GRADE_EXPOSURE_PCT_MAX,
    apply_clip_grade_pil,
    cache_jpg_path_for_video,
    cover_display_xy_to_base_xy,
    extract_mid_frame_jpg,
    neutral_point_wb_multipliers,
    normalize_clip_grade,
    pil_cover_resize,
    preview_frame_cache_dir,
    suggested_kelvin_from_rgb_sample,
    suggested_tint_from_rgb_sample,
)

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore[misc, assignment]

SESSION_JSON = Path.home() / ".music_montage_grade_web_session.json"
CLIP_GRADE_JSON = Path.home() / ".music_montage_clip_grade_preview.json"

THUMB_MAX_EDGE = 240
PREVIEW_MAX_W = 1280
PREVIEW_MAX_H = 900
JPEG_Q_THUMB = 78
JPEG_Q_PREVIEW = 82

_clip_lock = threading.Lock()
_clip_cache_sig: str | None = None
_clip_cache_vids: list[Path] | None = None
_clip_cache_allowed: frozenset[str] | None = None

_jpg_extract_locks_mu = threading.Lock()
_jpg_extract_locks: dict[str, threading.Lock] = {}


def _norm_path_str(s: str) -> str:
    return unicodedata.normalize("NFC", s)


def _strip_trailing_slash(path: str) -> str:
    p = path
    while len(p) > 1 and p.endswith("/"):
        p = p[:-1]
    return p


def _session_sig() -> str:
    try:
        st = SESSION_JSON.stat()
        return f"{st.st_mtime_ns}:{st.st_size}"
    except OSError:
        return "missing"


def _load_session_raw() -> dict:
    if not SESSION_JSON.is_file():
        return {}
    try:
        o = json.loads(SESSION_JSON.read_text(encoding="utf-8"))
        return o if isinstance(o, dict) else {}
    except (OSError, json.JSONDecodeError):
        return {}


def _session_video_files_and_dir(raw: dict) -> tuple[list[str] | None, str | None]:
    vf = raw.get("video_files")
    files = [str(x) for x in vf] if isinstance(vf, list) else None
    vd = raw.get("videos_dir")
    vdir = str(vd).strip() if isinstance(vd, str) and vd.strip() else None
    return files, vdir


def _session_clip_order(raw: dict) -> list[str] | None:
    co = raw.get("clip_order")
    if isinstance(co, list):
        return [str(x) for x in co]
    return None


def _reorder_paths_by_clip_order(vids: list[Path], order_keys: list[str]) -> list[Path]:
    allowed = {_norm_path_str(str(p.resolve())) for p in vids}
    by_norm = {_norm_path_str(str(p.resolve())): p for p in vids}
    out: list[Path] = []
    seen: set[str] = set()
    for k in order_keys:
        try:
            pk = _norm_path_str(str(Path(k).expanduser().resolve()))
        except OSError:
            continue
        if pk in allowed and pk not in seen:
            out.append(by_norm[pk])
            seen.add(pk)
    for p in vids:
        pk = _norm_path_str(str(p.resolve()))
        if pk not in seen:
            out.append(p)
    return out


def _clip_paths_allowlist() -> list[Path]:
    global _clip_cache_sig, _clip_cache_vids, _clip_cache_allowed
    sig = _session_sig()
    with _clip_lock:
        if sig == _clip_cache_sig and _clip_cache_vids is not None:
            return list(_clip_cache_vids)

    raw_sess = _load_session_raw()
    web_only = bool(raw_sess.get("web_clips_only"))
    vids: list[Path] = []

    if web_only:
        files, _vdir = _session_video_files_and_dir(raw_sess)
        if files:
            for x in files:
                try:
                    p = Path(x).expanduser().resolve()
                    if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
                        vids.append(p)
                except OSError:
                    continue
        vids = drop_videos_too_short(vids, log=None)
    else:
        files, vdir = _session_video_files_and_dir(raw_sess)
        clip_order = _session_clip_order(raw_sess)
        vdir_p = Path(vdir).expanduser().resolve() if vdir else None
        vfs = [Path(p) for p in files] if files else None
        try:
            vids = resolve_videos(vdir_p, vfs)
        except (OSError, ValueError, NotADirectoryError):
            vids = []
        vids = drop_videos_too_short(vids, log=None)
        if clip_order:
            vids = _reorder_paths_by_clip_order(vids, clip_order)

    with _clip_lock:
        _clip_cache_sig = sig
        _clip_cache_vids = list(vids)
        _clip_cache_allowed = frozenset(
            _norm_path_str(str(p.resolve())) for p in vids
        )
    return list(vids)


def _path_allowed(path_key: str) -> bool:
    _clip_paths_allowlist()
    try:
        cand = Path(path_key).expanduser().resolve()
    except OSError:
        return False
    if not cand.is_file():
        return False
    sk = _norm_path_str(str(cand))
    with _clip_lock:
        allowed = _clip_cache_allowed
    return allowed is not None and sk in allowed


def _load_sidecar_by_path() -> dict[str, dict]:
    if not CLIP_GRADE_JSON.is_file():
        return {}
    try:
        data = json.loads(CLIP_GRADE_JSON.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    bp = data.get("by_path")
    return bp if isinstance(bp, dict) else {}


def _default_grade_entry(path_key: str) -> dict:
    bp = _load_sidecar_by_path()
    side = bp.get(path_key)
    if side is None and bp:
        for k, v in bp.items():
            if isinstance(v, dict) and _norm_path_str(str(k)) == path_key:
                side = v
                break
    return normalize_clip_grade(side if isinstance(side, dict) else None)


def _lock_for_jpg_dest(dest: Path) -> threading.Lock:
    key = str(dest.resolve())
    with _jpg_extract_locks_mu:
        if key not in _jpg_extract_locks:
            _jpg_extract_locks[key] = threading.Lock()
        return _jpg_extract_locks[key]


def _ensure_jpg(path_key: str) -> Path | None:
    if not _path_allowed(path_key):
        return None
    vp = Path(path_key)
    cache_dir = preview_frame_cache_dir()
    dest = cache_jpg_path_for_video(vp, cache_dir)
    if dest.is_file() and dest.stat().st_size > 80:
        return dest
    lk = _lock_for_jpg_dest(dest)
    with lk:
        if dest.is_file() and dest.stat().st_size > 80:
            return dest

        def _log(msg: str) -> None:
            sys.stderr.write(f"[grade_web] JPG 추출 {vp.name}: {msg}\n")

        if extract_mid_frame_jpg(vp, dest, log_fail=_log):
            return dest
    return None


def _pil_resample():
    if Image is None:
        return None
    try:
        return Image.Resampling.LANCZOS  # type: ignore[attr-defined]
    except AttributeError:
        return Image.LANCZOS  # type: ignore[attr-defined]


def _thumb_jpeg_bytes(path_key: str) -> bytes | None:
    jpg = _ensure_jpg(path_key)
    if jpg is None or Image is None:
        return None
    try:
        im = Image.open(jpg).convert("RGB")
        im.thumbnail((THUMB_MAX_EDGE, THUMB_MAX_EDGE), _pil_resample())
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=JPEG_Q_THUMB, optimize=True)
        return buf.getvalue()
    except Exception:
        sys.stderr.write(f"[grade_web] thumb PIL 실패 path_key={path_key!r}\n")
        traceback.print_exc()
        return None


def _parse_preview_qs_grade(qs: dict[str, list[str]]) -> dict[str, object] | None:
    def _fi(key: str, default: int) -> int:
        try:
            return int((qs.get(key) or [str(default)])[0])
        except (TypeError, ValueError):
            return default

    def _ff(key: str, default: float) -> float:
        try:
            return float((qs.get(key) or [str(default)])[0])
        except (TypeError, ValueError):
            return default

    return {
        "exposure_pct": _fi("e", 100),
        "ct_k": _fi("ct", int(MONTAGE_CT_NEUTRAL_K)),
        "spot_mul": [
            _ff("rr", 1.0),
            _ff("gg", 1.0),
            _ff("bb", 1.0),
        ],
        "wb_pct": _fi("wb", 0),
        "tint_pct": _fi("tint", 0),
        "hue_pct": _fi("hue", 0),
        "contrast_pct": _fi("cont", 100),
        "saturation_pct": _fi("sat", 100),
        "highlights_pct": _fi("hi", 0),
        "shadows_pct": _fi("sh", 0),
        "whites_pct": _fi("wh", 0),
        "blacks_pct": _fi("bl", 0),
        "texture_pct": _fi("tex", 0),
        "clarity_pct": _fi("clr", 0),
        "dehaze_pct": _fi("dh", 0),
        "vibrance_pct": _fi("vib", 0),
    }


def _preview_jpeg_bytes(path_key: str, grade: dict) -> bytes | None:
    jpg = _ensure_jpg(path_key)
    if jpg is None or Image is None:
        return None
    try:
        im = Image.open(jpg).convert("RGB")
        im.thumbnail((PREVIEW_MAX_W, PREVIEW_MAX_H), _pil_resample())
        out = apply_clip_grade_pil(im, grade, neutral_k=float(MONTAGE_CT_NEUTRAL_K))
        mw, mh = out.size
        if mw > PREVIEW_MAX_W or mh > PREVIEW_MAX_H:
            out = pil_cover_resize(out, PREVIEW_MAX_W, PREVIEW_MAX_H)
        buf = io.BytesIO()
        out.save(buf, format="JPEG", quality=JPEG_Q_PREVIEW, optimize=True)
        return buf.getvalue()
    except Exception:
        sys.stderr.write(f"[grade_web] preview PIL 실패 path_key={path_key!r}\n")
        traceback.print_exc()
        return None


def _b64url_to_path(s: str) -> str | None:
    try:
        t = s.strip().replace("-", "+").replace("_", "/")
        pad = (-len(t)) % 4
        if pad:
            t += "=" * pad
        raw = base64.b64decode(t, validate=False)
        return raw.decode("utf-8")
    except (binascii.Error, UnicodeDecodeError, ValueError):
        return None


def _resolve_path_for_image_request(qs: dict[str, list[str]]) -> str | None:
    vids = _clip_paths_allowlist()
    idx_s = (qs.get("i") or [""])[0]
    if idx_s != "":
        try:
            i = int(idx_s)
        except ValueError:
            return None
        if 0 <= i < len(vids):
            return _norm_path_str(str(vids[i].resolve()))
        return None
    b64 = (qs.get("b") or [""])[0]
    if b64:
        p = _b64url_to_path(b64)
        if p and _path_allowed(p):
            try:
                return _norm_path_str(str(Path(p).expanduser().resolve()))
            except OSError:
                return None
    return None


class GradeWebHandler(BaseHTTPRequestHandler):
    server_version = "MusicMontageGradeWeb/0.1"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write(
            "%s - - [%s] %s\n"
            % (self.address_string(), self.log_date_time_string(), fmt % args)
        )

    def _send_json(self, code: int, obj: object) -> None:
        b = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _send_bytes(self, code: int, data: bytes, content_type: str) -> None:
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _read_json_body(self) -> dict | None:
        ln = self.headers.get("Content-Length")
        if not ln:
            return None
        try:
            n = int(ln)
        except ValueError:
            return None
        raw = self.rfile.read(n)
        try:
            o = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            return None
        return o if isinstance(o, dict) else None

    def do_OPTIONS(self) -> None:
        path = _strip_trailing_slash(urlparse(self.path).path)
        if path.startswith("/api/"):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "86400")
            self.end_headers()
            return
        self.send_error(404)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = _strip_trailing_slash(parsed.path)
        qs = parse_qs(parsed.query or "")

        if path == "/api/ping":
            self._send_json(200, {"ok": True, "post_session": True})
            return

        if path == "/api/clips":
            vids = _clip_paths_allowlist()
            clips = [
                {"path": _norm_path_str(str(p.resolve())), "name": p.name}
                for p in vids
            ]
            self._send_json(200, {"clips": clips})
            return

        if path == "/api/state":
            vids = _clip_paths_allowlist()
            grades: dict[str, dict] = {}
            for p in vids:
                k = _norm_path_str(str(p.resolve()))
                grades[k] = _default_grade_entry(k)
            self._send_json(
                200,
                {
                    "clips": [
                        {"path": _norm_path_str(str(p.resolve())), "name": p.name}
                        for p in vids
                    ],
                    "grades": grades,
                    "ct_min": MONTAGE_CT_K_MIN,
                    "ct_max": MONTAGE_CT_K_MAX,
                    "neutral_ct": int(MONTAGE_CT_NEUTRAL_K),
                    "exposure_min": 0,
                    "exposure_max": GRADE_EXPOSURE_PCT_MAX,
                    "exposure_default": 100,
                },
            )
            return

        if path == "/api/thumb.jpg":
            pk = _resolve_path_for_image_request(qs)
            if not pk:
                self.send_error(403)
                return
            data = _thumb_jpeg_bytes(pk)
            if not data:
                self.send_error(404)
                return
            self._send_bytes(200, data, "image/jpeg")
            return

        if path == "/api/jpg":
            pk = _resolve_path_for_image_request(qs)
            if not pk:
                self.send_error(403)
                return
            jpg = _ensure_jpg(pk)
            if jpg is None or not jpg.is_file():
                self.send_error(404)
                return
            try:
                data = jpg.read_bytes()
            except OSError:
                self.send_error(500)
                return
            self._send_bytes(200, data, "image/jpeg")
            return

        if path in ("/api/preview.jpg", "/api/preview.png"):
            pk = _resolve_path_for_image_request(qs)
            if not pk:
                self.send_error(403)
                return
            grade = _parse_preview_qs_grade(qs)
            if grade is None:
                self.send_error(400)
                return
            data = _preview_jpeg_bytes(pk, grade)
            if not data:
                self.send_error(500)
                return
            self._send_bytes(200, data, "image/jpeg")
            return

        if path == "/" or path == "/index.html":
            html_path = Path(__file__).resolve().parent / "index.html"
            try:
                html = html_path.read_text(encoding="utf-8")
            except OSError:
                self.send_error(500)
                return
            b = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)
            return

        if path == "/app.js":
            js_path = Path(__file__).resolve().parent / "app.js"
            try:
                js = js_path.read_text(encoding="utf-8")
            except OSError:
                self.send_error(404)
                return
            b = js.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/javascript; charset=utf-8")
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)
            return

        self.send_error(404)

    def do_POST(self) -> None:
        path = _strip_trailing_slash(unquote(urlparse(self.path).path))
        while "//" in path:
            path = path.replace("//", "/")

        if path == "/api/pick_rgb":
            body = self._read_json_body()
            if not body:
                self._send_json(400, {"error": "bad json"})
                return
            pk = _norm_path_str(str(body.get("path") or ""))
            if not pk or not _path_allowed(pk):
                self._send_json(403, {"error": "path"})
                return
            jpg = _ensure_jpg(pk)
            if jpg is None or Image is None:
                self._send_json(404, {"error": "jpg"})
                return
            try:
                dx = int(body.get("dx", 0))
                dy = int(body.get("dy", 0))
                disp_w = max(1, int(body.get("disp_w", 1)))
                disp_h = max(1, int(body.get("disp_h", 1)))
            except (TypeError, ValueError):
                self._send_json(400, {"error": "coords"})
                return
            try:
                im = Image.open(jpg).convert("RGB")
                bw, bh = im.size
                ix, iy = cover_display_xy_to_base_xy(
                    dx, dy, bw, bh, disp_w, disp_h
                )
                rgb = im.getpixel((ix, iy))
                r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
            except (OSError, ValueError):
                self._send_json(500, {"error": "read"})
                return
            rr, gg, bb = neutral_point_wb_multipliers(r, g, b)
            k = suggested_kelvin_from_rgb_sample(r, g, b)
            k = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, int(k)))
            tint = int(suggested_tint_from_rgb_sample(r, g, b))
            self._send_json(
                200,
                {
                    "spot_mul": [rr, gg, bb],
                    "kelvin": k,
                    "tint_pct": tint,
                    "rgb": [r, g, b],
                },
            )
            return

        if path == "/api/spot_sample":
            body = self._read_json_body()
            if not body:
                self._send_json(400, {"error": "bad json"})
                return
            try:
                r = int(body.get("r", 0))
                g = int(body.get("g", 0))
                b = int(body.get("b", 0))
            except (TypeError, ValueError):
                self._send_json(400, {"error": "bad rgb"})
                return
            r = max(0, min(255, r))
            g = max(0, min(255, g))
            b = max(0, min(255, b))
            rr, gg, bb = neutral_point_wb_multipliers(r, g, b)
            k = suggested_kelvin_from_rgb_sample(r, g, b)
            k = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, int(k)))
            tint = int(suggested_tint_from_rgb_sample(r, g, b))
            self._send_json(
                200,
                {"spot_mul": [rr, gg, bb], "kelvin": k, "tint_pct": tint},
            )
            return

        if path == "/api/session":
            body = self._read_json_body()
            if not body:
                self._send_json(400, {"error": "bad json"})
                return
            vf_in = body.get("video_files")
            if not isinstance(vf_in, list):
                self._send_json(400, {"error": "video_files must be array"})
                return
            cur = _clip_paths_allowlist()
            cur_allowed = {_norm_path_str(str(p.resolve())) for p in cur}
            incoming: list[str] = []
            for x in vf_in:
                try:
                    pk = _norm_path_str(
                        str(Path(str(x)).expanduser().resolve())
                    )
                except OSError:
                    self._send_json(400, {"error": f"bad path: {x!r}"})
                    return
                if pk not in cur_allowed:
                    self._send_json(400, {"error": "path not in current session"})
                    return
                incoming.append(pk)
            if len(incoming) != len(set(incoming)):
                self._send_json(400, {"error": "duplicate paths"})
                return

            raw = _load_session_raw()
            old_vfs = raw.get("video_files")
            old_list = [str(x) for x in old_vfs] if isinstance(old_vfs, list) else []
            res_to_orig: dict[str, str] = {}
            for o in old_list:
                try:
                    rk = _norm_path_str(str(Path(o).expanduser().resolve()))
                except OSError:
                    continue
                res_to_orig.setdefault(rk, o)

            new_vfs = [res_to_orig.get(pk, pk) for pk in incoming]
            raw["video_files"] = new_vfs
            raw["clip_order"] = incoming
            raw["web_clips_only"] = True
            try:
                SESSION_JSON.write_text(
                    json.dumps(raw, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
            except OSError as exc:
                self._send_json(500, {"error": str(exc)})
                return
            self._send_json(200, {"ok": True, "count": len(incoming)})
            return

        if path == "/api/save":
            body = self._read_json_body()
            if not body or "by_path" not in body:
                self._send_json(400, {"error": "need by_path"})
                return
            by_in = body.get("by_path")
            if not isinstance(by_in, dict):
                self._send_json(400, {"error": "by_path must be object"})
                return
            allowed = {
                _norm_path_str(str(p.resolve())) for p in _clip_paths_allowlist()
            }
            out_bp: dict[str, dict] = {}
            for k, v in by_in.items():
                sk = _norm_path_str(str(k))
                if sk not in allowed:
                    continue
                if not isinstance(v, dict):
                    continue
                out_bp[sk] = normalize_clip_grade(v)
            for p in _clip_paths_allowlist():
                pk = _norm_path_str(str(p.resolve()))
                if pk not in out_bp:
                    out_bp[pk] = _default_grade_entry(pk)

            payload = {
                "version": 1,
                "note": "웹 로컬 편집기에서 저장. 몽타주 GUI 「웹 저장값 불러오기」로 반영하세요.",
                "by_path": out_bp,
            }
            try:
                CLIP_GRADE_JSON.write_text(
                    json.dumps(payload, ensure_ascii=False, indent=2),
                    encoding="utf-8",
                )
            except OSError as exc:
                self._send_json(500, {"error": str(exc)})
                return
            self._send_json(200, {"saved": True, "count": len(out_bp)})
            return

        self.send_error(404)


def main() -> None:
    montage_lib._ensure_cli_tools_path()
    ff_err = check_ffmpeg()
    if ff_err:
        print(f"경고: {ff_err}", file=sys.stderr, flush=True)
    if Image is None:
        print(
            "경고: Pillow(PIL)가 없어 썸네일·미리보기를 만들 수 없습니다. "
            "`pip install pillow` 후 다시 실행하세요.",
            file=sys.stderr,
            flush=True,
        )
    ap = argparse.ArgumentParser(description="로컬 클립 등급 웹 편집기")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=18765)
    args = ap.parse_args()
    httpd = ThreadingHTTPServer((args.host, args.port), GradeWebHandler)
    print(f"Grade web: http://{args.host}:{args.port}/", flush=True)
    print("  POST /api/session 지원(브라우저에서 클립 순서·목록 저장)", flush=True)
    print(
        "  순서 저장이 HTTP 404면: 이 포트를 쓰는 예전 Python 프로세스를 Ctrl+C로 끄고 다시 실행하세요.",
        flush=True,
    )
    print("종료: Ctrl+C", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n종료", flush=True)


if __name__ == "__main__":
    main()
