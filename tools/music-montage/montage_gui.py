#!/usr/bin/env python3
"""음악 몽타주 tkinter GUI (montage_lib.run_montage)."""

from __future__ import annotations

import copy
import json
import queue
from collections.abc import Callable
import re
import subprocess
import sys
import threading
import time
import traceback
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
from tkinter import (
    BOTH,
    CENTER,
    E,
    END,
    EXTENDED,
    HORIZONTAL,
    LEFT,
    N,
    RIGHT,
    S,
    VERTICAL,
    W,
    X,
    Y,
    BooleanVar,
    Canvas,
    DoubleVar,
    Frame,
    IntVar,
    Label,
    Listbox,
    PhotoImage,
    Scale,
    Scrollbar,
    Spinbox,
    StringVar,
    TclError,
    Tk,
    Toplevel,
    filedialog,
    messagebox,
    scrolledtext,
    simpledialog,
)
from tkinter import ttk

try:
    from tkinterdnd2 import DND_FILES, TkinterDnD

    HAS_DND = True
except ImportError:
    HAS_DND = False
    DND_FILES = None  # type: ignore[misc,assignment]
    TkinterDnD = None  # type: ignore[misc,assignment]

from montage_lib import (
    AUDIO_EXTS,
    VIDEO_EXTS,
    check_ffmpeg,
    is_skipped_media_filename,
    clamp_auto_exposure_strength,
    clamp_color_temperature_k,
    drop_videos_too_short,
    ffprobe_duration,
    infer_output_path,
    MONTAGE_CT_K_MAX,
    MONTAGE_CT_K_MIN,
    MONTAGE_CT_NEUTRAL_K,
    montage_output_filename_stem_from_preset,
    list_sorted_videos,
    resolve_videos,
    run_montage,
)
from preview_frame_cache import (
    GRADE_EXPOSURE_PCT_MAX,
    GRADE_WEB_EXTRA_KEYS,
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
    from PIL import Image, ImageTk

    HAS_PIL = True
except ImportError:
    HAS_PIL = False

SETTINGS_PATH = Path.home() / ".music_montage_gui_settings.json"
CLIP_GRADE_PREVIEW_JSON = Path.home() / ".music_montage_clip_grade_preview.json"
GRADE_WEB_SESSION_JSON = Path.home() / ".music_montage_grade_web_session.json"
GRADE_WEB_SERVER = Path(__file__).resolve().parent / "grade_web" / "grade_web_server.py"
GRADE_WEB_PORT = 18765
LARGE_PREVIEW_PIL_MAX = 1600
LIVE_GRADE_DEBOUNCE_MS = 70

VQ_PREVIEW_GRID_COLS = 4
GRADE_PREVIEW_HEIGHT = 520
GRADE_THUMB_GRID_COLS = 5
GRADE_RIGHT_PANEL_W = 268
GRADE_THUMB_MAX = 128
GRADE_THUMB_STRIP_MIN_W = 160
GRADE_THUMB_STRIP_MAX_W = 520
GRADE_THUMB_STRIP_CANVAS_W = GRADE_THUMB_STRIP_MIN_W

# 「선택하기」 모드: 3컷 묶음마다 초록·빨강만 번갈아 테두리(1묶음=초록, 2묶음=빨강, …)
THUMB_PICK_TRIPLET_BORDER_COLORS = ("#16a34a", "#dc2626")
THUMB_PICK_TRIPLET_POS = ("위", "중간", "아래")
_LARGE_PREVIEW_FALLBACK_W = 1100
# 썸네일: 캐시 JPG + Pillow(FFmpeg 없음).
THUMB_WORKER_COUNT = 2
THUMB_FLUSH_DEBOUNCE_MS = 200

LOGO_EXTS = {".png", ".jpg", ".jpeg", ".webp"}

# 이전 버전 설정의 selected_preset_label → 현재 라벨
_LEGACY_PRESET_LABELS: dict[str, str] = {
    "가로 Full HD": "가로 Full HD 1920×1080",
    "세로 Full HD": "세로 Full HD 1080×1920",
    "시네마 1920×817": "시네마 1920×850",
    "시네마 1920×850": "시네마 1920×1080 (레터박스)",
}


DEFAULT_PRESETS: list[dict] = [
    {
        "label": "시네마 1920×1080 (레터박스)",
        "line2": (
            "Cinematic letterbox · 1920×1080 · black bars top/bottom · "
            "active 1920×850 · wide aspect"
        ),
        "w": 1920,
        "h": 1080,
        "content_h": 850,
        "layout": "fullframe",
        "bundle": "cinema",
    },
    {
        "label": "가로 Full HD 1920×1080",
        "line2": "1920×1080",
        "w": 1920,
        "h": 1080,
        "layout": "fullframe",
        "bundle": None,
    },
    {
        "label": "세로 Full HD 1080×1920",
        "line2": "1080×1920",
        "w": 1080,
        "h": 1920,
        "layout": "fullframe",
        "bundle": None,
    },
    {
        "label": "3컷 세로 1080×1920",
        "line2": "1080×1920",
        "w": 1080,
        "h": 1920,
        "layout": "tri_stack",
        "bundle": "tri_vertical",
    },
]


class MontageGuiApp:
    def __init__(self) -> None:
        if HAS_DND and TkinterDnD is not None:
            self.root = TkinterDnD.Tk()
        else:
            self.root = Tk()
        self.root.title("음악 몽타주")
        self.root.minsize(1280, 680)
        self.root.geometry("1760x980")
        if not HAS_PIL:
            py = sys.executable
            messagebox.showerror(
                "Pillow 필요",
                "JPG 미리보기에 Pillow 가 필요합니다.\n\n"
                f"이 앱이 사용 중인 Python:\n{py}\n\n"
                "같은 인터프리터로 설치하세요:\n"
                f'"{py}" -m pip install Pillow',
            )
            raise SystemExit(1)

        self._job_queue: list[dict] = []
        self._job_queue_lock = threading.Lock()
        self._montage_thread: threading.Thread | None = None
        self._stop_requested = threading.Event()

        self.music_path_var = StringVar()
        self.videos_dir_var = StringVar()
        self.video_files: list[str] = []
        self.logo_path_var = StringVar()
        self.output_path_var = StringVar()
        self.window_sec_var = DoubleVar(value=4.0)
        self.peak_start_var = DoubleVar(value=3.0)
        self.clip_trim_var = DoubleVar(value=0.5)
        self.tail_black_var = DoubleVar(value=2.0)
        self.audio_fade_var = DoubleVar(value=5.0)
        self.letterbox_open_sec_var = DoubleVar(value=2.0)
        self.letterbox_close_sec_var = DoubleVar(value=2.0)
        self.letterbox_open_enabled_var = BooleanVar(value=True)
        self.letterbox_close_enabled_var = BooleanVar(value=True)

        self.custom_presets: list[dict] = []
        self.preset_labels: list[str] = []
        self.preset_choice_var = StringVar()

        # 클립 노출 기본값(슬라이더·최종완료 폴백). 히스토그램 자동 노출은 사용하지 않음.
        self.auto_exposure_strength_var = IntVar(value=100)
        self.auto_wb_strength_var = IntVar(value=100)
        self._grade_per_clip_strength: dict[str, int] = {}
        # 미리보기: 「확인」으로만 클립별 덮어쓰기, 미설정 클립은 확정값(또는 구버전 JSON 전역 %) 사용
        self._preview_per_clip_strength: dict[str, int] = {}
        self._preview_per_clip_wb: dict[str, int] = {}
        self._grade_per_clip_wb: dict[str, int] = {}
        self._grade_apply_strength_var = IntVar(value=100)
        self._suppress_grade_apply_spin = False
        self._suppress_grade_apply_ct_spin = False
        self.auto_ct_kelvin_var = IntVar(value=int(MONTAGE_CT_NEUTRAL_K))
        self._preview_per_clip_ct_k: dict[str, int] = {}
        self._grade_per_clip_ct_k: dict[str, int] = {}
        self._grade_apply_ct_k_var = IntVar(value=int(MONTAGE_CT_NEUTRAL_K))
        self._grade_apply_highlights_var = IntVar(value=0)
        self._grade_apply_whites_var = IntVar(value=0)
        self._grade_apply_hue_var = IntVar(value=0)
        self._suppress_grade_apply_tone_spin = False
        self._grade_wb_spot_mul: dict[str, tuple[float, float, float]] = {}
        self._preview_wb_spot_mul: dict[str, tuple[float, float, float]] = {}
        self._spot_strength_var = IntVar(value=100)
        self._grade_undo_stack: list[dict] = []
        self._grade_redo_stack: list[dict] = []
        self._large_preview_cell_w = 720
        self._wb_spot_pick_active = False
        self._wb_spot_btn: ttk.Button | None = None
        self._grade_focus_path: str | None = None
        self._large_preview_source_path: str | None = None
        self._grade_shift_anchor_idx: int | None = None
        self._clip_grade_adjust: dict[str, dict[str, object]] = {}
        self._preview_tone: dict[str, dict[str, int]] = {}
        self._tone_grade_preset: dict[str, object] | None = None
        self._tone_preset_seeded_paths: set[str] = set()
        self._grade_checked: set[str] = set()
        self._grade_triplet_labels: dict[str, Label] = {}
        self._thumb_pick_mode = False
        self._grade_drag_start: tuple[float, float, str | None] | None = None
        self._grade_thumb_images: dict[str, PhotoImage] = {}
        self._grade_pill_labels: dict[str, Label] = {}
        self._grade_ct_pill_labels: dict[str, Label] = {}
        self._large_preview_image: PhotoImage | None = None
        self._preview_cache_dir = preview_frame_cache_dir()
        self._extract_q: queue.Queue[tuple] = queue.Queue()
        self._large_base_pil: dict[str, Image.Image] = {}
        self._live_grade_after: str | None = None
        # 백그라운드 스레드 → Tk: root.after()를 워커에서 호출하면 macOS 등에서 불안정함
        self._ui_invoke_q: queue.Queue[Callable[[], None]] = queue.Queue()
        self._ui_pump_stopped = False

        self._thumb_work_q: queue.Queue[tuple] = queue.Queue()
        self._thumb_flush_after: str | None = None
        self._grade_grid_refresh_after: str | None = None

        self._main_scroll_canvas: Canvas | None = None
        self._grade_canvas: Canvas | None = None
        self._vq_canvas: Canvas | None = None
        self._video_queue_win: Toplevel | None = None
        self._suppress_preset_side_effects = False
        # drop_videos_too_short 안에서 클립마다 ffprobe → 클릭마다 호출하면 매우 느림. 입력이 같을 때만 재사용.
        self._montage_vids_cache: list[Path] | None = None
        self._montage_vids_cache_sig: tuple[tuple[str, ...], str] | None = None
        # 영상 목록이 완전히 바뀌었는지 판별(겹침 없음 → 몽타주·보정 초기화)
        self._prev_montage_path_set: set[str] | None = None

        self._build_ui()
        self._load_gui_settings()
        self._wire_traces()
        self._start_thumb_workers()
        self._start_extract_workers()
        # macOS: <MouseWheel> delta가 ±1 수준일 때 int(delta/120)==0 이 되어 스크롤이 막히는 경우 처리
        self.root.bind_all("<MouseWheel>", self._on_global_mousewheel, add=True)
        self.root.bind_all("<Button-4>", self._on_global_mousewheel, add=True)
        self.root.bind_all("<Button-5>", self._on_global_mousewheel, add=True)

        self.root.bind_all("<Delete>", self._grade_hotkey_delete, add=True)
        self.root.bind_all("<BackSpace>", self._grade_hotkey_delete, add=True)
        self.root.bind_all("<Control-z>", self._grade_undo_action, add=True)
        self.root.bind_all("<Control-Shift-Z>", self._grade_redo_action, add=True)
        self.root.bind_all("<Control-y>", self._grade_redo_action, add=True)
        self.root.bind_all("<Alt-Key-s>", self._grade_hotkey_alt_s, add=True)
        self.root.bind_all("<Alt-Key-d>", self._grade_hotkey_alt_d, add=True)
        self.root.bind_all("<Alt-Key-w>", self._grade_hotkey_alt_w, add=True)
        if sys.platform == "darwin":
            self.root.bind_all("<Command-z>", self._grade_undo_action, add=True)
            self.root.bind_all("<Command-Shift-Z>", self._grade_redo_action, add=True)
            for _seq, _cmd in (
                ("<Option-s>", self._grade_hotkey_alt_s),
                ("<Option-d>", self._grade_hotkey_alt_d),
                ("<Option-w>", self._grade_hotkey_alt_w),
            ):
                try:
                    self.root.bind_all(_seq, _cmd, add=True)
                except TclError:
                    pass

        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self.root.after(0, self._drain_ui_invoke_queue)

    def _post_ui(self, fn: Callable[[], None]) -> None:
        self._ui_invoke_q.put(fn)

    def _drain_ui_invoke_queue(self) -> None:
        # winfo_exists()가 일시적으로 0이 되는 환경이 있어, 펌프는 닫기 플래그로만 중단
        if self._ui_pump_stopped:
            return
        try:
            while True:
                job = self._ui_invoke_q.get_nowait()
                try:
                    job()
                except Exception:
                    traceback.print_exc()
        except queue.Empty:
            pass
        if self._ui_pump_stopped:
            return
        try:
            self.root.after(32, self._drain_ui_invoke_queue)
        except TclError:
            pass

    # --- settings ---
    def _normalize_job(self, d: dict) -> dict:
        out = dict(d)
        out["music_path"] = str(out.get("music_path") or "")
        out["videos_dir"] = out.get("videos_dir")
        if out["videos_dir"] is not None:
            out["videos_dir"] = str(out["videos_dir"])
        vf = out.get("video_files") or []
        out["video_files"] = [str(x) for x in vf if str(x).strip()]
        out["logo_path"] = str(out.get("logo_path") or "")
        out["window_sec"] = float(out.get("window_sec") or 4.0)
        out["peak_start"] = float(out.get("peak_start") or 3.0)
        out["clip_trim"] = float(out.get("clip_trim") or 0.5)
        out["tail_black"] = float(out.get("tail_black") or 2.0)
        out["audio_fade_out"] = float(out.get("audio_fade_out") or 5.0)
        out["letterbox_open_sec"] = float(out.get("letterbox_open_sec") or 2.0)
        out["letterbox_close_sec"] = float(out.get("letterbox_close_sec") or 2.0)
        out["letterbox_open_enabled"] = bool(out.get("letterbox_open_enabled", True))
        out["letterbox_close_enabled"] = bool(out.get("letterbox_close_enabled", True))
        out["auto_exposure_grade"] = False
        for _k in ("auto_exposure_mode_dark_lt", "auto_exposure_mode_bright_ge"):
            out.pop(_k, None)
        out["auto_exposure_strength_percent"] = int(
            max(
                0,
                min(
                    GRADE_EXPOSURE_PCT_MAX,
                    int(out.get("auto_exposure_strength_percent", 100)),
                ),
            )
        )
        out["auto_wb_grade"] = False
        out["auto_wb_strength_percent"] = 0
        raw_by = out.get("auto_exposure_strength_by_file") or {}
        by_file: dict[str, int] = {}
        if isinstance(raw_by, dict):
            for k, v in raw_by.items():
                try:
                    by_file[str(k)] = max(0, min(GRADE_EXPOSURE_PCT_MAX, int(v)))
                except (TypeError, ValueError):
                    pass
        out["auto_exposure_strength_by_file"] = by_file
        raw_wb = out.get("auto_wb_strength_by_file") or {}
        by_wb: dict[str, int] = {}
        if isinstance(raw_wb, dict):
            for k, v in raw_wb.items():
                try:
                    by_wb[str(k)] = max(0, min(100, int(v)))
                except (TypeError, ValueError):
                    pass
        out["auto_wb_strength_by_file"] = by_wb
        raw_spot = out.get("auto_wb_spot_mul_by_file") or {}
        by_spot: dict[str, list[float]] = {}
        if isinstance(raw_spot, dict):
            for k, v in raw_spot.items():
                if isinstance(v, (list, tuple)) and len(v) == 3:
                    try:
                        by_spot[str(k)] = [
                            float(v[0]),
                            float(v[1]),
                            float(v[2]),
                        ]
                    except (TypeError, ValueError):
                        pass
        out["auto_wb_spot_mul_by_file"] = by_spot
        out["auto_ct_grade"] = bool(out.get("auto_ct_grade", True))
        ctk = int(out.get("auto_ct_kelvin", int(MONTAGE_CT_NEUTRAL_K)))
        out["auto_ct_kelvin"] = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, ctk))
        raw_ct = out.get("auto_ct_kelvin_by_file") or {}
        by_ct: dict[str, int] = {}
        if isinstance(raw_ct, dict):
            for k, v in raw_ct.items():
                try:
                    kk = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, int(v)))
                    by_ct[str(k)] = kk
                except (TypeError, ValueError):
                    pass
        out["auto_ct_kelvin_by_file"] = by_ct
        presets = out.get("presets")
        if not isinstance(presets, list):
            presets = []
        out["presets"] = presets
        out["selected_preset_label"] = str(out.get("selected_preset_label") or "")
        out["output_path"] = str(out.get("output_path") or "")
        raw_cgp = out.get("clip_grade_preview")
        out["clip_grade_preview"] = raw_cgp if isinstance(raw_cgp, dict) else {}
        tgp = out.get("tone_grade_preset")
        out["tone_grade_preset"] = tgp if isinstance(tgp, dict) else {}
        return out

    def _load_gui_settings(self) -> None:
        if not SETTINGS_PATH.is_file():
            self._apply_job_to_ui(self._normalize_job({}))
            return
        try:
            data = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            self._apply_job_to_ui(self._normalize_job({}))
            return
        job = self._normalize_job(data if isinstance(data, dict) else {})
        q = data.get("montage_queue") if isinstance(data, dict) else None
        if isinstance(q, list):
            with self._job_queue_lock:
                self._job_queue = [self._normalize_job(x) for x in q if isinstance(x, dict)]
        self._apply_job_to_ui(job)

    def _collect_ui_job(self) -> dict:
        pl = self._current_preset_dict()
        tag = montage_output_filename_stem_from_preset(pl)
        return {
            "music_path": self.music_path_var.get().strip(),
            "videos_dir": self.videos_dir_var.get().strip() or None,
            "video_files": list(self.video_files),
            "logo_path": self.logo_path_var.get().strip(),
            "output_path": self.output_path_var.get().strip(),
            "window_sec": float(self.window_sec_var.get()),
            "peak_start": float(self.peak_start_var.get()),
            "clip_trim": float(self.clip_trim_var.get()),
            "tail_black": float(self.tail_black_var.get()),
            "audio_fade_out": float(self.audio_fade_var.get()),
            "letterbox_open_sec": float(self.letterbox_open_sec_var.get()),
            "letterbox_close_sec": float(self.letterbox_close_sec_var.get()),
            "letterbox_open_enabled": bool(self.letterbox_open_enabled_var.get()),
            "letterbox_close_enabled": bool(self.letterbox_close_enabled_var.get()),
            "presets": list(self.custom_presets),
            "selected_preset_label": self.preset_choice_var.get(),
            "auto_exposure_grade": False,
            "auto_exposure_strength_percent": int(self.auto_exposure_strength_var.get()),
            "auto_exposure_strength_by_file": {
                k: int(v) for k, v in self._grade_per_clip_strength.items()
            },
            "auto_wb_grade": False,
            "auto_wb_strength_percent": 0,
            "auto_wb_strength_by_file": {},
            "auto_wb_spot_mul_by_file": {
                k: [float(t[0]), float(t[1]), float(t[2])]
                for k, t in self._grade_wb_spot_mul.items()
                if any(abs(float(t[i]) - 1.0) >= 0.002 for i in range(3))
            },
            "auto_ct_grade": True,
            "auto_ct_kelvin": int(self.auto_ct_kelvin_var.get()),
            "auto_ct_kelvin_by_file": {
                k: int(v) for k, v in self._grade_per_clip_ct_k.items()
            },
            "clip_grade_preview": self._build_clip_grade_preview_payload(),
            "tone_grade_preset": (
                copy.deepcopy(self._tone_grade_preset)
                if isinstance(self._tone_grade_preset, dict)
                else {}
            ),
            "_output_preset_tag": tag,
        }

    def _build_clip_grade_preview_payload(self) -> dict[str, dict[str, object]]:
        snap = self._try_build_montage_snapshot()
        if not snap:
            return {}
        out: dict[str, dict[str, object]] = {}
        for p in snap[0]:
            k = str(p.resolve())
            sm = self._clip_spot_mul_preview(k)
            base: dict[str, object] = {
                "exposure_pct": self._clip_strength_percent_preview(k),
                "wb_pct": 0,
                "ct_k": self._clip_ct_k_preview(k),
                "spot_mul": [float(sm[0]), float(sm[1]), float(sm[2])],
            }
            ex = self._clip_grade_adjust.get(k)
            if ex:
                base.update(ex)
            ptn = self._preview_tone.get(k)
            if ptn:
                base["highlights_pct"] = int(ptn["highlights_pct"])
                base["whites_pct"] = int(ptn["whites_pct"])
                if "hue_pct" in ptn:
                    base["hue_pct"] = int(ptn["hue_pct"])
            out[k] = normalize_clip_grade(base)
        return out

    def _write_clip_grade_preview_sidecar(self) -> None:
        payload = {
            "version": 1,
            "note": "클립별 미리보기 조정값. 「최종완료」 후 「만들기」에서 FFmpeg으로 원본에 반영됩니다.",
            "by_path": self._build_clip_grade_preview_payload(),
        }
        try:
            CLIP_GRADE_PREVIEW_JSON.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except OSError:
            pass

    def _ensure_grade_web_server(self, port: int = GRADE_WEB_PORT) -> bool:
        try:
            urllib.request.urlopen(
                f"http://127.0.0.1:{port}/api/ping", timeout=0.35
            )
            return True
        except (urllib.error.URLError, OSError):
            pass
        srv = GRADE_WEB_SERVER.resolve()
        if not srv.is_file():
            return False
        cwd = str(srv.parent.parent)
        try:
            subprocess.Popen(
                [sys.executable, str(srv), "--port", str(port)],
                cwd=cwd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        except OSError:
            return False
        for _ in range(25):
            time.sleep(0.08)
            try:
                urllib.request.urlopen(
                    f"http://127.0.0.1:{port}/api/ping", timeout=0.35
                )
                return True
            except (urllib.error.URLError, OSError):
                continue
        return False

    def _open_grade_in_browser(self) -> None:
        snap = self._try_build_montage_snapshot()
        if not snap:
            messagebox.showinfo(
                "알림", "먼저 영상 폴더 또는「파일 여러 개」로 클립을 지정하세요."
            )
            return
        payload = {
            "video_files": list(self.video_files),
            "videos_dir": self.videos_dir_var.get().strip() or None,
        }
        try:
            GRADE_WEB_SESSION_JSON.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError as exc:
            messagebox.showerror("오류", str(exc))
            return
        if not self._ensure_grade_web_server():
            messagebox.showerror(
                "웹 서버",
                "로컬 편집 서버를 띄우지 못했습니다. 터미널에서 직접 실행한 뒤 다시 시도하세요.\n\n"
                f"  cd {GRADE_WEB_SERVER.parent.parent}\n"
                f"  python3 grade_web/grade_web_server.py",
            )
            return

        def _browse() -> None:
            webbrowser.open(f"http://127.0.0.1:{GRADE_WEB_PORT}/")

        self.root.after(120, _browse)

    def _import_grade_web_sidecar(self) -> None:
        self._apply_grade_web_session_video_list()
        self._montage_vids_cache = None
        self._montage_vids_cache_sig = None

        def _sync_after_session_or_grades() -> None:
            self._save_gui_settings()
            self._rebuild_grade_grid()
            self._rebuild_video_list_content()
            self._schedule_large_preview_refresh()
            self._sync_apply_slider_from_selection()

        if not CLIP_GRADE_PREVIEW_JSON.is_file():
            _sync_after_session_or_grades()
            messagebox.showinfo(
                "알림",
                f"{CLIP_GRADE_PREVIEW_JSON.name} 파일이 없습니다. 웹에서「저장」하세요. "
                "웹에서 바꾼 클립 순서·삭제는 세션 파일 기준으로 목록에 반영했습니다.",
            )
            return
        try:
            data = json.loads(
                CLIP_GRADE_PREVIEW_JSON.read_text(encoding="utf-8")
            )
        except (OSError, json.JSONDecodeError) as exc:
            messagebox.showerror("오류", f"JSON을 읽을 수 없습니다:\n{exc}")
            return
        by_path = data.get("by_path")
        if not isinstance(by_path, dict) or not by_path:
            _sync_after_session_or_grades()
            messagebox.showinfo("알림", "by_path 데이터가 없습니다. 세션 목록은 반영했습니다.")
            return
        snap = self._try_build_montage_snapshot()
        if not snap:
            _sync_after_session_or_grades()
            messagebox.showinfo("알림", "현재 스냅샷에 맞는 영상이 없습니다.")
            return
        keys = {str(p.resolve()) for p in snap[0]}
        applied = 0
        for path_key, g in by_path.items():
            sk = str(path_key)
            if sk not in keys:
                continue
            if not isinstance(g, dict):
                continue
            try:
                e = max(
                    0,
                    min(
                        GRADE_EXPOSURE_PCT_MAX,
                        int(g.get("exposure_pct", 100)),
                    ),
                )
            except (TypeError, ValueError):
                e = 100
            try:
                ct = max(
                    MONTAGE_CT_K_MIN,
                    min(
                        MONTAGE_CT_K_MAX,
                        int(g.get("ct_k", MONTAGE_CT_NEUTRAL_K)),
                    ),
                )
            except (TypeError, ValueError):
                ct = int(MONTAGE_CT_NEUTRAL_K)
            self._grade_per_clip_strength[sk] = e
            self._preview_per_clip_strength[sk] = e
            self._grade_per_clip_ct_k[sk] = ct
            self._preview_per_clip_ct_k[sk] = ct
            sm = g.get("spot_mul")
            if isinstance(sm, (list, tuple)) and len(sm) == 3:
                try:
                    t = (float(sm[0]), float(sm[1]), float(sm[2]))
                except (TypeError, ValueError):
                    t = (1.0, 1.0, 1.0)
                if self._spot_mul_identity(t):
                    self._grade_wb_spot_mul.pop(sk, None)
                    self._preview_wb_spot_mul.pop(sk, None)
                else:
                    self._grade_wb_spot_mul[sk] = t
                    self._preview_wb_spot_mul[sk] = t
            else:
                self._grade_wb_spot_mul.pop(sk, None)
                self._preview_wb_spot_mul.pop(sk, None)
            full = normalize_clip_grade(g)
            self._clip_grade_adjust[sk] = {
                str(kk): full[kk] for kk in GRADE_WEB_EXTRA_KEYS
            }
            applied += 1
        if applied == 0:
            _sync_after_session_or_grades()
            messagebox.showinfo(
                "알림",
                "저장 파일의 경로가 현재 클립 목록과 맞지 않습니다. "
                "세션 목록은 반영했습니다. 웹에서 다시 저장해 보세요.",
            )
            return
        self._preview_tone.clear()
        self._montage_vids_cache = None
        self._montage_vids_cache_sig = None
        _sync_after_session_or_grades()
        messagebox.showinfo(
            "완료",
            f"웹에서 저장한 값을 {applied}개 클립에 반영했습니다. "
            "웹에서 바꾼 클립 순서·삭제는 세션 파일 기준으로 목록에도 반영했습니다. "
            "필요하면「최종완료」 후「만들기」를 진행하세요.",
        )

    def _apply_grade_web_session_video_list(self) -> None:
        """~/.music_montage_grade_web_session.json 의 video_files / web_clips_only → self.video_files."""
        if not GRADE_WEB_SESSION_JSON.is_file():
            return
        try:
            raw = json.loads(GRADE_WEB_SESSION_JSON.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return
        vf = raw.get("video_files")
        web_only = bool(raw.get("web_clips_only"))
        if not isinstance(vf, list):
            return
        if not vf and not web_only:
            return
        out: list[str] = []
        for x in vf:
            p = Path(str(x)).expanduser()
            try:
                if p.is_file() and p.suffix.lower() in VIDEO_EXTS:
                    out.append(str(x))
            except OSError:
                continue
        if web_only:
            self.video_files = out
        elif out:
            self.video_files = out

    def _save_gui_settings(self) -> None:
        job = self._collect_ui_job()
        payload = dict(job)
        with self._job_queue_lock:
            payload["montage_queue"] = list(self._job_queue)
        try:
            SETTINGS_PATH.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
        except OSError:
            pass
        self._write_clip_grade_preview_sidecar()

    def _apply_job_to_ui(self, job: dict) -> None:
        self._suppress_preset_side_effects = True
        try:
            self.music_path_var.set(job.get("music_path") or "")
            vd = job.get("videos_dir")
            self.videos_dir_var.set(vd if vd else "")
            self.video_files = list(job.get("video_files") or [])
            self.logo_path_var.set(job.get("logo_path") or "")
            self.output_path_var.set(job.get("output_path") or "")
            self.window_sec_var.set(float(job.get("window_sec") or 4.0))
            self.peak_start_var.set(float(job.get("peak_start") or 3.0))
            self.clip_trim_var.set(float(job.get("clip_trim") or 0.5))
            self.tail_black_var.set(float(job.get("tail_black") or 2.0))
            self.audio_fade_var.set(float(job.get("audio_fade_out") or 5.0))
            self.letterbox_open_sec_var.set(float(job.get("letterbox_open_sec") or 2.0))
            self.letterbox_close_sec_var.set(float(job.get("letterbox_close_sec") or 2.0))
            self.letterbox_open_enabled_var.set(bool(job.get("letterbox_open_enabled", True)))
            self.letterbox_close_enabled_var.set(bool(job.get("letterbox_close_enabled", True)))
            pct = int(job.get("auto_exposure_strength_percent", 100))
            pct = max(0, min(GRADE_EXPOSURE_PCT_MAX, pct))
            self.auto_exposure_strength_var.set(pct)
            self.auto_wb_strength_var.set(0)
            raw_by = job.get("auto_exposure_strength_by_file") or {}
            self._grade_per_clip_strength = {}
            if isinstance(raw_by, dict):
                for k, v in raw_by.items():
                    try:
                        self._grade_per_clip_strength[str(k)] = max(
                            0, min(GRADE_EXPOSURE_PCT_MAX, int(v))
                        )
                    except (TypeError, ValueError):
                        pass
            self._grade_per_clip_wb = {}
            self._preview_per_clip_wb = {}
            self._preview_per_clip_strength = dict(self._grade_per_clip_strength)
            ctk0 = int(job.get("auto_ct_kelvin", int(MONTAGE_CT_NEUTRAL_K)))
            ctk0 = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, ctk0))
            self.auto_ct_kelvin_var.set(ctk0)
            raw_ctf = job.get("auto_ct_kelvin_by_file") or {}
            self._grade_per_clip_ct_k = {}
            if isinstance(raw_ctf, dict):
                for k, v in raw_ctf.items():
                    try:
                        kk = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, int(v)))
                        self._grade_per_clip_ct_k[str(k)] = kk
                    except (TypeError, ValueError):
                        pass
            self._preview_per_clip_ct_k = dict(self._grade_per_clip_ct_k)
            raw_spot = job.get("auto_wb_spot_mul_by_file") or {}
            self._grade_wb_spot_mul = {}
            self._preview_wb_spot_mul = {}
            if isinstance(raw_spot, dict):
                for k, v in raw_spot.items():
                    if isinstance(v, (list, tuple)) and len(v) == 3:
                        try:
                            t = (float(v[0]), float(v[1]), float(v[2]))
                            sk = str(k)
                            self._grade_wb_spot_mul[sk] = t
                            self._preview_wb_spot_mul[sk] = t
                        except (TypeError, ValueError):
                            pass
            raw_cgp = job.get("clip_grade_preview") or {}
            self._clip_grade_adjust = {}
            self._preview_tone = {}
            self._tone_grade_preset = self._tone_grade_preset_from_job(
                job.get("tone_grade_preset")
            )
            if isinstance(raw_cgp, dict):
                for k, v in raw_cgp.items():
                    if isinstance(v, dict):
                        sk = str(k)
                        full = normalize_clip_grade(v)
                        self._clip_grade_adjust[sk] = {
                            str(kk): full[kk] for kk in GRADE_WEB_EXTRA_KEYS
                        }
            presets = job.get("presets")
            self.custom_presets = [dict(x) for x in presets] if isinstance(presets, list) else []
            self._rebuild_preset_choices()
            sel = str(job.get("selected_preset_label") or "")
            sel = _LEGACY_PRESET_LABELS.get(sel, sel)
            if sel in self.preset_labels:
                self.preset_choice_var.set(sel)
            elif self.preset_labels:
                self.preset_choice_var.set(self.preset_labels[0])
            self._grade_focus_path = None
            self._large_preview_source_path = None
            self._grade_shift_anchor_idx = None
            self._grade_checked.clear()
            self._sync_apply_slider_from_selection()
            self._refresh_output_hint()
            self._enqueue_mid_frame_extracts_for_snapshot()
            self._rebuild_grade_grid()
            self._schedule_large_preview_refresh()
            self._refresh_queue_list()
            self._update_video_list_label()
            self._update_music_info_label()
        finally:
            self._suppress_preset_side_effects = False
            snap_seeded = self._try_build_montage_snapshot()
            if snap_seeded:
                self._tone_preset_seeded_paths = {
                    str(p.resolve()) for p in snap_seeded[0]
                }
                self._prev_montage_path_set = {
                    str(p.resolve()) for p in snap_seeded[0]
                }
            else:
                self._tone_preset_seeded_paths = set()
                self._prev_montage_path_set = None
            self._refresh_preset_quick_highlight()

    def _rebuild_preset_choices(self) -> None:
        self.preset_labels = [p["label"] for p in DEFAULT_PRESETS] + [
            str(p.get("label", "")) for p in self.custom_presets if p.get("label")
        ]
        if hasattr(self, "_preset_combo"):
            self._preset_combo["values"] = self.preset_labels
        self._rebuild_preset_quick_buttons()

    def _select_preset_by_label(self, lab: str) -> None:
        if lab in self.preset_labels:
            self.preset_choice_var.set(lab)

    def _apply_preset_side_effects(self) -> None:
        """빠른 선택·콤보에서 프리셋을 바꿀 때만(설정 로드 시 제외) 연관 옵션 적용."""
        if self._suppress_preset_side_effects:
            return
        lab = self.preset_choice_var.get()
        pl: dict | None = None
        for p in DEFAULT_PRESETS:
            if p["label"] == lab:
                pl = p
                break
        if pl is None:
            return
        bundle = pl.get("bundle")
        if bundle == "cinema":
            self.letterbox_open_enabled_var.set(True)
            self.letterbox_close_enabled_var.set(True)
            self.tail_black_var.set(2.0)
        elif bundle == "tri_vertical":
            self.letterbox_open_enabled_var.set(False)
            self.letterbox_close_enabled_var.set(False)
            self.tail_black_var.set(0.0)
        self._save_gui_settings()

    def _refresh_preset_quick_highlight(self) -> None:
        if not hasattr(self, "_preset_quick_inner"):
            return
        cur = self.preset_choice_var.get()
        for cap in self._preset_quick_inner.winfo_children():
            lab = getattr(cap, "_preset_label", None)
            if lab == cur:
                cap.config(highlightbackground="#2563eb", highlightthickness=2)
            else:
                cap.config(highlightbackground="#d1d5db", highlightthickness=1)

    def _rebuild_preset_quick_buttons(self) -> None:
        if not hasattr(self, "_preset_quick_inner"):
            return
        for w in self._preset_quick_inner.winfo_children():
            w.destroy()
        for p in DEFAULT_PRESETS:
            lab = str(p["label"])
            line1 = lab
            line2 = str(p.get("line2") or f'{int(p["w"])}×{int(p["h"])}')

            def _pick(_e=None, L: str = lab) -> None:
                self._select_preset_by_label(L)

            cap = Frame(
                self._preset_quick_inner,
                bg="#e5e7eb",
                highlightthickness=1,
                highlightbackground="#d1d5db",
                padx=3,
                pady=3,
            )
            cap.pack(side=LEFT, padx=4, pady=2)
            cap._preset_label = lab  # type: ignore[attr-defined]
            face = Label(
                cap,
                text=f"{line1}\n{line2}",
                bg="white",
                fg="#0f172a",
                font=("", 9),
                justify=CENTER,
                wraplength=200,
                cursor="hand2",
                padx=12,
                pady=10,
            )
            face.pack()
            face.bind("<Button-1>", _pick)
            cap.bind("<Button-1>", _pick)
        self._refresh_preset_quick_highlight()

    def _current_preset_dict(self) -> dict:
        lab = self.preset_choice_var.get()
        for p in DEFAULT_PRESETS:
            if p["label"] == lab:
                return dict(p)
        for p in self.custom_presets:
            if str(p.get("label")) == lab:
                return dict(p)
        return dict(DEFAULT_PRESETS[0])

    # --- UI build ---
    def _build_ui(self) -> None:
        top = Frame(self.root)
        top.pack(fill=X, padx=8, pady=6)
        Label(top, text="음악 몽타주", font=("", 14, "bold")).pack(side=LEFT)
        if HAS_DND:
            Label(top, text=" (드래그·드롭 가능)", fg="#666").pack(side=LEFT, padx=8)

        main_h = Frame(self.root)
        main_h.pack(fill=BOTH, expand=True)
        main_h.grid_columnconfigure(0, weight=1)
        main_h.grid_columnconfigure(1, weight=0, minsize=360)
        main_h.grid_rowconfigure(0, weight=1)

        right_sidebar = Frame(main_h)
        right_sidebar.grid(row=0, column=1, sticky="nsew", padx=(8, 12), pady=(0, 8))
        self._build_queue_section(right_sidebar, outer_padx=0)
        self._build_log_section(right_sidebar, outer_padx=0)

        btn_row = Frame(right_sidebar)
        btn_row.pack(fill=X, pady=(8, 4), padx=0)
        ttk.Button(btn_row, text="설정 저장", command=self._save_gui_settings).pack(
            side=LEFT, padx=2
        )
        ttk.Button(btn_row, text="생성 예약", command=self._queue_current).pack(
            side=LEFT, padx=2
        )
        ttk.Button(btn_row, text="만들기", command=self._launch_montage_thread).pack(
            side=LEFT, padx=2
        )
        ttk.Button(btn_row, text="종료", command=self._on_close).pack(side=RIGHT, padx=(0, 4))

        left_wrap = Frame(main_h)
        left_wrap.grid(row=0, column=0, sticky="nsew")

        self._main_scroll_canvas = Canvas(left_wrap, highlightthickness=0)
        vsb = Scrollbar(left_wrap, orient=VERTICAL, command=self._main_scroll_canvas.yview)
        self._main_scroll_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        vsb.pack(side=RIGHT, fill=Y)
        self._main_scroll_canvas.configure(yscrollcommand=vsb.set)
        body = Frame(self._main_scroll_canvas)
        self._main_inner = body
        win = self._main_scroll_canvas.create_window((0, 0), window=body, anchor=N + W)

        def _cfg_inner(_e=None) -> None:
            self._main_scroll_canvas.configure(scrollregion=self._main_scroll_canvas.bbox("all"))
            self._main_scroll_canvas.itemconfig(win, width=self._main_scroll_canvas.winfo_width())

        body.bind("<Configure>", _cfg_inner)
        self._main_scroll_canvas.bind("<Configure>", _cfg_inner)

        self._build_inputs(body)
        self._build_preset_section(body)
        self._build_montage_options(body)
        self._build_auto_exposure_section(body)

    def _build_inputs(self, parent: Frame) -> None:
        f = ttk.LabelFrame(parent, text="입력", padding=8)
        f.pack(fill=X, padx=8, pady=6)
        Label(f, text="음악", font=("", 10, "bold")).pack(anchor=W)
        r1 = Frame(f)
        r1.pack(fill=X, pady=(0, 2))
        ttk.Button(r1, text="파일…", command=self.browse_music, width=10).pack(side=LEFT, padx=(0, 4))
        ttk.Button(r1, text="폴더…", command=self.browse_music_folder).pack(side=LEFT, padx=(0, 8))
        ttk.Entry(r1, textvariable=self.music_path_var).pack(side=LEFT, fill=X, expand=True)
        self._music_info_lbl = Label(f, text="", fg="#64748b", wraplength=820, justify=LEFT)
        self._music_info_lbl.pack(anchor=W, pady=(2, 0))
        self._music_drop = Frame(f, bg="#dbeafe", highlightbackground="#3b82f6", highlightthickness=1)
        self._music_drop.pack(fill=X, pady=4, ipady=8, ipadx=4)
        Label(
            self._music_drop,
            text="▶ 음악 파일 또는 폴더를 여기로 드래그",
            bg="#dbeafe",
            fg="#1e40af",
            font=("", 10),
        ).pack()

        Label(f, text="영상", font=("", 10, "bold")).pack(anchor=W, pady=(10, 0))
        r2 = Frame(f)
        r2.pack(fill=X, pady=(0, 2))
        ttk.Button(r2, text="폴더…", command=self.browse_videos_dir, width=10).pack(
            side=LEFT, padx=(0, 4)
        )
        ttk.Button(r2, text="파일 여러 개…", command=self.browse_video_files).pack(
            side=LEFT, padx=(0, 4)
        )
        ttk.Button(r2, text="목록 편집…", command=self.open_video_list_editor).pack(
            side=LEFT, padx=(0, 4)
        )
        ttk.Button(r2, text="비우기", command=self.clear_video_sources, width=8).pack(
            side=LEFT, padx=(0, 4)
        )
        ttk.Entry(r2, textvariable=self.videos_dir_var).pack(
            side=LEFT, fill=X, expand=True, padx=(8, 0)
        )
        self._video_drop = Frame(f, bg="#dcfce7", highlightbackground="#16a34a", highlightthickness=1)
        self._video_drop.pack(fill=X, pady=4, ipady=8, ipadx=4)
        Label(
            self._video_drop,
            text="▶ 영상 폴더 또는 파일 드래그 (다른 폴더에서 오면 목록 교체·같은 폴더면 이어서 추가)",
            bg="#dcfce7",
            fg="#14532d",
            font=("", 10),
        ).pack()
        self._video_list_info_lbl = Label(f, text="", fg="#64748b", wraplength=820, justify=LEFT)
        self._video_list_info_lbl.pack(anchor=W, pady=(2, 0))
        self._update_video_list_label()

        r3 = Frame(f)
        r3.pack(fill=X, pady=(10, 2))
        Label(r3, text="로고 이미지:", width=14, anchor=W).pack(side=LEFT)
        ttk.Entry(r3, textvariable=self.logo_path_var).pack(side=LEFT, fill=X, expand=True)
        ttk.Button(r3, text="찾아보기…", command=self.browse_logo).pack(side=LEFT, padx=4)
        ttk.Button(r3, text="비우기", command=self.clear_logo, width=8).pack(side=LEFT, padx=(0, 4))
        self._logo_drop = Frame(
            f, bg="#fef3c7", highlightbackground="#ca8a04", highlightthickness=1
        )
        self._logo_drop.pack(fill=X, pady=4, ipady=6, ipadx=4)
        Label(
            self._logo_drop,
            text="▶ PNG / JPG / WebP 로고를 여기로 드래그",
            bg="#fef3c7",
            fg="#854d0e",
            font=("", 10),
        ).pack()
        r4 = Frame(f)
        r4.pack(fill=X, pady=2)
        Label(r4, text="출력 mp4 (선택·비우면 영상 폴더):", width=30, anchor=W).pack(
            side=LEFT
        )
        ttk.Entry(r4, textvariable=self.output_path_var).pack(side=LEFT, fill=X, expand=True)
        ttk.Button(r4, text="저장 위치…", command=self.browse_output).pack(side=LEFT, padx=4)
        self._output_hint = Label(f, text="", fg="#444", wraplength=820, justify=LEFT)
        self._output_hint.pack(fill=X, pady=4)
        if HAS_DND:
            try:
                self._music_drop.drop_target_register(DND_FILES)
                self._music_drop.dnd_bind("<<Drop>>", self.on_music_drop)
                self._video_drop.drop_target_register(DND_FILES)
                self._video_drop.dnd_bind("<<Drop>>", self.on_video_drop)
                self._logo_drop.drop_target_register(DND_FILES)
                self._logo_drop.dnd_bind("<<Drop>>", self.on_logo_drop)
            except (TclError, AttributeError):
                pass
        self._update_music_info_label()

    def _build_preset_section(self, parent: Frame) -> None:
        f = ttk.LabelFrame(parent, text="크기 · 프리셋", padding=8)
        f.pack(fill=X, padx=8, pady=6)
        quick = Frame(f)
        quick.pack(fill=X, pady=(0, 6))
        Label(quick, text="선택:", font=("", 9)).pack(side=LEFT, padx=(0, 6))
        self._preset_quick_inner = Frame(quick)
        self._preset_quick_inner.pack(side=LEFT, fill=X, expand=True)
        row = Frame(f)
        row.pack(fill=X)
        Label(row, text="프리셋:").pack(side=LEFT)
        self._preset_combo = ttk.Combobox(
            row, textvariable=self.preset_choice_var, state="readonly", width=36
        )
        self._preset_combo.pack(side=LEFT, padx=6)
        self._rebuild_preset_choices()
        if self.preset_labels:
            self.preset_choice_var.set(self.preset_labels[0])
        ttk.Button(row, text="사용자 프리셋 추가…", command=self._add_custom_preset_dialog).pack(
            side=LEFT, padx=4
        )

    def _build_montage_options(self, parent: Frame) -> None:
        f = ttk.LabelFrame(parent, text="몽타주 옵션", padding=8)
        f.pack(fill=X, padx=8, pady=6)
        self._montage_adv_visible = BooleanVar(value=False)
        top = Frame(f)
        top.pack(fill=X)
        ttk.Checkbutton(
            top,
            text="컷·피크·트림·길이 등 고급 옵션 표시",
            variable=self._montage_adv_visible,
            command=self._toggle_montage_adv_panel,
        ).pack(anchor=W)
        self._montage_adv_summary = Label(
            top,
            text="",
            fg="#64748b",
            font=("", 9),
            justify=LEFT,
        )
        self._montage_adv_summary.pack(anchor=W, pady=(4, 0))
        self._montage_adv_inner = Frame(f)
        self._spin_row(
            self._montage_adv_inner,
            "컷 창 길이(초)",
            self.window_sec_var,
            0.5,
            60.0,
            0.5,
        )
        self._spin_row(
            self._montage_adv_inner,
            "피크 시작(초)",
            self.peak_start_var,
            0.0,
            59.0,
            0.1,
        )
        self._spin_row(
            self._montage_adv_inner,
            "클립 앞 트림(초)",
            self.clip_trim_var,
            0.0,
            10.0,
            0.05,
        )
        self._spin_row(
            self._montage_adv_inner,
            "끝 검은 화면(초)",
            self.tail_black_var,
            0.0,
            30.0,
            0.5,
        )
        self._spin_row(
            self._montage_adv_inner,
            "오디오 페이드아웃(초)",
            self.audio_fade_var,
            0.0,
            60.0,
            0.5,
        )
        self._spin_row(
            self._montage_adv_inner,
            "오프닝 페이드(초)",
            self.letterbox_open_sec_var,
            0.0,
            30.0,
            0.5,
        )
        self._spin_row(
            self._montage_adv_inner,
            "클로징 페이드(초)",
            self.letterbox_close_sec_var,
            0.0,
            30.0,
            0.5,
        )
        h = Frame(self._montage_adv_inner)
        h.pack(fill=X, pady=4)
        ttk.Checkbutton(
            h, text="오프닝 검은 페이드 사용", variable=self.letterbox_open_enabled_var
        ).pack(side=LEFT, padx=6)
        ttk.Checkbutton(
            h, text="클로징 검은 페이드 사용", variable=self.letterbox_close_enabled_var
        ).pack(side=LEFT, padx=6)
        self._refresh_montage_adv_summary()

    def _toggle_montage_adv_panel(self) -> None:
        if self._montage_adv_visible.get():
            self._montage_adv_inner.pack(fill=X, pady=(8, 0))
        else:
            self._montage_adv_inner.pack_forget()

    def _refresh_montage_adv_summary(self) -> None:
        if not hasattr(self, "_montage_adv_summary"):
            return
        try:
            self._montage_adv_summary.config(
                text=(
                    f"컷 {float(self.window_sec_var.get()):.1f}s · "
                    f"피크 {float(self.peak_start_var.get()):.1f}s · "
                    f"트림 {float(self.clip_trim_var.get()):.2f}s · "
                    f"끝검정 {float(self.tail_black_var.get()):.1f}s · "
                    f"A페이드 {float(self.audio_fade_var.get()):.1f}s"
                )
            )
        except (TclError, ValueError, TypeError):
            pass

    def _spin_row(
        self,
        parent: Frame,
        label: str,
        var: DoubleVar,
        lo: float,
        hi: float,
        inc: float,
    ) -> None:
        row = Frame(parent)
        row.pack(fill=X, pady=1)
        Label(row, text=label, width=22, anchor=W).pack(side=LEFT)
        sp = ttk.Spinbox(
            row,
            textvariable=var,
            from_=lo,
            to=hi,
            increment=inc,
            width=10,
        )
        sp.pack(side=LEFT)


    def _text_like_widget_focus(self) -> bool:
        w = self.root.focus_get()
        if w is None:
            return False
        wc = w.winfo_class()
        if wc in ("Entry", "TEntry", "Text", "Spinbox", "TSpinbox"):
            return True
        return isinstance(w, scrolledtext.ScrolledText)

    def _grade_snapshot_for_undo(self) -> dict:
        return {
            "video_files": list(self.video_files),
            "gps": dict(self._grade_per_clip_strength),
            "pps": dict(self._preview_per_clip_strength),
            "gwb": dict(self._grade_per_clip_wb),
            "pwb": dict(self._preview_per_clip_wb),
            "gct": dict(self._grade_per_clip_ct_k),
            "pct": dict(self._preview_per_clip_ct_k),
            "gwbs": {
                k: (float(t[0]), float(t[1]), float(t[2]))
                for k, t in self._grade_wb_spot_mul.items()
            },
            "pwbs": {
                k: (float(t[0]), float(t[1]), float(t[2]))
                for k, t in self._preview_wb_spot_mul.items()
            },
            "cga": {k: dict(v) for k, v in self._clip_grade_adjust.items()},
            "ptn": {k: dict(v) for k, v in self._preview_tone.items()},
            "tgp": copy.deepcopy(self._tone_grade_preset)
            if isinstance(self._tone_grade_preset, dict)
            else None,
            "tgs": sorted(self._tone_preset_seeded_paths),
            "focus": self._grade_focus_path,
            "large": self._large_preview_source_path,
            "checked": list(self._grade_checked),
            "spot_b": int(self._spot_strength_var.get()),
        }

    def _grade_restore_from_snapshot(self, sn: dict) -> None:
        self.video_files = list(sn.get("video_files") or [])
        self._grade_per_clip_strength = dict(sn.get("gps") or {})
        self._preview_per_clip_strength = dict(sn.get("pps") or {})
        self._grade_per_clip_wb = dict(sn.get("gwb") or {})
        self._preview_per_clip_wb = dict(sn.get("pwb") or {})
        self._grade_per_clip_ct_k = dict(sn.get("gct") or {})
        self._preview_per_clip_ct_k = dict(sn.get("pct") or {})
        self._grade_wb_spot_mul = dict(sn.get("gwbs") or {})
        self._preview_wb_spot_mul = dict(sn.get("pwbs") or {})
        self._clip_grade_adjust = {k: dict(v) for k, v in (sn.get("cga") or {}).items()}
        self._preview_tone = {k: dict(v) for k, v in (sn.get("ptn") or {}).items()}
        raw_tgp = sn.get("tgp")
        self._tone_grade_preset = (
            copy.deepcopy(raw_tgp) if isinstance(raw_tgp, dict) else None
        )
        self._tone_preset_seeded_paths = set(sn.get("tgs") or [])
        self._grade_focus_path = sn.get("focus")
        self._large_preview_source_path = sn.get("large")
        self._grade_checked = set(sn.get("checked") or [])
        try:
            self._spot_strength_var.set(int(sn.get("spot_b", 100)))
        except (TclError, ValueError, TypeError):
            self._spot_strength_var.set(100)
        self._prune_grade_strengths()
        self._sync_apply_slider_from_selection()
        self._refresh_output_hint()
        self._update_video_list_label()
        self._rebuild_grade_grid()
        self._rebuild_video_list_content()
        self._render_large_preview_pillow()
        self._refresh_pills_from_preview()
        self._write_clip_grade_preview_sidecar()

    def _grade_push_undo(self) -> None:
        self._grade_undo_stack.append(self._grade_snapshot_for_undo())
        if len(self._grade_undo_stack) > 64:
            self._grade_undo_stack.pop(0)
        self._grade_redo_stack.clear()

    def _grade_undo_action(self, _e=None) -> str | None:
        if self._text_like_widget_focus():
            return None
        fw = self.root.focus_get()
        if fw is not None and fw.winfo_class() == "Listbox":
            return None
        if not self._grade_undo_stack:
            return "break"
        cur = self._grade_snapshot_for_undo()
        prev = self._grade_undo_stack.pop()
        self._grade_redo_stack.append(cur)
        self._grade_restore_from_snapshot(prev)
        self._save_gui_settings()
        return "break"

    def _grade_redo_action(self, _e=None) -> str | None:
        if self._text_like_widget_focus():
            return None
        fw = self.root.focus_get()
        if fw is not None and fw.winfo_class() == "Listbox":
            return None
        if not self._grade_redo_stack:
            return "break"
        cur = self._grade_snapshot_for_undo()
        nxt = self._grade_redo_stack.pop()
        self._grade_undo_stack.append(cur)
        self._grade_restore_from_snapshot(nxt)
        self._save_gui_settings()
        return "break"

    def _grade_live_apply_targets(self) -> list[str]:
        if self._grade_checked:
            return sorted(self._grade_checked)
        lp = self._large_preview_source_path or self._grade_focus_path
        return [lp] if lp else []

    def _on_live_grade_apply_vars(self, *_a) -> None:
        if (
            self._suppress_grade_apply_spin
            or self._suppress_grade_apply_ct_spin
            or self._suppress_grade_apply_tone_spin
        ):
            return
        targets = self._grade_live_apply_targets()
        if not targets:
            self._schedule_live_grade_preview()
            return
        try:
            e = int(self._grade_apply_strength_var.get())
        except (ValueError, TclError):
            e = 100
        e = max(0, min(GRADE_EXPOSURE_PCT_MAX, e))
        try:
            ck = int(self._grade_apply_ct_k_var.get())
        except (ValueError, TclError):
            ck = int(MONTAGE_CT_NEUTRAL_K)
        ck = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, ck))
        try:
            hi = int(self._grade_apply_highlights_var.get())
        except (ValueError, TclError):
            hi = 0
        try:
            wh = int(self._grade_apply_whites_var.get())
        except (ValueError, TclError):
            wh = 0
        hi = max(-100, min(100, hi))
        wh = max(-100, min(100, wh))
        try:
            hue = int(self._grade_apply_hue_var.get())
        except (ValueError, TclError):
            hue = 0
        hue = max(-100, min(100, hue))
        for pk in targets:
            self._preview_per_clip_strength[pk] = e
            self._preview_per_clip_ct_k[pk] = ck
            prev = dict(self._preview_tone.get(pk) or {})
            prev["highlights_pct"] = hi
            prev["whites_pct"] = wh
            prev["hue_pct"] = hue
            self._preview_tone[pk] = prev
        self._schedule_live_grade_preview()
        self._refresh_pills_from_preview()
        self._flush_grade_preview_refresh()

    def _on_spot_strength_trace(self, *_a) -> None:
        self._refresh_pills_from_preview()
        self._schedule_live_grade_preview()
        self._flush_grade_preview_refresh()

    def _grade_scale_press_undo(self, _e=None) -> None:
        self._grade_push_undo()

    def _grade_navigate_delta(self, delta: int) -> None:
        if not self._video_files_mode():
            return
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        keys = [str(p.resolve()) for p in snap[0]]
        if not keys:
            return
        cur = self._large_preview_source_path or self._grade_focus_path
        idx = keys.index(cur) if cur in keys else 0
        idx = (idx + delta + len(keys)) % len(keys)
        pk = keys[idx]
        self._grade_focus_path = pk
        self._large_preview_source_path = pk
        self._grade_checked = {pk}
        snap2 = self._try_build_montage_snapshot()
        if snap2:
            k2 = [str(p.resolve()) for p in snap2[0]]
            if pk in k2:
                self._grade_shift_anchor_idx = k2.index(pk)
        self._update_grade_selection_highlights()
        self._sync_apply_slider_from_selection()
        self._schedule_large_preview_refresh()

    def _grade_hotkey_alt_s(self, _e=None) -> str | None:
        if self._text_like_widget_focus():
            return None
        fw = self.root.focus_get()
        if fw is not None and fw.winfo_class() == "Listbox":
            return None
        self._grade_navigate_delta(-1)
        return "break"

    def _grade_hotkey_alt_d(self, _e=None) -> str | None:
        if self._text_like_widget_focus():
            return None
        fw = self.root.focus_get()
        if fw is not None and fw.winfo_class() == "Listbox":
            return None
        self._grade_navigate_delta(1)
        return "break"

    def _grade_hotkey_alt_w(self, _e=None) -> str | None:
        if self._text_like_widget_focus():
            return None
        fw = self.root.focus_get()
        if fw is not None and fw.winfo_class() == "Listbox":
            return None
        self._wb_spot_toggle_pick()
        return "break"

    def _grade_delete_paths(self, to_remove: set[str]) -> None:
        self.video_files = [
            p for p in self.video_files if str(Path(p).resolve()) not in to_remove
        ]
        for k in to_remove:
            self._grade_per_clip_strength.pop(k, None)
            self._preview_per_clip_strength.pop(k, None)
            self._grade_per_clip_wb.pop(k, None)
            self._preview_per_clip_wb.pop(k, None)
            self._grade_per_clip_ct_k.pop(k, None)
            self._preview_per_clip_ct_k.pop(k, None)
            self._grade_wb_spot_mul.pop(k, None)
            self._preview_wb_spot_mul.pop(k, None)
            self._clip_grade_adjust.pop(k, None)
            self._preview_tone.pop(k, None)
            self._tone_preset_seeded_paths.discard(k)
        self._grade_checked -= to_remove
        if self._grade_focus_path in to_remove:
            self._grade_focus_path = None
        if self._large_preview_source_path in to_remove:
            self._large_preview_source_path = None
        self._save_gui_settings()
        self._sync_apply_slider_from_selection()
        self._refresh_output_hint()
        self._rebuild_grade_grid()
        self._rebuild_video_list_content()


    def _grade_hotkey_delete(self, _e=None) -> str | None:
        if self._text_like_widget_focus():
            return None
        fw = self.root.focus_get()
        if fw is not None and fw.winfo_class() == "Listbox":
            return None
        if not self._video_files_mode():
            return "break"
        to_remove = set(self._grade_checked)
        if not to_remove:
            lp = self._large_preview_source_path or self._grade_focus_path
            if lp:
                to_remove = {lp}
        if not to_remove:
            return "break"
        self._grade_push_undo()
        self._grade_delete_paths(to_remove)
        return "break"

    def _create_grade_spin_compat_widgets(self, parent: Frame) -> None:
        """트레이스·확인 핸들러 호환용(화면에 표시하지 않음)."""
        row_as = Frame(parent)
        row_as.pack()
        self._apply_strength_inner = Frame(row_as)
        self._apply_strength_inner.pack(side=LEFT)
        self._apply_spin = ttk.Spinbox(
            self._apply_strength_inner,
            from_=0,
            to=GRADE_EXPOSURE_PCT_MAX,
            textvariable=self._grade_apply_strength_var,
            width=6,
            increment=1,
        )
        self._apply_pct_suffix = Label(self._apply_strength_inner, text="%", font=("", 10))
        self._apply_disabled_lbl = Label(
            self._apply_strength_inner, text="—", font=("", 10, "bold")
        )
        self._apply_spin.grid(row=0, column=0, padx=(0, 6))
        self._apply_pct_suffix.grid(row=0, column=1)
        self._apply_disabled_lbl.grid(row=0, column=0, sticky=W)
        self._apply_disabled_lbl.grid_remove()
        for seq in ("<FocusOut>", "<Return>", "<<Increment>>", "<<Decrement>>"):
            self._apply_spin.bind(seq, self._clamp_apply_strength_spin, add=True)
        row_ctas = Frame(parent)
        row_ctas.pack()
        self._apply_ct_strength_inner = Frame(row_ctas)
        self._apply_ct_strength_inner.pack(side=LEFT)
        self._apply_ct_spin = ttk.Spinbox(
            self._apply_ct_strength_inner,
            from_=MONTAGE_CT_K_MIN,
            to=MONTAGE_CT_K_MAX,
            textvariable=self._grade_apply_ct_k_var,
            width=7,
            increment=100,
        )
        self._apply_ct_k_suffix = Label(
            self._apply_ct_strength_inner, text="K", font=("", 10)
        )
        self._apply_ct_disabled_lbl = Label(
            self._apply_ct_strength_inner, text="—", font=("", 10, "bold")
        )
        self._apply_ct_spin.grid(row=0, column=0, padx=(0, 6))
        self._apply_ct_k_suffix.grid(row=0, column=1)
        self._apply_ct_disabled_lbl.grid(row=0, column=0, sticky=W)
        self._apply_ct_disabled_lbl.grid_remove()
        for seq in ("<FocusOut>", "<Return>", "<<Increment>>", "<<Decrement>>"):
            self._apply_ct_spin.bind(seq, self._clamp_apply_ct_spin, add=True)

    def _build_grade_slider_column(self, parent: Frame) -> None:
        Label(parent, text="노출", font=("", 9, "bold")).pack(anchor=W)
        self._grade_expo_scale = Scale(
            parent,
            from_=0,
            to=GRADE_EXPOSURE_PCT_MAX,
            orient=HORIZONTAL,
            variable=self._grade_apply_strength_var,
            showvalue=1,
            length=GRADE_RIGHT_PANEL_W - 16,
        )
        self._grade_expo_scale.pack(fill=X, pady=(0, 8))
        self._grade_expo_scale.bind("<Button-1>", self._grade_scale_press_undo, add=True)

        Label(parent, text="톤 보정 (Tone)", font=("", 9, "bold")).pack(anchor=W, pady=(4, 0))
        Label(parent, text="하이라이트 (Highlights)", font=("", 9)).pack(anchor=W)
        self._grade_highlights_scale = Scale(
            parent,
            from_=-100,
            to=100,
            orient=HORIZONTAL,
            variable=self._grade_apply_highlights_var,
            showvalue=1,
            resolution=1,
            length=GRADE_RIGHT_PANEL_W - 16,
        )
        self._grade_highlights_scale.pack(fill=X, pady=(0, 4))
        self._grade_highlights_scale.bind(
            "<Button-1>", self._grade_scale_press_undo, add=True
        )
        Label(parent, text="화이트 (Whites)", font=("", 9)).pack(anchor=W)
        self._grade_whites_scale = Scale(
            parent,
            from_=-100,
            to=100,
            orient=HORIZONTAL,
            variable=self._grade_apply_whites_var,
            showvalue=1,
            resolution=1,
            length=GRADE_RIGHT_PANEL_W - 16,
        )
        self._grade_whites_scale.pack(fill=X, pady=(0, 8))
        self._grade_whites_scale.bind(
            "<Button-1>", self._grade_scale_press_undo, add=True
        )

        Label(parent, text="색상환 (Hue)", font=("", 9)).pack(anchor=W)
        self._grade_hue_scale = Scale(
            parent,
            from_=-100,
            to=100,
            orient=HORIZONTAL,
            variable=self._grade_apply_hue_var,
            showvalue=1,
            resolution=1,
            length=GRADE_RIGHT_PANEL_W - 16,
        )
        self._grade_hue_scale.pack(fill=X, pady=(0, 8))
        self._grade_hue_scale.bind(
            "<Button-1>", self._grade_scale_press_undo, add=True
        )

        tone_preset_row = Frame(parent)
        tone_preset_row.pack(fill=X, pady=(0, 10))
        ttk.Button(
            tone_preset_row,
            text="사전설정 저장",
            command=self._tone_preset_save,
            width=12,
        ).pack(side=LEFT, padx=(0, 6))
        ttk.Button(
            tone_preset_row,
            text="설정 적용",
            command=self._tone_preset_apply,
            width=12,
        ).pack(side=LEFT, padx=(6, 0))
        ttk.Button(
            tone_preset_row,
            text="전체초기화",
            command=self._grade_reset_all_clips_to_defaults,
            width=18,
        ).pack(side=LEFT, padx=(6, 0))
        ttk.Button(
            tone_preset_row,
            text="선택 클립 초기화",
            command=self._grade_reset_selected_clips_to_defaults,
            width=16,
        ).pack(side=LEFT, padx=(6, 0))

        Label(parent, text="색온도 (K)", font=("", 9, "bold")).pack(anchor=W)
        self._grade_ct_scale = Scale(
            parent,
            from_=MONTAGE_CT_K_MIN,
            to=MONTAGE_CT_K_MAX,
            orient=HORIZONTAL,
            resolution=50,
            variable=self._grade_apply_ct_k_var,
            showvalue=1,
            length=GRADE_RIGHT_PANEL_W - 16,
        )
        self._grade_ct_scale.pack(fill=X, pady=(0, 8))
        self._grade_ct_scale.bind("<Button-1>", self._grade_scale_press_undo, add=True)

        Label(parent, text="스포이드 세기", font=("", 9, "bold")).pack(anchor=W)
        self._grade_spot_scale = Scale(
            parent,
            from_=0,
            to=100,
            orient=HORIZONTAL,
            variable=self._spot_strength_var,
            showvalue=1,
            length=GRADE_RIGHT_PANEL_W - 16,
        )
        self._grade_spot_scale.pack(fill=X, pady=(0, 6))
        self._grade_spot_scale.bind("<Button-1>", self._grade_scale_press_undo, add=True)

        wb_row = Frame(parent)
        wb_row.pack(fill=X, pady=(4, 0))
        self._wb_spot_btn = ttk.Button(
            wb_row,
            text="흰색 스포이드",
            command=self._wb_spot_toggle_pick,
            width=12,
        )
        self._wb_spot_btn.pack(side=LEFT, padx=(0, 4))
        ttk.Button(
            wb_row,
            text="스포이드 초기화",
            command=self._wb_spot_reset_focus_clip,
            width=12,
        ).pack(side=LEFT)

        ttk.Button(
            parent,
            text="최종완료",
            command=self._on_exposure_finalize,
            width=14,
        ).pack(anchor=W, pady=(14, 0))

    def _build_auto_exposure_section(self, parent: Frame) -> None:
        _pad = 8
        f = ttk.LabelFrame(parent, text="클립 보정 (Tk · 웹과 동일 단축키)", padding=(_pad, _pad))
        f.pack(fill=BOTH, expand=True, padx=8, pady=8)

        topf = Frame(f)
        topf.pack(fill=X, pady=(0, 4))
        self._grade_hint = Label(
            topf,
            text="",
            fg="#475569",
            font=("", 9),
            wraplength=520,
            justify=LEFT,
        )
        self._grade_hint.pack(side=LEFT, anchor=W, fill=X, expand=True)
        br = Frame(topf)
        br.pack(side=RIGHT)
        ttk.Button(
            br,
            text="브라우저…",
            command=self._open_grade_in_browser,
            width=9,
        ).pack(side=LEFT, padx=2)
        ttk.Button(
            br,
            text="웹 불러오기",
            command=self._import_grade_web_sidecar,
            width=10,
        ).pack(side=LEFT, padx=2)
        self._grade_thumb_pick_btn = ttk.Button(
            br,
            text="선택하기",
            command=self._toggle_thumb_pick_mode,
            width=9,
        )
        self._grade_thumb_pick_btn.pack(side=LEFT, padx=2)
        ttk.Button(
            br,
            text="체크 삭제",
            command=self._grade_delete_checked_confirmed,
            width=9,
        ).pack(side=LEFT, padx=2)

        Label(
            f,
            text=(
                "⌫·Del 삭제  |  Ctrl/⌘+Z 실행취소  |  Ctrl/⌘+⇧+Z 또는 Ctrl+Y 다시  |  "
                "Shift+클릭 범위  Ctrl+클릭 토글  |  "
                "Alt/⌥+S 이전  Alt/⌥+D 다음  Alt/⌥+W 스포이드 (mac은 Option 키)"
            ),
            fg="#64748b",
            font=("", 8),
            wraplength=920,
            justify=LEFT,
        ).pack(anchor=W, pady=(0, 6))

        Label(
            f,
            text=(
                "왼쪽 썸네일 · 가운데 미리보기 · 오른쪽 슬라이더. "
                f"중간 프레임 캐시: {self._preview_cache_dir}"
            ),
            fg="#64748b",
            font=("", 9),
            wraplength=920,
            justify=LEFT,
        ).pack(anchor=W, pady=(0, 6))

        main = Frame(f)
        main.pack(fill=BOTH, expand=True)
        main.grid_columnconfigure(1, weight=1)
        main.grid_rowconfigure(0, weight=1)

        self._grade_left_column = Frame(main, width=GRADE_THUMB_STRIP_CANVAS_W)
        self._grade_left_column.grid(row=0, column=0, sticky="nsw", padx=(0, 6))
        self._grade_left_column.grid_propagate(False)
        left = self._grade_left_column

        gvsb = Scrollbar(left, orient=VERTICAL)
        self._grade_canvas = Canvas(
            left,
            highlightthickness=0,
            width=GRADE_THUMB_STRIP_CANVAS_W,
        )
        gvsb.pack(side=RIGHT, fill=Y)
        self._grade_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        self._grade_canvas.configure(yscrollcommand=gvsb.set)
        gvsb.config(command=self._grade_canvas.yview)
        self._grade_inner = Frame(self._grade_canvas)
        self._grade_canvas_win = self._grade_canvas.create_window(
            (0, 0), window=self._grade_inner, anchor="nw"
        )

        def _grade_inner_cfg(_e=None) -> None:
            self._grade_canvas.configure(scrollregion=self._grade_canvas.bbox("all"))

        self._grade_inner.bind("<Configure>", _grade_inner_cfg)

        def _grade_canvas_cfg(e) -> None:
            self._grade_canvas.itemconfig(self._grade_canvas_win, width=e.width)

        self._grade_canvas.bind("<Configure>", _grade_canvas_cfg)

        center = Frame(main)
        self._grade_preview_center = center
        center.grid(row=0, column=1, sticky="nsew", padx=4)
        center.grid_rowconfigure(0, weight=1)
        center.grid_columnconfigure(0, weight=1)

        lp_wrap = Frame(center, bd=1, relief="groove", height=GRADE_PREVIEW_HEIGHT)
        lp_wrap.grid(row=0, column=0, sticky="nsew")
        lp_wrap.grid_propagate(False)
        lp_wrap.pack_propagate(False)
        self._large_preview_frame = lp_wrap

        def _on_grade_center_cfg(ev) -> None:
            if ev.widget is not self._grade_preview_center:
                return
            try:
                cw = max(280, int(ev.width))
            except (ValueError, TclError):
                return
            self._large_preview_cell_w = cw
            lf = self._large_preview_frame
            if lf is not None:
                try:
                    lf.config(width=cw, height=GRADE_PREVIEW_HEIGHT)
                except TclError:
                    pass

        center.bind("<Configure>", _on_grade_center_cfg, add=True)
        self._large_preview_label = Label(
            lp_wrap,
            text="",
            bg="#e2e8f0",
            fg="#64748b",
        )
        self._large_preview_label.pack(fill=BOTH, expand=True, padx=4, pady=4)
        self._large_preview_label.bind("<Button-1>", self._on_large_preview_b1)

        right = Frame(main, width=GRADE_RIGHT_PANEL_W)
        right.grid(row=0, column=2, sticky="nse", padx=(6, 0))
        right.grid_propagate(False)
        self._build_grade_slider_column(right)

        Label(
            f,
            text=(
                f"http://127.0.0.1:{GRADE_WEB_PORT}  ·  "
                "python3 grade_web/grade_web_server.py"
            ),
            fg="#94a3b8",
            font=("", 8),
            justify=LEFT,
        ).pack(anchor=W, pady=(8, 0))

        self._grade_spin_compat_host = Frame(f)
        self._create_grade_spin_compat_widgets(self._grade_spin_compat_host)

        self._sync_apply_slider_from_selection()

    def _build_hidden_grade_tools(self, parent: Frame) -> None:
        """레거시 호출 호환(위젯은 _create_grade_spin_compat_widgets에서 생성)."""
        return

    def _build_queue_section(self, parent: Frame, *, outer_padx: int = 8) -> None:
        f = ttk.LabelFrame(parent, text="실행 대기열", padding=8)
        f.pack(fill=X, padx=outer_padx, pady=6)
        self._queue_list = Listbox(f, height=5, selectmode=EXTENDED)
        self._queue_list.pack(fill=X)
        qb = Frame(f)
        qb.pack(fill=X, pady=(6, 0))
        ttk.Button(qb, text="선택 제거", command=self._queue_remove_selected, width=11).pack(
            side=LEFT, padx=(0, 4)
        )
        ttk.Button(qb, text="대기열 비우기", command=self._queue_clear_all, width=14).pack(
            side=LEFT
        )
        Label(
            f,
            text="「만들기」: 맨 위부터 순서대로 바로 이어서 실행합니다. 실행 중에도 대기열에 넣으면 앞 작업이 끝난 뒤 곧바로 이어집니다. 완료된 항목은 목록에서 빠집니다.",
            fg="#64748b",
            font=("", 9),
            wraplength=320,
            justify=LEFT,
        ).pack(anchor=W, pady=(4, 0))

    def _build_log_section(self, parent: Frame, *, outer_padx: int = 8) -> None:
        f = ttk.LabelFrame(parent, text="로그", padding=8)
        f.pack(fill=BOTH, expand=True, padx=outer_padx, pady=6)
        self._log = scrolledtext.ScrolledText(f, height=12, state="disabled", wrap="word")
        self._log.pack(fill=BOTH, expand=True)

    def _scroll_canvas_for_widget(self, w) -> Canvas | None:
        cur = w
        for _ in range(80):
            if cur is None:
                return None
            if cur == self._grade_canvas:
                return self._grade_canvas
            if cur == self._vq_canvas:
                return self._vq_canvas
            if cur == self._main_scroll_canvas:
                return self._main_scroll_canvas
            cur = getattr(cur, "master", None)
        return None

    def _on_global_mousewheel(self, e) -> None:
        w = self.root.winfo_containing(e.x_root, e.y_root)
        if w is None or str(w) == ".":
            w = getattr(e, "widget", None)
        if w is None:
            return
        canvas = self._scroll_canvas_for_widget(w)
        if canvas is None:
            return
        delta = 0
        if hasattr(e, "delta") and e.delta != 0:
            if sys.platform == "darwin":
                # Cocoa Tk: 보통 ±1~±5, 120 배수 아님
                delta = -1 if e.delta > 0 else 1
            else:
                delta = -int(e.delta / 120)
                if delta == 0:
                    delta = -1 if e.delta > 0 else 1
        elif getattr(e, "num", None) == 4:
            delta = -1
        elif getattr(e, "num", None) == 5:
            delta = 1
        if delta:
            # delta만 사용(추가 배율 없음). 이전 step×3~4가 한 칸만 내려도 과하게 내려감.
            canvas.yview_scroll(delta, "units")

    def _wire_traces(self) -> None:
        self.preset_choice_var.trace_add(
            "write",
            lambda *_a: (
                self._refresh_output_hint(),
                self._apply_preset_side_effects(),
                self._refresh_preset_quick_highlight(),
            ),
        )
        self.music_path_var.trace_add("write", lambda *_a: self._update_music_info_label())
        self.videos_dir_var.trace_add("write", lambda *_a: self._on_paths_changed())
        for v in (
            self.window_sec_var,
            self.peak_start_var,
            self.clip_trim_var,
            self.music_path_var,
            self.output_path_var,
        ):
            v.trace_add("write", lambda *_a: self._refresh_output_hint())
        for v in (
            self.window_sec_var,
            self.peak_start_var,
            self.clip_trim_var,
            self.tail_black_var,
            self.audio_fade_var,
        ):
            v.trace_add("write", lambda *_a: self._refresh_montage_adv_summary())
        self.clip_trim_var.trace_add("write", lambda *_a: self._debounce_grade_grid_refresh())
        for gv in (
            self._grade_apply_strength_var,
            self._grade_apply_ct_k_var,
            self._grade_apply_highlights_var,
            self._grade_apply_whites_var,
            self._grade_apply_hue_var,
        ):
            gv.trace_add("write", lambda *_a: self._on_live_grade_apply_vars())
        self._spot_strength_var.trace_add(
            "write", lambda *_a: self._on_spot_strength_trace()
        )

    def _debounce_grade_grid_refresh(self) -> None:
        if self._grade_grid_refresh_after:
            self.root.after_cancel(self._grade_grid_refresh_after)
        self._grade_grid_refresh_after = self.root.after(180, self._run_debounced_grade_refresh)

    def _run_debounced_grade_refresh(self) -> None:
        self._grade_grid_refresh_after = None
        self._rebuild_grade_grid()
        self._schedule_large_preview_refresh()

    def _on_paths_changed(self) -> None:
        snap = self._try_build_montage_snapshot()
        new_paths: list[str] = []
        if snap:
            new_paths = [str(p.resolve()) for p in snap[0]]
        new_set = set(new_paths)
        prev = self._prev_montage_path_set
        if (
            prev is not None
            and len(prev) > 0
            and len(new_set) > 0
            and len(prev & new_set) == 0
        ):
            self._reset_montage_to_fresh_defaults()
        self._prev_montage_path_set = new_set if new_set else None
        self._prune_grade_strengths()
        self._update_video_list_label()
        self._refresh_output_hint()
        self._enqueue_mid_frame_extracts_for_snapshot()
        self._rebuild_grade_grid()

    @staticmethod
    def _split_dnd_paths(data: str) -> list[str]:
        s = (data or "").strip()
        if not s:
            return []
        if "{" in s:
            return [m.strip() for m in re.findall(r"\{([^}]*)\}", s) if m.strip()]
        return [p.strip() for p in s.split() if p.strip()]

    def _update_video_list_label(self) -> None:
        if not hasattr(self, "_video_list_info_lbl"):
            return
        vf = self.video_files
        vd = self.videos_dir_var.get().strip()
        if vf:
            self._video_list_info_lbl.config(
                text=f"파일 {len(vf)}개 (순서 유지) — 아래 썸네일에서 순서·선택·삭제",
                fg="#14532d",
            )
        elif vd:
            self._video_list_info_lbl.config(
                text=f"폴더: {Path(vd).name} (이름순) — 클립 클릭으로 큰 미리보기",
                fg="#14532d",
            )
        else:
            self._video_list_info_lbl.config(
                text="영상 폴더 또는「파일 여러 개…」로 클립을 지정하세요.",
                fg="#64748b",
            )

    @staticmethod
    def _count_audio_files_in_dir(folder: Path) -> int:
        try:
            return sum(
                1
                for x in folder.iterdir()
                if x.is_file()
                and x.suffix.lower() in AUDIO_EXTS
                and not is_skipped_media_filename(x.name)
            )
        except OSError:
            return -1

    def _update_music_info_label(self) -> None:
        if not hasattr(self, "_music_info_lbl"):
            return
        raw = self.music_path_var.get().strip()
        if not raw:
            self._music_info_lbl.config(text="", fg="#64748b")
            return
        try:
            p = Path(raw).expanduser().resolve()
        except OSError:
            self._music_info_lbl.config(text="경로를 읽을 수 없습니다.", fg="#b45309")
            return
        if p.is_file():
            if p.suffix.lower() in AUDIO_EXTS and not is_skipped_media_filename(p.name):
                self._music_info_lbl.config(text="선택한 음악 1곡 (파일)", fg="#1e40af")
            else:
                self._music_info_lbl.config(
                    text="지원 형식 음악 파일이 아닙니다.", fg="#b45309"
                )
            return
        if p.is_dir():
            n = self._count_audio_files_in_dir(p)
            if n < 0:
                self._music_info_lbl.config(text="폴더를 읽을 수 없습니다.", fg="#b45309")
            elif n == 0:
                self._music_info_lbl.config(
                    text=f"폴더에 지원 음악이 없습니다. 지원: {', '.join(sorted(AUDIO_EXTS))}",
                    fg="#b45309",
                )
            else:
                self._music_info_lbl.config(
                    text=f"폴더 내 음악 {n}곡 (실행 시 그중 무작위 1곡 사용)",
                    fg="#1e40af",
                )
            return
        self._music_info_lbl.config(
            text="음악 파일 또는 폴더 경로를 확인하세요.", fg="#b45309"
        )

    def _reset_montage_to_fresh_defaults(self) -> None:
        """다른 영상 배치로 갈아탈 때: 저장 세션에 묶인 몽타주·클립 보정을 처음과 같은 기본값으로."""
        self._suppress_preset_side_effects = True
        try:
            self._tone_grade_preset = None
            self._tone_preset_seeded_paths.clear()
            self._grade_per_clip_strength.clear()
            self._preview_per_clip_strength.clear()
            self._grade_per_clip_wb.clear()
            self._preview_per_clip_wb.clear()
            self._grade_per_clip_ct_k.clear()
            self._preview_per_clip_ct_k.clear()
            self._grade_wb_spot_mul.clear()
            self._preview_wb_spot_mul.clear()
            self._clip_grade_adjust.clear()
            self._preview_tone.clear()
            self._large_base_pil.clear()
            self._montage_vids_cache = None
            self._montage_vids_cache_sig = None
            self.auto_exposure_strength_var.set(100)
            self.auto_wb_strength_var.set(0)
            self.auto_ct_kelvin_var.set(int(MONTAGE_CT_NEUTRAL_K))
            self._spot_strength_var.set(100)
            self._grade_apply_strength_var.set(100)
            self._grade_apply_ct_k_var.set(int(MONTAGE_CT_NEUTRAL_K))
            self._grade_apply_highlights_var.set(0)
            self._grade_apply_whites_var.set(0)
            self._grade_apply_hue_var.set(0)
            nj = self._normalize_job({})
            self.window_sec_var.set(float(nj.get("window_sec") or 4.0))
            self.peak_start_var.set(float(nj.get("peak_start") or 3.0))
            self.clip_trim_var.set(float(nj.get("clip_trim") or 0.5))
            self.tail_black_var.set(float(nj.get("tail_black") or 2.0))
            self.audio_fade_var.set(float(nj.get("audio_fade_out") or 5.0))
            self.letterbox_open_sec_var.set(float(nj.get("letterbox_open_sec") or 2.0))
            self.letterbox_close_sec_var.set(float(nj.get("letterbox_close_sec") or 2.0))
            self.letterbox_open_enabled_var.set(bool(nj.get("letterbox_open_enabled", True)))
            self.letterbox_close_enabled_var.set(bool(nj.get("letterbox_close_enabled", True)))
            if self.preset_labels:
                lab = str(DEFAULT_PRESETS[1]["label"])
                if lab in self.preset_labels:
                    self.preset_choice_var.set(lab)
                else:
                    self.preset_choice_var.set(self.preset_labels[0])
        finally:
            self._suppress_preset_side_effects = False
        self._refresh_montage_adv_summary()
        self._refresh_preset_quick_highlight()
        self._save_gui_settings()

    def _prune_grade_strengths(self) -> None:
        snap = self._try_build_montage_snapshot()
        if snap is None:
            return
        vids, _ = snap
        keys = {str(p.resolve()) for p in vids}
        for k in list(self._grade_per_clip_strength.keys()):
            if k not in keys:
                del self._grade_per_clip_strength[k]
        for k in list(self._preview_per_clip_strength.keys()):
            if k not in keys:
                del self._preview_per_clip_strength[k]
        for k in list(self._grade_per_clip_wb.keys()):
            if k not in keys:
                del self._grade_per_clip_wb[k]
        for k in list(self._preview_per_clip_wb.keys()):
            if k not in keys:
                del self._preview_per_clip_wb[k]
        for k in list(self._grade_per_clip_ct_k.keys()):
            if k not in keys:
                del self._grade_per_clip_ct_k[k]
        for k in list(self._preview_per_clip_ct_k.keys()):
            if k not in keys:
                del self._preview_per_clip_ct_k[k]
        for k in list(self._grade_wb_spot_mul.keys()):
            if k not in keys:
                del self._grade_wb_spot_mul[k]
        for k in list(self._preview_wb_spot_mul.keys()):
            if k not in keys:
                del self._preview_wb_spot_mul[k]
        self._grade_checked.intersection_update(keys)
        if self._grade_focus_path and self._grade_focus_path not in keys:
            self._grade_focus_path = None
        for k in list(self._large_base_pil.keys()):
            if k not in keys:
                del self._large_base_pil[k]
        for k in list(self._clip_grade_adjust.keys()):
            if k not in keys:
                del self._clip_grade_adjust[k]
        for k in list(self._preview_tone.keys()):
            if k not in keys:
                del self._preview_tone[k]

    def _committed_clip_strength(self, path_key: str) -> int:
        if path_key in self._grade_per_clip_strength:
            return max(
                0,
                min(
                    GRADE_EXPOSURE_PCT_MAX,
                    int(self._grade_per_clip_strength[path_key]),
                ),
            )
        return max(
            0,
            min(GRADE_EXPOSURE_PCT_MAX, int(self.auto_exposure_strength_var.get())),
        )

    def _committed_clip_wb(self, path_key: str) -> int:
        if path_key in self._grade_per_clip_wb:
            return max(0, min(100, int(self._grade_per_clip_wb[path_key])))
        return max(0, min(100, int(self.auto_wb_strength_var.get())))

    def _committed_clip_ct_k(self, path_key: str) -> int:
        if path_key in self._grade_per_clip_ct_k:
            return max(
                MONTAGE_CT_K_MIN,
                min(MONTAGE_CT_K_MAX, int(self._grade_per_clip_ct_k[path_key])),
            )
        return max(
            MONTAGE_CT_K_MIN,
            min(MONTAGE_CT_K_MAX, int(self.auto_ct_kelvin_var.get())),
        )

    def _clip_strength_percent_preview(self, path_key: str) -> int:
        if path_key in self._preview_per_clip_strength:
            return max(
                0,
                min(
                    GRADE_EXPOSURE_PCT_MAX,
                    int(self._preview_per_clip_strength[path_key]),
                ),
            )
        return self._committed_clip_strength(path_key)

    def _clip_wb_percent_preview(self, path_key: str) -> int:
        if path_key in self._preview_per_clip_wb:
            return max(0, min(100, int(self._preview_per_clip_wb[path_key])))
        return self._committed_clip_wb(path_key)

    def _clip_ct_k_preview(self, path_key: str) -> int:
        if path_key in self._preview_per_clip_ct_k:
            return max(
                MONTAGE_CT_K_MIN,
                min(MONTAGE_CT_K_MAX, int(self._preview_per_clip_ct_k[path_key])),
            )
        return self._committed_clip_ct_k(path_key)

    @staticmethod
    def _spot_mul_identity(t: tuple[float, float, float], eps: float = 0.002) -> bool:
        return all(abs(float(t[i]) - 1.0) < eps for i in range(3))

    def _committed_spot_mul(self, path_key: str) -> tuple[float, float, float]:
        return self._grade_wb_spot_mul.get(path_key, (1.0, 1.0, 1.0))

    def _clip_spot_mul_preview(self, path_key: str) -> tuple[float, float, float]:
        if path_key in self._preview_wb_spot_mul:
            base = self._preview_wb_spot_mul[path_key]
        else:
            base = self._committed_spot_mul(path_key)
        try:
            t = float(self._spot_strength_var.get()) / 100.0
        except (TclError, ValueError, TypeError):
            t = 1.0
        t = max(0.0, min(1.0, t))
        return tuple(1.0 + (float(base[i]) - 1.0) * t for i in range(3))

    def _tone_hi_wh_effective(self, path_key: str, *, preview: bool) -> tuple[int, int]:
        sup = self._merged_clip_grade_supplements(path_key)
        if preview:
            e = self._clip_strength_percent_preview(path_key)
            ck = self._clip_ct_k_preview(path_key)
            sm = list(self._clip_spot_mul_preview(path_key))
        else:
            e = self._committed_clip_strength(path_key)
            ck = self._committed_clip_ct_k(path_key)
            sm = list(self._committed_spot_mul(path_key))
        ng = normalize_clip_grade(
            {"exposure_pct": e, "ct_k": ck, "spot_mul": sm, "wb_pct": 0, **sup}
        )
        return int(ng["highlights_pct"]), int(ng["whites_pct"])

    def _tone_hue_effective(self, path_key: str, *, preview: bool) -> int:
        sup = self._merged_clip_grade_supplements(path_key)
        if preview:
            e = self._clip_strength_percent_preview(path_key)
            ck = self._clip_ct_k_preview(path_key)
            sm = list(self._clip_spot_mul_preview(path_key))
        else:
            e = self._committed_clip_strength(path_key)
            ck = self._committed_clip_ct_k(path_key)
            sm = list(self._committed_spot_mul(path_key))
        ng = normalize_clip_grade(
            {"exposure_pct": e, "ct_k": ck, "spot_mul": sm, "wb_pct": 0, **sup}
        )
        return int(ng["hue_pct"])

    def _merged_clip_grade_supplements(self, path_key: str) -> dict[str, object]:
        sup = dict(self._clip_grade_adjust.get(path_key, {}))
        pt = self._preview_tone.get(path_key)
        if pt:
            sup["highlights_pct"] = int(pt["highlights_pct"])
            sup["whites_pct"] = int(pt["whites_pct"])
            if "hue_pct" in pt:
                sup["hue_pct"] = int(pt["hue_pct"])
        return sup

    @staticmethod
    def _tone_grade_preset_from_job(raw: object) -> dict[str, object] | None:
        if not isinstance(raw, dict) or not raw:
            return None
        gr = raw.get("grade")
        if not isinstance(gr, dict):
            return None
        try:
            ss = int(raw.get("spot_strength_pct", 100))
        except (TypeError, ValueError):
            ss = 100
        ss = max(0, min(100, ss))
        return {"grade": dict(gr), "spot_strength_pct": ss}

    def _apply_tone_grade_preset_to_paths(
        self,
        paths: list[str],
        *,
        push_undo: bool,
    ) -> None:
        gdict = self._tone_grade_preset
        if not gdict or not paths:
            return
        gr = gdict.get("grade")
        if not isinstance(gr, dict):
            return
        g = normalize_clip_grade(gr)
        try:
            ss = int(gdict.get("spot_strength_pct", 100))
        except (TypeError, ValueError):
            ss = 100
        ss = max(0, min(100, ss))
        if push_undo:
            self._grade_push_undo()
        self._spot_strength_var.set(ss)
        sm_list = g.get("spot_mul")
        if not isinstance(sm_list, (list, tuple)) or len(sm_list) != 3:
            t3: tuple[float, float, float] = (1.0, 1.0, 1.0)
        else:
            try:
                t3 = (float(sm_list[0]), float(sm_list[1]), float(sm_list[2]))
            except (TypeError, ValueError):
                t3 = (1.0, 1.0, 1.0)
        for pk in paths:
            e = int(g["exposure_pct"])
            ck = int(g["ct_k"])
            self._preview_per_clip_strength[pk] = e
            self._grade_per_clip_strength[pk] = e
            self._preview_per_clip_ct_k[pk] = ck
            self._grade_per_clip_ct_k[pk] = ck
            if self._spot_mul_identity(t3):
                self._grade_wb_spot_mul.pop(pk, None)
                self._preview_wb_spot_mul.pop(pk, None)
            else:
                self._grade_wb_spot_mul[pk] = t3
                self._preview_wb_spot_mul[pk] = t3
            adj = {
                str(kk): g[kk]
                for kk in GRADE_WEB_EXTRA_KEYS
                if kk in g
            }
            if adj:
                self._clip_grade_adjust[pk] = adj
            else:
                self._clip_grade_adjust.pop(pk, None)
            self._preview_tone[pk] = {
                "highlights_pct": int(g["highlights_pct"]),
                "whites_pct": int(g["whites_pct"]),
                "hue_pct": int(g["hue_pct"]),
            }
        self._suppress_grade_apply_spin = True
        self._suppress_grade_apply_ct_spin = True
        self._suppress_grade_apply_tone_spin = True
        try:
            self._grade_apply_strength_var.set(int(g["exposure_pct"]))
            self._grade_apply_ct_k_var.set(int(g["ct_k"]))
            self._grade_apply_highlights_var.set(int(g["highlights_pct"]))
            self._grade_apply_whites_var.set(int(g["whites_pct"]))
            self._grade_apply_hue_var.set(int(g["hue_pct"]))
        finally:
            self._suppress_grade_apply_spin = False
            self._suppress_grade_apply_ct_spin = False
            self._suppress_grade_apply_tone_spin = False
        for wn, vget in (
            ("_grade_expo_scale", lambda: int(self._grade_apply_strength_var.get())),
            ("_grade_ct_scale", lambda: int(self._grade_apply_ct_k_var.get())),
            (
                "_grade_highlights_scale",
                lambda: int(self._grade_apply_highlights_var.get()),
            ),
            (
                "_grade_whites_scale",
                lambda: int(self._grade_apply_whites_var.get()),
            ),
            (
                "_grade_hue_scale",
                lambda: int(self._grade_apply_hue_var.get()),
            ),
        ):
            sc = getattr(self, wn, None)
            if sc is not None:
                try:
                    sc.set(vget())
                except (TclError, ValueError):
                    pass

    def _tone_preset_save(self) -> None:
        pk = self._apply_spin_reference_path()
        if not pk:
            messagebox.showinfo("톤 사전설정", "먼저 클립을 선택하세요.")
            return
        snap = self._try_build_montage_snapshot()
        if not snap:
            messagebox.showinfo("톤 사전설정", "먼저 영상을 지정하세요.")
            return
        keys_ok = {str(p.resolve()) for p in snap[0]}
        if pk not in keys_ok:
            messagebox.showinfo("톤 사전설정", "유효한 클립을 선택하세요.")
            return
        base: dict[str, object] = {
            "exposure_pct": self._clip_strength_percent_preview(pk),
            "wb_pct": 0,
            "ct_k": self._clip_ct_k_preview(pk),
            "spot_mul": list(self._clip_spot_mul_preview(pk)),
        }
        base.update(self._merged_clip_grade_supplements(pk))
        full = normalize_clip_grade(base)
        ser: dict[str, object] = {}
        for k, v in full.items():
            if isinstance(v, (list, tuple)):
                ser[k] = [float(x) for x in v]
            else:
                ser[k] = v
        self._tone_grade_preset = {
            "grade": ser,
            "spot_strength_pct": max(
                0, min(100, int(self._spot_strength_var.get()))
            ),
        }
        self._save_gui_settings()
        self._log_line(
            "톤 사전설정 저장: 노출·색온도·스포이드·하이라이트·화이트 등 현재 값."
        )
        messagebox.showinfo(
            "톤 사전설정",
            "현재 선택 클립 기준으로 설정을 저장했습니다.\n"
            "「설정 적용」으로 선택 클립에 넣거나, 새로 추가한 클립에 자동 반영됩니다.",
        )

    def _tone_preset_apply(self) -> None:
        if not self._tone_grade_preset:
            messagebox.showinfo(
                "톤 사전설정",
                "먼저 「사전설정 저장」으로 값을 저장하세요.",
            )
            return
        targets = self._resolve_grade_apply_targets()
        if not targets:
            return
        self._apply_tone_grade_preset_to_paths(targets, push_undo=True)
        self._tone_preset_seeded_paths.update(targets)
        self._sync_apply_slider_from_selection()
        self._refresh_pills_from_preview()
        self._write_clip_grade_preview_sidecar()
        self._render_large_preview_pillow()
        self._flush_grade_preview_refresh()
        self._log_line(f"톤 사전설정 적용: {len(targets)}개 클립.")

    def _maybe_seed_tone_preset_for_new_clips(self) -> None:
        """새 클립에 톤 사전설정을 자동 덮어쓰지 않음(배치가 완전히 바뀌면 `_reset_montage_to_fresh_defaults`)."""
        return

    def _clip_has_spot_wb(self, path_key: str) -> bool:
        return not self._spot_mul_identity(self._clip_spot_mul_preview(path_key))

    def _wb_spot_set_pick(self, active: bool) -> None:
        self._wb_spot_pick_active = bool(active)
        if self._wb_spot_btn is not None:
            self._wb_spot_btn.config(
                text=("스포이드 취소" if active else "흰색 스포이드")
            )
        lp = getattr(self, "_large_preview_label", None)
        if lp is not None:
            try:
                lp.config(cursor=("crosshair" if active else ""))
            except TclError:
                pass

    def _wb_spot_toggle_pick(self) -> None:
        self._wb_spot_set_pick(not self._wb_spot_pick_active)

    def _wb_spot_reset_focus_clip(self) -> None:
        targets = self._grade_live_apply_targets()
        if not targets:
            messagebox.showinfo("스포이드", "먼저 영상·클립을 지정하세요.")
            return
        self._grade_push_undo()
        for path in targets:
            self._grade_wb_spot_mul.pop(path, None)
            self._preview_wb_spot_mul.pop(path, None)
        self._wb_spot_set_pick(False)
        self._save_gui_settings()
        self._refresh_pills_from_preview()
        self._write_clip_grade_preview_sidecar()
        self._render_large_preview_pillow()
        if len(targets) == 1:
            self._log_line(f"스포이드 WB 초기화: {Path(targets[0]).name}")
        else:
            self._log_line(f"스포이드 WB 초기화: {len(targets)}개 클립")

    def _on_large_preview_b1(self, event) -> None:
        if getattr(self, "_large_preview_label", None) is None:
            return
        if not self._wb_spot_pick_active:
            return
        self._apply_wb_spot_from_click(event)

    def _apply_wb_spot_from_click(self, event) -> None:
        lp_lbl = getattr(self, "_large_preview_label", None)
        if lp_lbl is None:
            return
        path = self._large_preview_source_path or self._grade_focus_path
        if not path:
            messagebox.showinfo("스포이드", "먼저 영상·클립을 지정하세요.")
            return
        ph = self._large_preview_image
        if ph is None:
            return
        base = self._large_base_pil.get(path)
        if base is None:
            return
        lw = max(1, int(lp_lbl.winfo_width()))
        lh = max(1, int(lp_lbl.winfo_height()))
        pw, phh = int(ph.width()), int(ph.height())
        ox = (lw - pw) // 2
        oy = (lh - phh) // 2
        dx, dy = int(event.x) - ox, int(event.y) - oy
        if dx < 0 or dy < 0 or dx >= pw or dy >= phh:
            self._log_line("스포이드: 미리보기 이미지 안을 클릭하세요.")
            return
        targets = self._grade_live_apply_targets()
        if not targets:
            messagebox.showinfo("스포이드", "먼저 클립을 선택하세요.")
            return
        self._grade_push_undo()
        bw, bh = base.size
        ix, iy = cover_display_xy_to_base_xy(dx, dy, bw, bh, pw, phh)
        rgb = base.getpixel((ix, iy))
        r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
        rr, gg, bb = neutral_point_wb_multipliers(r, g, b)
        self._spot_strength_var.set(100)
        k_est = suggested_kelvin_from_rgb_sample(r, g, b)
        k_est = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, int(k_est)))
        t_est = suggested_tint_from_rgb_sample(r, g, b)
        for path in targets:
            self._preview_wb_spot_mul[path] = (rr, gg, bb)
            self._grade_wb_spot_mul[path] = (rr, gg, bb)
            self._preview_per_clip_ct_k[path] = k_est
            self._grade_per_clip_ct_k[path] = k_est
            adj = dict(self._clip_grade_adjust.get(path, {}))
            adj["tint_pct"] = int(t_est)
            self._clip_grade_adjust[path] = adj
        self._suppress_grade_apply_ct_spin = True
        self._grade_apply_ct_k_var.set(k_est)
        self._suppress_grade_apply_ct_spin = False
        self._save_gui_settings()
        self._refresh_pills_from_preview()
        self._write_clip_grade_preview_sidecar()
        self._render_large_preview_pillow()
        if len(targets) == 1:
            msg = (
                f"스포이드 ({Path(targets[0]).name}): R×{rr:.2f} G×{gg:.2f} B×{bb:.2f}, "
                f"색온도≈{k_est}K, 색조≈{t_est:+d}"
            )
        else:
            msg = (
                f"스포이드 {len(targets)}개 클립: R×{rr:.2f} G×{gg:.2f} B×{bb:.2f}, "
                f"색온도≈{k_est}K, 색조≈{t_est:+d}"
            )
        self._log_line(msg)

    def _resolve_grade_apply_targets(self) -> list[str] | None:
        """선택된 클립이 있으면 그 목록, 없으면 포커스 클립. 실패 시 None."""
        snap = self._try_build_montage_snapshot()
        if not snap:
            messagebox.showinfo("알림", "먼저 영상을 지정하세요.")
            return None
        keys_order = [str(p.resolve()) for p in snap[0]]
        keys_ok = set(keys_order)
        if self._grade_checked:
            targets = [k for k in keys_order if k in self._grade_checked]
            if not targets:
                messagebox.showinfo("알림", "적용할 클립을 선택하세요.")
                return None
            return targets
        if self._grade_focus_path and self._grade_focus_path in keys_ok:
            return [self._grade_focus_path]
        messagebox.showinfo(
            "알림",
            "웹에서 클립을 고른 뒤 저장하거나, 영상 목록을 지정한 뒤 「적용」을 누르세요.",
        )
        return None

    def _after_single_grade_apply(self, targets: list[str], *, used_checkbox: bool) -> None:
        if used_checkbox and targets:
            self._grade_focus_path = targets[0]
        self._grade_checked.clear()
        if self._grade_focus_path:
            self._grade_checked = {self._grade_focus_path}
            snap = self._try_build_montage_snapshot()
            if snap:
                keys = [str(p.resolve()) for p in snap[0]]
                if self._grade_focus_path in keys:
                    self._grade_shift_anchor_idx = keys.index(self._grade_focus_path)
        self._update_grade_selection_highlights()
        self._refresh_pills_from_preview()
        self._write_clip_grade_preview_sidecar()
        self._render_large_preview_pillow()
        self._sync_apply_slider_from_selection()

    def _on_confirm_exposure_preview(self) -> None:
        used_checkbox = bool(self._grade_checked)
        targets = self._resolve_grade_apply_targets()
        if not targets:
            return
        try:
            pct = int(self._apply_spin.get())
        except (ValueError, TclError):
            pct = 100
        pct = max(0, min(GRADE_EXPOSURE_PCT_MAX, pct))
        self._grade_apply_strength_var.set(pct)
        for fp in targets:
            self._preview_per_clip_strength[fp] = pct
        self._after_single_grade_apply(targets, used_checkbox=used_checkbox)

    def _on_confirm_ct_preview(self) -> None:
        used_checkbox = bool(self._grade_checked)
        targets = self._resolve_grade_apply_targets()
        if not targets:
            return
        try:
            ct_k = int(self._apply_ct_spin.get())
        except (ValueError, TclError):
            ct_k = int(MONTAGE_CT_NEUTRAL_K)
        ct_k = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, ct_k))
        self._grade_apply_ct_k_var.set(ct_k)
        for fp in targets:
            self._preview_per_clip_ct_k[fp] = ct_k
        self._after_single_grade_apply(targets, used_checkbox=used_checkbox)

    def _refresh_pills_from_preview(self) -> None:
        """그리드 유지한 채 % 뱃지만 미리보기 값으로 갱신."""
        for pk, lbl in self._grade_pill_labels.items():
            pctv = self._clip_strength_percent_preview(pk)
            bg = "#dde8ff" if pk == self._grade_focus_path else "#eee"
            lbl.config(text=f" E{pctv}% ", bg=bg, fg="#222")
        for pk, lbl in self._grade_ct_pill_labels.items():
            ctk = self._clip_ct_k_preview(pk)
            if abs(float(ctk) - MONTAGE_CT_NEUTRAL_K) < 0.6:
                t = f" {int(MONTAGE_CT_NEUTRAL_K)}K "
            else:
                t = f" {ctk}K "
            if self._clip_has_spot_wb(pk):
                t = t.strip() + "·S "
            bg = "#dbeafe" if pk == self._grade_focus_path else "#eff6ff"
            lbl.config(text=t, bg=bg, fg="#222")

    def _on_exposure_finalize(self) -> None:
        """미리보기에 맞춘 값을 저장·인코딩용으로 확정."""
        snap = self._try_build_montage_snapshot()
        if not snap:
            messagebox.showinfo("알림", "영상이 없어 저장할 클립이 없습니다.")
            return
        self._grade_push_undo()
        keys_order = [str(p.resolve()) for p in snap[0]]
        new_c = {k: self._clip_strength_percent_preview(k) for k in keys_order}
        new_wb = {k: 0 for k in keys_order}
        new_ct = {k: self._clip_ct_k_preview(k) for k in keys_order}
        new_spot = {k: self._clip_spot_mul_preview(k) for k in keys_order}
        self._grade_per_clip_strength = new_c
        self._preview_per_clip_strength = dict(new_c)
        self._grade_per_clip_wb = new_wb
        self._preview_per_clip_wb = dict(new_wb)
        self._grade_per_clip_ct_k = new_ct
        self._preview_per_clip_ct_k = dict(new_ct)
        self._grade_wb_spot_mul = {
            k: v for k, v in new_spot.items() if not self._spot_mul_identity(v)
        }
        self._preview_wb_spot_mul = dict(self._grade_wb_spot_mul)
        for k in keys_order:
            pt = self._preview_tone.pop(k, None)
            if not pt:
                continue
            cur = dict(self._clip_grade_adjust.get(k, {}))
            cur["highlights_pct"] = int(pt["highlights_pct"])
            cur["whites_pct"] = int(pt["whites_pct"])
            if "hue_pct" in pt:
                cur["hue_pct"] = int(pt["hue_pct"])
            self._clip_grade_adjust[k] = {
                str(kk): cur[kk] for kk in GRADE_WEB_EXTRA_KEYS if kk in cur
            }
        self.auto_exposure_strength_var.set(100)
        self.auto_wb_strength_var.set(0)
        self.auto_ct_kelvin_var.set(int(MONTAGE_CT_NEUTRAL_K))
        self._save_gui_settings()
        self._sync_apply_slider_from_selection()
        self._refresh_pills_from_preview()
        messagebox.showinfo(
            "최종완료",
            "클립별 값이 설정 JSON·clip_grade_preview에 확정 저장되었습니다.\n"
            "미리보기는 Pillow 근사치였으며, 「만들기」/대기열에서는 FFmpeg으로 원본 영상에 일괄 반영됩니다.",
        )

    def _grade_reset_all_clips_to_defaults(self) -> None:
        """모든 클립의 톤·노출 보정을 앱 기본값으로 되돌립니다(미리보기·클립별 덮어쓰기 초기화)."""
        snap = self._try_build_montage_snapshot()
        if not snap:
            messagebox.showinfo("알림", "영상이 없어 초기화할 클립이 없습니다.")
            return
        if not messagebox.askyesno(
            "전체초기화",
            "모든 클립의 노출·색온도·톤(하이라이트/화이트)·스포이드를 기본값으로 되돌립니다.\n"
            "저장된「톤 사전설정」템플릿은 지우지 않으며, 현재 클립에는 다시 자동으로 덮어쓰지 않습니다.\n\n"
            "실행 취소: Ctrl/⌘+Z",
        ):
            return
        self._grade_push_undo()
        keys_order = [str(p.resolve()) for p in snap[0]]
        self._grade_per_clip_strength.clear()
        self._preview_per_clip_strength.clear()
        self._grade_per_clip_wb.clear()
        self._preview_per_clip_wb.clear()
        self._grade_per_clip_ct_k.clear()
        self._preview_per_clip_ct_k.clear()
        self._grade_wb_spot_mul.clear()
        self._preview_wb_spot_mul.clear()
        self._clip_grade_adjust.clear()
        self._preview_tone.clear()
        self.auto_exposure_strength_var.set(100)
        self.auto_wb_strength_var.set(0)
        self.auto_ct_kelvin_var.set(int(MONTAGE_CT_NEUTRAL_K))
        self._spot_strength_var.set(100)
        self._grade_apply_strength_var.set(100)
        self._grade_apply_ct_k_var.set(int(MONTAGE_CT_NEUTRAL_K))
        self._grade_apply_highlights_var.set(0)
        self._grade_apply_whites_var.set(0)
        self._grade_apply_hue_var.set(0)
        self._tone_preset_seeded_paths = set(keys_order)
        self._montage_vids_cache = None
        self._montage_vids_cache_sig = None
        self._large_base_pil.clear()
        self._save_gui_settings()
        self._sync_apply_slider_from_selection()
        self._refresh_pills_from_preview()
        self._schedule_live_grade_preview()
        self._flush_grade_preview_refresh()
        self._schedule_large_preview_refresh()
        self._update_grade_selection_highlights()
        self._log_line("— 모든 클립 보정을 초기화했습니다. —")

    def _grade_reset_selected_clips_to_defaults(self) -> None:
        """체크·포커스로 고른 클립만 클립별 보정을 지웁니다(전역 슬라이더·다른 클립은 유지)."""
        targets = self._resolve_grade_apply_targets()
        if not targets:
            return
        n = len(targets)
        if not messagebox.askyesno(
            "선택 클립 초기화",
            f"선택된 클립 {n}개의 노출·색온도·톤(하이라이트/화이트)·스포이드(클립별)를 "
            f"지웁니다. 이후 해당 클립은 전역 기본값을 따릅니다.\n\n실행 취소: Ctrl/⌘+Z",
        ):
            return
        self._grade_push_undo()
        for k in targets:
            self._grade_per_clip_strength.pop(k, None)
            self._preview_per_clip_strength.pop(k, None)
            self._grade_per_clip_wb.pop(k, None)
            self._preview_per_clip_wb.pop(k, None)
            self._grade_per_clip_ct_k.pop(k, None)
            self._preview_per_clip_ct_k.pop(k, None)
            self._grade_wb_spot_mul.pop(k, None)
            self._preview_wb_spot_mul.pop(k, None)
            self._clip_grade_adjust.pop(k, None)
            self._preview_tone.pop(k, None)
            self._large_base_pil.pop(k, None)
        self._tone_preset_seeded_paths.update(targets)
        self._save_gui_settings()
        self._sync_apply_slider_from_selection()
        self._refresh_pills_from_preview()
        self._write_clip_grade_preview_sidecar()
        self._schedule_live_grade_preview()
        self._flush_grade_preview_refresh()
        self._schedule_large_preview_refresh()
        self._update_grade_selection_highlights()
        self._log_line(f"— 선택 클립 {n}개 보정을 초기화했습니다. —")

    def _preview_differs_from_committed(self) -> bool:
        snap = self._try_build_montage_snapshot()
        if not snap:
            return False
        for k in (str(p.resolve()) for p in snap[0]):
            if self._clip_strength_percent_preview(k) != self._committed_clip_strength(k):
                return True
            if self._clip_wb_percent_preview(k) != self._committed_clip_wb(k):
                return True
            if self._clip_ct_k_preview(k) != self._committed_clip_ct_k(k):
                return True
            a = self._clip_spot_mul_preview(k)
            b = self._committed_spot_mul(k)
            if not (
                abs(a[0] - b[0]) <= 0.012
                and abs(a[1] - b[1]) <= 0.012
                and abs(a[2] - b[2]) <= 0.012
            ):
                return True
            if self._tone_hi_wh_effective(k, preview=True) != self._tone_hi_wh_effective(
                k, preview=False
            ):
                return True
            if self._tone_hue_effective(k, preview=True) != self._tone_hue_effective(
                k, preview=False
            ):
                return True
        return False

    def _sync_apply_slider_from_selection(self) -> None:
        if not hasattr(self, "_apply_spin"):
            return
        self._suppress_grade_apply_spin = True
        self._suppress_grade_apply_ct_spin = True
        self._suppress_grade_apply_tone_spin = True
        try:
            if self._grade_checked:
                lp = self._large_preview_source_path
                if lp and lp in self._grade_checked:
                    first = lp
                else:
                    first = next(iter(sorted(self._grade_checked)))
                pct = self._clip_strength_percent_preview(first)
                self._grade_apply_strength_var.set(pct)
                self._grade_apply_ct_k_var.set(self._clip_ct_k_preview(first))
                h0, w0 = self._tone_hi_wh_effective(first, preview=True)
                self._grade_apply_highlights_var.set(h0)
                self._grade_apply_whites_var.set(w0)
                self._grade_apply_hue_var.set(self._tone_hue_effective(first, preview=True))
                self._apply_disabled_lbl.grid_remove()
                self._apply_spin.grid(row=0, column=0, padx=(0, 6))
                self._apply_pct_suffix.grid(row=0, column=1)
                self._apply_ct_disabled_lbl.grid_remove()
                self._apply_ct_spin.grid(row=0, column=0, padx=(0, 6))
                self._apply_ct_k_suffix.grid(row=0, column=1)
                return
            if self._grade_focus_path:
                pct = self._clip_strength_percent_preview(self._grade_focus_path)
                self._grade_apply_strength_var.set(pct)
                self._grade_apply_ct_k_var.set(
                    self._clip_ct_k_preview(self._grade_focus_path)
                )
                h0, w0 = self._tone_hi_wh_effective(
                    self._grade_focus_path, preview=True
                )
                self._grade_apply_highlights_var.set(h0)
                self._grade_apply_whites_var.set(w0)
                self._grade_apply_hue_var.set(
                    self._tone_hue_effective(self._grade_focus_path, preview=True)
                )
                self._apply_disabled_lbl.grid_remove()
                self._apply_spin.grid(row=0, column=0, padx=(0, 6))
                self._apply_pct_suffix.grid(row=0, column=1)
                self._apply_ct_disabled_lbl.grid_remove()
                self._apply_ct_spin.grid(row=0, column=0, padx=(0, 6))
                self._apply_ct_k_suffix.grid(row=0, column=1)
                return
            self._apply_spin.grid_remove()
            self._apply_pct_suffix.grid_remove()
            self._apply_disabled_lbl.grid(row=0, column=0, sticky=W)
            self._apply_ct_spin.grid_remove()
            self._apply_ct_k_suffix.grid_remove()
            self._apply_ct_disabled_lbl.grid(row=0, column=0, sticky=W)
        finally:
            self._suppress_grade_apply_spin = False
            self._suppress_grade_apply_ct_spin = False
            self._suppress_grade_apply_tone_spin = False
            for wn, vget in (
                ("_grade_expo_scale", lambda: int(self._grade_apply_strength_var.get())),
                ("_grade_ct_scale", lambda: int(self._grade_apply_ct_k_var.get())),
                (
                    "_grade_highlights_scale",
                    lambda: int(self._grade_apply_highlights_var.get()),
                ),
                (
                    "_grade_whites_scale",
                    lambda: int(self._grade_apply_whites_var.get()),
                ),
                (
                    "_grade_hue_scale",
                    lambda: int(self._grade_apply_hue_var.get()),
                ),
            ):
                sc = getattr(self, wn, None)
                if sc is not None:
                    try:
                        sc.set(vget())
                    except (TclError, ValueError):
                        pass

    def _apply_spin_reference_path(self) -> str | None:
        if self._grade_checked:
            lp = self._large_preview_source_path
            if lp and lp in self._grade_checked:
                return lp
            return next(iter(sorted(self._grade_checked)))
        return self._grade_focus_path

    def _clamp_apply_strength_spin(self, _e=None) -> None:
        if self._suppress_grade_apply_spin:
            return
        try:
            pct = int(self._apply_spin.get())
        except (ValueError, TclError):
            pk = self._apply_spin_reference_path()
            pct = self._clip_strength_percent_preview(pk) if pk else 100
        self._grade_apply_strength_var.set(
            max(0, min(GRADE_EXPOSURE_PCT_MAX, pct))
        )

    def _clamp_apply_ct_spin(self, _e=None) -> None:
        if self._suppress_grade_apply_ct_spin:
            return
        try:
            k = int(self._apply_ct_spin.get())
        except (ValueError, TclError):
            pk = self._apply_spin_reference_path()
            k = (
                self._clip_ct_k_preview(pk)
                if pk
                else int(MONTAGE_CT_NEUTRAL_K)
            )
        k = max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, k))
        self._grade_apply_ct_k_var.set(k)

    def _set_grade_focus(self, path_key: str | None) -> None:
        self._grade_focus_path = path_key
        if path_key:
            self._large_preview_source_path = path_key
        self._sync_apply_slider_from_selection()
        self._refresh_pills_from_preview()
        self._schedule_large_preview_refresh()

    def _video_files_mode(self) -> bool:
        return len(self.video_files) > 0

    def _folder_mode_message(self) -> None:
        messagebox.showinfo(
            "알림",
            "이 작업은「영상 파일 목록」모드에서만 사용할 수 있습니다.\n"
            "「파일 추가…」로 클립을 지정하세요.",
        )

    def _grade_select_all(self) -> None:
        if not self._video_files_mode():
            self._folder_mode_message()
            return
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        vids, _ = snap
        keys = [str(p.resolve()) for p in vids]
        self._grade_checked = set(keys)
        self._grade_shift_anchor_idx = 0
        if keys:
            if self._grade_focus_path not in self._grade_checked:
                self._grade_focus_path = keys[0]
            self._large_preview_source_path = self._grade_focus_path
        self._update_grade_selection_highlights()
        self._sync_apply_slider_from_selection()

    def _grade_select_none(self) -> None:
        if not self._video_files_mode():
            self._folder_mode_message()
            return
        self._grade_checked.clear()
        self._grade_focus_path = None
        self._large_preview_source_path = None
        self._grade_shift_anchor_idx = None
        self._update_grade_selection_highlights()
        self._sync_apply_slider_from_selection()

    def _grade_delete_checked(self) -> None:
        if not self._video_files_mode():
            self._folder_mode_message()
            return
        if not self._grade_checked:
            messagebox.showinfo("알림", "삭제할 클립을 선택하세요.")
            return
        self._grade_push_undo()
        to_remove = set(self._grade_checked)
        self._grade_delete_paths(to_remove)

    def _toggle_thumb_pick_mode(self) -> None:
        if not self._video_files_mode():
            self._folder_mode_message()
            return
        self._thumb_pick_mode = not self._thumb_pick_mode
        btn = getattr(self, "_grade_thumb_pick_btn", None)
        if btn is not None:
            try:
                btn.config(text="선택 끝" if self._thumb_pick_mode else "선택하기")
            except TclError:
                pass
        self._rebuild_grade_grid()

    def _on_thumb_checkbox_toggle(self, path_key: str) -> None:
        var = self._grade_thumb_check_vars.get(path_key)
        if var is None:
            return
        if var.get():
            self._grade_checked.add(path_key)
        else:
            self._grade_checked.discard(path_key)
        self._grade_shift_anchor_idx = self._grade_path_to_row.get(path_key)
        self._grade_focus_path = path_key
        self._large_preview_source_path = path_key
        self._update_grade_selection_highlights()
        self._sync_apply_slider_from_selection()
        self._schedule_large_preview_refresh()
        self._refresh_pills_from_preview()

    def _grade_delete_checked_confirmed(self) -> None:
        if not self._video_files_mode():
            self._folder_mode_message()
            return
        if not self._grade_checked:
            messagebox.showinfo(
                "알림",
                "삭제할 클립이 없습니다.\n"
                "「선택하기」를 켠 뒤 썸네일 체크를 켜거나, 클립을 클릭·Ctrl로 선택하세요.",
            )
            return
        n = len(self._grade_checked)
        if not messagebox.askyesno(
            "클립 삭제",
            f"선택·체크된 클립 {n}개를 목록에서 제거할까요?\n(실행 취소: Ctrl/⌘+Z)",
        ):
            return
        self._grade_push_undo()
        self._grade_delete_paths(set(self._grade_checked))

    def _grade_row_for_widget(self, w) -> int | None:
        path = getattr(w, "_grade_path_key", None)
        if path:
            return self._grade_path_to_row.get(path)
        cur = w
        for _ in range(20):
            path = getattr(cur, "_grade_path_key", None)
            if path:
                return self._grade_path_to_row.get(path)
            cur = getattr(cur, "master", None)
            if cur is None:
                break
        return None

    def _grade_canvas_release(self, e) -> None:
        drag = self._grade_drag_start
        self._grade_drag_start = None
        if drag is None:
            return
        x0, y0, path_key = drag
        if not path_key:
            return
        dist = abs(e.x_root - x0) + abs(e.y_root - y0)
        if dist < 8:
            shift = (e.state & 0x0001) != 0
            control = (e.state & 0x0004) != 0
            self._grade_thumb_click_select(path_key, shift, control)
            return
        if not self._video_files_mode():
            self._set_grade_focus(path_key)
            return
        row = self._grade_row_for_widget(e.widget)
        if row is None:
            tgt = self._grade_row_at_pointer(e.x_root, e.y_root)
            if tgt is not None:
                src = self._grade_path_to_row.get(path_key)
                if src is not None and src != tgt:
                    self._move_video_item(src, tgt)
            return
        src = self._grade_path_to_row.get(path_key)
        if src is not None and row != src:
            self._move_video_item(src, row)

    def _grade_row_at_pointer(self, x_root: int, y_root: int) -> int | None:
        for path, row in self._grade_path_to_row.items():
            fr = self._grade_row_frames.get(path)
            if fr is None:
                continue
            try:
                x1, y1 = fr.winfo_rootx(), fr.winfo_rooty()
                x2, y2 = x1 + fr.winfo_width(), y1 + fr.winfo_height()
            except TclError:
                continue
            if x1 <= x_root < x2 and y1 <= y_root < y2:
                return row
        return None

    def _grade_card_press(self, path_key: str, e) -> None:
        self._grade_drag_start = (float(e.x_root), float(e.y_root), path_key)

    def _grade_thumb_click_select(self, path_key: str, shift: bool, control: bool) -> None:
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        keys = [str(p.resolve()) for p in snap[0]]
        if path_key not in keys:
            return
        idx = keys.index(path_key)
        if shift and control:
            if self._grade_shift_anchor_idx is None:
                self._grade_shift_anchor_idx = idx
            a = self._grade_shift_anchor_idx
            lo, hi = sorted((a, idx))
            self._grade_checked |= set(keys[lo : hi + 1])
        elif shift:
            if self._grade_shift_anchor_idx is None:
                self._grade_shift_anchor_idx = idx
            a = self._grade_shift_anchor_idx
            lo, hi = sorted((a, idx))
            self._grade_checked = set(keys[lo : hi + 1])
        elif control:
            nxt = set(self._grade_checked)
            if path_key in nxt:
                nxt.discard(path_key)
                if not nxt:
                    nxt = {path_key}
            else:
                nxt.add(path_key)
            self._grade_checked = nxt
            self._grade_shift_anchor_idx = idx
        else:
            self._grade_shift_anchor_idx = idx
            self._grade_checked = {path_key}
        self._grade_focus_path = path_key
        self._large_preview_source_path = path_key
        self._update_grade_selection_highlights()
        self._sync_apply_slider_from_selection()
        self._schedule_large_preview_refresh()
        self._refresh_pills_from_preview()

    def _apply_thumb_pick_mode_triplet_highlights(self) -> None:
        """체크 안 된 클립만 순서대로 세어 3컷 묶음별 테두리 색(위·중간·아래). 체크=삭제 예정은 회색."""
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        keys_in_order = [str(p.resolve()) for p in snap[0]]
        keep_i = 0
        n_colors = len(THUMB_PICK_TRIPLET_BORDER_COLORS)
        for pk in keys_in_order:
            fr = self._grade_row_frames.get(pk)
            trip = self._grade_triplet_labels.get(pk)
            if pk in self._grade_checked:
                try:
                    if fr is not None:
                        fr.config(
                            highlightbackground="#64748b",
                            highlightthickness=3,
                            highlightcolor="#64748b",
                        )
                    if trip is not None:
                        trip.config(text="삭제 예정", fg="#94a3b8")
                except TclError:
                    pass
                continue
            g = keep_i // 3
            pos = keep_i % 3
            color = THUMB_PICK_TRIPLET_BORDER_COLORS[g % n_colors]
            try:
                if fr is not None:
                    fr.config(
                        highlightbackground=color,
                        highlightthickness=4,
                        highlightcolor=color,
                    )
                if trip is not None:
                    trip.config(
                        text=f"{g + 1}묶음·{THUMB_PICK_TRIPLET_POS[pos]}",
                        fg=color,
                    )
            except TclError:
                pass
            keep_i += 1

    def _update_grade_selection_highlights(self) -> None:
        if getattr(self, "_thumb_pick_mode", False) and self._video_files_mode():
            for pk, var in getattr(self, "_grade_thumb_check_vars", {}).items():
                try:
                    want = pk in self._grade_checked
                    if bool(var.get()) != want:
                        var.set(want)
                except TclError:
                    pass
            self._apply_thumb_pick_mode_triplet_highlights()
            return
        for pk, fr in getattr(self, "_grade_row_frames", {}).items():
            sel = pk in self._grade_checked
            try:
                fr.config(
                    highlightbackground="#2563eb" if sel else "#e5e7eb",
                    highlightthickness=3 if sel else 0,
                    highlightcolor="#2563eb",
                )
            except TclError:
                pass
        for pk, var in getattr(self, "_grade_thumb_check_vars", {}).items():
            try:
                want = pk in self._grade_checked
                if bool(var.get()) != want:
                    var.set(want)
            except TclError:
                pass

    def _montage_snapshot_input_sig(self) -> tuple[tuple[str, ...], str]:
        return (tuple(self.video_files), self.videos_dir_var.get().strip())

    def _try_build_montage_snapshot(
        self,
    ) -> tuple[list[Path], dict[str, float]] | None:
        """resolve_videos + drop_videos_too_short, per-clip strength dict (0~1)."""
        sig = self._montage_snapshot_input_sig()
        if self._montage_vids_cache is not None and self._montage_vids_cache_sig == sig:
            vids = self._montage_vids_cache
        else:
            try:
                vd = self.videos_dir_var.get().strip() or None
                vdir = Path(vd).resolve() if vd else None
                vfs = [Path(p) for p in self.video_files] if self.video_files else None
                raw = resolve_videos(vdir, vfs)
            except (OSError, ValueError):
                return None

            def _lg(_s: str) -> None:
                pass

            vids = drop_videos_too_short(raw, log=_lg)
            self._montage_vids_cache = vids
            self._montage_vids_cache_sig = sig
        if not vids:
            return None
        by_clip: dict[str, float] = {}
        for p in vids:
            k = str(p.resolve())
            pct = self._committed_clip_strength(k)
            by_clip[k] = clamp_auto_exposure_strength(
                pct / float(GRADE_EXPOSURE_PCT_MAX)
            )
        return vids, by_clip

    def _effective_trim_avail(self, vp: Path) -> tuple[float, float]:
        want = max(0.0, float(self.clip_trim_var.get()))
        try:
            vdur = ffprobe_duration(vp)
        except (OSError, ValueError, RuntimeError):
            vdur = 10.0
        trim_eff = want
        if trim_eff > 1e-6:
            if vdur <= trim_eff + 0.06:
                trim_eff = max(0.0, vdur - 0.08)
            avail = max(0.0, vdur - trim_eff)
        else:
            avail = vdur
        return trim_eff, avail

    @staticmethod
    def _pil_resample():
        try:
            return Image.Resampling.LANCZOS
        except AttributeError:
            return Image.LANCZOS  # type: ignore[attr-defined]

    def _enqueue_mid_frame_extracts_for_snapshot(self) -> None:
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        for p in snap[0]:
            self._extract_q.put(("extract", str(p.resolve())))

    def _start_extract_workers(self) -> None:
        def loop() -> None:
            while True:
                item = self._extract_q.get()
                if not item or item[0] == "stop":
                    break
                if item[0] != "extract":
                    continue
                pk = str(item[1])
                vp = Path(pk)
                dest = cache_jpg_path_for_video(vp, self._preview_cache_dir)
                ok = False
                try:
                    if dest.is_file() and dest.stat().st_size > 80:
                        ok = True
                    elif vp.is_file():
                        ok = extract_mid_frame_jpg(vp, dest)
                except OSError:
                    ok = False
                self._post_ui(lambda p=pk, o=ok: self._on_mid_frame_extract_done(p, o))

        threading.Thread(target=loop, daemon=True).start()

    def _on_mid_frame_extract_done(self, path_key: str, ok: bool) -> None:
        self._large_base_pil.pop(path_key, None)
        if path_key in self._grade_thumb_labels:
            jpg = cache_jpg_path_for_video(Path(path_key), self._preview_cache_dir)
            self._apply_thumb_jpg(path_key, jpg)
        lp = self._large_preview_source_path or self._grade_focus_path
        if ok and lp == path_key:
            self._render_large_preview_pillow()

    def _schedule_large_preview_refresh(self) -> None:
        self.root.after_idle(self._flush_large_preview)

    def _large_preview_scale_bounds(self) -> tuple[int, int]:
        fr = getattr(self, "_large_preview_frame", None)
        if fr is None:
            return _LARGE_PREVIEW_FALLBACK_W, GRADE_PREVIEW_HEIGHT
        fr.update_idletasks()
        w = fr.winfo_width()
        h = fr.winfo_height()
        cap_w = int(getattr(self, "_large_preview_cell_w", 0) or 0)
        if cap_w >= 280:
            w = min(w, cap_w) if w >= 32 else cap_w
        if w < 32:
            try:
                w = max(320, int(self.root.winfo_width()) - 48)
            except TclError:
                w = _LARGE_PREVIEW_FALLBACK_W
            if cap_w >= 280:
                w = min(w, cap_w)
        if h < 32:
            h = GRADE_PREVIEW_HEIGHT
        h = min(h, GRADE_PREVIEW_HEIGHT + 8)
        return w, h

    def _flush_large_preview(self) -> None:
        self._render_large_preview_pillow()

    def _schedule_live_grade_preview(self) -> None:
        if (
            self._suppress_grade_apply_spin
            or self._suppress_grade_apply_ct_spin
            or self._suppress_grade_apply_tone_spin
        ):
            return
        if self._live_grade_after is not None:
            try:
                self.root.after_cancel(self._live_grade_after)
            except TclError:
                pass
        self._live_grade_after = self.root.after(
            LIVE_GRADE_DEBOUNCE_MS, self._live_grade_preview_fire
        )

    def _live_grade_preview_fire(self) -> None:
        self._live_grade_after = None
        self._render_large_preview_pillow()

    def _render_large_preview_pillow(self) -> None:
        lp_lbl = getattr(self, "_large_preview_label", None)
        if lp_lbl is None:
            return
        path = self._large_preview_source_path or self._grade_focus_path
        if not path:
            mw, _mh = self._large_preview_scale_bounds()
            lp_lbl.config(
                image="",
                text="영상을 지정하면 첫 클립이 여기에 크게 표시됩니다. 다른 클립을 클릭하면 바뀝니다.",
                fg="#94a3b8",
                wraplength=max(200, mw - 24),
            )
            self._large_preview_image = None
            return
        vp = Path(path)
        if not vp.is_file():
            return
        jpg = cache_jpg_path_for_video(vp, self._preview_cache_dir)
        if not jpg.is_file():
            mw, _ = self._large_preview_scale_bounds()
            lp_lbl.config(
                image="",
                text="중간 프레임 JPG 추출 중… (잠시만 기다리세요)",
                fg="#94a3b8",
                wraplength=max(200, mw - 24),
            )
            self._large_preview_image = None
            return
        try:
            if path not in self._large_base_pil:
                im0 = Image.open(jpg).convert("RGB")
                im0.thumbnail((LARGE_PREVIEW_PIL_MAX, LARGE_PREVIEW_PIL_MAX), self._pil_resample())
                self._large_base_pil[path] = im0.copy()
            base = self._large_base_pil[path]
            e = int(self._clip_strength_percent_preview(path))
            ck = int(self._clip_ct_k_preview(path))
            sp = self._clip_spot_mul_preview(path)
            merged: dict[str, object] = {
                "exposure_pct": max(0, min(GRADE_EXPOSURE_PCT_MAX, e)),
                "wb_pct": 0,
                "ct_k": max(MONTAGE_CT_K_MIN, min(MONTAGE_CT_K_MAX, ck)),
                "spot_mul": [float(sp[0]), float(sp[1]), float(sp[2])],
            }
            merged.update(self._clip_grade_adjust.get(path, {}))
            pt = self._preview_tone.get(path)
            if pt:
                merged["highlights_pct"] = int(pt["highlights_pct"])
                merged["whites_pct"] = int(pt["whites_pct"])
                if "hue_pct" in pt:
                    merged["hue_pct"] = int(pt["hue_pct"])
            gnorm = normalize_clip_grade(merged)
            out = apply_clip_grade_pil(
                base,
                gnorm,
                neutral_k=float(MONTAGE_CT_NEUTRAL_K),
            )
            mw, mh = self._large_preview_scale_bounds()
            out = pil_cover_resize(out, mw, mh)
            ph = ImageTk.PhotoImage(out, master=self.root)
            self._large_preview_image = ph
            lp_lbl.config(image=ph, text="", wraplength=0)
        except OSError:
            mw, _ = self._large_preview_scale_bounds()
            lp_lbl.config(
                image="",
                text=f"미리보기 로드 실패: {vp.name}",
                fg="#c66",
                wraplength=max(200, mw - 24),
            )
            self._large_preview_image = None

    def _start_thumb_workers(self) -> None:
        def loop() -> None:
            while True:
                item = self._thumb_work_q.get()
                if not item or item[0] == "stop":
                    break
                if item[0] != "thumb":
                    continue
                path_key = item[1]
                self._run_thumb_job(path_key)

        for _ in range(THUMB_WORKER_COUNT):
            threading.Thread(target=loop, daemon=True).start()

    def _run_thumb_job(self, path_key: str) -> None:
        vp = Path(path_key)
        jpg = cache_jpg_path_for_video(vp, self._preview_cache_dir)
        self._post_ui(lambda pk=path_key, jp=jpg: self._apply_thumb_jpg(pk, jp))

    def _apply_thumb_jpg(self, path_key: str, jpg_path: Path) -> None:
        lbl = self._grade_thumb_labels.get(path_key)
        if lbl is None:
            return
        if not jpg_path.is_file():
            lbl.config(image="", text="추출\n대기…")
            return
        try:
            im = Image.open(jpg_path).convert("RGB")
            im.thumbnail((GRADE_THUMB_MAX, GRADE_THUMB_MAX), self._pil_resample())
            ph = ImageTk.PhotoImage(im, master=self.root)
            self._grade_thumb_images[path_key] = ph
            lbl.config(image=ph, text="")
        except OSError:
            lbl.config(image="", text="썸네일\n실패")

    def _flush_grade_preview_refresh(self, full_grade: bool = False) -> None:
        """스냅샷 기준 썸네일(JPG) 큐. 연속 호출은 짧게 합침."""
        del full_grade  # 호환용 인자(더 이상 사용 안 함)
        if self._thumb_flush_after is not None:
            try:
                self.root.after_cancel(self._thumb_flush_after)
            except TclError:
                pass
        self._thumb_flush_after = self.root.after(
            THUMB_FLUSH_DEBOUNCE_MS, self._run_debounced_thumb_flush
        )

    def _run_debounced_thumb_flush(self) -> None:
        self._thumb_flush_after = None
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        for p in snap[0]:
            self._thumb_work_q.put(("thumb", str(p.resolve())))

    def _rebuild_grade_grid(self, *, thumb_full_grade: bool = False) -> None:
        self._grade_row_frames = {}
        self._grade_path_to_row = {}
        self._grade_thumb_labels = {}
        self._grade_pill_labels = {}
        self._grade_ct_pill_labels = {}
        self._grade_thumb_check_vars = {}
        self._grade_triplet_labels = {}
        inner = getattr(self, "_grade_inner", None)
        if inner is not None:
            for w in inner.winfo_children():
                w.destroy()
        snap = self._try_build_montage_snapshot()
        gh = getattr(self, "_grade_hint", None)
        if gh is not None:
            gh.config(
                text=(
                    (
                        "파일 목록: 「선택하기」— 체크=삭제 예정. 체크 안 된 클립만 순서대로 3개씩 한 묶음(위·중간·아래)으로 색 테두리가 표시됩니다. "
                        "「체크 삭제」로 한꺼번에 제거. 클릭·Shift·Ctrl·드래그 순서 / # 더블클릭=순서."
                        if getattr(self, "_thumb_pick_mode", False)
                        else "파일 목록: 왼쪽 썸네일은 가로 5열. 클릭·Shift 범위·Ctrl 토글(떨어진 클립)·드래그 순서 / # 더블클릭=순서 입력. "
                        "큰 미리보기=마지막 클릭 클립."
                    )
                    if self._video_files_mode()
                    else "폴더 모드: 순서·다중 선택은「파일 여러 개」모드에서만 됩니다."
                )
            )
        if inner is None:
            if not snap:
                self._grade_focus_path = None
                self._large_preview_source_path = None
            else:
                vids0, _ = snap
                keys_in_order = [str(v.resolve()) for v in vids0]
                self._grade_checked = {k for k in self._grade_checked if k in keys_in_order}
                if not self._grade_checked:
                    self._grade_checked = {keys_in_order[0]}
                if not self._grade_focus_path or self._grade_focus_path not in keys_in_order:
                    self._grade_focus_path = keys_in_order[0]
                if (
                    not self._large_preview_source_path
                    or self._large_preview_source_path not in keys_in_order
                ):
                    self._large_preview_source_path = self._grade_focus_path
            self._maybe_seed_tone_preset_for_new_clips()
            self._sync_apply_slider_from_selection()
            self._flush_grade_preview_refresh(full_grade=thumb_full_grade)
            self._schedule_large_preview_refresh()
            self._update_grade_selection_highlights()
            return
        if not snap:
            self._grade_focus_path = None
            self._large_preview_source_path = None
            Label(
                inner,
                text="영상을 지정하면 그리드가 표시됩니다.",
                fg="#666",
            ).pack(pady=20)
            self._schedule_large_preview_refresh()
            self._sync_apply_slider_from_selection()
            return
        vids, _ = snap
        keys_in_order = [str(v.resolve()) for v in vids]
        self._grade_checked = {k for k in self._grade_checked if k in keys_in_order}
        if not self._grade_checked:
            self._grade_checked = {keys_in_order[0]}
        if not self._grade_focus_path or self._grade_focus_path not in keys_in_order:
            self._grade_focus_path = keys_in_order[0]
        if (
            not self._large_preview_source_path
            or self._large_preview_source_path not in keys_in_order
        ):
            self._large_preview_source_path = self._grade_focus_path
        cols = GRADE_THUMB_GRID_COLS
        n_vid = len(vids)
        num_cols = cols
        for idx, vp in enumerate(vids):
            row = idx // cols
            col = idx % cols
            path_key = str(vp.resolve())
            fr = Frame(inner, bd=1, relief="groove", padx=3, pady=3)
            fr.grid(row=row, column=col, padx=3, pady=3, sticky=N + W + E)
            self._grade_row_frames[path_key] = fr
            self._grade_path_to_row[path_key] = idx
            top_r = Frame(fr)
            top_r.pack(fill=X)
            if getattr(self, "_thumb_pick_mode", False):
                cv = BooleanVar(master=self.root, value=path_key in self._grade_checked)
                self._grade_thumb_check_vars[path_key] = cv
                ttk.Checkbutton(
                    top_r,
                    variable=cv,
                    command=lambda pk=path_key: self._on_thumb_checkbox_toggle(pk),
                ).pack(side=LEFT, padx=(0, 2))
            num_lbl = Label(
                top_r,
                text=f"#{idx + 1}",
                width=4,
                cursor="hand2",
                fg="#1d4ed8",
            )
            num_lbl.pack(side=LEFT)
            if getattr(self, "_thumb_pick_mode", False):
                trip_lbl = Label(
                    top_r,
                    text="",
                    font=("", 8),
                    fg="#64748b",
                    anchor=W,
                )
                trip_lbl.pack(side=LEFT, padx=(4, 0))
                self._grade_triplet_labels[path_key] = trip_lbl
            num_lbl.bind(
                "<Double-Button-1>",
                lambda e, pk=path_key, r=idx: self._prompt_move_clip_to_position(pk, r),
            )
            num_lbl._grade_path_key = path_key  # type: ignore[attr-defined]
            num_lbl.bind(
                "<ButtonPress-1>",
                lambda e, pk=path_key: self._grade_card_press(pk, e),
            )
            num_lbl.bind("<ButtonRelease-1>", lambda e: self._grade_canvas_release(e))
            thumb_h = max(128, int(GRADE_THUMB_MAX * 9 / 16) + 28)
            th_fr = Frame(fr, bg="#dde1e8", width=GRADE_THUMB_MAX + 28, height=thumb_h)
            th_fr.pack(pady=(4, 2))
            th_fr.pack_propagate(False)
            thumb = Label(th_fr, text="로딩…", bg="#dde1e8", fg="#475569")
            thumb.place(relx=0.5, rely=0.5, anchor=CENTER)
            th_fr._grade_path_key = path_key  # type: ignore[attr-defined]
            thumb._grade_path_key = path_key  # type: ignore[attr-defined]
            fr._grade_path_key = path_key  # type: ignore[attr-defined]
            top_r._grade_path_key = path_key  # type: ignore[attr-defined]
            for w in (thumb, th_fr):
                w.bind(
                    "<ButtonPress-1>",
                    lambda e, pk=path_key: self._grade_card_press(pk, e),
                )
                w.bind("<ButtonRelease-1>", lambda e: self._grade_canvas_release(e))
            self._grade_thumb_labels[path_key] = thumb
            Label(
                fr,
                text=Path(path_key).name[:22],
                wraplength=max(56, GRADE_THUMB_MAX + 24),
            ).pack()
        self._update_grade_selection_highlights()
        cell_tw = GRADE_THUMB_MAX + 36
        strip_w = min(
            GRADE_THUMB_STRIP_MAX_W,
            max(GRADE_THUMB_STRIP_MIN_W, num_cols * cell_tw + 20),
        )
        lf = getattr(self, "_grade_left_column", None)
        if lf is not None:
            try:
                lf.config(width=int(strip_w + 18))
            except TclError:
                pass
        if self._grade_canvas is not None:
            try:
                self._grade_canvas.config(width=int(strip_w))
            except TclError:
                pass
        for c in range(num_cols):
            inner.grid_columnconfigure(c, weight=1)
        self._maybe_seed_tone_preset_for_new_clips()
        self._sync_apply_slider_from_selection()
        self._flush_grade_preview_refresh(full_grade=thumb_full_grade)
        self._schedule_large_preview_refresh()

    def _move_video_item(self, from_row: int, to_row: int) -> None:
        """그리드 행(스냅샷 순서) 기준으로 video_files 내 몽타주 클립 블록만 재정렬."""
        if not self._video_files_mode():
            return
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        vids, _ = snap
        n = len(vids)
        if from_row < 0 or to_row < 0 or from_row >= n or to_row >= n or from_row == to_row:
            return
        montage_keys = [str(v.resolve()) for v in vids]
        key_set = set(montage_keys)
        p_for_key: dict[str, str] = {}
        for p in self.video_files:
            k = str(Path(p).resolve())
            if k in key_set and k not in p_for_key:
                p_for_key[k] = p
        ordered_sub = [p_for_key[k] for k in montage_keys if k in p_for_key]
        if len(ordered_sub) != len(montage_keys):
            return
        item = ordered_sub.pop(from_row)
        ordered_sub.insert(to_row, item)
        new_files: list[str] = []
        inserted = False
        for p in self.video_files:
            k = str(Path(p).resolve())
            if k in key_set:
                if not inserted:
                    new_files.extend(ordered_sub)
                    inserted = True
                continue
            new_files.append(p)
        if not inserted:
            new_files = ordered_sub + new_files
        self.video_files = new_files
        self._save_gui_settings()
        order_keys = [str(Path(p).resolve()) for p in self.video_files]
        rank = {k: i for i, k in enumerate(order_keys)}
        self._grade_per_clip_strength = dict(
            sorted(self._grade_per_clip_strength.items(), key=lambda kv: rank.get(kv[0], 9999))
        )
        self._preview_per_clip_strength = dict(
            sorted(
                self._preview_per_clip_strength.items(),
                key=lambda kv: rank.get(kv[0], 9999),
            )
        )
        self._grade_per_clip_wb = dict(
            sorted(self._grade_per_clip_wb.items(), key=lambda kv: rank.get(kv[0], 9999))
        )
        self._preview_per_clip_wb = dict(
            sorted(self._preview_per_clip_wb.items(), key=lambda kv: rank.get(kv[0], 9999))
        )
        self._grade_per_clip_ct_k = dict(
            sorted(self._grade_per_clip_ct_k.items(), key=lambda kv: rank.get(kv[0], 9999))
        )
        self._preview_per_clip_ct_k = dict(
            sorted(self._preview_per_clip_ct_k.items(), key=lambda kv: rank.get(kv[0], 9999))
        )
        self._rebuild_grade_grid()
        self._rebuild_video_list_content()
        self._refresh_output_hint()

    def _prompt_move_clip_to_position(self, path_key: str, from_row: int) -> None:
        """#번호 더블클릭: 목표 순번(1-based)으로 삽입, 나머지는 한 칸씩 밀림."""
        if not self._video_files_mode():
            self._folder_mode_message()
            return
        snap = self._try_build_montage_snapshot()
        if not snap:
            return
        n = len(snap[0])
        if n <= 1:
            messagebox.showinfo("알림", "순서를 바꿀 클립이 하나뿐입니다.")
            return
        name = Path(path_key).name
        new_pos = simpledialog.askinteger(
            "순서 변경",
            f"「{name}」을 넣을 위치 번호를 입력하세요.\n"
            f"1 = 맨 앞, {n} = 맨 뒤. 그 자리에 끼어들면 뒤 클립은 한 칸씩 밀립니다.",
            minvalue=1,
            maxvalue=n,
            initialvalue=from_row + 1,
            parent=self.root,
        )
        if new_pos is None:
            return
        to_row = new_pos - 1
        if to_row == from_row:
            return
        self._move_video_item(from_row, to_row)

    def browse_music(self) -> None:
        p = filedialog.askopenfilename(
            title="음악 파일",
            filetypes=[
                ("오디오", " ".join(f"*{e}" for e in sorted(AUDIO_EXTS))),
                ("모든 파일", "*.*"),
            ],
        )
        if p:
            self.music_path_var.set(p)
            self._save_gui_settings()
            self._update_music_info_label()

    def browse_music_folder(self) -> None:
        p = filedialog.askdirectory(title="음악이 들어 있는 폴더 (실행 시 그중 무작위 1곡)")
        if p:
            folder = Path(p)
            n = self._count_audio_files_in_dir(folder)
            if n <= 0:
                messagebox.showinfo(
                    "알림",
                    f"이 폴더에 지원 음악이 없습니다.\n지원: {', '.join(sorted(AUDIO_EXTS))}",
                )
                return
            self.music_path_var.set(str(folder.resolve()))
            self._save_gui_settings()
            self._update_music_info_label()

    def browse_videos_dir(self) -> None:
        p = filedialog.askdirectory(title="영상 폴더")
        if p:
            self.video_files = []
            self.videos_dir_var.set(p)
            self._save_gui_settings()
            self._on_paths_changed()

    def browse_video_files(self) -> None:
        files = filedialog.askopenfilenames(
            title="영상 파일",
            filetypes=[
                ("영상", " ".join(f"*{e}" for e in sorted(VIDEO_EXTS))),
                ("모든 파일", "*.*"),
            ],
        )
        if not files:
            return
        self.videos_dir_var.set("")
        for f in files:
            if f and f not in self.video_files:
                self.video_files.append(f)
        self._save_gui_settings()
        self._on_paths_changed()

    def clear_video_sources(self) -> None:
        """영상 폴더 경로와「파일 여러 개」목록을 모두 비웁니다."""
        self.video_files = []
        self.videos_dir_var.set("")
        self._prev_montage_path_set = None
        self._montage_vids_cache = None
        self._montage_vids_cache_sig = None
        self._save_gui_settings()
        self._on_paths_changed()
        self._rebuild_video_list_content()
        self._schedule_large_preview_refresh()

    def clear_logo(self) -> None:
        """로고 이미지 경로를 지웁니다."""
        self.logo_path_var.set("")
        self._save_gui_settings()

    def browse_logo(self) -> None:
        p = filedialog.askopenfilename(
            title="로고 이미지",
            filetypes=[
                ("이미지", "*.png *.jpg *.jpeg *.webp"),
                ("모든 파일", "*.*"),
            ],
        )
        if p:
            self.logo_path_var.set(p)
            self._save_gui_settings()

    def browse_output(self) -> None:
        p = filedialog.asksaveasfilename(
            defaultextension=".mp4",
            filetypes=[("MP4", "*.mp4")],
        )
        if p:
            self.output_path_var.set(p)
            self._save_gui_settings()

    def on_music_drop(self, e) -> None:
        if not HAS_DND:
            return
        parts = self._split_dnd_paths(e.data)
        if not parts:
            return
        p = Path(parts[0])
        if p.is_file():
            if p.suffix.lower() in AUDIO_EXTS and not is_skipped_media_filename(p.name):
                self.music_path_var.set(str(p.resolve()))
                self._save_gui_settings()
                self._update_music_info_label()
        elif p.is_dir():
            folder = p.resolve()
            n = self._count_audio_files_in_dir(folder)
            if n <= 0:
                messagebox.showinfo(
                    "알림",
                    f"이 폴더에 지원 음악이 없습니다.\n지원: {', '.join(sorted(AUDIO_EXTS))}",
                )
                return
            self.music_path_var.set(str(folder))
            self._save_gui_settings()
            self._update_music_info_label()

    def on_logo_drop(self, e) -> None:
        if not HAS_DND:
            return
        for raw in self._split_dnd_paths(e.data):
            p = Path(raw)
            if (
                p.is_file()
                and p.suffix.lower() in LOGO_EXTS
                and not is_skipped_media_filename(p.name)
            ):
                self.logo_path_var.set(str(p.resolve()))
                self._save_gui_settings()
                return
        messagebox.showinfo(
            "알림",
            f"PNG / JPG / WebP 로고 파일을 드롭하세요. 지원: {', '.join(sorted(LOGO_EXTS))}",
        )

    def on_video_drop(self, e) -> None:
        if not HAS_DND:
            return
        paths = [Path(p) for p in self._split_dnd_paths(e.data)]
        if not paths:
            return
        dirs = [p for p in paths if p.is_dir()]
        files = [
            p
            for p in paths
            if p.is_file()
            and p.suffix.lower() in VIDEO_EXTS
            and not is_skipped_media_filename(p.name)
        ]
        if len(dirs) > 1:
            messagebox.showinfo("알림", "영상 폴더는 한 번에 한 개만 드롭하세요.")
            return
        if len(dirs) == 1 and not files:
            self.video_files = []
            self.videos_dir_var.set(str(dirs[0].resolve()))
            self._save_gui_settings()
            self._on_paths_changed()
            return
        if not files:
            return

        vd_raw = self.videos_dir_var.get().strip()
        has_vf = bool(self.video_files)

        if vd_raw and not has_vf:
            try:
                vdir = Path(vd_raw).resolve()
            except OSError:
                vdir = None
            if vdir is not None and vdir.is_dir():
                try:
                    drop_parent = files[0].resolve().parent
                except OSError:
                    drop_parent = None
                if drop_parent is not None and drop_parent == vdir:
                    self.videos_dir_var.set("")
                    self.video_files = [str(p.resolve()) for p in list_sorted_videos(vdir)]
                    for f in files:
                        fs = str(f.resolve())
                        if fs not in self.video_files:
                            self.video_files.append(fs)
                    self._save_gui_settings()
                    self._on_paths_changed()
                    return

        self.videos_dir_var.set("")
        try:
            new_parent = files[0].resolve().parent
        except OSError:
            new_parent = None

        if self.video_files and new_parent is not None:
            try:
                old_parent = Path(self.video_files[0]).resolve().parent
            except OSError:
                old_parent = None
            if old_parent is not None and old_parent == new_parent:
                for f in files:
                    fs = str(f.resolve())
                    if fs not in self.video_files:
                        self.video_files.append(fs)
                self._save_gui_settings()
                self._on_paths_changed()
                return

        self.video_files = []
        for f in files:
            fs = str(f.resolve())
            if fs not in self.video_files:
                self.video_files.append(fs)
        self._save_gui_settings()
        self._on_paths_changed()

    def _add_custom_preset_dialog(self) -> None:
        d = Toplevel(self.root)
        d.title("사용자 프리셋")
        Label(d, text="이름").grid(row=0, column=0, padx=6, pady=4)
        lv = StringVar()
        ttk.Entry(d, textvariable=lv, width=28).grid(row=0, column=1, padx=6, pady=4)
        Label(d, text="가로").grid(row=1, column=0)
        wv = IntVar(value=1920)
        ttk.Spinbox(d, from_=320, to=7680, textvariable=wv, width=8).grid(
            row=1, column=1, sticky=W
        )
        Label(d, text="세로").grid(row=2, column=0)
        hv = IntVar(value=1080)
        ttk.Spinbox(d, from_=320, to=7680, textvariable=hv, width=8).grid(
            row=2, column=1, sticky=W
        )
        lay = StringVar(value="fullframe")
        Label(d, text="레이아웃").grid(row=3, column=0)
        ttk.Combobox(
            d, textvariable=lay, values=("fullframe", "tri_stack"), state="readonly", width=14
        ).grid(row=3, column=1, sticky=W)

        def ok() -> None:
            lab = lv.get().strip()
            if not lab:
                return
            self.custom_presets.append(
                {"label": lab, "w": int(wv.get()), "h": int(hv.get()), "layout": lay.get()}
            )
            self._rebuild_preset_choices()
            self.preset_choice_var.set(lab)
            self._save_gui_settings()
            d.destroy()

        ttk.Button(d, text="추가", command=ok).grid(row=4, column=1, pady=8)

    def _refresh_output_hint(self) -> None:
        snap = self._try_build_montage_snapshot()
        pl = self._current_preset_dict()
        tag = montage_output_filename_stem_from_preset(pl)
        op = self.output_path_var.get().strip()
        if op:
            self._output_hint.config(text=f"출력: {op}")
            return
        if not snap:
            self._output_hint.config(text="출력: (영상·음악을 채우면 자동 경로 힌트가 표시됩니다)")
            return
        vids, _ = snap
        vd = self.videos_dir_var.get().strip() or None
        vdir = Path(vd).resolve() if vd else None
        try:
            hint = infer_output_path(vids, vdir, preset_tag=tag)
        except OSError:
            self._output_hint.config(text="출력 힌트 계산 실패")
            return
        self._output_hint.config(
            text=f"자동 출력 힌트: {hint}  (프리셋 파일명: {tag})"
        )

    def _log_line(self, s: str) -> None:
        self._log.configure(state="normal")
        self._log.insert(END, s + "\n")
        self._log.see(END)
        self._log.configure(state="disabled")

    def _queue_current(self) -> None:
        if self._preview_differs_from_committed():
            if not messagebox.askyesno(
                "노출 설정",
                "「최종완료」하지 않은 미리보기 노출·색온도·스포이드는 대기열 작업에 반영되지 않습니다.\n"
                "저장된(이전) 노출로 대기열에 넣을까요?\n\n"
                "아니오 → 취소 후 「최종완료」를 누르세요.",
            ):
                return
        job = self._collect_ui_job()
        with self._job_queue_lock:
            self._job_queue.append(job)
        self._save_gui_settings()
        self._refresh_queue_list()
        self._log_line("대기열에 작업을 추가했습니다.")

    def _preset_for_montage_job(self, job: dict) -> dict:
        plab = str(job.get("selected_preset_label") or "")
        for p in DEFAULT_PRESETS:
            if p["label"] == plab:
                return p
        for p in job.get("presets") or []:
            if isinstance(p, dict) and str(p.get("label")) == plab:
                return p
        return DEFAULT_PRESETS[0]

    def _job_output_basename_for_queue(self, job: dict) -> str:
        """대기열 한 줄에 쓸 출력 파일 이름(명시 경로 없으면 infer_output_path와 동일 규칙)."""
        out_s = (job.get("output_path") or "").strip()
        if out_s:
            return Path(out_s).name
        tag = job.get("_output_preset_tag") or montage_output_filename_stem_from_preset(
            self._preset_for_montage_job(job)
        )
        vd = job.get("videos_dir")
        vdir = Path(vd).resolve() if vd else None
        vfs = [Path(p) for p in (job.get("video_files") or [])] or None
        try:
            vids = resolve_videos(vdir, vfs)
        except (OSError, ValueError):
            return "(출력 미정)"
        vids = drop_videos_too_short(vids, log=lambda _s: None)
        if not vids:
            return "(출력 미정)"
        try:
            return infer_output_path(vids, vdir, preset_tag=tag).name
        except OSError:
            return "(출력 미정)"

    def _refresh_queue_list(self) -> None:
        with self._job_queue_lock:
            rows = list(self._job_queue)
        self._queue_list.delete(0, END)
        for j in rows:
            m = j.get("music_path", "")
            mname = Path(m).name if m else "(음악 없음)"
            out_nm = self._job_output_basename_for_queue(j)
            self._queue_list.insert(END, f"{mname}  →  {out_nm}")

    def _queue_remove_selected(self) -> None:
        sel = self._queue_list.curselection()
        if not sel:
            messagebox.showinfo("대기열", "목록에서 제거할 항목을 선택하세요.")
            return
        with self._job_queue_lock:
            for i in reversed(sel):
                if 0 <= i < len(self._job_queue):
                    del self._job_queue[i]
        self._save_gui_settings()
        self._refresh_queue_list()
        self._log_line("대기열에서 선택한 항목을 제거했습니다.")

    def _queue_clear_all(self) -> None:
        with self._job_queue_lock:
            nq = len(self._job_queue)
            if not self._job_queue:
                return
        if not messagebox.askyesno(
            "대기열 비우기",
            f"대기열에 있는 작업 {nq}개를 모두 지울까요?",
        ):
            return
        with self._job_queue_lock:
            self._job_queue.clear()
        self._save_gui_settings()
        self._refresh_queue_list()
        self._log_line("대기열을 모두 비웠습니다.")

    def _queue_discard_job_by_identity(self, job: dict) -> bool:
        """대기열에서 job과 같은 객체(is)만 제거. list.remove(dict)는 == 비교라 오인 제거 가능."""
        with self._job_queue_lock:
            for i, qj in enumerate(self._job_queue):
                if qj is job:
                    self._job_queue.pop(i)
                    return True
        return False

    def _remove_completed_queue_job(self, job: dict) -> None:
        """「만들기」로 끝난 대기열 항목만 목록에서 제거(설정 파일에도 반영)."""
        with self._job_queue_lock:
            for i, qj in enumerate(self._job_queue):
                if qj is job:
                    self._job_queue.pop(i)
                    break
        self._save_gui_settings()
        self._refresh_queue_list()

    def _warn_logo_not_in_output_basename(self, jobs: list[dict]) -> None:
        """로고 파일명(확장자 제외)이 출력 파일명에 없으면 다른 로고일 수 있음을 알림."""
        lines: list[str] = []
        for j in jobs:
            logo = (j.get("logo_path") or "").strip()
            if not logo:
                continue
            try:
                lp = Path(logo).expanduser().resolve()
            except OSError:
                continue
            if not lp.is_file():
                continue
            stem = lp.stem.strip()
            if not stem:
                continue
            out_nm = self._job_output_basename_for_queue(j)
            if not out_nm or out_nm.startswith("("):
                continue
            out_lower = out_nm.lower()
            if stem.lower() in out_lower:
                continue
            lines.append(f"  • 로고: {lp.name}  →  출력: {out_nm}")
        if not lines:
            return
        messagebox.showwarning(
            "로고·출력 이름",
            "로고 파일 이름(확장자 제외)이 출력 파일 이름에 들어 있지 않습니다.\n"
            "다른 로고가 쓰인 결과물일 수 있으니 저장 위치·파일명을 확인하세요.\n\n"
            + "\n".join(lines),
        )

    def _launch_montage_thread(self) -> None:
        if self._montage_thread and self._montage_thread.is_alive():
            messagebox.showwarning("실행 중", "이미 몽타주가 실행 중입니다.")
            return
        err = check_ffmpeg()
        if err:
            messagebox.showerror("ffmpeg", err)
            return
        if self._preview_differs_from_committed():
            if not messagebox.askyesno(
                "노출 설정",
                "「최종완료」하지 않은 미리보기 노출·색온도·스포이드는 만들기에 반영되지 않습니다.\n"
                "저장된(이전) 노출로 진행할까요?\n\n"
                "아니오 → 취소 후 「최종완료」를 누르세요.",
            ):
                return
        with self._job_queue_lock:
            queue_mode = bool(self._job_queue)
        if queue_mode:
            with self._job_queue_lock:
                warn_jobs = list(self._job_queue)
            self._warn_logo_not_in_output_basename(warn_jobs)
        else:
            jobs = [self._collect_ui_job()]
            self._warn_logo_not_in_output_basename(jobs)
        self._stop_requested.clear()

        def _reveal_output_path(path: Path) -> None:
            """완료된 출력 파일이 있는 폴더를 Finder/탐색기에서 연다."""
            try:
                p = path.expanduser().resolve()
            except OSError:
                return
            if not p.is_file():
                return
            try:
                if sys.platform == "darwin":
                    subprocess.run(["open", "-R", str(p)], check=False)
                elif sys.platform == "win32":
                    subprocess.run(
                        ["explorer", "/select," + str(p)],
                        check=False,
                    )
                else:
                    subprocess.run(["xdg-open", str(p.parent)], check=False)
            except OSError:
                pass

        def run_jobs() -> None:
            try:
                if queue_mode:
                    idx_run = 0
                    while True:
                        if self._stop_requested.is_set():
                            self._post_ui(
                                lambda: self._log_line(
                                    "— 중지 요청으로 대기열 처리를 멈췄습니다 (남은 항목은 대기열에 그대로 있습니다). —"
                                )
                            )
                            break
                        with self._job_queue_lock:
                            if not self._job_queue:
                                break
                            job = self._job_queue[0]
                            n_q = len(self._job_queue)
                        idx_run += 1
                        idx = idx_run
                        out_nm = self._job_output_basename_for_queue(job)

                        def _log_start(a=idx, b=n_q, o=out_nm) -> None:
                            self._log_line(f"── 대기열 {a}/{b} 시작 → 출력: {o} ──")

                        self._post_ui(_log_start)
                        try:
                            out_path = self._run_one_montage_job(job)
                        except Exception as exc:
                            tb = traceback.format_exc()

                            def _log_fail(a=idx, b=n_q, e=exc, t=tb) -> None:
                                self._log_line(f"!! 대기열 {a}/{b} 실패: {e}")
                                self._log_line(t)
                                print(
                                    f"[montage_gui] 대기열 {a}/{b} 실패: {e}\n{t}",
                                    file=sys.stderr,
                                    flush=True,
                                )
                                try:
                                    messagebox.showerror(
                                        "몽타주 실패",
                                        f"대기열 {a}/{b}에서 오류가 났습니다.\n\n{e}\n\n"
                                        "하단 로그에 전체 내용이 있습니다. 터미널을 켠 채 실행했으면 stderr에도 출력됩니다.",
                                    )
                                except TclError:
                                    pass

                            self._post_ui(_log_fail)
                            rotated = False
                            with self._job_queue_lock:
                                if self._job_queue and self._job_queue[0] is job:
                                    if len(self._job_queue) > 1:
                                        self._job_queue.pop(0)
                                        self._job_queue.append(job)
                                        rotated = True
                            if rotated:
                                self._post_ui(self._refresh_queue_list)
                            if not rotated:
                                break
                            continue

                        self._queue_discard_job_by_identity(job)

                        def _after_ok(
                            a=idx, b=n_q, o=out_nm, op=out_path
                        ) -> None:
                            self._log_line(f"── 대기열 {a}/{b} 완료 ({o}) ──")
                            self._save_gui_settings()
                            self._refresh_queue_list()
                            _reveal_output_path(op)

                        self._post_ui(_after_ok)
                else:
                    total = len(jobs)
                    for i, job in enumerate(jobs):
                        if self._stop_requested.is_set():
                            self._post_ui(
                                lambda: self._log_line(
                                    "— 중지 요청으로 대기열 처리를 멈췄습니다 (남은 항목은 대기열에 그대로 있습니다). —"
                                )
                            )
                            break
                        idx = i + 1
                        out_nm = self._job_output_basename_for_queue(job)

                        def _log_start(a=idx, b=total, o=out_nm) -> None:
                            self._log_line(f"── 대기열 {a}/{b} 시작 → 출력: {o} ──")

                        self._post_ui(_log_start)
                        try:
                            out_path = self._run_one_montage_job(job)
                        except Exception as exc:
                            tb = traceback.format_exc()

                            def _log_fail(a=idx, b=total, e=exc, t=tb) -> None:
                                self._log_line(f"!! 대기열 {a}/{b} 실패: {e}")
                                self._log_line(t)
                                print(
                                    f"[montage_gui] 대기열 {a}/{b} 실패: {e}\n{t}",
                                    file=sys.stderr,
                                    flush=True,
                                )
                                try:
                                    messagebox.showerror(
                                        "몽타주 실패",
                                        f"대기열 {a}/{b}에서 오류가 났습니다.\n\n{e}\n\n"
                                        "하단 로그에 전체 내용이 있습니다. 터미널을 켠 채 실행했으면 stderr에도 출력됩니다.",
                                    )
                                except TclError:
                                    pass

                            self._post_ui(_log_fail)
                            continue

                        def _log_done(
                            a=idx, b=total, o=out_nm, op=out_path
                        ) -> None:
                            self._log_line(f"── 대기열 {a}/{b} 완료 ({o}) ──")
                            _reveal_output_path(op)

                        self._post_ui(_log_done)
            except Exception:
                tb = traceback.format_exc()

                def _log_outer(t=tb) -> None:
                    self._log_line(t)
                    print(f"[montage_gui] 대기열 처리 중 예외:\n{t}", file=sys.stderr, flush=True)

                self._post_ui(_log_outer)
            finally:
                def _montage_worker_done() -> None:
                    self._montage_thread = None
                    self._log_line("— 작업 종료 —")

                self._post_ui(_montage_worker_done)

        self._montage_thread = threading.Thread(target=run_jobs, daemon=True)
        self._montage_thread.start()

    def _run_one_montage_job(self, job: dict) -> Path:
        music = Path(job["music_path"])
        out_s = (job.get("output_path") or "").strip()
        out = Path(out_s) if out_s else None
        vd = job.get("videos_dir")
        vdir = Path(vd).resolve() if vd else None
        vfs = [Path(p) for p in (job.get("video_files") or [])] or None
        preset = self._preset_for_montage_job(job)
        layout = str(preset.get("layout", "fullframe"))
        w = int(preset.get("w", 1920))
        h = int(preset.get("h", 850))
        raw_ch = preset.get("content_h")
        content_h_opt: int | None = None
        if raw_ch is not None:
            try:
                content_h_opt = int(raw_ch)
            except (TypeError, ValueError):
                content_h_opt = None
        tag = job.get("_output_preset_tag") or montage_output_filename_stem_from_preset(
            preset
        )

        logo = (job.get("logo_path") or "").strip()
        logo_p = Path(logo) if logo else None

        by_file = job.get("auto_exposure_strength_by_file") or {}
        by_clip: dict[str, float] = {}
        if isinstance(by_file, dict):
            for k, v in by_file.items():
                try:
                    by_clip[str(k)] = clamp_auto_exposure_strength(
                        int(v) / float(GRADE_EXPOSURE_PCT_MAX)
                    )
                except (TypeError, ValueError):
                    pass

        by_ctf = job.get("auto_ct_kelvin_by_file") or {}
        by_clip_ct: dict[str, float] = {}
        if isinstance(by_ctf, dict):
            for k, v in by_ctf.items():
                try:
                    by_clip_ct[str(k)] = clamp_color_temperature_k(float(int(v)))
                except (TypeError, ValueError):
                    pass

        by_spot_j = job.get("auto_wb_spot_mul_by_file") or {}
        by_spot_clip: dict[str, object] = {}
        if isinstance(by_spot_j, dict):
            for k, v in by_spot_j.items():
                if isinstance(v, (list, tuple)) and len(v) == 3:
                    try:
                        by_spot_clip[str(k)] = [
                            float(v[0]),
                            float(v[1]),
                            float(v[2]),
                        ]
                    except (TypeError, ValueError):
                        pass

        cgp = job.get("clip_grade_preview") or {}
        by_clip_grade_full: dict[str, dict] = {}
        if isinstance(cgp, dict):
            for k, v in cgp.items():
                if isinstance(v, dict):
                    by_clip_grade_full[str(k)] = v

        def log_cb(msg: str) -> None:
            self._post_ui(lambda m=msg: self._log_line(m))

        return run_montage(
            music.resolve(),
            out,
            videos_dir=vdir,
            video_files=vfs,
            window_sec=float(job.get("window_sec", 4.0)),
            peak_band_start=float(job.get("peak_start", 3.0)),
            width=w,
            height=h,
            content_height=content_h_opt,
            layout=layout,
            output_preset_tag=tag,
            audio_fade_out_sec=max(0.0, float(job.get("audio_fade_out", 5.0))),
            clip_trim_start_sec=max(0.0, float(job.get("clip_trim", 0.5))),
            letterbox_open_sec=max(0.0, float(job.get("letterbox_open_sec", 2.0))),
            letterbox_close_sec=max(0.0, float(job.get("letterbox_close_sec", 2.0))),
            letterbox_open_enabled=bool(job.get("letterbox_open_enabled", True)),
            letterbox_close_enabled=bool(job.get("letterbox_close_enabled", True)),
            tail_black_sec=max(0.0, float(job.get("tail_black", 2.0))),
            logo_path=logo_p,
            auto_exposure_grade=False,
            auto_exposure_strength=clamp_auto_exposure_strength(
                int(job.get("auto_exposure_strength_percent", 100))
                / float(GRADE_EXPOSURE_PCT_MAX)
            ),
            auto_exposure_strength_by_clip=by_clip or None,
            auto_wb_grade=False,
            auto_wb_strength=0.0,
            auto_wb_strength_by_clip=None,
            auto_wb_spot_mul_by_clip=by_spot_clip or None,
            auto_ct_grade=bool(job.get("auto_ct_grade", True)),
            auto_ct_kelvin=clamp_color_temperature_k(
                float(int(job.get("auto_ct_kelvin", MONTAGE_CT_NEUTRAL_K)))
            ),
            auto_ct_kelvin_by_clip=by_clip_ct or None,
            manual_clip_grade_by_clip=by_clip_grade_full or None,
            log=log_cb,
        )

    # --- video list editor ---
    def open_video_list_editor(self) -> None:
        self._ensure_video_queue_window()

    def _ensure_video_queue_window(self) -> None:
        if self._video_queue_win is not None and self._video_queue_win.winfo_exists():
            self._video_queue_win.lift()
            self._rebuild_video_list_content()
            return
        win = Toplevel(self.root)
        win.title("영상 파일 목록")
        win.geometry("520x420")
        self._video_queue_win = win
        cf = Frame(win)
        cf.pack(fill=BOTH, expand=True)
        self._vq_canvas = Canvas(cf, highlightthickness=0)
        vsb = Scrollbar(cf, orient=VERTICAL, command=self._vq_canvas.yview)
        self._vq_canvas.pack(side=LEFT, fill=BOTH, expand=True)
        vsb.pack(side=RIGHT, fill=Y)
        self._vq_canvas.configure(yscrollcommand=vsb.set)
        self._vq_inner = Frame(self._vq_canvas)
        self._vq_win_id = self._vq_canvas.create_window(
            (0, 0), window=self._vq_inner, anchor=N + W
        )

        def vcfg(_e=None) -> None:
            self._vq_canvas.configure(scrollregion=self._vq_canvas.bbox("all"))
            self._vq_canvas.itemconfig(
                self._vq_win_id, width=self._vq_canvas.winfo_width()
            )

        self._vq_inner.bind("<Configure>", vcfg)
        self._vq_canvas.bind("<Configure>", vcfg)
        br = Frame(win)
        br.pack(fill=X, padx=6, pady=6)
        ttk.Button(br, text="파일 추가…", command=self._vq_browse_add).pack(side=LEFT, padx=2)
        ttk.Button(br, text="선택 항목 위로", command=lambda: self._vq_move(-1)).pack(
            side=LEFT, padx=2
        )
        ttk.Button(br, text="선택 항목 아래로", command=lambda: self._vq_move(1)).pack(
            side=LEFT, padx=2
        )
        ttk.Button(br, text="선택 삭제", command=self._vq_remove_sel).pack(side=LEFT, padx=2)
        ttk.Button(br, text="닫기", command=win.destroy).pack(side=RIGHT)
        self._vq_listbox = Listbox(self._vq_inner, height=20)
        self._vq_listbox.pack(fill=BOTH, expand=True)
        self._rebuild_video_list_content()

    def _rebuild_video_list_content(self) -> None:
        if self._video_queue_win is None or not self._video_queue_win.winfo_exists():
            return
        lb = getattr(self, "_vq_listbox", None)
        if lb is None:
            return
        lb.delete(0, END)
        for p in self.video_files:
            lb.insert(END, p)

    def _vq_browse_add(self) -> None:
        files = filedialog.askopenfilenames(
            title="영상 파일",
            filetypes=[("영상", " ".join(f"*{e}" for e in sorted(VIDEO_EXTS)))],
        )
        for f in files:
            if f and f not in self.video_files:
                self.video_files.append(f)
        self._save_gui_settings()
        self._on_paths_changed()
        self._rebuild_video_list_content()

    def _vq_move(self, delta: int) -> None:
        lb = getattr(self, "_vq_listbox", None)
        if lb is None:
            return
        sel = lb.curselection()
        if not sel:
            return
        i = int(sel[0])
        j = i + delta
        if j < 0 or j >= len(self.video_files):
            return
        self.video_files[i], self.video_files[j] = self.video_files[j], self.video_files[i]
        self._save_gui_settings()
        self._rebuild_video_list_content()
        lb.selection_clear(0, END)
        lb.selection_set(j)
        self._rebuild_grade_grid()

    def _vq_remove_sel(self) -> None:
        lb = getattr(self, "_vq_listbox", None)
        if lb is None:
            return
        sel = lb.curselection()
        if not sel:
            return
        i = int(sel[0])
        p = self.video_files.pop(i)
        pk = str(Path(p).resolve())
        self._grade_per_clip_strength.pop(pk, None)
        self._preview_per_clip_strength.pop(pk, None)
        self._save_gui_settings()
        self._on_paths_changed()
        self._rebuild_video_list_content()

    def _on_close(self) -> None:
        self._ui_pump_stopped = True
        self._wb_spot_set_pick(False)
        self._save_gui_settings()
        self._extract_q.put(("stop",))
        for _ in range(THUMB_WORKER_COUNT):
            self._thumb_work_q.put(("stop",))
        self.root.destroy()

    def run(self) -> None:
        self.root.mainloop()


def main() -> None:
    MontageGuiApp().run()


if __name__ == "__main__":
    main()
