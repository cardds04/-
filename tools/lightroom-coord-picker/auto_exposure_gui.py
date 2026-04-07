#!/usr/bin/env python3
"""
Lightroom 노출 자동 조정 — 시각화·목표 비율·조정 강도 설정 GUI.

  cd tools/lightroom-coord-picker && pip install -r requirements.txt
  python auto_exposure_gui.py
"""

from __future__ import annotations

import json
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk

from PIL import Image, ImageTk

import auto_exposure as ae

HOTKEY_FILE = Path(__file__).resolve().parent / "lightroom_gui_hotkeys.json"

# (설정 키, 버튼 기본 제목)
HOTKEY_ACTIONS: list[tuple[str, str]] = [
    ("refresh_preview", "히스토그램 새로고침 (캡처)"),
    ("run_auto", "자동 조정 실행 (최대 3회)"),
    ("clear_log", "로그 지우기"),
]


def default_hotkey_map() -> dict[str, str]:
    if sys.platform == "darwin":
        return {
            "refresh_preview": "<F5>",
            "run_auto": "<Command-e>",
            "clear_log": "<Command-l>",
        }
    return {
        "refresh_preview": "<F5>",
        "run_auto": "<Control-Shift-E>",
        "clear_log": "<Control-l>",
    }


def load_hotkey_map() -> dict[str, str]:
    base = default_hotkey_map()
    if not HOTKEY_FILE.is_file():
        return base
    try:
        raw = json.loads(HOTKEY_FILE.read_text(encoding="utf-8"))
        if not isinstance(raw, dict):
            return base
        out = dict(base)
        for k, v in raw.items():
            if k in base and isinstance(v, str) and v.strip():
                out[k] = v.strip()
        return out
    except (OSError, json.JSONDecodeError):
        return base


def save_hotkey_map(data: dict[str, str]) -> None:
    HOTKEY_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def validate_tk_sequence(root: tk.Misc, seq: str) -> tuple[bool, str]:
    s = seq.strip()
    if not s:
        return False, "비어 있습니다."
    if not (s.startswith("<") and s.endswith(">")):
        return False, "Tk 형식으로 <F5>, <Command-e> 처럼 < … > 로 감싸야 합니다."
    try:
        root.bind(s, lambda _e: None)
        root.unbind(s)
        return True, ""
    except tk.TclError as e:
        return False, str(e)


def event_to_bind_string(event: tk.Event) -> str | None:
    """키 캡처 창에서 KeyPress → Tk bind 문자열 (맥 Command 는 state 비트 조합)."""
    ks = event.keysym
    if ks in (
        "Shift_L",
        "Shift_R",
        "Control_L",
        "Control_R",
        "Meta_L",
        "Meta_R",
        "Super_L",
        "Super_R",
        "Alt_L",
        "Alt_R",
        "Caps_Lock",
        "Num_Lock",
        "Escape",
    ):
        return None

    st = event.state
    parts: list[str] = []
    if st & 0x0001:
        parts.append("Shift")
    if st & 0x0004:
        parts.append("Control")

    if sys.platform == "darwin":
        if st & 0x100000:
            parts.append("Command")
        if st & 0x0008:
            parts.append("Option")
    else:
        if st & 0x0008 or st & 0x20000:
            parts.append("Alt")

    if ks.startswith("F") and len(ks) <= 3 and ks != "Fn":
        try:
            int(ks[1:])
            key = ks
        except ValueError:
            key = ks.lower() if len(ks) == 1 else ks
    elif ks in ("Return", "Tab", "BackSpace", "Delete", "space", "Up", "Down", "Left", "Right"):
        key = "space" if ks == "space" else ks
    elif len(ks) == 1:
        key = ks.lower()
    else:
        key = ks

    if not parts:
        return f"<{key}>"
    return "<" + "-".join(parts) + "-" + key + ">"


def humanize_hotkey(seq: str) -> str:
    """버튼 옆에 짧게 표시."""
    s = seq.strip("<>")
    if sys.platform == "darwin":
        s = (
            s.replace("Command-", "⌘")
            .replace("Control-", "⌃")
            .replace("Shift-", "⇧")
            .replace("Option-", "⌥")
        )
    return s


