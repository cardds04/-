"""
마우스·키보드 매크로 핵심 로직 — CLI·GUI 공용.
"""
from __future__ import annotations

import json
import threading
import time
from pathlib import Path
from typing import Callable

from pynput import keyboard, mouse
from pynput.keyboard import Key, KeyCode
from pynput.mouse import Button


def serialize_key_obj(key: keyboard.Key | KeyCode | None) -> dict:
    if key is None:
        return {"kind": "none"}
    if isinstance(key, KeyCode):
        if key.vk is not None and key.char is None:
            return {"kind": "vk", "vk": key.vk}
        return {"kind": "char", "char": key.char or ""}
    return {"kind": "named", "name": key.name}


def deserialize_key(rec: dict) -> Key | KeyCode | None:
    kind = rec.get("kind")
    if kind == "char":
        c = rec.get("char") or ""
        return KeyCode.from_char(c) if len(c) == 1 else None
    if kind == "named":
        name = rec.get("name")
        if not name:
            return None
        k = getattr(Key, name, None)
        if k is not None:
            return k
        aliases = {"cmd_l": Key.cmd_l, "cmd_r": Key.cmd_r, "alt_l": Key.alt_l}
        return aliases.get(name)
    if kind == "vk":
        vk = rec.get("vk")
        return KeyCode(vk=int(vk)) if vk is not None else None
    return None


def button_to_str(btn: Button) -> str:
    return {Button.left: "left", Button.right: "right", Button.middle: "middle"}[btn]


def str_to_button(s: str) -> Button:
    return {"left": Button.left, "right": Button.right, "middle": Button.middle}[s]


def run_record(
    out_path: Path,
    record_moves: bool,
    *,
    external_stop_event: threading.Event | None = None,
) -> int:
    """
    녹화를 시작하고 종료까지 블록합니다.
    종료 조건: Esc 키, 또는 external_stop_event가 set 될 때.
    반환: 저장된 이벤트 개수.
    """
    events: list[dict] = []
    t0 = time.perf_counter()
    esc_stop = {"stop": False}

    def rel_ms() -> int:
        return int((time.perf_counter() - t0) * 1000)

    def should_stop_outer() -> bool:
        if esc_stop["stop"]:
            return True
        if external_stop_event is not None and external_stop_event.is_set():
            return True
        return False

    def stop_if_esc(key_struct: dict) -> bool:
        return key_struct.get("kind") == "named" and key_struct.get("name") == "esc"

    def on_click(x: int, y: int, button: Button, pressed: bool):
        events.append(
            {
                "t_ms": rel_ms(),
                "type": "mouse_click",
                "x": float(x),
                "y": float(y),
                "button": button_to_str(button),
                "pressed": pressed,
            }
        )

    def on_scroll(_x: int, _y: int, dx: float, dy: float):
        events.append({"t_ms": rel_ms(), "type": "scroll", "dx": float(dx), "dy": float(dy)})

    def on_move(x: int, y: int):
        events.append({"t_ms": rel_ms(), "type": "mouse_move", "x": float(x), "y": float(y)})

    def on_press(key):
        js = serialize_key_obj(key)
        if stop_if_esc(js):
            esc_stop["stop"] = True
            return False
        events.append({"t_ms": rel_ms(), "type": "key_press", "key": js})

    def on_release(key):
        events.append({"t_ms": rel_ms(), "type": "key_release", "key": serialize_key_obj(key)})

    if record_moves:
        m_listener = mouse.Listener(on_click=on_click, on_scroll=on_scroll, on_move=on_move)
    else:
        m_listener = mouse.Listener(on_click=on_click, on_scroll=on_scroll)
    kb_listener = keyboard.Listener(on_press=on_press, on_release=on_release)

    kb_listener.start()
    m_listener.start()

    try:
        while not should_stop_outer():
            time.sleep(0.05)
    finally:
        kb_listener.stop()
        m_listener.stop()

    out_path = Path(out_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {"version": 1, "events": events}
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(events)


def load_events(inp: Path) -> list:
    raw = json.loads(Path(inp).read_text(encoding="utf-8"))
    events = raw.get("events") or raw
    if not isinstance(events, list):
        raise ValueError("JSON에 events 배열이 없습니다.")
    return events


def run_play(
    inp: Path,
    speed: float,
    *,
    dry_run: bool = False,
    countdown_secs: float = 5,
    cancel_event: threading.Event | None = None,
    on_log: Callable[[str], None] | None = None,
) -> int:
    """
    재생 후 처리한 이벤트 건수 반환 (건너뛴 것 포함).
    cancel_event 가 set 되면 즉시 중단.
    on_log(msg: str) 옵션.
    """
    def log(msg: str) -> None:
        if on_log:
            try:
                on_log(msg)
            except Exception:
                pass

    events = load_events(inp)
    mc = mouse.Controller()
    kc = keyboard.Controller()
    spd = max(0.05, float(speed))

    def apply_one(ev: dict) -> None:
        t = ev.get("type")
        if t == "mouse_click":
            x, y = int(ev["x"]), int(ev["y"])
            btn = str_to_button(ev.get("button", "left"))
            mc.position = (x, y)
            if dry_run:
                return
            if ev.get("pressed"):
                mc.press(btn)
            else:
                mc.release(btn)
        elif t == "mouse_move":
            if not dry_run:
                mc.position = (int(ev["x"]), int(ev["y"]))
        elif t == "scroll":
            if not dry_run:
                mc.scroll(float(ev.get("dx", 0)), float(ev.get("dy", 0)))
        elif t == "key_press":
            kk = deserialize_key(ev.get("key") or {})
            if kk is None:
                return
            if not dry_run:
                kc.press(kk)
        elif t == "key_release":
            kk = deserialize_key(ev.get("key") or {})
            if kk is None:
                return
            if not dry_run:
                kc.release(kk)

    if countdown_secs > 0:
        log(f"[재생] {int(countdown_secs)}초 뒤 시작합니다.")
        elapsed = 0.0
        step = 0.05
        while elapsed < countdown_secs:
            if cancel_event and cancel_event.is_set():
                log("[재생] 취소됨")
                return 0
            time.sleep(step)
            elapsed += step

    prev_ms = 0
    count = 0
    log(f"[재생] {len(events)}건 실행 (속도 {spd}×, 테스트={dry_run})")

    for ev in events:
        if cancel_event and cancel_event.is_set():
            log("[재생] 중간에 중지했습니다.")
            break
        t_ms = int(ev.get("t_ms", ev.get("t", 0)))
        wait_ms = max(0, t_ms - prev_ms)
        prev_ms = t_ms
        if wait_ms:
            target = wait_ms / 1000.0 / spd
            slept = 0.0
            chunk = 0.08
            while slept < target:
                if cancel_event and cancel_event.is_set():
                    log("[재생] 중간에 중지했습니다.")
                    return count
                s = min(chunk, target - slept)
                time.sleep(s)
                slept += s
        try:
            apply_one(ev)
            count += 1
        except Exception as exc:
            log(f"[재생] 건너뜀: {exc}")

    log("[재생] 완료")
    return count
