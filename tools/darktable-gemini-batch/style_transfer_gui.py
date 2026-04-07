#!/usr/bin/env python3
"""
참조 스타일 복제 — 시각화(샘플 1장) + Gemini 대화 + STYLE_TOOL_WRITE 적용.

  cd tools/darktable-gemini-batch
  pip install -r requirements.txt
  export GEMINI_API_KEY=...
  python3 style_transfer_gui.py

종료 시 `style_transfer_gui_settings.json`에 경로·모델·창 위치 등이 자동 저장되며,
다음 실행 시 복원됩니다. API 키는 저장하지 않습니다.
"""

from __future__ import annotations

import json
import os
import sys
import threading
import tkinter as tk
import math
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext, ttk

import numpy as np
from PIL import Image, ImageTk

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from style_transfer_assistant_shared import (
    SYSTEM_INSTRUCTION,
    parse_style_tool_write_blocks,
    safe_script_path,
)
from style_transfer_core import (
    DEFAULT_HISTOGRAM_MATCH_ALPHA,
    PHASE1_VARIANT_KEYS,
    collect_raw_files,
    find_sidecar_xmp_path,
    load_reference_pil,
    load_variant_choice_from_pack,
    parse_gain_overrides_from_plain_text,
    parse_lightroom_xmp,
    parse_relative_exposure_ev_delta_from_text,
    raw_preview_pil,
    run_phase1_samples,
    run_phase2_batch,
)

CHAT_HISTORY_PATH = SCRIPT_DIR / "style_transfer_chat_history.json"
GUI_SETTINGS_PATH = SCRIPT_DIR / "style_transfer_gui_settings.json"


