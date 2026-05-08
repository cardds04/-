"""
마우스·키보드 매크로 핵심 로직 — CLI·GUI 공용.
※ pynput 은 run_record / run_play 안에서만 불러옵니다.
※ macOS: 녹화는 기본적으로 별도 자식 프로세스(spawn)에서만 돌려,
  pynput / Quartz 충돌(SIGTRAP, zsh: trace trap) 시에도 GUI·터미널 본체는 살아 있게 합니다.
"""
from __future__ import annotations

import json
import multiprocessing as mp
import os
import queue
import sys
import threading
import time
from pathlib import Path
from typing import Any, Callable


# Esc 를 이 시간(초) 안에 두 번 누르면 녹화·재생 중지
DOUBLE_ESCAPE_WINDOW_SEC = 0.75


def _is_esc_key_struct(key_struct: dict) -> bool:
    return key_struct.get("kind") == "named" and key_struct.get("name") == "esc"


def _double_escape_register_press(state: dict, now: float) -> bool:
    """state: {\"t0\": float, \"n\": int}. 같은 윈도 안에서 두 번째 Esc 이면 True."""
    if now - state["t0"] > DOUBLE_ESCAPE_WINDOW_SEC:
        state["n"] = 1
    else:
        state["n"] += 1
    state["t0"] = now
    return state["n"] >= 2


def serialize_key_obj(key: Any) -> dict:
    from pynput.keyboard import KeyCode

    if key is None:
        return {"kind": "none"}
    if isinstance(key, KeyCode):
        if key.vk is not None and key.char is None:
            return {"kind": "vk", "vk": key.vk}
        return {"kind": "char", "char": key.char or ""}
    return {"kind": "named", "name": key.name}


def deserialize_key(rec: dict):
    from pynput.keyboard import Key, KeyCode

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


def button_to_str(btn: Any) -> str:
    from pynput.mouse import Button

    return {Button.left: "left", Button.right: "right", Button.middle: "middle"}[btn]


def str_to_button(s: str):
    from pynput.mouse import Button

    return {"left": Button.left, "right": Button.right, "middle": Button.middle}[s]


def _execute_record_listen_impl(
    out_path: Path,
    record_moves: bool,
    external_stop_predicate: Callable[[], bool],
) -> int:
    """같은 프로세스에서 녹화 (내부·자식 공용 본문)."""
    from pynput import keyboard, mouse
    from pynput.mouse import Button

    events: list[dict] = []
    t0 = time.perf_counter()
    esc_stop = {"stop": False}

    def rel_ms() -> int:
        return int((time.perf_counter() - t0) * 1000)

    def should_stop_outer() -> bool:
        if esc_stop["stop"]:
            return True
        try:
            return bool(external_stop_predicate())
        except Exception:
            return False

    esc_dbl_state = {"t0": 0.0, "n": 0}

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
        if _is_esc_key_struct(js):
            if _double_escape_register_press(esc_dbl_state, time.perf_counter()):
                esc_stop["stop"] = True
                return False
            return None
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


def _darwin_record_worker_main(
    out_resolved: str,
    record_moves: bool,
    stop_mp: Any,
    done_q: Any,
) -> None:
    """multiprocessing spawn 전용 — 최상위 함수로 두어 pickle 가능하게."""
    try:
        n = _execute_record_listen_impl(
            Path(out_resolved),
            record_moves,
            lambda: stop_mp.is_set(),
        )
        done_q.put(("ok", n))
    except Exception as e:
        try:
            done_q.put(("err", str(e)))
        except Exception:
            pass


def _bridge_threading_event_to_mp(te: threading.Event, stop_mp: Any) -> None:
    def _run() -> None:
        te.wait()
        stop_mp.set()

    threading.Thread(target=_run, daemon=True).start()


def _run_record_macos_spawn(
    out_path: Path,
    record_moves: bool,
    external_stop_event: threading.Event | None,
) -> int:
    ctx = mp.get_context("spawn")
    stop_mp = ctx.Event()
    done_q = ctx.Queue(maxsize=1)

    if external_stop_event is not None:
        _bridge_threading_event_to_mp(external_stop_event, stop_mp)

    out_resolved = str(Path(out_path).expanduser().resolve())
    proc = ctx.Process(
        target=_darwin_record_worker_main,
        args=(out_resolved, bool(record_moves), stop_mp, done_q),
    )
    proc.start()
    proc.join()

    if proc.exitcode != 0:
        raise RuntimeError(
            "macOS 녹화 하위 프로세스가 비정상 종료했습니다 (pynput/Quartz 충돌 가능). "
            "① 시스템 설정 → 개인 정보 보호 → 손쉬운 사용에서 터미널(또는 Python) 허용 "
            "② Python 3.11~3.12 로 가상환경 재구성 권장 "
            f"③ 터미널에서 `export MACRO_RECORD_FORCE_INPROCESS=1` 후 재시도(위험·GUI도 죽을 수 있음). "
            f"[exit {proc.exitcode}]"
        )

    try:
        status, payload = done_q.get(timeout=2.0)
    except queue.Empty as exc:
        raise RuntimeError(
            "녹화 프로세스는 끝났는데 결과를 받지 못했습니다. 손쉬운 접근 권한·Python 버전을 확인하세요."
        ) from exc

    if status == "err":
        raise RuntimeError(payload)
    return int(payload)


