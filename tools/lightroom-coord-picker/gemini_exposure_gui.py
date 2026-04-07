#!/usr/bin/env python3
"""
Gemini 노출 제안 — 시각화 GUI (캡처 미리보기 · -5~+5 매핑 · 슬라이더 실행).

  cd tools/lightroom-coord-picker
  pip install -r requirements-gemini.txt
  python gemini_exposure_gui.py
"""

from __future__ import annotations

import json
import sys
import threading
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, ttk

from PIL import Image, ImageTk

import gemini_exposure_suggest as gex

SETTINGS_FILE = Path(__file__).resolve().parent / "gemini_exposure_gui_settings.json"


def region_from_entries(l, t, w, h) -> tuple[int, int, int, int]:
    return (int(l), int(t), int(w), int(h))


def track_from_entries(x0, x1, y) -> tuple[int, int, int]:
    return (int(x0), int(x1), int(y))


def exposure_to_slider_x_local(
    value: float,
    x0: int,
    x1: int,
    vmin: float,
    vmax: float,
) -> int:
    if x0 > x1:
        x0, x1 = x1, x0
    v = max(vmin, min(vmax, value))
    t = (v - vmin) / (vmax - vmin) if vmax != vmin else 0.5
    return int(round(x0 + t * (x1 - x0)))