CANVAS_PLACEHOLDER = (
    "① Lightroom을 켜고 히스토그램이 보이게 하세요.\n\n"
    "② 반드시 아래 「히스토그램 새로고침」 버튼을 누르세요.\n"
    "   (누르기 전에는 여기가 검게 보일 수 있습니다.)\n\n"
    "③ 목표 % 슬라이더 → 녹색 목표선이 움직입니다 (같은 캡처 기준).\n"
    "④ 조정 강도 → 실제로 슬라이더를 얼마나 밀지 (×배율).\n\n"
    "── 맥에서 캡처가 검은 화면이면 ──\n"
    "시스템 설정 → 개인 정보 보호 및 보안 → 화면 녹화\n"
    "에서 터미널 또는 Python을 켜 주세요.\n"
    "해상도·모니터를 바꿨다면 pick_coords.py 로 좌표를 다시 잡으세요.\n\n"
    "이 창이 포커스일 때만 단축키가 먹습니다. 키는 「단축키 설정」에서 바꿀 수 있습니다."
)


def bgr_to_photo(bgr):
    import cv2

    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    pil = Image.fromarray(rgb)
    max_w = 520
    if pil.width > max_w:
        r = max_w / pil.width
        pil = pil.resize((max_w, int(pil.height * r)), Image.Resampling.LANCZOS)
    return ImageTk.PhotoImage(pil)


