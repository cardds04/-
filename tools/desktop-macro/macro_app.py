#!/usr/bin/env python3
"""
마우스·키보드 매크로 — 간단 GUI.
실행: (가상환경 후) python macro_app.py
macOS 에서는 해당 앱 실행 주체에 「손쉬운 접근」 권한 필요.
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


PLAY_COUNTDOWN_SECONDS = 0.2

# macOS Q/W/E/R virtual key codes (option 키와 같이 누르면 char 가 변형되므로 vk 로 식별)
_MAC_VK = {"q": 12, "w": 13, "e": 14, "r": 15}


class AltHotkeyListener:
    """창 포커스와 무관하게 Alt+Q/W/E/R 를 잡는 전역 리스너."""

    def __init__(self, callbacks: dict):
        self._cbs = callbacks  # {'q': fn, 'w': fn, 'e': fn, 'r': fn}
        self._listener = None
        self._alt_down = False

    def start(self) -> str | None:
        try:
            from pynput import keyboard
        except Exception as e:
            return f"pynput 가져오기 실패 ({e}) — Alt 단축키 비활성. 버튼만 사용 가능."

        Key = keyboard.Key
        alt_keys = {Key.alt, Key.alt_l, Key.alt_r}
        alt_gr = getattr(Key, "alt_gr", None)
        if alt_gr is not None:
            alt_keys.add(alt_gr)

        def _letter_for(k) -> str | None:
            vk = getattr(k, "vk", None)
            if vk is not None:
                for letter, mac_vk in _MAC_VK.items():
                    if vk == mac_vk:
                        return letter
            ch = getattr(k, "char", None)
            if ch and len(ch) == 1 and ch.lower() in self._cbs:
                return ch.lower()
            return None

        def on_press(k):
            try:
                if k in alt_keys:
                    self._alt_down = True
                    return
                if not self._alt_down:
                    return
                letter = _letter_for(k)
                if letter and letter in self._cbs:
                    self._cbs[letter]()
            except Exception:
                pass

        def on_release(k):
            try:
                if k in alt_keys:
                    self._alt_down = False
            except Exception:
                pass

        try:
            self._listener = keyboard.Listener(on_press=on_press, on_release=on_release)
            self._listener.daemon = True
            self._listener.start()
        except Exception as e:
            return f"단축키 리스너 시작 실패 ({e}) — 손쉬운 접근 권한 확인."
        return None

    def stop(self) -> None:
        if self._listener is not None:
            try:
                self._listener.stop()
            except Exception:
                pass
            self._listener = None


def main() -> None:
    try:
        root = tk.Tk()
    except Exception as e:
        print(
            "Tkinter 창을 만들 수 없습니다. (macOS: python.org 정식 설치 또는 `brew install python-tk`)\n",
            e,
            file=sys.stderr,
        )
        traceback.print_exc()
        sys.exit(1)

    root.title("매크로")
    root.geometry("520x480")
    root.minsize(460, 420)

    bg = "#f4f6fb"
    card = "#ffffff"
    accent = "#2563eb"
    accent_hover = "#1d4ed8"
    danger = "#dc2626"
    success = "#059669"
    text_muted = "#64748b"
    root.configure(bg=bg)

    stop_rec_ev = threading.Event()
    cancel_play_ev = threading.Event()
    recording = {"flag": False}
    playing = {"flag": False}

    default_file = SCRIPT_DIR / "macro_session.json"
    path_var = tk.StringVar(value=str(default_file))
    repeat_var = tk.IntVar(value=1)
    speed_var = tk.StringVar(value="1")

    outer = tk.Frame(root, bg=bg, padx=18, pady=14)
    outer.pack(fill=tk.BOTH, expand=True)

    tk.Label(
        outer,
        text="마우스 · 키보드 매크로",
        font=("Helvetica Neue", 18, "bold"),
        fg="#0f172a",
        bg=bg,
    ).pack(anchor=tk.W)

    status_var = tk.StringVar(value="대기 중")
    tk.Label(
        outer,
        textvariable=status_var,
        font=("Helvetica Neue", 12),
        fg=accent,
        bg=bg,
    ).pack(anchor=tk.W, pady=(2, 12))

    card_f = tk.Frame(
        outer, bg=card, highlightthickness=1, highlightbackground="#e2e8f0", padx=14, pady=14
    )
    card_f.pack(fill=tk.X)

    file_row = tk.Frame(card_f, bg=card)
    file_row.pack(fill=tk.X)
    tk.Entry(file_row, textvariable=path_var, font=("Menlo", 11)).pack(
        side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6)
    )

    def browse_save() -> None:
        p = filedialog.asksaveasfilename(
            title="매크로 저장 파일",
            defaultextension=".json",
            filetypes=[("JSON", "*.json"), ("모든 파일", "*")],
            initialdir=str(SCRIPT_DIR),
            initialfile=Path(path_var.get()).name or "macro_session.json",
        )
        if p:
            path_var.set(p)

    def browse_open() -> None:
        p = filedialog.askopenfilename(
            title="재생할 파일",
            filetypes=[("JSON", "*.json"), ("모든 파일", "*")],
            initialdir=str(SCRIPT_DIR),
        )
        if p:
            path_var.set(p)

    tk.Button(file_row, text="저장…", command=browse_save, relief=tk.GROOVE, bg="#f8fafc").pack(
        side=tk.LEFT, padx=(0, 4)
    )
    tk.Button(file_row, text="열기…", command=browse_open, relief=tk.GROOVE, bg="#f8fafc").pack(
        side=tk.LEFT
    )

    def big_btn(parent: tk.Misc, text: str, color: str, cmd) -> tk.Button:
        hovers = {accent: accent_hover, danger: "#b91c1c", success: "#047857"}
        return tk.Button(
            parent,
            text=text,
            command=cmd,
            fg="white",
            bg=color,
            activebackground=hovers.get(color, color),
            activeforeground="white",
            font=("Helvetica Neue", 14, "bold"),
            padx=14,
            pady=10,
            relief="flat",
            cursor="hand2",
        )

    opt_row = tk.Frame(card_f, bg=card)
    opt_row.pack(fill=tk.X, pady=(10, 0))
    tk.Label(opt_row, text="반복", bg=card, fg=text_muted, font=("Helvetica Neue", 11)).pack(
        side=tk.LEFT
    )
    tk.Spinbox(
        opt_row,
        from_=1,
        to=9999,
        increment=1,
        textvariable=repeat_var,
        width=6,
        font=("Menlo", 11),
    ).pack(side=tk.LEFT, padx=(6, 16))
    tk.Label(opt_row, text="속도", bg=card, fg=text_muted, font=("Helvetica Neue", 11)).pack(
        side=tk.LEFT
    )
    ttk.Combobox(
        opt_row,
        textvariable=speed_var,
        values=("0.5", "0.75", "1", "1.25", "1.5", "2", "3", "4"),
        width=5,
        state="readonly",
        font=("Menlo", 11),
    ).pack(side=tk.LEFT, padx=(6, 0))
    tk.Label(opt_row, text="× (1=원래속도)", bg=card, fg=text_muted, font=("Helvetica Neue", 10)).pack(
        side=tk.LEFT, padx=(4, 0)
    )

    btn_row = tk.Frame(card_f, bg=card)
    btn_row.pack(fill=tk.X, pady=(12, 0))

    def ui_log_append(msg: str) -> None:
        def append() -> None:
            log_w.configure(state=tk.NORMAL)
            log_w.insert(tk.END, msg.rstrip() + "\n")
            log_w.see(tk.END)
            log_w.configure(state=tk.DISABLED)

        root.after(0, append)

    def set_status(s: str) -> None:
        root.after(0, lambda: status_var.set(s))

    def refresh_buttons() -> None:
        def apply() -> None:
            if recording["flag"]:
                btn_rec.configure(text=" ■ 녹화 중지 ", bg=danger, activebackground="#b91c1c")
                btn_play.configure(state="disabled")
            else:
                btn_rec.configure(text=" ● 녹화 시작 ", bg=accent, activebackground=accent_hover)
                btn_play.configure(state="disabled" if playing["flag"] else "normal")
            if playing["flag"]:
                btn_play.configure(text=" ■ 재생 중지 ", bg=danger, activebackground="#b91c1c")
                btn_rec.configure(state="disabled")
            else:
                btn_play.configure(text=" ▶ 재생 ", bg=success, activebackground="#047857")
                btn_rec.configure(state="disabled" if recording["flag"] else "normal")

        root.after(0, apply)

    def start_record() -> None:
        if playing["flag"] or recording["flag"]:
            return
        out_path = Path(path_var.get().strip()).expanduser()
        if not out_path.name:
            messagebox.showwarning("알림", "저장할 파일 경로를 입력하세요.")
            return
        recording["flag"] = True
        stop_rec_ev.clear()
        refresh_buttons()
        set_status("녹화 중 — Esc 두 번 또는 중지 버튼")

        def worker() -> None:
            try:
                n = run_record(out_path, record_moves=False, external_stop_event=stop_rec_ev)
                ui_log_append(f"[녹화] 완료 — {n}개 이벤트 → {out_path.name}")
            except Exception as e:
                ui_log_append(f"[녹화] 오류: {e}")
                traceback.print_exc()
                root.after(0, lambda: messagebox.showerror("녹화 오류", str(e)))
            finally:
                def done() -> None:
                    recording["flag"] = False
                    set_status("대기 중")
                    refresh_buttons()

                root.after(0, done)

        threading.Thread(target=worker, daemon=True).start()

    def stop_record() -> None:
        stop_rec_ev.set()

    def toggle_record() -> None:
        if recording["flag"]:
            stop_record()
        else:
            start_record()

    def start_playback() -> None:
        if playing["flag"] or recording["flag"]:
            return
        fp = Path(path_var.get().strip()).expanduser()
        if not fp.is_file():
            messagebox.showwarning("알림", f"파일이 없습니다:\n{fp}")
            return
        try:
            spd = float((speed_var.get() or "1").replace(",", "."))
        except ValueError:
            spd = 1.0
        spd = max(0.05, spd)
        try:
            reps = int(repeat_var.get() or 1)
        except (ValueError, tk.TclError):
            reps = 1
        reps = max(1, min(100000, reps))
        playing["flag"] = True
        cancel_play_ev.clear()
        refresh_buttons()
        set_status(f"재생 중 — {reps}회 · {spd}×")

        def worker() -> None:
            try:
                run_play(
                    fp,
                    speed=spd,
                    dry_run=False,
                    countdown_secs=PLAY_COUNTDOWN_SECONDS,
                    repeat_count=reps,
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
                    set_status("대기 중")
                    refresh_buttons()

                root.after(0, done)

        threading.Thread(target=worker, daemon=True).start()

    def stop_playback() -> None:
        cancel_play_ev.set()

    def toggle_play() -> None:
        if playing["flag"]:
            stop_playback()
        else:
            start_playback()

    btn_rec = big_btn(btn_row, " ● 녹화 시작 ", accent, toggle_record)
    btn_rec.pack(side=tk.LEFT, padx=(0, 8))
    btn_play = big_btn(btn_row, " ▶ 재생 ", success, toggle_play)
    btn_play.pack(side=tk.LEFT)

    tk.Label(
        card_f,
        text="단축키 — Alt+Q 녹화 시작  ·  Alt+W 녹화 완료  ·  Alt+E 재생  ·  Alt+R 재생 중지",
        font=("Helvetica Neue", 10),
        fg=text_muted,
        bg=card,
    ).pack(anchor=tk.W, pady=(10, 0))

    tk.Label(outer, text="로그", font=("Helvetica Neue", 10, "bold"), fg=text_muted, bg=bg).pack(
        anchor=tk.W, pady=(14, 4)
    )
    log_w = scrolledtext.ScrolledText(
        outer,
        height=8,
        wrap=tk.WORD,
        font=("Menlo", 10),
        fg="#334155",
        bg="#f8fafc",
        state=tk.DISABLED,
    )
    log_w.pack(fill=tk.BOTH, expand=True)

    def intro_log() -> None:
        ui_log_append("Alt+Q 녹화 시작 · Alt+W 녹화 완료 · Alt+E 재생 · Alt+R 재생 중지")
        ui_log_append("창이 뒤에 있어도 위 단축키는 동작합니다 (손쉬운 접근 권한 필요).")
        if sys.platform == "darwin":
            ui_log_append("※ 첫 실행: 시스템 설정 → 개인정보 보호 및 보안 → 손쉬운 접근에 이 앱(또는 Python) 허용.")

    # 전역 Alt 단축키 — 상태 가드는 각 함수에서 이미 처리.
    def _hk_alt_q() -> None:
        root.after(0, lambda: (None if (recording["flag"] or playing["flag"]) else start_record()))

    def _hk_alt_w() -> None:
        root.after(0, lambda: stop_record() if recording["flag"] else None)

    def _hk_alt_e() -> None:
        root.after(0, lambda: (None if (recording["flag"] or playing["flag"]) else start_playback()))

    def _hk_alt_r() -> None:
        root.after(0, lambda: stop_playback() if playing["flag"] else None)

    hotkeys = AltHotkeyListener({"q": _hk_alt_q, "w": _hk_alt_w, "e": _hk_alt_e, "r": _hk_alt_r})
    hk_err = hotkeys.start()
    if hk_err:
        ui_log_append(f"[알림] {hk_err}")

    def on_close() -> None:
        hotkeys.stop()
        root.destroy()

    root.protocol("WM_DELETE_WINDOW", on_close)
    root.after(200, intro_log)
    refresh_buttons()
    root.mainloop()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        traceback.print_exc()
        print(f"[macro_app] 오류: {exc}", file=sys.stderr)
        sys.exit(1)