def run_record(
    out_path: Path,
    record_moves: bool,
    *,
    external_stop_event: threading.Event | None = None,
) -> int:
    """
    녹화. macOS 기본: spawn 자식에서만 실행.
    환경변수 MACRO_RECORD_FORCE_INPROCESS=1 이면 예전처럼 현재 프로세스에서 실행(디버그용).
    """
    out_path = Path(out_path)
    pred = lambda: external_stop_event.is_set() if external_stop_event is not None else False

    use_mac_spawn = (
        sys.platform == "darwin"
        and os.environ.get("MACRO_RECORD_FORCE_INPROCESS", "").strip() != "1"
    )

    if use_mac_spawn:
        return _run_record_macos_spawn(out_path, record_moves, external_stop_event)

    return _execute_record_listen_impl(out_path, record_moves, pred)


def load_events(inp: Path) -> list:
    raw = json.loads(Path(inp).read_text(encoding="utf-8"))
    events = raw.get("events") or raw
    if not isinstance(events, list):
        raise ValueError("JSON에 events 배열이 없습니다.")
    return events


def _execute_play_impl(
    inp: Path,
    speed: float,
    *,
    dry_run: bool = False,
    countdown_secs: float = 5,
    repeat_count: int = 1,
    cancel_predicate: Callable[[], bool] | None = None,
    on_log: Callable[[str], None] | None = None,
) -> int:
    """같은 프로세스에서 재생 (내부·자식 공용 본문)."""
    from pynput import keyboard, mouse

    def log(msg: str) -> None:
        if on_log:
            try:
                on_log(msg)
            except Exception:
                pass

    dbl_esc_cancel = threading.Event()

    def cancelled() -> bool:
        if dbl_esc_cancel.is_set():
            return True
        if cancel_predicate is None:
            return False
        try:
            return bool(cancel_predicate())
        except Exception:
            return False

    esc_play_state = {"t0": 0.0, "n": 0}

    def on_play_esc_press(key: Any):
        js = serialize_key_obj(key)
        if _is_esc_key_struct(js):
            if _double_escape_register_press(esc_play_state, time.perf_counter()):
                dbl_esc_cancel.set()
                log("[재생] Esc 두 번 입력 — 중지합니다.")
                return False
        return None

    kb_esc_listener = keyboard.Listener(on_press=on_play_esc_press)
    kb_esc_listener.start()

    try:
        events = load_events(inp)
        log(f"[재생] 진행 중 Esc 키를 {DOUBLE_ESCAPE_WINDOW_SEC:g}초 안에 두 번 누르면 즉시 중지합니다.")
        repeats = max(1, min(100000, int(repeat_count)))
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
                if cancelled():
                    log("[재생] 취소됨")
                    return 0
                time.sleep(step)
                elapsed += step

        total_applied = 0
        for rep in range(repeats):
            if cancelled():
                log("[재생] 중간에 중지했습니다.")
                return total_applied
            if repeats > 1:
                log(f"[재생] {rep + 1}/{repeats}회차 시작 · 이벤트 {len(events)}건 (속도 {spd}×, 테스트={dry_run})")
            else:
                log(f"[재생] {len(events)}건 실행 (속도 {spd}×, 테스트={dry_run})")

            prev_ms = 0

            for ev in events:
                if cancelled():
                    log("[재생] 중간에 중지했습니다.")
                    if repeats > 1:
                        log(f"[재생] {rep + 1}회차 중단 · 처리 {total_applied}건")
                    return total_applied
                t_ms = int(ev.get("t_ms", ev.get("t", 0)))
                wait_ms = max(0, t_ms - prev_ms)
                prev_ms = t_ms
                if wait_ms:
                    target = wait_ms / 1000.0 / spd
                    slept = 0.0
                    chunk = 0.08
                    while slept < target:
                        if cancelled():
                            log("[재생] 중간에 중지했습니다.")
                            if repeats > 1:
                                log(f"[재생] {rep + 1}회차 중단 · 처리 {total_applied}건")
                            return total_applied
                        s = min(chunk, target - slept)
                        time.sleep(s)
                        slept += s
                try:
                    apply_one(ev)
                    total_applied += 1
                except Exception as exc:
                    log(f"[재생] 건너뜀: {exc}")

            if repeats > 1 and rep + 1 < repeats and not cancelled():
                log(f"[재생] {rep + 1}회차 끝 → 다음 회차로 이어갑니다.")

        if repeats > 1:
            log(f"[재생] 전체 완료 ({repeats}회 반복, 총 처리 {total_applied}건)")
        else:
            log("[재생] 완료")
        return total_applied
    finally:
        try:
            kb_esc_listener.stop()
        except Exception:
            pass

