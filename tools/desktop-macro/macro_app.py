#!/usr/bin/env python3
"""
마우스·키보드 매크로 — Tkinter 로 보기 쉬운 프로그램.
실행: (가상환경 후) python macro_app.py
macOS 에서는 해당 터미널/앱에 손쉬운 접근 권한 필요.
"""

from __future__ import annotations

import sys
import threading
import traceback
from pathlib import Path

import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk

SCRIPT_DIR = Path(__file__).resolve().parent

try:
    from macro_core import run_play, run_record
except ImportError:
    sys.path.insert(0, str(SCRIPT_DIR))
    from macro_core import run_play, run_record


def main() -> None:
    root = tk.Tk()
    root.title("매크로 — 녹화 / 재생")
    root.geometry("620x620")
    root.minsize(520, 480)

    # 색 테마 (다크 카드형)
    bg = "#eef1f8"
    card = "#ffffff"
    accent = "#2563eb"
    accent_hover = "#1d4ed8"
    danger = "#dc2626"
    text_muted = "#64748b"
    root.configure(bg=bg)

    stop_rec_ev = threading.Event()
    cancel_play_ev = threading.Event()
    recording = {"flag": False}
    playing = {"flag": False}

    default_file = SCRIPT_DIR / "macro_session.json"
    path_var = tk.StringVar(value=str(default_file))
    moves_var = tk.BooleanVar(value=False)
    dry_var = tk.BooleanVar(value=False)
    countdown_var = tk.IntVar(value=5)
    speed_var = tk.StringVar(value="1")

    outer = tk.Frame(root, bg=bg, padx=20, pady=16)
    outer.pack(fill=tk.BOTH, expand=True)

    title_frame = tk.Frame(outer, bg=bg)
    title_frame.pack(fill=tk.X, pady=(0, 6))
    tk.Label(
        title_frame,
        text="마우스 · 키보드 매크로",
        font=("Helvetica Neue", 20, "bold"),
        fg="#0f172a",
        bg=bg,
    ).pack(anchor=tk.W)
    tk.Label(
        title_frame,
        text="화면 좌표 · 클릭 · 입력을 시간 순으로 기록하고 그대로 다시 재생합니다.",
        font=("Helvetica Neue", 12),
        fg=text_muted,
        bg=bg,
        wraplength=560,
        justify=tk.LEFT,
    ).pack(anchor=tk.W, pady=(4, 0))

    hint = tk.Label(
        outer,
        text=f"먼저 macOS에서는 이 앱 실행 주체에게「손쉬운 사용」허용. 민감한 정보(비밀번호 등)는 녹화하지 마세요.",
        fg="#b45309",
        bg="#fffbeb",
        font=("Helvetica Neue", 11),
        wraplength=560,
        justify=tk.LEFT,
        padx=12,
        pady=10,
        relief="flat",
    )
    hint.pack(fill=tk.X, pady=(10, 12))

    card_f = tk.Frame(outer, bg=card, highlightthickness=1, highlightbackground="#e2e8f0", padx=18, pady=16)
    card_f.pack(fill=tk.X, pady=(0, 10))

    # 상태
    status_var = tk.StringVar(value="상태 · 대기 중")
    tk.Label(card_f, textvariable=status_var, font=("Helvetica Neue", 14, "bold"), fg=accent, bg=card).pack(
        anchor=tk.W
    )

    row1 = tk.Frame(card_f, bg=card, pady=12)
    row1.pack(fill=tk.X)
    tk.Label(row1, text="저장 파일", font=("Helvetica Neue", 12), fg=text_muted, bg=card, width=9, anchor=tk.W).pack(
        side=tk.LEFT
    )
    ent = tk.Entry(row1, textvariable=path_var, font=("Menlo", 11))
    ent.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))

    def browse_save() -> None:
        p = filedialog.asksaveasfilename(
            title="매크로를 저장할 파일",
            defaultextension=".json",
            filetypes=[("JSON 매크로", "*.json"), ("모든 파일", "*")],
            initialdir=str(SCRIPT_DIR),
            initialfile=Path(path_var.get()).name if path_var.get() else "macro_session.json",
        )
        if p:
            path_var.set(p)

    def browse_open() -> None:
        p = filedialog.askopenfilename(
            title="재생할 매크로 파일",
            filetypes=[("JSON 매크로", "*.json"), ("모든 파일", "*")],
            initialdir=str(SCRIPT_DIR),
        )
        if p:
            path_var.set(p)

    ttk.Style().configure("TButton", padding=6)
    tk.Button(row1, text="저장 위치…", command=browse_save, relief=tk.GROOVE, bg="#f8fafc").pack(
        side=tk.LEFT, padx=(0, 4)
    )
    tk.Button(row1, text="불러오기…", command=browse_open, relief=tk.GROOVE, bg="#f8fafc").pack(side=tk.LEFT)

    btns_row = tk.Frame(card_f, bg=card)
    btns_row.pack(fill=tk.X, pady=(4, 0))

    def style_big_btn(w: tk.Misc, text: str, bg_c: str, cmd) -> tk.Button:
        if bg_c == accent:
            active = accent_hover
        elif bg_c == danger:
            active = "#b91c1c"
        elif bg_c == "#059669":
            active = "#047857"
        else:
            active = bg_c
        btn = tk.Button(
            w,
            text=text,
            command=cmd,
            fg="white",
            bg=bg_c,
            activebackground=active,
            activeforeground="white",
            font=("Helvetica Neue", 14, "bold"),
            padx=18,
            pady=10,
            cursor="hand2",
            relief="flat",
        )
        return btn

    def ui_log_append(msg: str) -> None:
        def append() -> None:
            log_w.configure(state=tk.NORMAL)
            log_w.insert(tk.END, msg.rstrip() + "\n")
            log_w.see(tk.END)
            log_w.configure(state=tk.DISABLED)

        root.after(0, append)

    def set_status(s: str) -> None:
        root.after(0, lambda: status_var.set(s))

    def toggle_rec_controls(rec_on: bool) -> None:
        def apply() -> None:
            btn_rec_start.configure(state="disabled" if rec_on else "normal")
            btn_rec_stop.configure(state="normal" if rec_on else "disabled")
            btn_play.configure(state="disabled" if rec_on or playing["flag"] else "normal")

        root.after(0, apply)

    def on_rec_finished() -> None:
        recording["flag"] = False
        toggle_rec_controls(False)
        set_status("상태 · 대기 중")

    def start_record() -> None:
        if recording["flag"]:
            return
        out_path = Path(path_var.get().strip()).expanduser()
        if not out_path.name:
            messagebox.showwarning("알림", "저장할 파일 경로를 입력하거나 찾아보기로 선택하세요.")
            return
        recording["flag"] = True
        stop_rec_ev.clear()
        toggle_rec_controls(True)
        set_status("녹화 중 · 마우스/키 입력이 저장됩니다 (중지 또는 Esc)")
        moves = moves_var.get()

        def worker() -> None:
            try:
                n = run_record(out_path, moves, external_stop_event=stop_rec_ev)
                ui_log_append(f"[녹화] 완료 — {n}개 이벤트 → {out_path}")
            except Exception as e:
                ui_log_append(f"[녹화] 오류: {e}")
                traceback.print_exc()
                root.after(0, lambda: messagebox.showerror("녹화 오류", str(e)))
            finally:
                root.after(0, on_rec_finished)

        threading.Thread(target=worker, daemon=True).start()

    def stop_record() -> None:
        stop_rec_ev.set()

    btn_rec_start = style_big_btn(btns_row, " 녹화 시작 ", accent, start_record)
    btn_rec_start.pack(side=tk.LEFT, padx=(0, 8))
    btn_rec_stop = style_big_btn(btns_row, " 녹화 중지 ", danger, stop_record)
    btn_rec_stop.pack(side=tk.LEFT)

    tk.Button(
        card_f,
        text="설정:",
        fg=text_muted,
        bg=card,
        font=("Helvetica Neue", 11),
        relief="flat",
        state="disabled",
    ).pack(anchor=tk.W, pady=(14, 0))

    opt_row = tk.Frame(card_f, bg=card, pady=6)
    opt_row.pack(fill=tk.X)

    chk_moves = tk.Checkbutton(opt_row, text="마우스 이동 경로까지 기록 (파일이 커질 수 있음)", variable=moves_var, bg=card, fg="#0f172a", anchor=tk.W)
    chk_moves.pack(fill=tk.X)

    chk_dry = tk.Checkbutton(
        opt_row, text='재생 시 "테스트 모드"(클릭·키 안 넣고 시간만 흘림)', variable=dry_var, bg=card, fg="#0f172a", anchor=tk.W
    )
    chk_dry.pack(fill=tk.X, pady=(4, 0))

    play_opts = tk.Frame(card_f, bg=card, pady=10)
    play_opts.pack(fill=tk.X)

    tk.Label(play_opts, text="재생 전 대기 (초)", bg=card, fg=text_muted, font=("Helvetica Neue", 11)).grid(
        row=0, column=0, sticky=tk.W, pady=2
    )
    sp_count = tk.Spinbox(
        play_opts,
        from_=0,
        to=30,
        increment=1,
        textvariable=countdown_var,
        width=8,
        font=("Menlo", 11),
    )
    sp_count.grid(row=0, column=1, sticky=tk.W, padx=(8, 24), pady=2)

    tk.Label(play_opts, text="재생 속도 배속", bg=card, fg=text_muted, font=("Helvetica Neue", 11)).grid(
        row=0, column=2, sticky=tk.W, pady=2
    )
    speed_combo = ttk.Combobox(
        play_opts,
        textvariable=speed_var,
        values=("0.5", "0.75", "1", "1.25", "1.5", "2", "3", "4"),
        width=7,
        state="readonly",
        font=("Menlo", 11),
    )
    speed_combo.grid(row=0, column=3, sticky=tk.W, padx=(8, 0), pady=2)

    play_row = tk.Frame(card_f, bg=card, pady=8)
    play_row.pack(fill=tk.X)

    def stop_playback() -> None:
        cancel_play_ev.set()

    def start_playback() -> None:
        if playing["flag"]:
            return
        fp = Path(path_var.get().strip()).expanduser()
        if not fp.is_file():
            messagebox.showwarning("알림", f"파일이 없습니다:\n{fp}")
            return
        playing["flag"] = True
        cancel_play_ev.clear()
        btn_play.configure(state="disabled")
        btn_rec_start.configure(state="disabled")
        btn_stop_play.configure(state="normal")

        try:
            spd = float((speed_var.get() or "1").replace(",", "."))
        except ValueError:
            spd = 1.0
        spd = max(0.05, spd)
        cd = float(int(countdown_var.get() or 0))
        dry = dry_var.get()
        set_status("재생 중… (중단 버튼으로 멈춤)")

        def worker() -> None:
            try:
                run_play(
                    fp,
                    spd,
                    dry_run=dry,
                    countdown_secs=cd,
                    cancel_event=cancel_play_ev,
                    on_log=ui_log_append,
                )
            except Exception as e:
                ui_log_append(f"[재생] 오류: {e}")
                traceback.print_exc()
                root.after(0, lambda: messagebox.showerror("재생 오류", str(e)))
            finally:
                def done() -> None:
                    playing["flag"] = False
                    btn_play.configure(state="normal")
                    btn_rec_start.configure(state="normal")
                    btn_stop_play.configure(state="disabled")
                    set_status("상태 · 대기 중")

                root.after(0, done)

        threading.Thread(target=worker, daemon=True).start()

    btn_play = style_big_btn(play_row, " ▶ 재생 ", "#059669", start_playback)
    btn_play.pack(side=tk.LEFT, padx=(0, 8))
    btn_stop_play = style_big_btn(play_row, " 재생 중단 ", danger, stop_playback)
    btn_stop_play.pack(side=tk.LEFT)
    btn_stop_play.configure(state="disabled")

    tk.Label(outer, text="로그", font=("Helvetica Neue", 11, "bold"), fg=text_muted, bg=bg).pack(anchor=tk.W)

    log_w = scrolledtext.ScrolledText(
        outer, height=10, wrap=tk.WORD, font=("Menlo", 10), fg="#334155", bg="#f8fafc", state=tk.DISABLED
    )
    log_w.pack(fill=tk.BOTH, expand=True, pady=(6, 0))

    def intro_log() -> None:
        ui_log_append("실행 방법: 저장 파일을 정한 뒤 「녹화 시작」→ 동작 후 「녹화 중지」 또는 Esc.")
        ui_log_append("재생 전 마우스를 안전한 곳에 두고, 필요하면 대기(초)를 3 이상 두세요.")

    root.after(200, intro_log)

    toggle_rec_controls(False)

    root.mainloop()


if __name__ == "__main__":
    main()