class GeminiExposureGui:
    def __init__(self) -> None:
        self.root = tk.Tk()
        self.root.title("Gemini 노출 제안 · 시각화")
        self.root.minsize(720, 640)

        self._photo: ImageTk.PhotoImage | None = None
        self._last_pil: Image.Image | None = None
        self._parsed_exposure: float | None = None
        self._target_x: int | None = None
        self._busy = False
        self.var_show_api_key = tk.BooleanVar(value=False)

        f = ttk.Frame(self.root, padding=10)
        f.pack(fill=tk.BOTH, expand=True)

        ttk.Label(
            f,
            text="작업 영역을 캡처 → Gemini로 노출 숫자 요청 → 아래 막대로 화면 x 좌표 매핑을 확인 → 슬라이더 실행.",
            wraplength=680,
        ).pack(anchor=tk.W)

        # --- 좌표 ---
        coord = ttk.LabelFrame(f, text="좌표 (픽셀)", padding=8)
        coord.pack(fill=tk.X, pady=8)

        ttk.Label(coord, text="사진 작업 영역  L").grid(row=0, column=0, sticky=tk.W)
        self.ent_pl = ttk.Entry(coord, width=8)
        self.ent_pl.grid(row=0, column=1, padx=4)
        ttk.Label(coord, text="T").grid(row=0, column=2)
        self.ent_pt = ttk.Entry(coord, width=8)
        self.ent_pt.grid(row=0, column=3, padx=4)
        ttk.Label(coord, text="W").grid(row=0, column=4)
        self.ent_pw = ttk.Entry(coord, width=8)
        self.ent_pw.grid(row=0, column=5, padx=4)
        ttk.Label(coord, text="H").grid(row=0, column=6)
        self.ent_ph = ttk.Entry(coord, width=8)
        self.ent_ph.grid(row=0, column=7, padx=4)

        ttk.Label(coord, text="슬라이더 트랙  x0").grid(row=1, column=0, sticky=tk.W, pady=(6, 0))
        self.ent_sx0 = ttk.Entry(coord, width=8)
        self.ent_sx0.grid(row=1, column=1, padx=4, pady=(6, 0))
        ttk.Label(coord, text="x1").grid(row=1, column=2, pady=(6, 0))
        self.ent_sx1 = ttk.Entry(coord, width=8)
        self.ent_sx1.grid(row=1, column=3, padx=4, pady=(6, 0))
        ttk.Label(coord, text="y").grid(row=1, column=4, pady=(6, 0))
        self.ent_sy = ttk.Entry(coord, width=8)
        self.ent_sy.grid(row=1, column=5, padx=4, pady=(6, 0))

        self._load_settings_into_entries()

        # --- API 키 (저장하지 않음) ---
        key_fr = ttk.Frame(f)
        key_fr.pack(fill=tk.X, pady=4)
        key_fr.columnconfigure(1, weight=1)
        ttk.Label(key_fr, text="Gemini API 키").grid(row=0, column=0, sticky=tk.W)
        self.ent_key = ttk.Entry(key_fr, width=36, show="•")
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
        ttk.Label(key_fr, text="(Cmd+V / Ctrl+V · 환경변수 GEMINI_API_KEY)", font=("", 9)).grid(
            row=0, column=4, sticky=tk.W
        )
        envk = gex.get_api_key()
        if envk:
            self.ent_key.insert(0, envk)
        self._bind_api_key_paste_shortcuts()

        # --- 버튼 ---
        btn = ttk.Frame(f)
        btn.pack(fill=tk.X, pady=6)
        ttk.Button(btn, text="작업 영역 캡처 (미리보기)", command=self.capture_preview).pack(
            side=tk.LEFT, padx=(0, 8)
        )
        ttk.Button(btn, text="Gemini 질문 (캡처 이미지)", command=self.run_gemini).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn, text="슬라이더 드래그 실행", command=self.run_drag).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn, text="설정 저장 (좌표만)", command=self.save_settings).pack(side=tk.LEFT, padx=(0, 8))

        self.var_countdown = tk.IntVar(value=gex.COUNTDOWN_SEC)
        ttk.Label(btn, text="캡처 전 대기(초)").pack(side=tk.LEFT, padx=(12, 4))
        ttk.Spinbox(btn, from_=0, to=15, width=4, textvariable=self.var_countdown).pack(side=tk.LEFT)

        # --- 수동 노출 슬라이더 (매핑 시각화용) ---
        man = ttk.LabelFrame(f, text="노출 값 ↔ 슬라이더 x (수동으로 움직여 보면서 확인)", padding=8)
        man.pack(fill=tk.X, pady=6)
        self.var_manual_exp = tk.DoubleVar(value=0.0)
        self.scale_exp = ttk.Scale(
            man,
            from_=-5.0,
            to=5.0,
            variable=self.var_manual_exp,
            orient=tk.HORIZONTAL,
            length=420,
            command=lambda _e: self._on_manual_exposure(),
        )
        self.scale_exp.pack(side=tk.LEFT)
        self.lbl_manual = ttk.Label(man, text="")
        self.lbl_manual.pack(side=tk.LEFT, padx=10)
        self._on_manual_exposure()

        # --- 시각화 캔버스: -5 ~ +5 트랙 + 목표 x ---
        vis = ttk.LabelFrame(f, text="매핑 시각화 (빨강 = 현재 노출 값의 화면 x)", padding=6)
        vis.pack(fill=tk.X, pady=6)
        self.cv_w = 520
        self.cv_h = 100
        self.canvas = tk.Canvas(vis, width=self.cv_w, height=self.cv_h, bg="#1e1e1e", highlightthickness=0)
        self.canvas.pack()
        self._draw_mapping_canvas(self.var_manual_exp.get(), from_gemini=False)

        # --- 미리보기 이미지 ---
        prev_fr = ttk.LabelFrame(f, text="캡처 미리보기", padding=4)
        prev_fr.pack(fill=tk.BOTH, expand=True, pady=6)
        self.lbl_img = tk.Label(prev_fr, text="「작업 영역 캡처」를 누르세요.", bg="#2d2d30", fg="#ccc", pady=40)
        self.lbl_img.pack(fill=tk.BOTH, expand=True)

        # --- Gemini 응답 ---
        ttk.Label(f, text="Gemini 응답").pack(anchor=tk.W)
        self.txt_resp = tk.Text(f, height=4, wrap=tk.WORD, font=("Menlo", 11) if sys.platform == "darwin" else ("Consolas", 10))
        self.txt_resp.pack(fill=tk.X, pady=4)

        self.status = ttk.Label(f, text="준비")
        self.status.pack(anchor=tk.W)

    def _get_region_track(self) -> tuple[tuple[int, int, int, int], tuple[int, int, int]]:
        r = region_from_entries(
            self.ent_pl.get(),
            self.ent_pt.get(),
            self.ent_pw.get(),
            self.ent_ph.get(),
        )
        tr = track_from_entries(self.ent_sx0.get(), self.ent_sx1.get(), self.ent_sy.get())
        return r, tr

    def _load_settings_into_entries(self) -> None:
        p = gex.PHOTO_WORK_REGION
        t = gex.EXPOSURE_SLIDER_TRACK
        if SETTINGS_FILE.is_file():
            try:
                d = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
                if isinstance(d.get("photo_region"), list) and len(d["photo_region"]) == 4:
                    p = tuple(int(x) for x in d["photo_region"])
                if isinstance(d.get("slider_track"), list) and len(d["slider_track"]) == 3:
                    t = tuple(int(x) for x in d["slider_track"])
            except (OSError, json.JSONDecodeError, ValueError, TypeError):
                pass
        for e, v in zip((self.ent_pl, self.ent_pt, self.ent_pw, self.ent_ph), p):
            e.delete(0, tk.END)
            e.insert(0, str(v))
        for e, v in zip((self.ent_sx0, self.ent_sx1, self.ent_sy), t):
            e.delete(0, tk.END)
            e.insert(0, str(v))

    def save_settings(self) -> None:
        try:
            r, tr = self._get_region_track()
        except ValueError:
            messagebox.showerror("오류", "좌표는 정수로 입력하세요.")
            return
        SETTINGS_FILE.write_text(
            json.dumps({"photo_region": list(r), "slider_track": list(tr)}, indent=2) + "\n",
            encoding="utf-8",
        )
        messagebox.showinfo("저장", f"{SETTINGS_FILE.name} 에 좌표만 저장했습니다.")

    def _sync_api_key_show(self) -> None:
        self.ent_key.configure(show="" if self.var_show_api_key.get() else "•")

    def _bind_api_key_paste_shortcuts(self) -> None:
        self.ent_key.bind("<Command-v>", self._on_api_key_paste_shortcut)
        self.ent_key.bind("<Control-v>", self._on_api_key_paste_shortcut)

    def _on_api_key_paste_shortcut(self, _event: tk.Event | None = None) -> str:
        self.paste_api_key_from_clipboard(silent=True)
        return "break"

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

    def _api_key_resolved(self) -> str:
        k = self.ent_key.get().strip()
        if k:
            return k
        return gex.get_api_key()

    def capture_preview(self) -> None:
        if self._busy:
            return
        try:
            r, _ = self._get_region_track()
        except ValueError:
            messagebox.showerror("오류", "사진 영역 좌표를 정수로 입력하세요.")
            return

        def job() -> None:
            self._busy = True
            self.root.after(0, lambda: self.status.config(text="캡처 대기 중…"))
            n = max(0, int(self.var_countdown.get()))
            for i in range(n, 0, -1):
                self.root.after(0, lambda i=i: self.status.config(text=f"{i}초 후 캡처…"))
                import time

                time.sleep(1)
            try:
                img = gex.capture_work_region(r)
                self._last_pil = img

                def show() -> None:
                    self._photo = self._pil_to_photo(img, max_w=640)
                    self.lbl_img.config(image=self._photo, text="")
                    self.status.config(text=f"캡처 완료 {r} → {img.size[0]}×{img.size[1]} px")

                self.root.after(0, show)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("캡처 실패", str(e)))
                self.root.after(0, lambda: self.status.config(text="캡처 실패"))
            finally:
                self._busy = False

        threading.Thread(target=job, daemon=True).start()

    def _pil_to_photo(self, pil: Image.Image, max_w: int) -> ImageTk.PhotoImage:
        if pil.width > max_w:
            r = max_w / pil.width
            pil = pil.resize((max_w, int(pil.height * r)), Image.Resampling.LANCZOS)
        return ImageTk.PhotoImage(pil.convert("RGB"))

    def _on_manual_exposure(self) -> None:
        v = float(self.var_manual_exp.get())
        try:
            _, tr = self._get_region_track()
        except ValueError:
            self.lbl_manual.config(text="좌표 오류")
            return
        x0, x1, _ty = tr
        tx = exposure_to_slider_x_local(v, x0, x1, gex.EXPOSURE_MIN, gex.EXPOSURE_MAX)
        self.lbl_manual.config(text=f"  노출 {v:+.2f}  →  화면 x = {tx}")
        self._draw_mapping_canvas(v, from_gemini=False)

    def _draw_mapping_canvas(self, exposure: float, *, from_gemini: bool) -> None:
        self.canvas.delete("all")
        pad = 24
        w = self.cv_w - 2 * pad
        h = self.cv_h
        y_mid = h // 2

        self.canvas.create_line(pad, y_mid, pad + w, y_mid, fill="#555", width=4)
        for label, t in [("-5", 0.0), ("0", 0.5), ("+5", 1.0)]:
            x = pad + t * w
            self.canvas.create_line(x, y_mid - 8, x, y_mid + 8, fill="#888")
            self.canvas.create_text(x, y_mid + 22, text=label, fill="#aaa", font=("Helvetica", 10))

        try:
            _, tr = self._get_region_track()
            x0, x1, ty = tr
        except ValueError:
            self.canvas.create_text(self.cv_w // 2, 12, text="좌표 입력 오류", fill="#f66")
            return

        t = (max(gex.EXPOSURE_MIN, min(gex.EXPOSURE_MAX, exposure)) - gex.EXPOSURE_MIN) / (
            gex.EXPOSURE_MAX - gex.EXPOSURE_MIN
        )
        px = pad + t * w
        self.canvas.create_line(px, 10, px, h - 28, fill="#ff5555", width=3)
        tx = exposure_to_slider_x_local(exposure, x0, x1, gex.EXPOSURE_MIN, gex.EXPOSURE_MAX)
        src = "Gemini" if from_gemini else "수동"
        self.canvas.create_text(
            self.cv_w // 2,
            h - 12,
            text=f"{src}  노출 {exposure:+.2f}  →  drag 목표 x={tx}  y={ty}",
            fill="#ddd",
            font=("Helvetica", 11, "bold"),
        )

    def run_gemini(self) -> None:
        if self._busy:
            return
        if self._last_pil is None:
            messagebox.showinfo("먼저 캡처", "「작업 영역 캡처」로 이미지를 만든 뒤 실행하세요.")
            return
        key = self._api_key_resolved()
        if not key:
            messagebox.showerror("API 키", "API 키를 입력하거나 GEMINI_API_KEY 환경 변수를 설정하세요.")
            return

        try:
            _, tr_snap = self._get_region_track()
        except ValueError:
            messagebox.showerror("오류", "슬라이더/영역 좌표를 정수로 입력하세요.")
            return

        img = self._last_pil.copy()

        def job() -> None:
            self._busy = True
            self.root.after(0, lambda: self.status.config(text="Gemini 호출 중…"))

            try:
                raw = gex.ask_gemini_exposure(img, key)
                val = gex.parse_exposure_number(raw)
                val = max(gex.EXPOSURE_MIN, min(gex.EXPOSURE_MAX, val))
                x0, x1, ty = tr_snap
                tx = exposure_to_slider_x_local(val, x0, x1, gex.EXPOSURE_MIN, gex.EXPOSURE_MAX)

                def done() -> None:
                    self._parsed_exposure = val
                    self._target_x = tx
                    self.txt_resp.delete("1.0", tk.END)
                    self.txt_resp.insert(tk.END, raw)
                    self.var_manual_exp.set(val)
                    self._draw_mapping_canvas(val, from_gemini=True)
                    self.lbl_manual.config(text=f"  노출 {val:+.2f}  →  화면 x = {tx}")
                    self.status.config(text=f"Gemini 완료 → x={tx} (슬라이더 실행 가능)")

                self.root.after(0, done)
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("Gemini 오류", str(e)))
                self.root.after(0, lambda: self.status.config(text="Gemini 실패"))
            finally:
                self._busy = False

        threading.Thread(target=job, daemon=True).start()

    def run_drag(self) -> None:
        if self._busy:
            return
        try:
            _, tr = self._get_region_track()
        except ValueError:
            messagebox.showerror("오류", "슬라이더 좌표를 확인하세요.")
            return
        x0, x1, ty = tr

        try:
            v = float(self.var_manual_exp.get())
        except tk.TclError:
            v = self._parsed_exposure if self._parsed_exposure is not None else 0.0

        tx = exposure_to_slider_x_local(v, x0, x1, gex.EXPOSURE_MIN, gex.EXPOSURE_MAX)

        if not messagebox.askokcancel(
            "슬라이더 이동",
            f"마우스로 노출 슬라이더를 움칩니다.\n목표: x={tx}, y={ty}\n비상: 마우스를 왼쪽 위 모서리로.\n3초 후 시작합니다.",
        ):
            return

        def job() -> None:
            self._busy = True
            import time

            import pyautogui

            pyautogui.FAILSAFE = True
            pyautogui.PAUSE = 0.25
            time.sleep(3)
            try:
                gex.move_exposure_slider(tx, ty, x0, x1)
                self.root.after(0, lambda: self.status.config(text="드래그 완료"))
            except Exception as e:
                self.root.after(0, lambda: messagebox.showerror("드래그 실패", str(e)))
            finally:
                self._busy = False

        threading.Thread(target=job, daemon=True).start()

    def run(self) -> None:
        self.root.mainloop()


if __name__ == "__main__":
    GeminiExposureGui().run()