def _darwin_play_worker_main(
    inp_resolved: str,
    speed: float,
    dry_run: bool,
    countdown_secs: float,
    repeat_count: int,
    cancel_mp: Any,
    log_q: Any,
    done_q: Any,
) -> None:
    """multiprocessing spawn 전용 — 재생 자식 프로세스 본문."""
    def child_log(msg: str) -> None:
        try:
            log_q.put(str(msg))
        except Exception:
            pass

    try:
        n = _execute_play_impl(
            Path(inp_resolved),
            float(speed),
            dry_run=bool(dry_run),
            countdown_secs=float(countdown_secs),
            repeat_count=int(repeat_count),
            cancel_predicate=lambda: cancel_mp.is_set(),
            on_log=child_log,
        )
        done_q.put(("ok", int(n)))
    except Exception as e:
        try:
            done_q.put(("err", str(e)))
        except Exception:
            pass


def _run_play_macos_spawn(
    inp: Path,
    speed: float,
    *,
    dry_run: bool,
    countdown_secs: float,
    repeat_count: int = 1,
    cancel_event: threading.Event | None,
    on_log: Callable[[str], None] | None,
) -> int:
    ctx = mp.get_context("spawn")
    cancel_mp = ctx.Event()
    log_q = ctx.Queue()
    done_q = ctx.Queue(maxsize=1)

    if cancel_event is not None:
        _bridge_threading_event_to_mp(cancel_event, cancel_mp)

    inp_resolved = str(Path(inp).expanduser().resolve())
    proc = ctx.Process(
        target=_darwin_play_worker_main,
        args=(
            inp_resolved,
            float(speed),
            bool(dry_run),
            float(countdown_secs),
            int(repeat_count),
            cancel_mp,
            log_q,
            done_q,
        ),
    )
    proc.start()

    def pump_logs() -> None:
        while True:
            try:
                msg = log_q.get(timeout=0.2)
            except queue.Empty:
                if not proc.is_alive():
                    break
                continue
            if on_log is not None:
                try:
                    on_log(msg)
                except Exception:
                    pass

    log_thread = threading.Thread(target=pump_logs, daemon=True)
    log_thread.start()

    proc.join()
    log_thread.join(timeout=1.0)

    if proc.exitcode != 0:
        if cancel_event is not None and cancel_event.is_set():
            return 0
        raise RuntimeError(
            "macOS 재생 하위 프로세스가 비정상 종료했습니다 (pynput/Quartz 충돌 가능). "
            "① 시스템 설정 → 개인 정보 보호 → 손쉬운 사용에서 터미널(또는 Python) 허용 "
            "② Python 3.11~3.12 로 가상환경 재구성 권장 "
            f"③ 환경변수 `MACRO_PLAY_FORCE_INPROCESS=1` 후 재시도(GUI도 죽을 수 있음). "
            f"[exit {proc.exitcode}]"
        )

    try:
        status, payload = done_q.get(timeout=2.0)
    except queue.Empty as exc:
        raise RuntimeError(
            "재생 프로세스는 끝났는데 결과를 받지 못했습니다. 손쉬운 접근 권한·Python 버전을 확인하세요."
        ) from exc

    if status == "err":
        raise RuntimeError(payload)
    return int(payload)


def run_play(
    inp: Path,
    speed: float,
    *,
    dry_run: bool = False,
    countdown_secs: float = 5,
    repeat_count: int = 1,
    cancel_event: threading.Event | None = None,
    on_log: Callable[[str], None] | None = None,
) -> int:
    """
    재생. macOS 기본: spawn 자식에서만 실행 (pynput/Quartz SIGTRAP 시 GUI 보호).
    환경변수 MACRO_PLAY_FORCE_INPROCESS=1 이면 현재 프로세스에서 실행(디버그용).
    repeat_count: 동일 기록을 연속으로 재생할 횟수(기본 1). 대기(초)는 전체 시작 전에 한 번만 적용.
    """
    use_mac_spawn = (
        sys.platform == "darwin"
        and os.environ.get("MACRO_PLAY_FORCE_INPROCESS", "").strip() != "1"
    )
    if use_mac_spawn:
        return _run_play_macos_spawn(
            Path(inp),
            speed,
            dry_run=dry_run,
            countdown_secs=countdown_secs,
            repeat_count=int(repeat_count),
            cancel_event=cancel_event,
            on_log=on_log,
        )

    pred = (lambda: cancel_event.is_set()) if cancel_event is not None else None
    return _execute_play_impl(
        Path(inp),
        speed,
        dry_run=dry_run,
        countdown_secs=countdown_secs,
        repeat_count=int(repeat_count),
        cancel_predicate=pred,
        on_log=on_log,
    )