class AutoExposureGui:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Lightroom 노출 자동 조정 · 미리보기")
        self.root.minsize(580, 520)

        self._photo: ImageTk.PhotoImage | None = None
        self._running = False
        self._last_bgr = None  # 마지막 성공 캡처 (슬라이더만 바꿀 때 재사용)
        self.hotkeys: dict[str, str] = load_hotkey_map()
        self._hotkey_seq_registered: list[str] = []

        f = ttk.Frame(self.root, padding=10)
        f.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            f,
            text="먼저 「히스토그램 새로고침」으로 화면을 찍어야 미리보기가 나옵니다. "
            "이후 목표 %·강도 슬라이더를 움직이면 숫자와 (캡처가 있을 때) 녹색 목표선이 바로 반영됩니다.",
            wraplength=540,
        ).pack(anchor=tk.W)

        ctrl = ttk.Frame(f)
        ctrl.pack(fill=tk.X, pady=8)

        ttk.Label(ctrl, text="목표 위치 (히스토그램 너비 대비 %)").grid(row=0, column=0, sticky=tk.W)
        self.var_ratio = tk.DoubleVar(value=ae.DEFAULT_TARGET_RATIO)
        self.scale_ratio = ttk.Scale(
            ctrl,
            from_=0.08,
            to=0.55,
            variable=self.var_ratio,
            orient=tk.HORIZONTAL,
            length=260,
            command=self._on_ratio_scale,
        )
        self.scale_ratio.grid(row=0, column=1, padx=6)
        self.spin_ratio = ttk.Spinbox(
            ctrl,
            from_=8,
            to=55,
            width=5,
            command=self._on_ratio_spin,
        )
        self.spin_ratio.grid(row=0, column=2, padx=4)
        self.spin_ratio.set(int(round(ae.DEFAULT_TARGET_RATIO * 100)))
        self.spin_ratio.bind("<Return>", lambda _e: self._on_ratio_spin())
        self.spin_ratio.bind("<FocusOut>", lambda _e: self._on_ratio_spin())
        self.lbl_ratio = ttk.Label(ctrl, text="")
        self.lbl_ratio.grid(row=0, column=3, sticky=tk.W)
        self._sync_ratio_labels()

        ttk.Label(ctrl, text="조정 강도 (슬라이더 이동 ×배율)").grid(row=1, column=0, sticky=tk.W, pady=(8, 0))
        self.var_strength = tk.DoubleVar(value=ae.DEFAULT_ADJUSTMENT_STRENGTH)
        self.scale_strength = ttk.Scale(
            ctrl,
            from_=0.2,
            to=1.8,
            variable=self.var_strength,
            orient=tk.HORIZONTAL,
            length=260,
            command=self._on_strength_scale,
        )
        self.scale_strength.grid(row=1, column=1, padx=6, pady=(8, 0))
        self.lbl_strength = ttk.Label(ctrl, text="")
        self.lbl_strength.grid(row=1, column=3, sticky=tk.W, pady=(8, 0))
        self._on_strength_change()

        self.var_live = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            f,
            text="목표 %·강도 바꿀 때마다 미리보기 즉시 갱신 (마지막 캡처 기준)",
            variable=self.var_live,
        ).pack(anchor=tk.W, pady=(2, 0))

        btn_row = ttk.Frame(f)
        btn_row.pack(fill=tk.X, pady=8)
        self.btn_refresh = ttk.Button(btn_row, text="", command=self.refresh_preview)
        self.btn_refresh.pack(side=tk.LEFT, padx=(0, 8))
        self.btn_run_auto = ttk.Button(btn_row, text="", command=self.run_auto)
        self.btn_run_auto.pack(side=tk.LEFT, padx=(0, 8))
        self.btn_clear_log = ttk.Button(btn_row, text="", command=self._clear_log)
        self.btn_clear_log.pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn_row, text="단축키 설정…", command=self.open_hotkey_settings).pack(side=tk.LEFT)
        self._update_action_button_labels()

        self.info = tk.Text(f, height=5, wrap=tk.WORD, font=("Menlo", 11) if self._is_mac() else ("Consolas", 10))
        self.info.pack(fill=tk.X, pady=4)
        self._log(
            "팁: 해상도를 바꾸면 auto_exposure.py 의 HISTOGRAM_REGION 값이 어긋납니다. "
            "pick_coords.py 로 다시 찍으세요."
        )

        preview_wrap = ttk.Frame(f)
        preview_wrap.pack(fill=tk.BOTH, expand=True, pady=4)
        self.canvas = tk.Label(
            preview_wrap,
            bg="#2d2d30",
            fg="#e8e8e8",
            text=CANVAS_PLACEHOLDER,
            justify=tk.LEFT,
            anchor=tk.NW,
            font=("PingFang SC", 13) if self._is_mac() else ("Segoe UI", 12),
            padx=14,
            pady=14,
            relief=tk.SUNKEN,
        )
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self.summary = ttk.Label(f, text="", wraplength=540)
        self.summary.pack(anchor=tk.W, pady=(0, 4))

        self.status = ttk.Label(f, text="대기 — 「히스토그램 새로고침」을 눌러 캡처하세요.")
        self.status.pack(anchor=tk.W)

        self.root.protocol("WM_DELETE_WINDOW", self._on_close)
        self.apply_window_hotkeys()

    def _hotkey_refresh(self, _event=None) -> str | None:
        self.refresh_preview()
        return "break"

    def _hotkey_run_auto(self, _event=None) -> str | None:
        self.run_auto()
        return "break"

    def _hotkey_clear_log(self, _event=None) -> str | None:
        self._clear_log()
        return "break"

    def apply_window_hotkeys(self) -> None:
        """이 Tk 창에 포커스가 있을 때만 동작 (라이트룸 앞에 두면 단축키 안 먹음)."""
        for seq in self._hotkey_seq_registered:
            try:
                self.root.unbind(seq)
            except tk.TclError:
                pass
        self._hotkey_seq_registered = []

        d0 = default_hotkey_map()
        mapping = [
            (self.hotkeys.get("refresh_preview") or d0["refresh_preview"], self._hotkey_refresh),
            (self.hotkeys.get("run_auto") or d0["run_auto"], self._hotkey_run_auto),
            (self.hotkeys.get("clear_log") or d0["clear_log"], self._hotkey_clear_log),
        ]
        used: set[str] = set()
        for seq, handler in mapping:
            seq = (seq or "").strip()
            if not seq or seq in used:
                continue
            ok, err = validate_tk_sequence(self.root, seq)
            if not ok:
                if hasattr(self, "info") and self.info.winfo_exists():
                    self._log(f"[단축키 무시] {seq}: {err}")
                continue
            used.add(seq)
            self.root.bind(seq, handler)
            self._hotkey_seq_registered.append(seq)

    def _update_action_button_labels(self) -> None:
        titles = {k: t for k, t in HOTKEY_ACTIONS}
        for key, btn in (
            ("refresh_preview", self.btn_refresh),
            ("run_auto", self.btn_run_auto),
            ("clear_log", self.btn_clear_log),
        ):
            base = titles.get(key, key)
            seq = self.hotkeys.get(key, "")
            suf = f" [{humanize_hotkey(seq)}]" if seq else ""
            btn.config(text=base + suf)

    def open_hotkey_settings(self) -> None:
        HotkeySettingsWindow(self.root, self)

    def _is_mac(self) -> bool:
        return sys.platform == "darwin"

    def _clear_log(self) -> None:
        self.info.delete("1.0", tk.END)

    def _sync_ratio_labels(self) -> None:
        r = self.var_ratio.get()
        w = ae.HISTOGRAM_REGION[2]
        tx = ae.target_peak_x_from_ratio(w, r)
        self.lbl_ratio.config(text=f"  → 목표 x ≈ {tx} (너비 {w}px)")

    def _on_ratio_scale(self, _evt=None) -> None:
        r = float(self.var_ratio.get())
        r = max(0.08, min(0.55, r))
        self.var_ratio.set(r)
        try:
            self.spin_ratio.set(int(round(r * 100)))
        except tk.TclError:
            pass
        self._sync_ratio_labels()
        self._after_ratio_strength_change()

    def _on_ratio_spin(self) -> None:
        try:
            p = int(self.spin_ratio.get())
        except (tk.TclError, ValueError):
            return
        p = max(8, min(55, p))
        self.var_ratio.set(p / 100.0)
        self._sync_ratio_labels()
        self._after_ratio_strength_change()

    def _on_strength_scale(self, _evt=None) -> None:
        self._on_strength_change()
        self._after_ratio_strength_change()

    def _on_strength_change(self) -> None:
        s = float(self.var_strength.get())
        self.lbl_strength.config(text=f"  ×{s:.2f}")

    def _after_ratio_strength_change(self) -> None:
        if not self.var_live.get():
            self._update_summary_only()
            return
        if self._last_bgr is None:
            self._update_summary_only()
            return
        self._apply_overlay_to_canvas(self._last_bgr)

    def _update_summary_only(self) -> None:
        if self._last_bgr is None:
            self.summary.config(text="캡처 후 여기에 피크·슬라이더 이동 요약이 표시됩니다.")
            return
        try:
            w = ae.HISTOGRAM_REGION[2]
            ratio = float(self.var_ratio.get())
            target_x = ae.target_peak_x_from_ratio(w, ratio)
            strength = float(self.var_strength.get())
            plan = ae.plan_from_bgr(
                self._last_bgr,
                ae.HISTOGRAM_REGION,
                ae.EXPOSURE_SLIDER_TRACK,
                target_x,
                strength=strength,
            )
            self.summary.config(
                text=(
                    f"피크(빨강) x={plan['peak_x']}  |  목표(녹강) x={target_x}  |  "
                    f"히스토그램 Δ {plan['delta_hist']:+d}px  |  "
                    f"슬라이더 이동 {plan['delta_slider_applied']:+d}px (원본 {plan['delta_slider_raw']:+d} × 강도)"
                )
            )
        except Exception as e:
            self.summary.config(text=f"요약 오류: {e}")

    def _apply_overlay_to_canvas(self, bgr) -> None:
        w = ae.HISTOGRAM_REGION[2]
        ratio = float(self.var_ratio.get())
        target_x = ae.target_peak_x_from_ratio(w, ratio)
        strength = float(self.var_strength.get())
        plan = ae.plan_from_bgr(
            bgr,
            ae.HISTOGRAM_REGION,
            ae.EXPOSURE_SLIDER_TRACK,
            target_x,
            strength=strength,
        )
        overlay = ae.draw_preview_overlay(plan["bgr"], plan["peak_x"], target_x, draw_profile=True)
        self._photo = bgr_to_photo(overlay)
        self.canvas.config(image=self._photo, text="")
        self.summary.config(
            text=(
                f"피크 x={plan['peak_x']}  |  목표 x={target_x}  |  Δ히스토 {plan['delta_hist']:+d}px  |  "
                f"슬라이더 {plan['delta_slider_applied']:+d}px (트랙 {plan['start_x']}→{plan['end_x']})"
            )
        )

    def _log(self, line: str) -> None:
        self.info.insert(tk.END, line + "\n")
        self.info.see(tk.END)

    def refresh_preview(self) -> None:
        self.status.config(text="캡처 중…")
        self.root.update_idletasks()
        try:
            w = ae.HISTOGRAM_REGION[2]
            ratio = float(self.var_ratio.get())
            target_x = ae.target_peak_x_from_ratio(w, ratio)
            strength = float(self.var_strength.get())

            plan = ae.compute_adjustment_plan(
                ae.HISTOGRAM_REGION,
                ae.EXPOSURE_SLIDER_TRACK,
                target_x,
                strength=strength,
            )
            bgr = plan["bgr"]

            if ae.capture_looks_blank(bgr):
                messagebox.showwarning(
                    "캡처가 거의 검은색입니다",
                    "권한 또는 좌표 문제일 수 있습니다.\n\n"
                    "• 맥: 시스템 설정 → 개인 정보 보호 → 화면 녹화 → 터미널/Python 허용\n"
                    "• 모니터·해상도·창 위치를 바꿨다면 pick_coords.py 로 좌표 재측정\n"
                    "• Lightroom이 해당 화면 좌표에 보이는지 확인",
                )

            self._last_bgr = bgr.copy()
            self._apply_overlay_to_canvas(self._last_bgr)

            self._log(
                f"[캡처] 피크={plan['peak_x']} 목표={target_x} Δ히스토={plan['delta_hist']:+d} "
                f"슬라이더={plan['delta_slider_applied']:+d}px"
            )
            self.status.config(text="미리보기 갱신됨. 목표 %를 움직이면 녹선만 바뀝니다 (F5로 다시 캡처).")
        except Exception as e:
            messagebox.showerror("오류", str(e))
            self.status.config(text=f"실패: {e}")

    def run_auto(self) -> None:
        if self._running:
            messagebox.showinfo("진행 중", "이미 자동 조정이 실행 중입니다.")
            return

        if self._last_bgr is None:
            messagebox.showinfo(
                "먼저 캡처",
                "「히스토그램 새로고침」으로 한 번 캡처한 뒤 자동 조정을 실행하세요.",
            )
            return

        if not messagebox.askokcancel(
            "확인",
            "마우스로 노출 슬라이더를 움직입니다.\n"
            "비상 시 마우스를 화면 왼쪽 위 모서리로 옮기세요.\n"
            "3초 후 시작합니다. 계속할까요?",
        ):
            return

        def job() -> None:
            self._running = True
            self.root.after(0, lambda: self.status.config(text="자동 조정 중… (3초 대기)"))

            import time

            import pyautogui

            pyautogui.FAILSAFE = True
            pyautogui.PAUSE = 0.5

            w = ae.HISTOGRAM_REGION[2]
            ratio = float(self.var_ratio.get())
            target_x = ae.target_peak_x_from_ratio(w, ratio)
            strength = float(self.var_strength.get())

            time.sleep(3)
            try:
                for i in range(ae.MAX_ITERATIONS):
                    peak_x, err_b = ae.adjust_exposure_once(
                        ae.HISTOGRAM_REGION,
                        ae.EXPOSURE_SLIDER_TRACK,
                        target_x,
                        strength=strength,
                    )
                    msg = f"[{i + 1}/{ae.MAX_ITERATIONS}] 피크={peak_x} 목표={target_x} 오차={err_b}px"
                    self.root.after(0, lambda m=msg: self._log(m))

                    time.sleep(ae.LOOP_INTERVAL_SEC)
                    bgr = ae.capture_histogram_bgr(ae.HISTOGRAM_REGION)
                    peak_after = ae.peak_x_brightest_column(bgr)
                    err_a = abs(peak_after - target_x)
                    msg2 = f"    재측정 피크={peak_after} 오차={err_a}px"
                    self.root.after(0, lambda m=msg2: self._log(m))

                    if err_a <= ae.TOLERANCE_PX:
                        self.root.after(0, lambda: self._log("목표 범위 도달."))
                        break
                else:
                    self.root.after(0, lambda: self._log("최대 반복 종료."))

                self.root.after(0, self.refresh_preview)
            except pyautogui.FailSafeException:
                self.root.after(0, lambda: self._log("[FAILSAFE] 중단됨."))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("오류", str(e)))
            finally:
                self._running = False
                self.root.after(
                    0,
                    lambda: self.status.config(text="준비됨 — 새로고침(F5)으로 미리보기를 다시 찍을 수 있습니다."),
                )

        threading.Thread(target=job, daemon=True).start()

    def _on_close(self) -> None:
        if self._running:
            if not messagebox.askokcancel("종료", "자동 조정이 진행 중입니다. 그래도 닫을까요?"):
                return
        self.root.destroy()

    def run(self) -> None:
        self._update_summary_only()
        self.root.mainloop()