class StyleTransferGui:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("참조 스타일 복제 · 시각화 + rawpy + Gemini")
        self.root.minsize(1100, 920)

        self.var_ref = tk.StringVar()
        self.var_raw_dir = tk.StringVar()
        self.var_raw_one = tk.StringVar()
        self.var_samples = tk.StringVar(value=str(SCRIPT_DIR / "style_samples"))
        self.var_output = tk.StringVar()
        self.var_model = tk.StringVar(value="gemini-2.5-flash")
        self.var_show_key = tk.BooleanVar(value=False)
        self.var_choice = tk.StringVar(value="01")
        self.var_histogram_alpha = tk.DoubleVar(value=float(DEFAULT_HISTOGRAM_MATCH_ALPHA))
        self.var_phase2_jpeg = tk.BooleanVar(value=False)
        self.var_override_strength = tk.DoubleVar(value=0.0)
        self.var_override_r = tk.DoubleVar(value=1.0)
        self.var_override_g = tk.DoubleVar(value=1.0)
        self.var_override_b = tk.DoubleVar(value=1.0)
        self.var_override_exposure_mul = tk.DoubleVar(value=1.0)
        self.var_busy = False

        self._pack_path: Path | None = None
        self._sample_cells: dict[str, tuple[tk.Canvas, ttk.Label]] = {}
        self._sample_pil_original: Image.Image | None = None
        self._sample_redraw_after: str | None = None
        self._sample_photo_image: ImageTk.PhotoImage | None = None
        self._photo_refs: list[ImageTk.PhotoImage] = []
        self._photo_input_refs: list[ImageTk.PhotoImage] = []

        self._chat_messages: list[dict[str, str]] = []
        self._chat = None
        self._chat_key: str | None = None
        self._chat_model: str | None = None

        self._input_preview_seq = 0
        self._scroll_canvas: tk.Canvas | None = None
        self._scroll_inner: ttk.Frame | None = None
        self._build_ui()
        self._gui_settings_loaded = self._load_gui_settings()
        self._load_chat_history()
        self._reload_previews()
        self._refresh_input_preview()
        self.root.after(200, self._sync_sample_canvas_geometry)
        self.root.protocol("WM_DELETE_WINDOW", self._on_close_window)

    def _sync_scroll_region(self) -> None:
        c = self._scroll_canvas
        if c is None:
            return
        c.update_idletasks()
        c.configure(scrollregion=c.bbox("all"))

    def _wheel_candidate(self, w: tk.Misc | None) -> bool:
        if w is None:
            return False
        t: tk.Misc | None = w
        while t:
            if t.winfo_class() == "Text":
                return False
            t = getattr(t, "master", None)
        t = w
        inner, canvas = self._scroll_inner, self._scroll_canvas
        while t:
            if inner is not None and t is inner:
                return True
            if canvas is not None and t is canvas:
                return True
            t = getattr(t, "master", None)
        return False

    def _on_root_mousewheel(self, event: tk.Event) -> None:
        c = self._scroll_canvas
        if c is None:
            return
        w = self.root.winfo_containing(event.x_root, event.y_root)
        if not self._wheel_candidate(w):
            return
        if sys.platform == "darwin":
            if event.delta > 0:
                c.yview_scroll(-3, "units")
            elif event.delta < 0:
                c.yview_scroll(3, "units")
        elif event.delta:
            c.yview_scroll(int(-1 * (event.delta / 120)), "units")

    def _on_root_mousewheel_linux(self, event: tk.Event, direction: int) -> None:
        c = self._scroll_canvas
        if c is None:
            return
        w = self.root.winfo_containing(event.x_root, event.y_root)
        if not self._wheel_candidate(w):
            return
        c.yview_scroll(direction, "units")

    def _build_ui(self) -> None:
        shell = ttk.Frame(self.root)
        shell.pack(fill=tk.BOTH, expand=True)
        try:
            bg = ttk.Style().lookup("TFrame", "background") or ""
        except tk.TclError:
            bg = ""
        if not bg:
            bg = "#ececec"
        self._scroll_canvas = tk.Canvas(shell, highlightthickness=0, background=bg)
        vsb = ttk.Scrollbar(shell, orient=tk.VERTICAL, command=self._scroll_canvas.yview)
        self._scroll_canvas.configure(yscrollcommand=vsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        self._scroll_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        outer = ttk.Frame(self._scroll_canvas, padding=8)
        self._scroll_inner = outer
        self._scroll_win_id = self._scroll_canvas.create_window((0, 0), window=outer, anchor=tk.NW)

        def _on_inner_cfg(_e: tk.Event) -> None:
            self._sync_scroll_region()

        def _on_canvas_cfg(e: tk.Event) -> None:
            self._scroll_canvas.itemconfigure(self._scroll_win_id, width=e.width)
            self.root.after_idle(self._sync_sample_canvas_geometry)

        outer.bind("<Configure>", _on_inner_cfg)
        self._scroll_canvas.bind("<Configure>", _on_canvas_cfg)

        top = ttk.LabelFrame(outer, text="입력 경로", padding=8)
        top.pack(fill=tk.X)
        self._row(top, 0, "참조 이미지 (JPG/PNG)", self.var_ref, self._browse_ref)
        self._row(top, 1, "RAW 폴더", self.var_raw_dir, self._browse_raw_dir)
        ttk.Label(top, text="기준 RAW").grid(row=2, column=0, sticky=tk.W, pady=4)
        self.cmb_raw = ttk.Combobox(top, textvariable=self.var_raw_one, width=68, state="readonly")
        self.cmb_raw.grid(row=2, column=1, padx=6, sticky=tk.EW)
        self.cmb_raw.bind("<<ComboboxSelected>>", lambda _e: self._refresh_input_preview())
        ttk.Button(top, text="목록 새로고침", command=self._refresh_raw_list).grid(row=2, column=2)
        self._row(top, 3, "샘플/JSON 출력 폴더", self.var_samples, self._browse_samples)
        self._row(top, 4, "Phase2 출력 폴더 (JPG 선택 시)", self.var_output, self._browse_output)
        self.lbl_ref_xmp = ttk.Label(
            top,
            text="",
            font=("", 9),
            foreground="#555",
            wraplength=720,
            justify=tk.LEFT,
        )
        self.lbl_ref_xmp.grid(row=5, column=0, columnspan=3, sticky=tk.W, pady=(2, 4))
        top.columnconfigure(1, weight=1)

        vis = ttk.LabelFrame(outer, text="시각화 — 참조 vs 기준 RAW (밝기 히스토그램)", padding=8)
        vis.pack(fill=tk.X, pady=6)
        vf = ttk.Frame(vis)
        vf.pack(fill=tk.X)
        ttk.Button(vf, text="입력 미리보기 갱신", command=self._refresh_input_preview).pack(
            side=tk.LEFT, padx=(0, 12)
        )
        ttk.Label(
            vf,
            text="경로를 바꾼 뒤 갱신하면 Phase1과 동일한 종류의 썸네일·히스토그램을 볼 수 있습니다.",
            font=("", 9),
            foreground="#555",
        ).pack(side=tk.LEFT)
        vgrid = ttk.Frame(vis)
        vgrid.pack(fill=tk.X, pady=(8, 0))
        for col, title in enumerate(("① 참조 (목표 스타일)", "② 기준 RAW (미리보기)")):
            ttk.Label(vgrid, text=title, font=("", 11, "bold")).grid(row=0, column=col, padx=20, pady=4)
        self.lbl_in_ref = ttk.Label(vgrid, text="(참조 없음)", anchor=tk.CENTER)
        self.lbl_in_ref.grid(row=1, column=0, padx=16, pady=4)
        self.lbl_hist_ref = ttk.Label(vgrid, text="", anchor=tk.CENTER)
        self.lbl_hist_ref.grid(row=2, column=0, padx=16)
        self.lbl_in_raw = ttk.Label(vgrid, text="(RAW 없음)", anchor=tk.CENTER)
        self.lbl_in_raw.grid(row=1, column=1, padx=16, pady=4)
        self.lbl_hist_raw = ttk.Label(vgrid, text="", anchor=tk.CENTER)
        self.lbl_hist_raw.grid(row=2, column=1, padx=16)

        mid = ttk.Frame(outer)
        mid.pack(fill=tk.X, pady=8)
        ttk.Label(mid, text="모델").pack(side=tk.LEFT)
        ttk.Entry(mid, textvariable=self.var_model, width=36).pack(side=tk.LEFT, padx=8)
        ttk.Label(mid, text="API 키").pack(side=tk.LEFT, padx=(16, 4))
        self.ent_key = ttk.Entry(mid, width=36, show="•")
        self.ent_key.pack(side=tk.LEFT, padx=4)
        if os.environ.get("GEMINI_API_KEY", "").strip():
            self.ent_key.insert(0, os.environ["GEMINI_API_KEY"].strip())
        ttk.Checkbutton(mid, text="키 표시", variable=self.var_show_key, command=self._sync_key_show).pack(
            side=tk.LEFT, padx=8
        )

        act = ttk.Frame(outer)
        act.pack(fill=tk.X, pady=4)
        ttk.Button(act, text="① Phase1: 분석 + 샘플 1장", command=self._run_phase1).pack(
            side=tk.LEFT, padx=(0, 8)
        )
        ttk.Label(act, text="Phase2:").pack(side=tk.LEFT, padx=(8, 2))
        _choice_vals = tuple(PHASE1_VARIANT_KEYS) + ("A", "B", "C")
        self.cmb_variant = ttk.Combobox(
            act,
            textvariable=self.var_choice,
            values=_choice_vals,
            width=5,
            state="readonly",
        )
        self.cmb_variant.pack(side=tk.LEFT, padx=2)
        ttk.Button(act, text="② Phase2: XMP 사이드카 (폴더 일괄)", command=self._run_phase2).pack(
            side=tk.LEFT, padx=16
        )
        ttk.Checkbutton(
            act,
            text="Phase2에서 JPG도 저장",
            variable=self.var_phase2_jpeg,
        ).pack(side=tk.LEFT, padx=(8, 0))

        hist_row = ttk.Frame(outer)
        hist_row.pack(fill=tk.X, pady=(2, 4))
        ttk.Label(hist_row, text="참조 히스토그램 블렌드 α (게인 후, 0=끔)").pack(side=tk.LEFT, padx=(0, 8))
        self.scale_hist_alpha = ttk.Scale(
            hist_row, from_=0.0, to=1.0, variable=self.var_histogram_alpha, command=self._on_histogram_alpha_scale
        )
        self.scale_hist_alpha.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
        self.lbl_hist_alpha_val = ttk.Label(hist_row, text="0.00", width=5)
        self.lbl_hist_alpha_val.pack(side=tk.LEFT)
        self._on_histogram_alpha_scale()

        ov = ttk.LabelFrame(outer, text="Phase1 수동 보정 (채팅/사용자 조정 → 샘플에 반영)", padding=8)
        ov.pack(fill=tk.X, pady=(2, 6))
        g = ttk.Frame(ov)
        g.pack(fill=tk.X)
        for col, (lab, var) in enumerate(
            (
                ("r_gain", self.var_override_r),
                ("g_gain", self.var_override_g),
                ("b_gain", self.var_override_b),
                ("exposure_mul", self.var_override_exposure_mul),
            )
        ):
            f = ttk.Frame(g)
            f.grid(row=0, column=col, padx=(0, 12) if col < 3 else 0, sticky=tk.W)
            ttk.Label(f, text=lab).pack(anchor=tk.W)
            ttk.Entry(f, textvariable=var, width=10).pack(anchor=tk.W)
        g.columnconfigure(3, weight=1)
        srow = ttk.Frame(ov)
        srow.pack(fill=tk.X, pady=(8, 0))
        ttk.Label(srow, text="반영 강도 (0=기본 평균정렬만, 1=수동/제안값 100%)").pack(
            side=tk.LEFT, padx=(0, 8)
        )
        self.scale_override = ttk.Scale(
            srow,
            from_=0.0,
            to=1.0,
            variable=self.var_override_strength,
            command=lambda *_: self._sync_override_strength_label(),
        )
        self.scale_override.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
        self.lbl_override_val = ttk.Label(srow, text="0.00", width=5)
        self.lbl_override_val.pack(side=tk.LEFT)
        self._sync_override_strength_label()

        prev = ttk.LabelFrame(outer, text="③ 미리보기 샘플 (Phase1 후 — 참조 노출·WB 정렬)", padding=8)
        prev.pack(fill=tk.X, pady=8)
        prev.columnconfigure(0, weight=1)
        prev.rowconfigure(1, weight=1)
        ptop = ttk.Frame(prev)
        ptop.grid(row=0, column=0, sticky=tk.EW, pady=(0, 6))
        self.lbl_sample_status = ttk.Label(ptop, text="", foreground="#0066cc", font=("", 10, "bold"))
        self.lbl_sample_status.pack(side=tk.LEFT)
        ttk.Button(ptop, text="샘플 비우기", command=self._clear_samples).pack(side=tk.RIGHT)
        pf = ttk.Frame(prev)
        pf.grid(row=1, column=0, sticky=tk.NSEW)
        pf.columnconfigure(0, weight=1)
        pf.rowconfigure(0, weight=1)
        self._sample_canvas = tk.Canvas(
            pf,
            width=1024,
            height=560,
            bg="#2a2a2e",
            highlightthickness=1,
            highlightbackground="#b8bcc8",
        )
        self._sample_canvas.grid(row=0, column=0, sticky=tk.NSEW, pady=(0, 6))
        self._sample_canvas.bind("<Configure>", self._on_sample_canvas_configure)
        self._sample_cap = ttk.Label(pf, text="", wraplength=900, justify=tk.CENTER, font=("", 9))
        self._sample_cap.grid(row=1, column=0, sticky=tk.EW, pady=(0, 2))
        for key in PHASE1_VARIANT_KEYS:
            self._sample_cells[key] = (self._sample_canvas, self._sample_cap)

        ana_fr = ttk.LabelFrame(outer, text="Gemini 분석 요약", padding=6)
        ana_fr.pack(fill=tk.X, pady=4)
        self.txt_analysis = scrolledtext.ScrolledText(ana_fr, height=5, wrap=tk.WORD, font=("system", 11))
        self.txt_analysis.pack(fill=tk.X)

        chat_fr = ttk.LabelFrame(
            outer,
            text="Gemini 대화 (STYLE_TOOL_WRITE path=… 로 코드 제안 → 직전 답변 적용)",
            padding=8,
        )
        chat_fr.pack(fill=tk.X, pady=8)
        self.txt_chat = scrolledtext.ScrolledText(chat_fr, height=10, wrap=tk.WORD, font=("system", 11))
        self.txt_chat.pack(fill=tk.X)
        self.txt_chat.bind("<Key>", self._on_chat_history_key)
        for seq in ("<Button-2>", "<Button-3>", "<Control-Button-1>"):
            self.txt_chat.bind(seq, self._on_chat_history_menu)
        cr = ttk.Frame(chat_fr)
        cr.pack(fill=tk.X, pady=6)
        self.ent_chat = ttk.Entry(cr)
        self.ent_chat.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self.ent_chat.bind("<Return>", lambda e: self._chat_send())
        ttk.Button(cr, text="전송", command=self._chat_send).pack(side=tk.LEFT, padx=2)
        ttk.Button(cr, text="직전 답변 적용", command=self._apply_chat).pack(side=tk.LEFT, padx=2)
        ttk.Button(cr, text="대화 비우기", command=self._chat_reset).pack(side=tk.LEFT, padx=2)

        log_fr = ttk.LabelFrame(outer, text="로그", padding=6)
        log_fr.pack(fill=tk.X, pady=(0, 4))
        self.txt_log = scrolledtext.ScrolledText(log_fr, height=8, font=("Courier", 10))
        self.txt_log.pack(fill=tk.X)

        self._bind_clipboard_shortcuts()

        self.root.bind_all("<MouseWheel>", self._on_root_mousewheel)
        self.root.bind_all("<Button-4>", lambda e: self._on_root_mousewheel_linux(e, -1))
        self.root.bind_all("<Button-5>", lambda e: self._on_root_mousewheel_linux(e, 1))

        self._sync_scroll_region()

    def _bind_clipboard_shortcuts(self) -> None:
        """macOS 등에서 ttk.Entry / Text 가 Cmd+V 를 먹지 않을 때 클립보드 동작을 보강합니다."""
        r = self.root

        def entry_paste(event: tk.Event) -> str:
            w = event.widget
            try:
                clip = r.clipboard_get()
            except tk.TclError:
                return "break"
            try:
                if w.selection_present():
                    w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            except tk.TclError:
                pass
            try:
                w.insert(tk.INSERT, clip)
            except tk.TclError:
                pass
            return "break"

        def entry_copy(event: tk.Event) -> str:
            w = event.widget
            try:
                if not w.selection_present():
                    return "break"
                r.clipboard_clear()
                r.clipboard_append(w.selection_get())
            except tk.TclError:
                pass
            return "break"

        def entry_cut(event: tk.Event) -> str:
            w = event.widget
            try:
                if not w.selection_present():
                    return "break"
                r.clipboard_clear()
                r.clipboard_append(w.selection_get())
                w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            except tk.TclError:
                pass
            return "break"

        def entry_select_all(event: tk.Event) -> str:
            w = event.widget
            try:
                w.selection_range(0, tk.END)
                w.icursor(tk.END)
            except tk.TclError:
                pass
            return "break"

        def text_paste(event: tk.Event) -> str:
            w = event.widget
            if w is self.txt_chat:
                return "break"
            try:
                clip = r.clipboard_get()
            except tk.TclError:
                return "break"
            try:
                if w.tag_ranges(tk.SEL):
                    w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            except tk.TclError:
                pass
            try:
                w.insert(tk.INSERT, clip)
            except tk.TclError:
                pass
            return "break"

        def text_copy(event: tk.Event) -> str | None:
            w = event.widget
            try:
                if not w.tag_ranges(tk.SEL):
                    return None
                r.clipboard_clear()
                r.clipboard_append(w.get(tk.SEL_FIRST, tk.SEL_LAST))
            except tk.TclError:
                pass
            return "break"

        def text_cut(event: tk.Event) -> str:
            w = event.widget
            if w is self.txt_chat:
                return "break"
            try:
                if not w.tag_ranges(tk.SEL):
                    return "break"
                r.clipboard_clear()
                r.clipboard_append(w.get(tk.SEL_FIRST, tk.SEL_LAST))
                w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            except tk.TclError:
                pass
            return "break"

        def text_select_all(event: tk.Event) -> str:
            w = event.widget
            try:
                w.tag_add(tk.SEL, "1.0", tk.END)
                w.mark_set(tk.INSERT, tk.END)
                w.see(tk.INSERT)
            except tk.TclError:
                pass
            return "break"

        for seq_v, seq_c, seq_x, seq_a in (
            ("<Command-v>", "<Command-c>", "<Command-x>", "<Command-a>"),
            ("<Control-v>", "<Control-c>", "<Control-x>", "<Control-a>"),
        ):
            r.bind_class("TEntry", seq_v, entry_paste)
            r.bind_class("TEntry", seq_c, entry_copy)
            r.bind_class("TEntry", seq_x, entry_cut)
            r.bind_class("TEntry", seq_a, entry_select_all)
            r.bind_class("Text", seq_v, text_paste)
            r.bind_class("Text", seq_c, text_copy)
            r.bind_class("Text", seq_x, text_cut)
            r.bind_class("Text", seq_a, text_select_all)

    def _save_gui_settings(self) -> None:
        data = {
            "version": 1,
            "reference_path": self.var_ref.get().strip(),
            "raw_dir": self.var_raw_dir.get().strip(),
            "raw_basename": self.var_raw_one.get().strip(),
            "sample_dir": self.var_samples.get().strip(),
            "output_dir": self.var_output.get().strip(),
            "model": self.var_model.get().strip(),
            "variant_choice": self.var_choice.get().strip() or "01",
            "histogram_match_alpha": float(max(0.0, min(1.0, self.var_histogram_alpha.get()))),
            "phase2_also_jpeg": bool(self.var_phase2_jpeg.get()),
            "override_strength": float(max(0.0, min(1.0, self.var_override_strength.get()))),
            "override_r_gain": float(self.var_override_r.get()),
            "override_g_gain": float(self.var_override_g.get()),
            "override_b_gain": float(self.var_override_b.get()),
            "override_exposure_mul": float(self.var_override_exposure_mul.get()),
            "show_api_key": bool(self.var_show_key.get()),
            "geometry": self.root.winfo_geometry(),
        }
        try:
            GUI_SETTINGS_PATH.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass

    def _load_gui_settings(self) -> bool:
        if not GUI_SETTINGS_PATH.is_file():
            return False
        try:
            data = json.loads(GUI_SETTINGS_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return False
        if not isinstance(data, dict):
            return False
        if data.get("reference_path"):
            self.var_ref.set(str(data["reference_path"]))
        if data.get("raw_dir"):
            self.var_raw_dir.set(str(data["raw_dir"]))
        if data.get("raw_basename"):
            self.var_raw_one.set(str(data["raw_basename"]))
        if data.get("sample_dir"):
            self.var_samples.set(str(data["sample_dir"]))
        if data.get("output_dir"):
            self.var_output.set(str(data["output_dir"]))
        if data.get("model"):
            self.var_model.set(str(data["model"]))
        raw_c = (data.get("variant_choice") or "01").strip()
        picked = False
        if raw_c.isdigit():
            c = f"{int(raw_c):02d}"
            if c in PHASE1_VARIANT_KEYS:
                self.var_choice.set(c)
                picked = True
        elif len(raw_c) == 1 and raw_c.isalpha() and raw_c.upper() in ("A", "B", "C"):
            self.var_choice.set(raw_c.upper())
            picked = True
        elif raw_c in PHASE1_VARIANT_KEYS:
            self.var_choice.set(raw_c)
            picked = True
        if not picked:
            self.var_choice.set("01")
        ha = data.get("histogram_match_alpha")
        if ha is not None:
            try:
                self.var_histogram_alpha.set(float(max(0.0, min(1.0, float(ha)))))
            except (TypeError, ValueError):
                pass
            self._on_histogram_alpha_scale()
        if "override_strength" in data:
            try:
                self.var_override_strength.set(float(max(0.0, min(1.0, float(data["override_strength"])))))
            except (TypeError, ValueError):
                pass
        for k, var in (
            ("override_r_gain", self.var_override_r),
            ("override_g_gain", self.var_override_g),
            ("override_b_gain", self.var_override_b),
            ("override_exposure_mul", self.var_override_exposure_mul),
        ):
            if k in data:
                try:
                    var.set(float(data[k]))
                except (TypeError, ValueError):
                    pass
        self._sync_override_strength_label()
        if "phase2_also_jpeg" in data:
            self.var_phase2_jpeg.set(bool(data["phase2_also_jpeg"]))
        if "show_api_key" in data:
            self.var_show_key.set(bool(data["show_api_key"]))
            self._sync_key_show()
        geom = data.get("geometry")
        if isinstance(geom, str) and geom.strip():
            try:
                self.root.geometry(geom.strip())
            except tk.TclError:
                pass
        self._refresh_raw_list()
        return True

    def _on_close_window(self) -> None:
        self._save_gui_settings()
        self.root.destroy()

    def _row(self, parent: ttk.Frame, row: int, label: str, var: tk.StringVar, cmd) -> None:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky=tk.W, pady=3)
        ttk.Entry(parent, textvariable=var, width=72).grid(row=row, column=1, padx=6, sticky=tk.EW)
        ttk.Button(parent, text="찾기…", command=cmd).grid(row=row, column=2)

    def _sync_key_show(self) -> None:
        self.ent_key.configure(show="" if self.var_show_key.get() else "•")

    def _on_histogram_alpha_scale(self, *_args: object) -> None:
        v = float(max(0.0, min(1.0, self.var_histogram_alpha.get())))
        self.var_histogram_alpha.set(v)
        self.lbl_hist_alpha_val.configure(text=f"{v:.2f}")

    def _sync_override_strength_label(self) -> None:
        v = float(max(0.0, min(1.0, self.var_override_strength.get())))
        self.var_override_strength.set(v)
        try:
            self.lbl_override_val.configure(text=f"{v:.2f}")
        except Exception:
            pass

    @staticmethod
    def _extract_first_json_object(text: str) -> dict | None:
        t = (text or "").strip()
        if not t:
            return None
        import re

        m = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", t, re.IGNORECASE)
        if m:
            t = m.group(1).strip()
        i0 = t.find("{")
        i1 = t.rfind("}")
        if i0 < 0 or i1 <= i0:
            return None
        try:
            obj = json.loads(t[i0 : i1 + 1])
        except Exception:
            return None
        return obj if isinstance(obj, dict) else None

    def _apply_override_from_chat_reply(self, reply: str) -> None:
        changed = False
        hints = parse_gain_overrides_from_plain_text(reply)
        pairs = (
            ("r_gain", self.var_override_r),
            ("g_gain", self.var_override_g),
            ("b_gain", self.var_override_b),
            ("exposure_mul", self.var_override_exposure_mul),
        )
        for key, var in pairs:
            if key not in hints:
                continue
            try:
                var.set(float(hints[key]))
                changed = True
            except (TypeError, ValueError):
                pass
        obj = self._extract_first_json_object(reply)
        if obj:
            v = obj.get("variants", {}).get("01") if isinstance(obj.get("variants"), dict) else None
            if not isinstance(v, dict):
                v = obj
            for key, var in pairs:
                if key not in v:
                    continue
                try:
                    var.set(float(v[key]))
                    changed = True
                except (TypeError, ValueError):
                    pass
        d_ev = parse_relative_exposure_ev_delta_from_text(reply)
        if d_ev is not None and abs(float(d_ev)) > 1e-12:
            try:
                cur = float(self.var_override_exposure_mul.get())
                if cur <= 0:
                    cur = 1.0
                new_e = float(np.clip(cur * (2.0**float(d_ev)), 0.5, 2.0))
                self.var_override_exposure_mul.set(new_e)
                changed = True
            except (TypeError, ValueError):
                pass
        if changed and float(self.var_override_strength.get()) <= 1e-9:
            self.var_override_strength.set(0.5)
            self._sync_override_strength_label()

    def _sync_sample_canvas_geometry(self, *, redraw: bool = True) -> None:
        """스크롤 영역 너비에 맞춰 샘플 캔버스를 크게 잡는다(스크롤 내부는 expand만으로는 세로 여유가 없음)."""
        if self._scroll_canvas is None or self._sample_canvas is None:
            return
        self.root.update_idletasks()
        scw = max(self._scroll_canvas.winfo_width(), 320)
        inner_w = max(int(scw) - 40, 760)
        h = max(int(inner_w * 0.55), 500)
        h = min(h, 920)
        try:
            self._sample_canvas.configure(width=inner_w, height=h)
            self._sample_cap.configure(wraplength=max(inner_w - 48, 400))
        except tk.TclError:
            return
        if redraw:
            self._redraw_sample_canvas()

    def _on_sample_canvas_configure(self, _event: tk.Event) -> None:
        if self._sample_redraw_after is not None:
            try:
                self.root.after_cancel(self._sample_redraw_after)
            except tk.TclError:
                pass
        self._sample_redraw_after = self.root.after(72, self._redraw_sample_canvas)

    def _redraw_sample_canvas(self) -> None:
        self._sample_redraw_after = None
        cv = self._sample_canvas
        cv.delete("all")
        cw = max(cv.winfo_width(), 2)
        ch = max(cv.winfo_height(), 2)
        if cw < 32:
            try:
                cw = max(int(float(cv.cget("width"))), 760)
            except (tk.TclError, ValueError):
                cw = 1024
        if ch < 32:
            try:
                ch = max(int(float(cv.cget("height"))), 500)
            except (tk.TclError, ValueError):
                ch = 560
        if self._sample_pil_original is None:
            cv.create_text(
                cw // 2,
                ch // 2,
                text="(샘플 없음)",
                fill="#9aa0b0",
                font=("", 13),
                anchor=tk.CENTER,
            )
            return
        im = self._sample_pil_original
        iw, ih = im.size
        if iw < 1 or ih < 1:
            return
        scale = max(cw / iw, ch / ih)
        nw = max(1, int(round(iw * scale)))
        nh = max(1, int(round(ih * scale)))
        resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
        left = (nw - cw) // 2
        top = (nh - ch) // 2
        cropped = resized.crop((left, top, left + cw, top + ch))
        self._sample_photo_image = ImageTk.PhotoImage(cropped)
        cv.create_image(0, 0, anchor=tk.NW, image=self._sample_photo_image)

    def log(self, s: str) -> None:
        self.txt_log.insert(tk.END, s + "\n")
        self.txt_log.see(tk.END)

    @staticmethod
    def _luma_histogram_pil(rgb: Image.Image, width: int = 220, height: int = 52) -> Image.Image:
        gray = np.asarray(rgb.convert("L"), dtype=np.uint8)
        hist, _ = np.histogram(gray.ravel(), bins=width, range=(0, 255))
        hist = hist.astype(np.float64)
        mx = float(hist.max()) or 1.0
        hist = hist / mx
        bar_h = max(height - 4, 1)
        arr = np.full((height, width, 3), (28, 28, 32), dtype=np.uint8)
        for x in range(width):
            bh = int(hist[x] * bar_h)
            bh = max(bh, 1)
            y0 = height - 2 - bh
            arr[y0 : height - 2, x] = (200, 200, 215)
        return Image.fromarray(arr, mode="RGB")

    def _refresh_input_preview(self) -> None:
        self._input_preview_seq += 1
        seq = self._input_preview_seq
        ref_p = Path(os.path.expanduser(self.var_ref.get().strip()))
        rd = Path(os.path.expanduser(self.var_raw_dir.get().strip()))
        one_name = self.var_raw_one.get().strip()
        raw_path = (rd / one_name) if one_name else None

        def work() -> None:
            ref_im: Image.Image | None = None
            raw_im: Image.Image | None = None
            ref_err = ""
            raw_err = ""
            try:
                if ref_p.is_file():
                    ref_im = load_reference_pil(ref_p, 640)
            except Exception as e:
                ref_err = str(e)
            try:
                if raw_path is not None and raw_path.is_file():
                    raw_im = raw_preview_pil(raw_path, 640)
            except Exception as e:
                raw_err = str(e)

            def done() -> None:
                if seq != self._input_preview_seq:
                    return
                self._photo_input_refs.clear()
                if ref_im is not None:
                    disp = ref_im.copy()
                    disp.thumbnail((340, 340), Image.Resampling.LANCZOS)
                    ph_img = ImageTk.PhotoImage(disp)
                    ph_hist = ImageTk.PhotoImage(self._luma_histogram_pil(ref_im))
                    self._photo_input_refs.extend((ph_img, ph_hist))
                    self.lbl_in_ref.configure(image=ph_img, text="")
                    self.lbl_hist_ref.configure(image=ph_hist, text="")
                    xp = find_sidecar_xmp_path(ref_p)
                    if xp is not None:
                        n_crs = len(parse_lightroom_xmp(xp))
                        self.lbl_ref_xmp.configure(
                            text=f"참조 XMP: {xp.name} ({n_crs}개 crs 속성) — Phase2·병합에 사용"
                        )
                    else:
                        self.lbl_ref_xmp.configure(
                            text="참조 XMP: 없음 — 참조 이미지와 같은 이름의 .xmp 가 폴더에 없으면 "
                            "병합은 게인·노출만 반영됩니다."
                        )
                else:
                    msg = "(참조 없음)"
                    if ref_err:
                        msg = f"(참조 오류)\n{ref_err[:120]}"
                    self.lbl_in_ref.configure(image="", text=msg)
                    self.lbl_hist_ref.configure(image="", text="")
                    self.lbl_ref_xmp.configure(text="")
                if raw_im is not None:
                    disp = raw_im.copy()
                    disp.thumbnail((340, 340), Image.Resampling.LANCZOS)
                    ph_img = ImageTk.PhotoImage(disp)
                    ph_hist = ImageTk.PhotoImage(self._luma_histogram_pil(raw_im))
                    self._photo_input_refs.extend((ph_img, ph_hist))
                    self.lbl_in_raw.configure(image=ph_img, text="")
                    self.lbl_hist_raw.configure(image=ph_hist, text="")
                else:
                    msg = "(RAW 없음)"
                    if raw_err:
                        msg = f"(RAW 오류)\n{raw_err[:120]}"
                    elif raw_path is not None and not raw_path.is_file():
                        msg = f"(파일 없음)\n{raw_path.name}"
                    self.lbl_in_raw.configure(image="", text=msg)
                    self.lbl_hist_raw.configure(image="", text="")
                self.root.after_idle(self._sync_scroll_region)

            self.root.after(0, done)

        threading.Thread(target=work, daemon=True).start()

    def _browse_ref(self) -> None:
        p = filedialog.askopenfilename(
            title="참조 이미지",
            filetypes=[("이미지", "*.jpg *.jpeg *.png *.webp"), ("모든 파일", "*")],
        )
        if p:
            self.var_ref.set(p)
            self._refresh_input_preview()

    def _browse_raw_dir(self) -> None:
        p = filedialog.askdirectory(title="RAW 폴더")
        if p:
            self.var_raw_dir.set(p)
            self._refresh_raw_list()
            self._refresh_input_preview()

    def _browse_samples(self) -> None:
        p = filedialog.askdirectory(title="샘플 출력 폴더")
        if p:
            self.var_samples.set(p)

    def _browse_output(self) -> None:
        p = filedialog.askdirectory(title="Phase2 출력 폴더")
        if p:
            self.var_output.set(p)

    def _refresh_raw_list(self) -> None:
        d = Path(os.path.expanduser(self.var_raw_dir.get().strip()))
        if not d.is_dir():
            self.cmb_raw.configure(values=[])
            self._refresh_input_preview()
            return
        files = [p.name for p in collect_raw_files(d)]
        self.cmb_raw.configure(values=files)
        cur = self.var_raw_one.get().strip()
        if not files:
            self.var_raw_one.set("")
        elif cur and cur not in files:
            self.var_raw_one.set(files[0])
        elif not cur:
            self.var_raw_one.set(files[0])
        self._refresh_input_preview()

    def _reload_previews(self) -> None:
        self._sample_pil_original = None
        self._sample_photo_image = None
        sd = Path(os.path.expanduser(self.var_samples.get().strip()))
        labels_map: dict[str, str] = {k: "" for k in PHASE1_VARIANT_KEYS}
        pack = sd / "variants_ABC.json"
        if pack.is_file():
            try:
                data = json.loads(pack.read_text(encoding="utf-8"))
                vv = data.get("variants")
                if isinstance(vv, dict):
                    for k in labels_map:
                        blk = vv.get(k)
                        if isinstance(blk, dict) and blk.get("label"):
                            labels_map[k] = str(blk["label"]).strip()
            except (OSError, json.JSONDecodeError):
                pass
        cap_lines: list[str] = []
        for key in PHASE1_VARIANT_KEYS:
            _, cap = self._sample_cells[key]
            p = sd / f"sample_{key}.jpg"
            cap_txt = labels_map[key] or ""
            if cap_txt:
                cap_lines.append(f"{key} · {cap_txt[:100]}{'…' if len(cap_txt) > 100 else ''}")
            if not p.is_file():
                continue
            try:
                self._sample_pil_original = Image.open(p).convert("RGB").copy()
            except OSError as e:
                self.log(f"샘플 {key}: {e}")
        cap = self._sample_cap
        cap.configure(text="\n".join(cap_lines) if cap_lines else "")
        self.root.update_idletasks()
        self._sync_sample_canvas_geometry()
        self.root.after_idle(self._sync_scroll_region)

    def _show_phase1_generating(self) -> None:
        self.lbl_sample_status.configure(text="샘플 1장 생성 중…")
        self._sample_pil_original = None
        self._sample_photo_image = None
        self._sync_sample_canvas_geometry(redraw=False)
        cv = self._sample_canvas
        cv.delete("all")
        self.root.update_idletasks()
        try:
            cw = max(cv.winfo_width(), int(float(cv.cget("width"))))
            ch = max(cv.winfo_height(), int(float(cv.cget("height"))))
        except (tk.TclError, ValueError):
            cw, ch = 1024, 560
        cv.create_text(
            cw // 2,
            ch // 2,
            text="생성 중…",
            fill="#4a9eff",
            font=("", 15),
            anchor=tk.CENTER,
        )
        self._sample_cap.configure(text="")
        self.root.update_idletasks()
        self.root.after_idle(self._sync_scroll_region)

    def _clear_samples(self) -> None:
        if self.var_busy:
            messagebox.showinfo("안내", "Phase1·Phase2·채팅 전송 등 작업이 끝난 뒤에 샘플을 비울 수 있습니다.")
            return
        sd = Path(os.path.expanduser(self.var_samples.get().strip()))
        if not messagebox.askyesno(
            "샘플 비우기",
            f"다음 폴더에서 샘플 JPG·JSON 을 삭제합니다.\n{sd}\n\n"
            "• sample_01.jpg\n"
            "• (구버전) sample_A/B/C.jpg\n"
            "• variants_ABC.json, variants_meta.json\n\n"
            "계속할까요?",
        ):
            return
        if not sd.is_dir():
            messagebox.showinfo("안내", "샘플 폴더가 없습니다.")
            self._reload_previews()
            return
        names: list[str] = ["variants_ABC.json", "variants_meta.json"]
        for k in PHASE1_VARIANT_KEYS:
            names.append(f"sample_{k}.jpg")
            names.append(f"sample_{k}_stage1.jpg")
        for leg in ("A", "B", "C"):
            names.append(f"sample_{leg}.jpg")
        err: str | None = None
        for name in names:
            p = sd / name
            if p.is_file():
                try:
                    p.unlink()
                except OSError as e:
                    err = str(e)
                    break
        if err:
            messagebox.showerror("삭제 실패", err)
            self._reload_previews()
            return
        self._pack_path = None
        self.lbl_sample_status.configure(text="")
        self._reload_previews()
        self.log("샘플 파일을 비웠습니다.")

    def _run_phase1(self) -> None:
        if self.var_busy:
            return
        ref = Path(os.path.expanduser(self.var_ref.get().strip()))
        rd = Path(os.path.expanduser(self.var_raw_dir.get().strip()))
        one_name = self.var_raw_one.get().strip()
        if not ref.is_file():
            messagebox.showwarning("필수", "참조 이미지를 지정하세요.")
            return
        if not rd.is_dir() or not one_name:
            messagebox.showwarning("필수", "RAW 폴더와 기준 RAW 파일을 선택하세요.")
            return
        raw_one = rd / one_name
        if not raw_one.is_file():
            messagebox.showerror("오류", f"RAW 없음: {raw_one}")
            return
        key = self.ent_key.get().strip() or os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            messagebox.showwarning("필수", "Gemini API 키를 입력하세요.")
            return
        samples = Path(os.path.expanduser(self.var_samples.get().strip()))
        model = self.var_model.get().strip() or "gemini-2.5-flash"
        self.var_busy = True
        self._show_phase1_generating()

        def work() -> None:
            err: str | None = None
            analysis = ""
            try:
                hm_a = float(max(0.0, min(1.0, self.var_histogram_alpha.get())))
                analysis, _v, pack = run_phase1_samples(
                    reference_path=ref,
                    raw_one_path=raw_one,
                    sample_dir=samples,
                    api_key=key,
                    model_name=model,
                    preview_max=1536,
                    sample_quality=82,
                    half_size=True,
                    histogram_match_alpha=hm_a,
                    override_simple_params={
                        "r_gain": float(self.var_override_r.get()),
                        "g_gain": float(self.var_override_g.get()),
                        "b_gain": float(self.var_override_b.get()),
                        "exposure_mul": float(self.var_override_exposure_mul.get()),
                    },
                    override_strength=float(max(0.0, min(1.0, self.var_override_strength.get()))),
                )
                self._pack_path = pack
            except Exception as e:
                err = str(e)
                analysis = ""

            def done() -> None:
                self.var_busy = False
                self.lbl_sample_status.configure(text="")
                if err:
                    messagebox.showerror("Phase1 실패", err)
                    self.log(err)
                    self._reload_previews()
                    self.root.after_idle(self._sync_scroll_region)
                    return
                self.txt_analysis.delete("1.0", tk.END)
                self.txt_analysis.insert("1.0", analysis)
                self._reload_previews()
                self._refresh_input_preview()
                self.log(
                    f"Phase1 완료 → {samples} (sample_01_stage1.jpg, sample_01.jpg, variants_ABC.json)"
                )
                self.root.after_idle(self._sync_scroll_region)

            self.root.after(0, done)

        threading.Thread(target=work, daemon=True).start()
        self.log("Phase1 실행 중…")

    def _run_phase2(self) -> None:
        if self.var_busy:
            return
        sd = Path(os.path.expanduser(self.var_samples.get().strip()))
        pack = sd / "variants_ABC.json"
        if not pack.is_file():
            messagebox.showwarning("필수", "먼저 Phase1 을 실행하거나 variants_ABC.json 경로를 확인하세요.")
            return
        ind = Path(os.path.expanduser(self.var_raw_dir.get().strip()))
        outd = Path(os.path.expanduser(self.var_output.get().strip()))
        if not ind.is_dir():
            messagebox.showwarning("필수", "RAW 폴더를 지정하세요.")
            return
        outd.mkdir(parents=True, exist_ok=True)
        choice = self.var_choice.get().strip()
        if len(choice) == 1 and choice.isalpha():
            choice = choice.upper()
        try:
            params = load_variant_choice_from_pack(pack, choice)
        except Exception as e:
            messagebox.showerror("오류", str(e))
            return
        ref_hist = Path(os.path.expanduser(self.var_ref.get().strip()))
        self.var_busy = True

        def work() -> None:
            err: str | None = None
            n = 0
            try:
                hm_a = float(max(0.0, min(1.0, self.var_histogram_alpha.get())))
                n = run_phase2_batch(
                    input_dir=ind,
                    output_dir=outd,
                    params=params,
                    jpeg_quality=95,
                    verbose=True,
                    pack_path=pack,
                    reference_for_histogram=ref_hist if ref_hist.is_file() else None,
                    histogram_match_alpha=hm_a,
                    write_jpeg=bool(self.var_phase2_jpeg.get()),
                    write_sidecar_xmp=True,
                )
            except Exception as e:
                err = str(e)

            def done() -> None:
                self.var_busy = False
                if err:
                    messagebox.showerror("Phase2 실패", err)
                    self.log(err)
                else:
                    jpg_note = " + JPG" if self.var_phase2_jpeg.get() else ""
                    self.log(f"Phase2 완료: {n}장 — RAW 옆 .xmp{jpg_note} → {outd}")

            self.root.after(0, done)

        threading.Thread(target=work, daemon=True).start()
        self.log(f"Phase2 실행 중… (선택 {choice})")

    # --- chat ---
    def _on_chat_history_key(self, event: tk.Event) -> str | None:
        """대화 표시창은 읽기 전용. 선택·복사·이동만 허용 (⌘/Ctrl 조합은 bind_class 로 처리)."""
        st = event.state
        if st & ~0x0001:
            return
        ks = event.keysym
        if ks in ("Up", "Down", "Left", "Right", "Prior", "Next", "Home", "End"):
            return
        if ks in ("BackSpace", "Delete", "Return", "KP_Enter", "Tab"):
            return "break"
        if event.char:
            return "break"
        return

    def _on_chat_history_menu(self, event: tk.Event) -> str:
        m = tk.Menu(self.root, tearoff=0)
        try:
            if self.txt_chat.tag_ranges(tk.SEL):
                m.add_command(label="복사", command=self._chat_copy_selection_to_clipboard)
        except tk.TclError:
            pass
        m.add_command(label="전체 선택", command=self._chat_select_all_for_copy)
        m.add_command(label="전체 대화 복사", command=self._chat_copy_all_to_clipboard)
        try:
            m.tk_popup(event.x_root, event.y_root)
        finally:
            try:
                m.grab_release()
            except tk.TclError:
                pass
        return "break"

    def _chat_copy_selection_to_clipboard(self) -> None:
        try:
            if self.txt_chat.tag_ranges(tk.SEL):
                t = self.txt_chat.get(tk.SEL_FIRST, tk.SEL_LAST)
                self.root.clipboard_clear()
                self.root.clipboard_append(t)
        except tk.TclError:
            pass

    def _chat_select_all_for_copy(self) -> None:
        self.txt_chat.tag_add(tk.SEL, "1.0", tk.END)

    def _chat_copy_all_to_clipboard(self) -> None:
        t = self.txt_chat.get("1.0", tk.END)
        self.root.clipboard_clear()
        self.root.clipboard_append(t)

    def _chat_refresh(self) -> None:
        self.txt_chat.delete("1.0", tk.END)
        if not self._chat_messages:
            self.txt_chat.insert(
                tk.END,
                "스타일 파이프라인·파라미터·코드 수정을 물어보세요.\n"
                "코드 반영은 # STYLE_TOOL_WRITE path=파일.py 와 ```python 블록으로 답한 뒤 "
                "「직전 답변 적용」을 누르세요.\n\n"
                "※ 대화 내용은 마우스로 드래그해 선택한 뒤 ⌘C(또는 Ctrl+C)·우클릭 «복사»로 일부만 복사할 수 있습니다. "
                "맨 아래 입력란에 붙여넣으려면 ⌘V 하세요.\n\n",
            )
        for m in self._chat_messages:
            who = "나" if m["role"] == "user" else "Gemini"
            self.txt_chat.insert(tk.END, f"【{who}】\n{m.get('text', '')}\n\n")
        self.txt_chat.see(tk.END)

    def _save_chat(self) -> None:
        try:
            CHAT_HISTORY_PATH.write_text(
                json.dumps({"version": 1, "messages": self._chat_messages}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
        except OSError:
            pass

    def _load_chat_history(self) -> None:
        self._chat_messages = []
        if not CHAT_HISTORY_PATH.is_file():
            self._chat_refresh()
            return
        try:
            data = json.loads(CHAT_HISTORY_PATH.read_text(encoding="utf-8"))
            for it in data.get("messages", []):
                if isinstance(it, dict) and it.get("role") in ("user", "model"):
                    t = it.get("text", "")
                    if isinstance(t, str):
                        self._chat_messages.append({"role": it["role"], "text": t})
        except (OSError, json.JSONDecodeError):
            pass
        self._chat = None
        self._chat_key = None
        self._chat_model = None
        self._chat_refresh()

    def _chat_reset(self) -> None:
        if not messagebox.askyesno("확인", "대화를 비울까요?"):
            return
        self._chat_messages = []
        self._chat = None
        self._chat_key = None
        self._chat_model = None
        self._save_chat()
        self._chat_refresh()

    def _chat_send(self) -> None:
        if self.var_busy:
            return
        text = self.ent_chat.get().strip()
        if not text:
            return
        self.ent_chat.delete(0, tk.END)
        key = self.ent_key.get().strip() or os.environ.get("GEMINI_API_KEY", "").strip()
        if not key:
            messagebox.showwarning("필수", "API 키가 필요합니다.")
            return
        model_name = self.var_model.get().strip() or "gemini-2.5-flash"
        self._chat_messages.append({"role": "user", "text": text})
        self._chat_refresh()
        self._save_chat()
        self.var_busy = True

        def work() -> None:
            err: str | None = None
            reply = ""
            try:
                import google.generativeai as genai

                genai.configure(api_key=key)
                try:
                    model = genai.GenerativeModel(model_name, system_instruction=SYSTEM_INSTRUCTION)
                except TypeError:
                    model = genai.GenerativeModel(model_name)
                need = (
                    self._chat is None
                    or self._chat_key != key
                    or self._chat_model != model_name
                )
                if need:
                    hist = [{"role": m["role"], "parts": [m["text"]]} for m in self._chat_messages[:-1]]
                    self._chat = model.start_chat(history=hist)
                    self._chat_key = key
                    self._chat_model = model_name
                    resp = self._chat.send_message(self._chat_messages[-1]["text"])
                else:
                    assert self._chat is not None
                    resp = self._chat.send_message(text)
                try:
                    reply = (resp.text or "").strip()
                except ValueError:
                    reply = "(응답 텍스트 없음)"
            except Exception as e:
                err = str(e)
                if self._chat_messages and self._chat_messages[-1]["role"] == "user":
                    self._chat_messages.pop()

            def done() -> None:
                self.var_busy = False
                if err:
                    self._chat = None
                    self._chat_key = None
                    self._chat_model = None
                    messagebox.showerror("채팅", err)
                    self._chat_refresh()
                    self._save_chat()
                    return
                self._chat_messages.append({"role": "model", "text": reply})
                self._chat_refresh()
                self._save_chat()
                self._apply_override_from_chat_reply(reply)

            self.root.after(0, done)

        threading.Thread(target=work, daemon=True).start()

    def _apply_chat(self) -> None:
        last = ""
        for m in reversed(self._chat_messages):
            if m["role"] == "model":
                last = m["text"]
                break
        if not last:
            messagebox.showinfo("안내", "적용할 답변이 없습니다.")
            return
        blocks = parse_style_tool_write_blocks(last)
        if not blocks:
            hint = (
                "마지막 Gemini 답변 안에 ‘코드로 파일을 바꾸라’는 형식이 없습니다.\n\n"
                "「직전 답변 적용」은 아래 형식이 **그대로** 들어 있을 때만 동작합니다.\n\n"
                "  # STYLE_TOOL_WRITE path=style_transfer_core.py\n"
                "  ```python\n"
                "  (여기에 전체 또는 일부 코드)\n"
                "  ```\n\n"
                "먼저 채팅에서 예: 「style_transfer_core.py 의 프롬프트에 화이트밸런스 설명을 "
                "추가해 주고, 위 형식으로 패치 제안해줘」처럼 요청한 뒤, "
                "답변이 온 다음 이 버튼을 누르세요.\n\n"
                "설명만 주고 코드 블록이 없으면 적용할 수 없습니다."
            )
            if "```" in last and "STYLE_TOOL_WRITE" not in last.upper():
                hint += (
                    "\n\n(힌트: 답변에 ```python 펜스는 있는데 STYLE_TOOL_WRITE 줄이 없습니다. "
                    "한 줄을 추가해 달라고 다시 요청해 보세요.)"
                )
            messagebox.showinfo("STYLE_TOOL_WRITE 없음", hint)
            return
        for rel, code in blocks:
            target = safe_script_path(SCRIPT_DIR, rel)
            if target is None:
                messagebox.showerror("거부", f"안전하지 않은 경로: {rel!r}")
                continue
            preview = code[:400] + ("…" if len(code) > 400 else "")
            if not messagebox.askyesno(
                "덮어쓰기",
                f"{target.relative_to(SCRIPT_DIR)}\n\n{preview}\n\n저장할까요?",
            ):
                continue
            try:
                target.write_text(code, encoding="utf-8")
                self.log(f"저장: {target}")
                messagebox.showinfo("완료", f"저장했습니다.\n{target.name}")
            except OSError as e:
                messagebox.showerror("실패", str(e))

    def run(self) -> None:
        self.root.mainloop()


def main() -> None:
    StyleTransferGui().run()


if __name__ == "__main__":
    main()
