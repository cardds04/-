#!/usr/bin/env python3
"""
RAW + rawpy + Gemini — 설정을 화면에서 채우고 터미널과 동일하게 실행합니다.

  cd tools/darktable-gemini-batch
  pip install -r requirements.txt
  python darktable_gemini_batch_gui.py

  python darktable_gemini_batch.py --config darktable_gemini_config.json

darktable-cli / XMP 는 쓰지 않습니다. Gemini 프롬프트는 JSON 현상 파라미터용입니다.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, scrolledtext, ttk

from darktable_gemini_assistant_shared import (
    SYSTEM_INSTRUCTION,
    parse_write_blocks,
    safe_script_path,
)

SCRIPT_DIR = Path(__file__).resolve().parent
CHAT_HISTORY_PATH = SCRIPT_DIR / "darktable_gemini_chat_history.json"
BATCH_SCRIPT = SCRIPT_DIR / "darktable_gemini_batch.py"
DEFAULT_CONFIG_PATH = SCRIPT_DIR / "darktable_gemini_config.json"
EXAMPLE_CONFIG = SCRIPT_DIR / "darktable_gemini_config.example.json"
GUI_SETTINGS_PATH = SCRIPT_DIR / "darktable_gemini_gui_settings.json"

_READONLY_NAV_KEYS = frozenset(
    {
        "Up",
        "Down",
        "Left",
        "Right",
        "Home",
        "End",
        "Next",
        "Prior",
        "Shift_L",
        "Shift_R",
        "Control_L",
        "Control_R",
        "Meta_L",
        "Meta_R",
        "Alt_L",
        "Alt_R",
        "ISO_Left_Tab",
    }
)


def _import_batch():
    import importlib.util

    spec = importlib.util.spec_from_file_location("darktable_gemini_batch", BATCH_SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("darktable_gemini_batch.py 를 불러올 수 없습니다.")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_batch = None


def batch_mod():
    global _batch
    if _batch is None:
        _batch = _import_batch()
    return _batch


def count_images(folder: Path) -> int:
    if not folder.is_dir():
        return 0
    bm = batch_mod()
    return len(bm.collect_images(folder))


class DarktableGeminiGui:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("RAW · rawpy + Gemini 일괄 현상 (설정)")
        self.root.minsize(820, 720)

        self.var_config_path = tk.StringVar(value=str(DEFAULT_CONFIG_PATH))
        self.var_input = tk.StringVar()
        self.var_output = tk.StringVar()
        self.var_out_ext = tk.StringVar(value="jpg")
        self.var_use_gemini = tk.BooleanVar(value=True)
        self.var_fixed_params_file = tk.StringVar()
        self.var_ref = tk.StringVar()
        self.var_preview_max = tk.StringVar(value="1200")
        self.var_jpeg_quality = tk.StringVar(value="92")
        self.var_model = tk.StringVar(value="gemini-2.5-flash")
        self.var_verbose = tk.BooleanVar(value=False)
        self.var_show_api_key = tk.BooleanVar(value=False)

        self._count_lbl: ttk.Label | None = None

        self._nano_chat_messages: list[dict[str, str]] = []
        self._nano_chat = None
        self._nano_chat_key: str | None = None
        self._nano_chat_model: str | None = None
        self._nano_chat_busy = False

        self._recent_log_max_chars = 14000
        self._recent_log_text = ""
        self.var_nano_attach_log = tk.BooleanVar(value=True)
        self.var_nano_auto_apply = tk.BooleanVar(value=True)

        self._build_ui()
        self._load_gui_settings()
        self._load_nano_chat_history()
        self.var_input.trace_add("write", lambda *_: self._refresh_count())

    def _build_ui(self) -> None:
        outer = ttk.Frame(self.root, padding=10)
        outer.pack(fill=tk.BOTH, expand=True)

        guide = ttk.LabelFrame(outer, text="무엇을 넣으면 되나요? (순서대로)", padding=10)
        guide.pack(fill=tk.X, pady=(0, 10))
        guide_txt = (
            "① 입력 폴더 — .ARW 등 RAW만 집계됩니다(맥 ._* 파일 제외).\n"
            "② 출력 폴더 — JPG 가 저장됩니다.\n"
            "③ Gemini 사용 시 — 폴더 첫 RAW에서 미리보기를 뽑아 JSON 파라미터를 받습니다. "
            "다른 장을 쓰려면「참조 RAW」경로를 지정하세요.\n"
            "④ Gemini 끄기 —「고정 파라미터 JSON 파일」에 exposure_ev, bright, user_wb, lens 를 넣고 체크를 끕니다."
        )
        ttk.Label(guide, text=guide_txt, wraplength=780, justify=tk.LEFT).pack(anchor=tk.W)

        # 설정 JSON 경로
        row0 = ttk.Frame(outer)
        row0.pack(fill=tk.X, pady=4)
        ttk.Label(row0, text="저장할 설정 파일").pack(side=tk.LEFT)
        ent_cfg = ttk.Entry(row0, textvariable=self.var_config_path, width=70)
        ent_cfg.pack(side=tk.LEFT, padx=8, fill=tk.X, expand=True)
        self._bind_entry_clipboard(ent_cfg)
        ttk.Button(row0, text="찾아보기…", command=self.browse_config_save).pack(side=tk.LEFT)

        f = ttk.LabelFrame(outer, text="경로", padding=8)
        f.pack(fill=tk.X, pady=8)

        self._row_path(f, 0, "입력 폴더 (RAW)", self.var_input, self.browse_input, show_count=True)
        self._row_path(f, 1, "출력 폴더 (JPG)", self.var_output, self.browse_output)

        row_fp = ttk.Frame(f)
        row_fp.grid(row=2, column=0, columnspan=3, sticky=tk.EW, pady=(8, 0))
        ttk.Label(row_fp, text="고정 파라미터 JSON").grid(row=0, column=0, sticky=tk.W)
        ent_fp = ttk.Entry(row_fp, textvariable=self.var_fixed_params_file, width=55)
        ent_fp.grid(row=0, column=1, padx=6, sticky=tk.EW)
        self._bind_entry_clipboard(ent_fp)
        ttk.Button(row_fp, text="찾아보기…", command=self.browse_fixed_params).grid(row=0, column=2)
        row_fp.columnconfigure(1, weight=1)

        r3 = ttk.Frame(f)
        r3.grid(row=3, column=0, columnspan=3, sticky=tk.EW, pady=(8, 0))
        ttk.Label(r3, text="참조 RAW (선택)").pack(side=tk.LEFT)
        ent_ref = ttk.Entry(r3, textvariable=self.var_ref, width=55)
        ent_ref.pack(side=tk.LEFT, padx=6, fill=tk.X, expand=True)
        self._bind_entry_clipboard(ent_ref)
        ttk.Button(r3, text="찾아보기…", command=self.browse_ref).pack(side=tk.LEFT)

        f.columnconfigure(1, weight=1)

        opt = ttk.LabelFrame(outer, text="출력 / Gemini", padding=8)
        opt.pack(fill=tk.X, pady=8)

        r1 = ttk.Frame(opt)
        r1.pack(fill=tk.X)
        ttk.Label(r1, text="확장자").pack(side=tk.LEFT)
        ttk.Combobox(
            r1,
            textvariable=self.var_out_ext,
            values=("jpg", "jpeg"),
            width=10,
            state="readonly",
        ).pack(side=tk.LEFT, padx=8)
        ttk.Checkbutton(r1, text="Gemini 로 파라미터 요청", variable=self.var_use_gemini).pack(
            side=tk.LEFT, padx=12
        )
        ttk.Checkbutton(r1, text="자세한 로그 (-v)", variable=self.var_verbose).pack(side=tk.LEFT)

        r1b = ttk.Frame(opt)
        r1b.pack(fill=tk.X, pady=(8, 0))
        ttk.Label(r1b, text="미리보기 긴 변(px)").pack(side=tk.LEFT)
        ent_pm = ttk.Entry(r1b, textvariable=self.var_preview_max, width=8)
        ent_pm.pack(side=tk.LEFT, padx=6)
        self._bind_entry_clipboard(ent_pm)
        ttk.Label(r1b, text="JPEG 품질").pack(side=tk.LEFT, padx=(16, 4))
        ent_jq = ttk.Entry(r1b, textvariable=self.var_jpeg_quality, width=6)
        ent_jq.pack(side=tk.LEFT)
        self._bind_entry_clipboard(ent_jq)

        r4 = ttk.Frame(opt)
        r4.pack(fill=tk.X, pady=(8, 0))
        ttk.Label(r4, text="모델").pack(side=tk.LEFT)
        ent_model = ttk.Entry(r4, textvariable=self.var_model, width=40)
        ent_model.pack(side=tk.LEFT, padx=8)
        self._bind_entry_clipboard(ent_model)

        key_fr = ttk.Frame(opt)
        key_fr.pack(fill=tk.X, pady=(8, 0))
        key_fr.columnconfigure(1, weight=1)
        ttk.Label(key_fr, text="Gemini API 키").grid(row=0, column=0, sticky=tk.W)
        self.ent_key = ttk.Entry(key_fr, width=40, show="•")
        self.ent_key.grid(row=0, column=1, padx=6, sticky=tk.EW)
        ttk.Button(key_fr, text="클립보드 붙여넣기", command=self.paste_api_key_from_clipboard).grid(
            row=0, column=2, padx=(0, 4)
        )
        ttk.Checkbutton(
            key_fr,
            text="키 표시",
            variable=self.var_show_api_key,
            command=self._sync_api_key_show,
        ).grid(row=0, column=3, padx=(0, 8))
        ttk.Label(key_fr, text="Cmd+V · 비우면 환경 변수", font=("", 9)).grid(row=0, column=4, sticky=tk.W)
        envk = os.environ.get("GEMINI_API_KEY", "").strip()
        if envk:
            self.ent_key.insert(0, envk)
        self._bind_entry_clipboard(self.ent_key)

        ttk.Label(opt, text="Gemini 프롬프트 (JSON 현상 파라미터만 받도록 지시)").pack(
            anchor=tk.W, pady=(10, 2)
        )
        self.txt_prompt = tk.Text(opt, height=5, wrap=tk.WORD, font=("system", 11))
        self.txt_prompt.pack(fill=tk.X)
        self.txt_prompt.insert("1.0", batch_mod().DEFAULT_PROMPT)
        self._bind_text_clipboard(self.txt_prompt)
        ttk.Label(
            opt,
            text="「입력→배치 프롬프트」는 이 칸으로 복사합니다. Gemini 끄면 고정 JSON 파일만 사용됩니다.",
            wraplength=760,
            font=("", 9),
            foreground="#444",
        ).pack(anchor=tk.W, pady=(4, 0))

        chat_fr = ttk.LabelFrame(
            outer,
            text="나노바나나 — 대화·로그·코드 반영 (rawpy 배치는 「배치 실행」)",
            padding=8,
        )
        chat_fr.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        self.txt_nano_chat = scrolledtext.ScrolledText(
            chat_fr, height=12, wrap=tk.WORD, font=("system", 11)
        )
        self.txt_nano_chat.pack(fill=tk.BOTH, expand=True)
        self._setup_readonly_text(self.txt_nano_chat)
        chat_top = ttk.Frame(chat_fr)
        chat_top.pack(fill=tk.X, pady=(0, 4))
        ttk.Button(chat_top, text="대화 전체 복사", command=self._copy_nano_chat_all).pack(side=tk.LEFT)
        ttk.Label(chat_top, text="(Cmd+A/C)", font=("", 9)).pack(side=tk.LEFT, padx=(4, 12))
        ttk.Checkbutton(
            chat_top,
            text="전송 시 최근 실행 로그 자동 첨부",
            variable=self.var_nano_attach_log,
        ).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Checkbutton(
            chat_top,
            text="DARKTABLE_TOOL_WRITE 는 확인 없이 자동 저장",
            variable=self.var_nano_auto_apply,
        ).pack(side=tk.LEFT)
        chat_top2 = ttk.Frame(chat_fr)
        chat_top2.pack(fill=tk.X, pady=(2, 0))
        ttk.Label(
            chat_top2,
            text="로그는 이 창에 쌓인 최근 텍스트만 잘라 붙입니다. 자동 저장은 이 도구 폴더의 .py 만 바뀌며, RAW 일괄 처리는 「배치 실행」.",
            font=("", 9),
            foreground="#444",
            wraplength=780,
        ).pack(anchor=tk.W)
        chat_row = ttk.Frame(chat_fr)
        chat_row.pack(fill=tk.X, pady=(8, 0))
        self.ent_nano_chat = ttk.Entry(chat_row)
        self.ent_nano_chat.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        self._bind_entry_clipboard(self.ent_nano_chat)
        self.ent_nano_chat.bind("<Return>", lambda e: self._nano_chat_send())
        ttk.Button(chat_row, text="전송", command=self._nano_chat_send).pack(side=tk.LEFT, padx=2)
        ttk.Button(chat_row, text="파일 첨부 보내기", command=self._nano_chat_send_with_file).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(chat_row, text="직전 답변 적용", command=self._nano_apply_last_reply).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(chat_row, text="입력→배치 프롬프트", command=self._copy_nano_input_to_batch_prompt).pack(
            side=tk.LEFT, padx=2
        )
        ttk.Button(chat_row, text="대화 비우기", command=self._nano_chat_reset).pack(side=tk.LEFT, padx=2)

        btn = ttk.Frame(outer)
        btn.pack(fill=tk.X, pady=10)
        ttk.Button(btn, text="예시 JSON 열기", command=self.open_example).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn, text="설정 JSON 저장", command=self.save_config_clicked).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn, text="설정 JSON 불러오기", command=self.load_config_clicked).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn, text="배치 실행 (터미널과 동일)", command=self.run_batch).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn, text="GUI 상태 저장", command=self.save_gui_settings).pack(side=tk.LEFT)

        log_hdr = ttk.Frame(outer)
        log_hdr.pack(fill=tk.X, pady=(8, 0))
        ttk.Label(log_hdr, text="실행 로그", font=("", 10, "bold")).pack(side=tk.LEFT)
        ttk.Button(log_hdr, text="로그 전체 복사", command=self._copy_log_all).pack(side=tk.LEFT, padx=12)
        ttk.Label(log_hdr, text="Cmd+A/C", font=("", 9)).pack(side=tk.LEFT)
        self.log_w = scrolledtext.ScrolledText(outer, height=10, font=("Courier", 11))
        self.log_w.pack(fill=tk.BOTH, expand=True, pady=4)
        self._setup_readonly_text(self.log_w)

    def _row_path(
        self,
        parent: ttk.Frame,
        row: int,
        label: str,
        var: tk.StringVar,
        cmd,
        *,
        show_count: bool = False,
    ) -> ttk.Entry:
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky=tk.NW, pady=4)
        e = ttk.Entry(parent, textvariable=var, width=70)
        e.grid(row=row, column=1, padx=6, pady=4, sticky=tk.EW)
        ttk.Button(parent, text="찾아보기…", command=cmd).grid(row=row, column=2, pady=4)
        if show_count:
            self._count_lbl = ttk.Label(parent, text="—")
            self._count_lbl.grid(row=row, column=3, padx=8, sticky=tk.W)
        self._bind_entry_clipboard(e)
        return e

    def _clipboard_get(self) -> str | None:
        try:
            return self.root.clipboard_get()
        except tk.TclError:
            return None

    def _clipboard_set(self, text: str) -> None:
        self.root.clipboard_clear()
        self.root.clipboard_append(text)

    def _bind_entry_clipboard(self, w: ttk.Entry) -> None:
        def paste(_e: tk.Event | None = None) -> str:
            clip = self._clipboard_get()
            if clip is None:
                return "break"
            if w.selection_present():
                w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            w.insert(tk.INSERT, clip)
            return "break"

        def copy(_e: tk.Event | None = None) -> str:
            if w.selection_present():
                self._clipboard_set(w.selection_get())
            return "break"

        def cut(_e: tk.Event | None = None) -> str:
            if w.selection_present():
                self._clipboard_set(w.selection_get())
                w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            return "break"

        def sel_all(_e: tk.Event | None = None) -> str:
            w.selection_range(0, tk.END)
            w.icursor(tk.END)
            return "break"

        for seq in ("<Command-v>", "<Control-v>", "<<Paste>>"):
            w.bind(seq, paste)
        for seq in ("<Command-c>", "<Control-c>"):
            w.bind(seq, copy)
        for seq in ("<Command-x>", "<Control-x>"):
            w.bind(seq, cut)
        for seq in ("<Command-a>", "<Control-a>"):
            w.bind(seq, sel_all)

    def _bind_text_clipboard(self, w: tk.Text) -> None:
        def paste(_e: tk.Event | None = None) -> str:
            clip = self._clipboard_get()
            if clip is None:
                return "break"
            if w.tag_ranges(tk.SEL):
                w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            w.insert(tk.INSERT, clip)
            return "break"

        def copy(_e: tk.Event | None = None) -> str:
            if w.tag_ranges(tk.SEL):
                self._clipboard_set(w.get(tk.SEL_FIRST, tk.SEL_LAST))
            return "break"

        def cut(_e: tk.Event | None = None) -> str:
            if w.tag_ranges(tk.SEL):
                self._clipboard_set(w.get(tk.SEL_FIRST, tk.SEL_LAST))
                w.delete(tk.SEL_FIRST, tk.SEL_LAST)
            return "break"

        def sel_all(_e: tk.Event | None = None) -> str:
            w.tag_add(tk.SEL, "1.0", tk.END)
            return "break"

        for seq in ("<Command-v>", "<Control-v>", "<<Paste>>"):
            w.bind(seq, paste)
        for seq in ("<Command-c>", "<Control-c>"):
            w.bind(seq, copy)
        for seq in ("<Command-x>", "<Control-x>"):
            w.bind(seq, cut)
        for seq in ("<Command-a>", "<Control-a>"):
            w.bind(seq, sel_all)

    def _text_copy_selection_or_all(self, w: tk.Text) -> None:
        if w.tag_ranges(tk.SEL):
            self._clipboard_set(w.get(tk.SEL_FIRST, tk.SEL_LAST))
        else:
            body = w.get("1.0", "end-1c")
            if body.strip():
                self._clipboard_set(body)

    def _setup_readonly_text(self, w: tk.Text) -> None:
        w.configure(state=tk.NORMAL)

        def on_key(event: tk.Event) -> str | None:
            if event.keysym == "Tab":
                nxt = event.widget.tk_focusNext()
                if nxt:
                    nxt.focus()
                return "break"
            if event.keysym in _READONLY_NAV_KEYS:
                return None
            st = event.state or 0
            if st & 0x4 or st & 0x8 or st & 0x20000 or st & 0x40000 or st >= 0x10000:
                return None
            if event.keysym in ("BackSpace", "Delete", "Return", "space"):
                return "break"
            ch = event.char
            if ch and ch.isprintable():
                return "break"
            return None

        w.bind("<Key>", on_key)

        def sel_all(_e: tk.Event | None = None) -> str:
            w.tag_add(tk.SEL, "1.0", tk.END)
            return "break"

        def copy_c(_e: tk.Event | None = None) -> str:
            self._text_copy_selection_or_all(w)
            return "break"

        for seq in ("<Command-a>", "<Control-a>"):
            w.bind(seq, sel_all)
        for seq in ("<Command-c>", "<Control-c>"):
            w.bind(seq, copy_c)

    def _copy_log_all(self) -> None:
        body = self.log_w.get("1.0", "end-1c")
        if not body.strip():
            messagebox.showinfo("안내", "복사할 로그가 없습니다.")
            return
        self._clipboard_set(body)
        self.log("(클립보드에 로그 전체를 복사했습니다.)")

    def _copy_nano_chat_all(self) -> None:
        body = self.txt_nano_chat.get("1.0", "end-1c")
        if not body.strip():
            messagebox.showinfo("안내", "복사할 대화가 없습니다.")
            return
        self._clipboard_set(body)
        self.log("(클립보드에 나노바나나 대화 전체를 복사했습니다.)")

    def log(self, msg: str) -> None:
        self.log_w.configure(state=tk.NORMAL)
        self.log_w.insert(tk.END, msg + "\n")
        self.log_w.see(tk.END)
        self.log_w.configure(state=tk.NORMAL)
        chunk = msg + "\n"
        self._recent_log_text = (self._recent_log_text + chunk)[-self._recent_log_max_chars :]

    def browse_config_save(self) -> None:
        p = filedialog.asksaveasfilename(
            title="설정 JSON 저장 위치",
            initialdir=str(SCRIPT_DIR),
            initialfile=Path(self.var_config_path.get()).name,
            defaultextension=".json",
            filetypes=[("JSON", "*.json"), ("모든 파일", "*")],
        )
        if p:
            self.var_config_path.set(p)

    def browse_input(self) -> None:
        p = filedialog.askdirectory(title="입력 폴더 (원본 사진)")
        if p:
            self.var_input.set(p)
            self._refresh_count()

    def browse_output(self) -> None:
        p = filedialog.askdirectory(title="출력 폴더")
        if p:
            self.var_output.set(p)

    def browse_fixed_params(self) -> None:
        p = filedialog.askopenfilename(
            title="고정 현상 파라미터 JSON",
            initialdir=str(SCRIPT_DIR),
            filetypes=[("JSON", "*.json"), ("모든 파일", "*")],
        )
        if p:
            self.var_fixed_params_file.set(p)

    def browse_ref(self) -> None:
        p = filedialog.askopenfilename(
            title="Gemini 미리보기에 쓸 참조 RAW",
            filetypes=[
                ("RAW", "*.arw *.cr2 *.cr3 *.nef *.dng"),
                ("모든 파일", "*"),
            ],
        )
        if p:
            self.var_ref.set(p)

    def _sync_api_key_show(self) -> None:
        self.ent_key.configure(show="" if self.var_show_api_key.get() else "•")

    def paste_api_key_from_clipboard(self, *, silent: bool = False) -> None:
        try:
            text = self.root.clipboard_get()
        except tk.TclError:
            if not silent:
                messagebox.showwarning("클립보드", "붙여넣을 텍스트가 없습니다.")
            return
        text = text.strip()
        if not text:
            if not silent:
                messagebox.showwarning("클립보드", "클립보드 내용이 비었습니다.")
            return
        self.ent_key.delete(0, tk.END)
        self.ent_key.insert(0, text)

    def _refresh_count(self) -> None:
        if self._count_lbl is None:
            return
        p = Path(os.path.expanduser(self.var_input.get().strip()))
        n = count_images(p)
        self._count_lbl.configure(text=f"→ {n}장 처리 대상")

    def open_example(self) -> None:
        if EXAMPLE_CONFIG.is_file():
            try:
                with EXAMPLE_CONFIG.open(encoding="utf-8") as f:
                    data = json.load(f)
                self._apply_config_dict(data)
                self.log(f"예시 파일을 폼에 반영했습니다: {EXAMPLE_CONFIG}")
            except (OSError, json.JSONDecodeError) as e:
                messagebox.showerror("오류", str(e))
        else:
            messagebox.showinfo("안내", f"파일이 없습니다: {EXAMPLE_CONFIG}")

    def _gather_config_dict(self) -> dict:
        inp = self.var_input.get().strip()
        outp = self.var_output.get().strip()
        ref = self.var_ref.get().strip()
        fp_path = self.var_fixed_params_file.get().strip()

        try:
            preview_max = int(self.var_preview_max.get().strip() or "1200")
            jpeg_q = int(self.var_jpeg_quality.get().strip() or "92")
        except ValueError as e:
            raise ValueError("미리보기 크기·JPEG 품질은 정수여야 합니다.") from e

        bm = batch_mod()
        cfg: dict = {
            "input_dir": inp or None,
            "output_dir": outp or None,
            "out_ext": self.var_out_ext.get().strip() or "jpg",
            "gemini_reference": ref or None,
            "fixed_params_file": fp_path or None,
            "model": self.var_model.get().strip() or bm.MODEL,
            "prompt": self.txt_prompt.get("1.0", tk.END).strip() or bm.DEFAULT_PROMPT,
            "preview_max_size": preview_max,
            "jpeg_quality": max(1, min(100, jpeg_q)),
            "use_gemini": bool(self.var_use_gemini.get()),
            "verbose": bool(self.var_verbose.get()),
        }

        key = self.ent_key.get().strip()
        cfg["gemini_api_key"] = key

        if fp_path:
            p = Path(os.path.expanduser(fp_path))
            if p.is_file():
                try:
                    cfg["fixed_params"] = json.loads(p.read_text(encoding="utf-8"))
                    if not isinstance(cfg["fixed_params"], dict):
                        raise ValueError("고정 파라미터 JSON 최상위는 객체여야 합니다.")
                except (OSError, json.JSONDecodeError, ValueError) as e:
                    raise ValueError(f"고정 파라미터 JSON 을 읽을 수 없습니다: {e}") from e

        return cfg

    def _apply_config_dict(self, d: dict) -> None:
        if not isinstance(d, dict):
            return
        if d.get("input_dir"):
            self.var_input.set(str(d["input_dir"]))
        if d.get("output_dir"):
            self.var_output.set(str(d["output_dir"]))
        if d.get("out_ext"):
            self.var_out_ext.set(str(d["out_ext"]))
        if d.get("gemini_reference"):
            self.var_ref.set(str(d["gemini_reference"]))
        if d.get("fixed_params_file"):
            self.var_fixed_params_file.set(str(d["fixed_params_file"]))
        if d.get("model"):
            self.var_model.set(str(d["model"]))
        if d.get("prompt"):
            self.txt_prompt.delete("1.0", tk.END)
            self.txt_prompt.insert("1.0", str(d["prompt"]))
        if "preview_max_size" in d:
            self.var_preview_max.set(str(int(d["preview_max_size"])))
        if "jpeg_quality" in d:
            self.var_jpeg_quality.set(str(int(d["jpeg_quality"])))
        if "use_gemini" in d:
            self.var_use_gemini.set(bool(d["use_gemini"]))
        if "verbose" in d:
            self.var_verbose.set(bool(d["verbose"]))
        gk = d.get("gemini_api_key")
        if gk:
            self.ent_key.delete(0, tk.END)
            self.ent_key.insert(0, str(gk))
        self._refresh_count()

    def save_config_clicked(self) -> None:
        try:
            cfg = self._gather_config_dict()
        except ValueError as e:
            messagebox.showerror("입력 오류", str(e))
            return
        path = Path(os.path.expanduser(self.var_config_path.get().strip()))
        if not path.parent.is_dir():
            messagebox.showerror("오류", f"폴더가 없습니다: {path.parent}")
            return
        # 저장 시 API 키는 비어 있으면 키 자체를 빈 문자열로 두어 env 사용 유도
        try:
            with path.open("w", encoding="utf-8") as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
            self.log(f"설정 저장: {path}")
            messagebox.showinfo("완료", f"저장했습니다.\n{path}")
        except OSError as e:
            messagebox.showerror("저장 실패", str(e))

    def load_config_clicked(self) -> None:
        p = filedialog.askopenfilename(
            title="설정 JSON",
            initialdir=str(SCRIPT_DIR),
            filetypes=[("JSON", "*.json"), ("모든 파일", "*")],
        )
        if not p:
            return
        try:
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            self.var_config_path.set(p)
            self._apply_config_dict(data)
            self.log(f"설정 불러옴: {p}")
        except (OSError, json.JSONDecodeError) as e:
            messagebox.showerror("오류", str(e))

    def save_gui_settings(self) -> None:
        data = {
            "config_path": self.var_config_path.get().strip(),
            "input_dir": self.var_input.get().strip(),
            "output_dir": self.var_output.get().strip(),
            "out_ext": self.var_out_ext.get().strip(),
            "fixed_params_file": self.var_fixed_params_file.get().strip(),
            "gemini_reference": self.var_ref.get().strip(),
            "model": self.var_model.get().strip(),
            "prompt": self.txt_prompt.get("1.0", tk.END),
            "preview_max": self.var_preview_max.get().strip(),
            "jpeg_quality": self.var_jpeg_quality.get().strip(),
            "use_gemini": self.var_use_gemini.get(),
            "verbose": self.var_verbose.get(),
            "nano_attach_log": self.var_nano_attach_log.get(),
            "nano_auto_apply": self.var_nano_auto_apply.get(),
        }
        try:
            with GUI_SETTINGS_PATH.open("w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            self.log(f"GUI 상태 저장: {GUI_SETTINGS_PATH}")
            messagebox.showinfo("완료", "다음 실행 시 폼이 복원됩니다. (API 키는 저장하지 않습니다)")
        except OSError as e:
            messagebox.showerror("저장 실패", str(e))

    def _load_gui_settings(self) -> None:
        if not GUI_SETTINGS_PATH.is_file():
            return
        try:
            with GUI_SETTINGS_PATH.open(encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            return
        if data.get("config_path"):
            self.var_config_path.set(str(data["config_path"]))
        self.var_input.set(str(data.get("input_dir", "")))
        self.var_output.set(str(data.get("output_dir", "")))
        if data.get("out_ext"):
            self.var_out_ext.set(str(data["out_ext"]))
        self.var_fixed_params_file.set(str(data.get("fixed_params_file", "")))
        self.var_ref.set(str(data.get("gemini_reference", "")))
        if data.get("model"):
            self.var_model.set(str(data["model"]))
        if data.get("prompt"):
            self.txt_prompt.delete("1.0", tk.END)
            self.txt_prompt.insert("1.0", str(data["prompt"]))
        if data.get("preview_max"):
            self.var_preview_max.set(str(data["preview_max"]))
        if data.get("jpeg_quality"):
            self.var_jpeg_quality.set(str(data["jpeg_quality"]))
        if "use_gemini" in data:
            self.var_use_gemini.set(bool(data["use_gemini"]))
        self.var_verbose.set(bool(data.get("verbose", False)))
        if "nano_attach_log" in data:
            self.var_nano_attach_log.set(bool(data["nano_attach_log"]))
        if "nano_auto_apply" in data:
            self.var_nano_auto_apply.set(bool(data["nano_auto_apply"]))
        self._refresh_count()

    def _run_subprocess(self, argv: list[str]) -> None:
        def work() -> None:
            self.log("실행: " + " ".join(argv))
            try:
                r = subprocess.run(
                    argv,
                    capture_output=True,
                    text=True,
                    cwd=str(SCRIPT_DIR),
                )
                if r.stdout:
                    self.log(r.stdout.rstrip())
                if r.stderr:
                    self.log(r.stderr.rstrip())
                self.log(f"종료 코드: {r.returncode}")
            except OSError as e:
                self.log(f"실행 실패: {e}")

        threading.Thread(target=work, daemon=True).start()

    def run_batch(self) -> None:
        path = Path(os.path.expanduser(self.var_config_path.get().strip()))
        try:
            cfg = self._gather_config_dict()
        except ValueError as e:
            messagebox.showerror("입력 오류", str(e))
            return
        if not cfg.get("input_dir") or not cfg.get("output_dir"):
            messagebox.showwarning("필수", "입력 폴더와 출력 폴더를 채워 주세요.")
            return
        if not cfg.get("use_gemini", True):
            has_embed = bool(cfg.get("fixed_params"))
            fp = (cfg.get("fixed_params_file") or "").strip()
            path_ok = bool(fp) and Path(os.path.expanduser(fp)).is_file()
            if not has_embed and not path_ok:
                messagebox.showwarning(
                    "필수",
                    "Gemini 를 끈 경우 고정 파라미터 JSON 파일(존재하는 경로)을 지정하거나, "
                    "설정에 fixed_params 객체가 포함되어 있어야 합니다.",
                )
                return
        try:
            with path.open("w", encoding="utf-8") as f:
                json.dump(cfg, f, ensure_ascii=False, indent=2)
            self.log(f"(실행 전) 설정 저장: {path}")
        except OSError as e:
            messagebox.showerror("저장 실패", str(e))
            return

        argv = [sys.executable, str(BATCH_SCRIPT), "--config", str(path)]
        self._run_subprocess(argv)

    def _nano_chat_label(self, role: str) -> str:
        return "나" if role == "user" else "나노바나나"

    def _nano_chat_refresh_display(self) -> None:
        self.txt_nano_chat.configure(state=tk.NORMAL)
        self.txt_nano_chat.delete("1.0", tk.END)
        if not self._nano_chat_messages:
            self.txt_nano_chat.insert(
                tk.END,
                "도구 동작·오류·개선을 말로만 요청하면 됩니다. 위 체크를 켜 두면 "
                "최근 실행 로그가 자동으로 같이 전송되고, 모델이 "
                "# DARKTABLE_TOOL_WRITE path=파일.py 와 ```python 블록으로 답하면 "
                "파일이 자동 저장됩니다. 수동으로만 적용하려면 자동 저장을 끄고 "
                "「직전 답변 적용」을 쓰세요. 사진 일괄 처리는 마지막에 「배치 실행」.\n\n",
            )
        for m in self._nano_chat_messages:
            who = self._nano_chat_label(m["role"])
            self.txt_nano_chat.insert(tk.END, f"【{who}】\n{m.get('text', '')}\n\n")
        self.txt_nano_chat.see(tk.END)
        self.txt_nano_chat.configure(state=tk.NORMAL)

    def _save_nano_chat_history(self) -> None:
        try:
            with CHAT_HISTORY_PATH.open("w", encoding="utf-8") as f:
                json.dump(
                    {"version": 1, "messages": self._nano_chat_messages},
                    f,
                    ensure_ascii=False,
                    indent=2,
                )
        except OSError:
            pass

    def _load_nano_chat_history(self) -> None:
        self._nano_chat_messages = []
        if not CHAT_HISTORY_PATH.is_file():
            self._nano_chat_refresh_display()
            return
        try:
            with CHAT_HISTORY_PATH.open(encoding="utf-8") as f:
                data = json.load(f)
        except (OSError, json.JSONDecodeError):
            self._nano_chat_refresh_display()
            return
        msgs = data.get("messages") if isinstance(data, dict) else None
        if not isinstance(msgs, list):
            self._nano_chat_refresh_display()
            return
        for item in msgs:
            if not isinstance(item, dict):
                continue
            role = item.get("role", "")
            text = item.get("text", "")
            if role not in ("user", "model") or not isinstance(text, str):
                continue
            self._nano_chat_messages.append({"role": role, "text": text})
        self._nano_chat = None
        self._nano_chat_key = None
        self._nano_chat_model = None
        self._nano_chat_refresh_display()

    def _nano_chat_reset(self) -> None:
        if self._nano_chat_busy:
            return
        if not messagebox.askyesno(
            "대화 비우기",
            "저장된 나노바나나 대화를 모두 지울까요?\n"
            f"({CHAT_HISTORY_PATH.name} 도 비워집니다.)",
            parent=self.root,
        ):
            return
        self._nano_chat_messages = []
        self._nano_chat = None
        self._nano_chat_key = None
        self._nano_chat_model = None
        self._save_nano_chat_history()
        self._nano_chat_refresh_display()

    def _nano_chat_resolve_key(self) -> str:
        k = self.ent_key.get().strip()
        if k:
            return k
        return (os.environ.get("GEMINI_API_KEY") or "").strip()

    def _copy_nano_input_to_batch_prompt(self) -> None:
        text = self.ent_nano_chat.get().strip()
        if not text:
            messagebox.showinfo("안내", "먼저 아래 입력란에 배치에 쓸 문장을 적어 주세요.")
            return
        self.txt_prompt.delete("1.0", tk.END)
        self.txt_prompt.insert("1.0", text)
        self.log("(배치 프롬프트를 채팅 입력란 내용으로 바꿨습니다.)")

    def _nano_augment_user_message(self, user_core: str) -> str:
        user_core = user_core.strip()
        if not self.var_nano_attach_log.get():
            return user_core
        tail = self._recent_log_text.strip()
        if not tail:
            return user_core
        return (
            "--- (자동) 이 창의 최근 실행 로그 — 오류·경로·명령 참고 ---\n```\n"
            + tail
            + "\n```\n\n--- 사용자 메시지 ---\n"
            + user_core
        )

    def _nano_apply_from_text(self, assistant_text: str, *, confirm: bool) -> int:
        blocks = parse_write_blocks(assistant_text)
        if not blocks:
            return 0
        applied = 0
        errors: list[str] = []
        for rel, code in blocks:
            target = safe_script_path(SCRIPT_DIR, rel)
            if target is None:
                errors.append(f"거부된 경로: {rel!r}")
                continue
            rel_disp = target.relative_to(SCRIPT_DIR)
            if confirm:
                preview = code[:500] + ("…" if len(code) > 500 else "")
                if not messagebox.askyesno(
                    "파일 덮어쓰기",
                    f"{rel_disp}\n({len(code)} bytes)\n\n미리보기:\n{preview}\n\n이 내용으로 저장할까요?",
                    parent=self.root,
                ):
                    continue
            try:
                target.write_text(code, encoding="utf-8")
                self.log(f"저장 완료: {target}")
                applied += 1
            except OSError as e:
                errors.append(f"{rel_disp}: {e}")
        if errors:
            messagebox.showerror(
                "파일 반영 오류" if not confirm else "일부 저장 실패",
                "\n".join(errors),
                parent=self.root,
            )
        elif confirm and applied:
            messagebox.showinfo("완료", f"{applied}개 파일을 저장했습니다.", parent=self.root)
        return applied

    def _nano_apply_last_reply(self) -> None:
        last = ""
        for m in reversed(self._nano_chat_messages):
            if m["role"] == "model":
                last = m["text"]
                break
        if not last:
            messagebox.showinfo("안내", "적용할 직전 나노바나나 답변이 없습니다.")
            return
        if not parse_write_blocks(last):
            messagebox.showinfo(
                "안내",
                "직전 답변에 # DARKTABLE_TOOL_WRITE path=... 와 ```python 블록이 없습니다.",
            )
            return
        self._nano_apply_from_text(last, confirm=True)

    def _nano_chat_send_with_file(self) -> None:
        if self._nano_chat_busy:
            return
        question = self.ent_nano_chat.get().strip()
        if not question:
            messagebox.showinfo("안내", "먼저 입력란에 파일에 대해 물을 내용을 적어 주세요.")
            return
        p = filedialog.askopenfilename(
            title="첨부할 파일 (이 도구 폴더 기준으로 읽습니다)",
            initialdir=str(SCRIPT_DIR),
            filetypes=[("Python", "*.py"), ("JSON", "*.json"), ("모든 파일", "*")],
        )
        if not p:
            return
        path = Path(p).resolve()
        try:
            path.relative_to(SCRIPT_DIR)
        except ValueError:
            messagebox.showerror("오류", "이 폴더 안의 파일만 첨부할 수 있습니다.")
            return
        try:
            body = path.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            messagebox.showerror("읽기 실패", str(e))
            return
        rel = path.relative_to(SCRIPT_DIR)
        user_msg = f"[첨부: {rel} 전체]\n```\n{body}\n```\n\n{question}"
        self.ent_nano_chat.delete(0, tk.END)
        self._nano_chat_send_with_text(user_msg)

    def _nano_chat_send_with_text(self, text: str) -> None:
        if self._nano_chat_busy or not text.strip():
            return
        payload = self._nano_augment_user_message(text)
        self._nano_chat_messages.append({"role": "user", "text": payload})
        self._nano_chat_refresh_display()
        self._save_nano_chat_history()
        self._nano_chat_busy = True

        def work() -> None:
            err: str | None = None
            reply = ""
            try:
                key = self._nano_chat_resolve_key()
                model_name = self.var_model.get().strip() or "gemini-3.1-pro-preview"
                if not key:
                    err = "API 키가 없습니다. 위에 입력하거나 GEMINI_API_KEY 를 설정하세요."
                else:
                    try:
                        import google.generativeai as genai
                    except ImportError as e:
                        err = f"google-generativeai 필요: {e}"
                    else:
                        need_new = (
                            self._nano_chat is None
                            or self._nano_chat_key != key
                            or self._nano_chat_model != model_name
                        )
                        genai.configure(api_key=key)
                        try:
                            model = genai.GenerativeModel(
                                model_name, system_instruction=SYSTEM_INSTRUCTION
                            )
                        except TypeError:
                            model = genai.GenerativeModel(model_name)
                        last_user = self._nano_chat_messages[-1]["text"]
                        if need_new:
                            hist: list[dict] = []
                            for m in self._nano_chat_messages[:-1]:
                                hist.append({"role": m["role"], "parts": [m["text"]]})
                            self._nano_chat = model.start_chat(history=hist)
                            self._nano_chat_key = key
                            self._nano_chat_model = model_name
                            resp = self._nano_chat.send_message(last_user)
                        else:
                            assert self._nano_chat is not None
                            resp = self._nano_chat.send_message(last_user)
                        try:
                            reply = (resp.text or "").strip()
                        except ValueError:
                            reply = "(응답 텍스트를 읽을 수 없습니다. safety 등을 확인하세요.)"
                        if not reply:
                            reply = "(빈 응답입니다.)"
            except Exception as e:
                err = str(e)
            self.root.after(0, lambda: self._nano_chat_after_send(reply, err))

        threading.Thread(target=work, daemon=True).start()

    def _nano_chat_send(self) -> None:
        if self._nano_chat_busy:
            return
        text = self.ent_nano_chat.get().strip()
        if not text:
            return
        self.ent_nano_chat.delete(0, tk.END)
        self._nano_chat_send_with_text(text)

    def _nano_chat_after_send(self, reply: str, err: str | None) -> None:
        self._nano_chat_busy = False
        if err:
            if self._nano_chat_messages and self._nano_chat_messages[-1]["role"] == "user":
                self._nano_chat_messages.pop()
            self._nano_chat = None
            self._nano_chat_key = None
            self._nano_chat_model = None
            messagebox.showerror("나노바나나", err, parent=self.root)
            self._nano_chat_refresh_display()
            self._save_nano_chat_history()
            return
        self._nano_chat_messages.append({"role": "model", "text": reply})
        self._nano_chat_refresh_display()
        self._save_nano_chat_history()
        if self.var_nano_auto_apply.get():
            n = self._nano_apply_from_text(reply, confirm=False)
            if n:
                self.log(f"(나노바나나 자동 반영: {n}개 파일 저장)")

    def run(self) -> None:
        self.root.mainloop()


def main() -> None:
    if not BATCH_SCRIPT.is_file():
        print(f"스크립트 없음: {BATCH_SCRIPT}", file=sys.stderr)
        sys.exit(1)
    DarktableGeminiGui().run()


if __name__ == "__main__":
    main()