class HotkeySettingsWindow:
    """버튼별 단축키: JSON 저장 + Tk bind (이 창 포커스 시에만)."""

    def __init__(self, parent: tk.Misc, app: AutoExposureGui) -> None:
        self.app = app
        self.win = tk.Toplevel(parent)
        self.win.title("단축키 설정")
        self.win.transient(parent)
        self.win.resizable(True, False)
        self.vars: dict[str, tk.StringVar] = {}

        hint = (
            "아래에 Tk bind 형식으로 입력하거나 「키로 지정」으로 눌러 등록하세요.\n"
            "예: <F5>   <Command-r> (맥)   <Control-Shift-e>   — 이 앱 창이 앞에 있을 때만 동작합니다."
        )
        ttk.Label(self.win, text=hint, wraplength=520).pack(anchor=tk.W, padx=12, pady=(10, 6))

        grid = ttk.Frame(self.win, padding=(12, 0, 12, 8))
        grid.pack(fill=tk.X)

        for row, (akey, label) in enumerate(HOTKEY_ACTIONS):
            ttk.Label(grid, text=label).grid(row=row, column=0, sticky=tk.W, pady=5)
            v = tk.StringVar(value=app.hotkeys.get(akey, ""))
            self.vars[akey] = v
            ttk.Entry(grid, textvariable=v, width=26).grid(row=row, column=1, padx=8, pady=5)
            ttk.Button(grid, text="키로 지정", command=lambda ak=akey: self._capture_key(ak)).grid(
                row=row, column=2, pady=5
            )

        bf = ttk.Frame(self.win, padding=12)
        bf.pack(fill=tk.X)
        ttk.Button(bf, text="저장 후 적용", command=self._save).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(bf, text="기본값으로", command=self._defaults).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(bf, text="닫기", command=self.win.destroy).pack(side=tk.RIGHT)

    def _capture_key(self, akey: str) -> None:
        cap = tk.Toplevel(self.win)
        cap.title("키 조합")
        cap.transient(self.win)
        ttk.Label(
            cap,
            text="이 창이 포커스인 상태에서 단축키를 누르세요.\n(Esc: 취소)",
            justify=tk.CENTER,
        ).pack(padx=24, pady=16)

        def on_key(event: tk.Event) -> str:
            if event.keysym == "Escape":
                cap.destroy()
                return "break"
            s = event_to_bind_string(event)
            if s:
                self.vars[akey].set(s)
                cap.destroy()
            return "break"

        cap.bind("<KeyPress>", on_key)
        cap.focus_force()
        cap.wait_visibility()

    def _defaults(self) -> None:
        for k, v in default_hotkey_map().items():
            if k in self.vars:
                self.vars[k].set(v)

    def _save(self) -> None:
        errors: list[str] = []
        newmap: dict[str, str] = {}
        for akey, _ in HOTKEY_ACTIONS:
            seq = self.vars[akey].get().strip()
            if not seq:
                errors.append(f"{akey}: 비어 있습니다.")
                continue
            ok, err = validate_tk_sequence(self.app.root, seq)
            if not ok:
                errors.append(f"{akey}: {err}")
                continue
            newmap[akey] = seq

        if len(newmap) != len(HOTKEY_ACTIONS):
            errors.append("세 항목 모두 올바른 단축키가 필요합니다.")

        rev: dict[str, list[str]] = {}
        for k, v in newmap.items():
            rev.setdefault(v, []).append(k)
        for v, ks in rev.items():
            if len(ks) > 1:
                errors.append(f"같은 단축키 {v} 가 중복: {', '.join(ks)}")

        if errors:
            messagebox.showerror("저장 불가", "\n".join(errors), parent=self.win)
            return

        self.app.hotkeys = newmap
        save_hotkey_map(newmap)
        self.app.apply_window_hotkeys()
        self.app._update_action_button_labels()
        messagebox.showinfo(
            "저장됨",
            f"{HOTKEY_FILE.name} 에 저장했습니다.\n(이 앱 창이 포커스일 때만 단축키가 동작합니다.)",
            parent=self.win,
        )


if __name__ == "__main__":
    AutoExposureGui().run()
