#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
음악 몽타주 → 다빈치 리졸브 브리지

문제 해결:
  • 바탕화면 montage_bridge_boot.txt — 스크립트가 한 줄이라도 실행됐는지
  • 바탕화면 montage_bridge_log.txt — 상세 로그

config.json 찾기 순서 (리졸브는 __file__ 이 없을 때가 많음):
  1) 환경 변수 MONTAGE_BRIDGE_CONFIG
  2) ~/Library/.../Fusion/Scripts/Utility/config.json (macOS)
  3) %AppData%/.../Utility/config.json (Windows)
  4) __file__ / sys.argv[0] 기준 같은 폴더
  5) ~/Documents/montage_bridge_config.json

montage_output_folder 에 **폴더** 경로를 넣으세요. 실수로 .mp4 파일 경로를 넣었으면 자동으로 그 상위 폴더를 씁니다.

무료 버전 콘솔: DaVinciResolveScript 는 임포트하지 않습니다.
  __main__.globals 의 resolve / 호출 스택의 globals 를 최우선으로 찾습니다.
"""

from __future__ import annotations

import builtins
import json
import os
import sys
import traceback
import unicodedata
import inspect
from pathlib import Path
from typing import Any, List, Optional, Tuple

# 최소 부트 로그 (import 오류 전에도 남김)
def _boot_write(lines: List[str]) -> None:
    try:
        desk = Path.home() / "Desktop"
        if not desk.is_dir() and sys.platform == "win32":
            desk = Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Desktop"
        p = desk / "montage_bridge_boot.txt"
        p.write_text("\n".join(lines) + "\n", encoding="utf-8")
    except Exception:
        pass


_boot_write(
    [
        "boot_ok=1",
        "argv=" + repr(sys.argv),
        "cwd=" + os.getcwd(),
        "__file__=" + repr(globals().get("__file__", "<없음>")),
    ]
)


def _script_dir() -> Path:
    try:
        p = Path(__file__).resolve()
        if p.is_file():
            return p.parent
    except NameError:
        pass
    if len(sys.argv) > 0 and sys.argv[0]:
        p = Path(sys.argv[0]).expanduser().resolve()
        if p.is_file() and p.suffix.lower() == ".py":
            return p.parent
    # 리졸브가 cwd 를 바꿔 두는 경우가 많아, 일반적인 Utility 경로를 후보로 사용
    if sys.platform == "darwin":
        u = (
            Path.home()
            / "Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"
        )
        if u.is_dir():
            return u
    if sys.platform == "win32":
        appd = os.environ.get("APPDATA", "")
        if appd:
            u = Path(appd) / "Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility"
            if u.is_dir():
                return u
    return Path.cwd()


def _desktop_dir() -> Path:
    home = Path.home()
    desk = home / "Desktop"
    if desk.is_dir():
        return desk
    if sys.platform == "win32":
        public = os.environ.get("USERPROFILE") or str(home)
        return Path(public) / "Desktop"
    return home


def _log_path() -> Path:
    return _desktop_dir() / "montage_bridge_log.txt"


def _log(msg: str) -> None:
    line = msg.rstrip() + "\n"
    try:
        with open(_log_path(), "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass
    try:
        print(msg)
    except Exception:
        pass


def _log_exception(where: str, ex: BaseException) -> None:
    _log(f"[{where}] {type(ex).__name__}: {ex}\n{traceback.format_exc()}")


def _alert(title: str, message: str) -> None:
    message = (message or "")[:900]
    title = (title or "Montage Bridge")[:120]
    if sys.platform == "darwin":
        try:
            import subprocess

            script = (
                f'display dialog {json.dumps(message)} '
                f'with title {json.dumps(title)} '
                'buttons {"OK"} default button "OK"'
            )
            subprocess.run(["osascript", "-e", script], capture_output=True, timeout=60, check=False)
            return
        except Exception:
            pass
    if sys.platform == "win32":
        try:
            import ctypes

            ctypes.windll.user32.MessageBoxW(0, message, title, 0x40)
            return
        except Exception:
            pass
    _log(f"[ALERT] {title}: {message}")


def _utility_config_paths() -> List[Path]:
    out: List[Path] = []
    if sys.platform == "darwin":
        out.append(
            Path.home()
            / "Library/Application Support/Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/config.json"
        )
    if sys.platform == "win32":
        appd = os.environ.get("APPDATA", "")
        if appd:
            out.append(
                Path(appd)
                / "Blackmagic Design/DaVinci Resolve/Fusion/Scripts/Utility/config.json"
            )
    return out


def _find_config_path() -> Tuple[Optional[Path], List[str]]:
    tried: List[str] = []
    env = (os.environ.get("MONTAGE_BRIDGE_CONFIG") or "").strip()
    if env:
        p = Path(os.path.expanduser(env))
        tried.append(str(p))
        if p.is_file():
            return p, tried

    for fixed in _utility_config_paths():
        tried.append(str(fixed))
        if fixed.is_file():
            return fixed, tried

    base = _script_dir() / "config.json"
    tried.append(str(base))
    if base.is_file():
        return base, tried

    doc = Path.home() / "Documents" / "montage_bridge_config.json"
    tried.append(str(doc))
    if doc.is_file():
        return doc, tried

    return None, tried


def _load_config() -> dict:
    path, tried = _find_config_path()
    if path is None:
        ups = _utility_config_paths()
        raise FileNotFoundError(
            "config.json 을 찾을 수 없습니다.\n"
            f"• Utility 후보: {ups[0] if ups else 'N/A'}\n"
            f"• 또는: {_script_dir() / 'config.json'}\n"
            f"시도한 경로: {tried}"
        )
    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def _normalize_fs_path(s: str) -> str:
    """macOS 한글 경로 등 NFC 로 통일."""
    t = os.path.expanduser(s.strip())
    if not t:
        return t
    try:
        return unicodedata.normalize("NFC", t)
    except Exception:
        return t


def _normalize_output_folder(raw: Path) -> Path:
    """폴더가 아니라 파일(.mp4 등)을 넣은 경우 상위 폴더로."""
    p = raw.expanduser().resolve()
    if p.is_file():
        _log(f"[info] montage_output_folder 가 파일이라 부모 폴더 사용: {p.parent}")
        return p.parent
    return p


def _newest_media(folder: Path, extensions: List[str]) -> Optional[Path]:
    exts = {e.lower() if e.startswith(".") else f".{e.lower()}" for e in extensions}
    best: Optional[Path] = None
    best_mtime = 0.0
    if not folder.is_dir():
        _log(f"[warn] montage_output_folder 가 폴더가 아님: {folder}")
        return None
    for p in folder.iterdir():
        if not p.is_file():
            continue
        suf = p.suffix.lower()
        if suf not in exts:
            continue
        try:
            mt = p.stat().st_mtime
        except OSError:
            continue
        if mt > best_mtime:
            best_mtime = mt
            best = p
    return best


def _normalize_import_result(imported: Any) -> List[Any]:
    if imported is None or imported is False:
        return []
    if isinstance(imported, (list, tuple)):
        return list(imported)
    return [imported]


def _import_media_variants(media_pool: Any, file_path: str) -> Tuple[List[Any], str]:
    """리졸브 버전별 ImportMedia 인자 차이 대응."""
    variants = [
        [{"File Path": file_path}],
        [{"filePath": file_path}],
        [{"Media Path": file_path}],
        [{"mediaPath": file_path}],
    ]
    last_raw: Any = None
    for item in variants:
        try:
            last_raw = media_pool.ImportMedia(item)
            clips = _normalize_import_result(last_raw)
            if clips:
                return clips, repr(item[0])
        except Exception as ex:
            _log(f"ImportMedia 시도 실패 {item[0].keys()}: {ex}")
    return [], repr(last_raw)


def _append_timeline_variants(media_pool: Any, clip: Any) -> bool:
    tries = [
        [{"mediaPoolItem": clip}],
        [{"MediaPoolItem": clip}],
        [clip],
    ]
    for t in tries:
        try:
            if media_pool.AppendToTimeline(t):
                return True
        except Exception as ex:
            _log(f"AppendToTimeline 실패 {t!r}: {ex}")
    return False


def _get_resolve_instance() -> Optional[Any]:
    """
    리졸브 앱 핸들. DaVinciResolveScript 는 사용하지 않습니다(무료판 임포트 차단 대응).

    우선순위:
      1) sys.modules['__main__'] 의 dict → globals().get('resolve') 와 동일한 네임스페이스
      2) run() 호출자 프레임의 f_globals.get('resolve')
      3) builtins
      4) 호출 스택: 각 프레임에서 f_globals 먼저(resolve, bmd), 그다음 f_locals
    어떤 예외도 밖으로 던지지 않고 None 을 반환합니다.
    """
    try:
        return _get_resolve_instance_impl()
    except BaseException as ex:
        _log_exception("_get_resolve_instance", ex)
        return None


def _get_resolve_instance_impl() -> Optional[Any]:
    # --- 1) __main__ 모듈의 globals (콘솔에서 resolve = ... 한 경우와 동일) ---
    try:
        main_mod = sys.modules.get("__main__")
        if main_mod is not None:
            g = vars(main_mod)
            for key in ("resolve", "Resolve"):
                v = g.get(key)
                if v is not None:
                    _log(f"[resolve] __main__ globals().get({key!r})")
                    return v
            bmd = g.get("bmd")
            if bmd is not None:
                try:
                    app = bmd.scriptapp("DaVinci")
                    if app is not None:
                        _log("[resolve] __main__ globals bmd.scriptapp('DaVinci')")
                        return app
                except Exception as ex:
                    _log(f"[resolve] __main__ bmd.scriptapp: {ex}")
    except Exception as ex:
        _log(f"[resolve] __main__ 탐색 예외: {ex}")

    # --- 2) run() 호출자의 globals (import 후 run() 호출 시 상위 전역) ---
    try:
        fr = inspect.currentframe()
        if fr is not None:
            fr = fr.f_back  # _get_resolve_instance_impl
        if fr is not None:
            fr = fr.f_back  # run
        if fr is not None:
            fr = fr.f_back  # run 의 호출자
        if fr is not None:
            g = fr.f_globals
            for key in ("resolve", "Resolve"):
                v = g.get(key)
                if v is not None:
                    _log(f"[resolve] 호출자 globals().get({key!r})")
                    return v
            bmd = g.get("bmd")
            if bmd is not None:
                try:
                    app = bmd.scriptapp("DaVinci")
                    if app is not None:
                        _log("[resolve] 호출자 globals bmd.scriptapp('DaVinci')")
                        return app
                except Exception as ex:
                    _log(f"[resolve] 호출자 bmd.scriptapp: {ex}")
    except Exception as ex:
        _log(f"[resolve] 호출자 프레임 탐색 예외: {ex}")

    # --- 3) builtins ---
    for name in ("resolve", "Resolve"):
        try:
            v = getattr(builtins, name, None)
            if v is not None:
                _log(f"[resolve] builtins.{name}")
                return v
        except Exception:
            pass

    # --- 4) 호출 스택 전체: 프레임마다 globals 먼저, 그다음 locals ---
    # current → impl → _get_resolve_instance → run → … 이므로 impl·래퍼 두 단계 건너뜀
    frame: Optional[Any] = inspect.currentframe()
    try:
        if frame is not None:
            frame = frame.f_back  # _get_resolve_instance
        if frame is not None:
            frame = frame.f_back  # run 부터 스캔
        depth = 0
        while frame is not None and depth < 40:
            g = frame.f_globals
            for name in ("resolve", "Resolve"):
                v = g.get(name)
                if v is not None:
                    _log(
                        f"[resolve] 프레임 globals {name} depth={depth} @ {getattr(frame.f_code, 'co_filename', '?')}"
                    )
                    return v
            bmd = g.get("bmd")
            if bmd is not None:
                try:
                    app = bmd.scriptapp("DaVinci")
                    if app is not None:
                        _log(f"[resolve] 프레임 globals bmd depth={depth}")
                        return app
                except Exception:
                    pass

            loc = frame.f_locals
            for name in ("resolve", "Resolve"):
                v = loc.get(name)
                if v is not None:
                    _log(
                        f"[resolve] 프레임 locals {name} depth={depth} @ {getattr(frame.f_code, 'co_filename', '?')}"
                    )
                    return v
            bmd = loc.get("bmd")
            if bmd is not None:
                try:
                    app = bmd.scriptapp("DaVinci")
                    if app is not None:
                        _log(f"[resolve] 프레임 locals bmd depth={depth}")
                        return app
                except Exception:
                    pass

            frame = frame.f_back
            depth += 1
    finally:
        del frame

    _log("[resolve] 어디에서도 resolve / bmd 를 찾지 못함")
    return None


def run() -> None:
    from datetime import datetime

    _log("--- " + datetime.now().isoformat(timespec="seconds") + " ---")
    sd = _script_dir()
    _log(f"script_dir={sd} argv0={sys.argv[0] if sys.argv else ''} cwd={os.getcwd()}")

    resolve = _get_resolve_instance()
    if resolve is None:
        msg = (
            "Resolve 앱에 연결하지 못했습니다.\n"
            "무료 콘솔에서는 먼저 전역에 resolve 를 만든 뒤 run() 을 다시 호출하세요.\n"
            "예: resolve = bmd.scriptapp('DaVinci') (리졸브 문서 예제 참고)"
        )
        _log(msg)
        _alert("Montage Bridge", msg)
        return

    cfg = _load_config()
    raw_out = _normalize_fs_path(str(cfg.get("montage_output_folder", "")))
    out_dir = _normalize_output_folder(Path(raw_out))
    exts = list(cfg.get("extensions") or [".mp4", ".mov", ".m4v"])
    timeline_name = str(cfg.get("timeline_name") or "Montage_Latest").strip() or "Montage_Latest"
    create_new = bool(cfg.get("create_new_timeline_each_run", True))

    _log(f"montage_output_folder(resolved)={out_dir}")

    newest = _newest_media(out_dir, exts)
    if newest is None:
        msg = f"가져올 영상이 없습니다.\n폴더: {out_dir}\n확장자: {exts}"
        _log(msg)
        _alert("Montage Bridge", msg)
        return

    pm = resolve.GetProjectManager()
    project = pm.GetCurrentProject()
    if project is None:
        _alert("Montage Bridge", "프로젝트를 먼저 연 뒤 다시 실행하세요.")
        return

    media_pool = project.GetMediaPool()
    if media_pool is None:
        _alert("Montage Bridge", "MediaPool 을 가져오지 못했습니다.")
        return

    file_path = str(newest.resolve())
    _log(f"import file_path={file_path}")

    clips, used_key = _import_media_variants(media_pool, file_path)
    _log(f"ImportMedia used={used_key} raw_ok={bool(clips)}")

    if not clips:
        msg = f"미디어 가져오기 실패:\n{file_path}\n(리졸브 버전에 맞는 ImportMedia 키가 다를 수 있습니다.)"
        _alert("Montage Bridge", msg)
        return

    clip = clips[0]

    timeline = project.GetCurrentTimeline()
    if create_new or timeline is None:
        tl = media_pool.CreateEmptyTimeline(timeline_name)
        if not tl:
            _alert("Montage Bridge", "빈 타임라인을 만들지 못했습니다.")
            return
        try:
            project.SetCurrentTimeline(tl)
        except Exception:
            pass
        timeline = tl

    if timeline is None:
        _alert("Montage Bridge", "타임라인이 없습니다.")
        return

    ok = _append_timeline_variants(media_pool, clip)
    if not ok:
        msg = (
            "타임라인에 클립을 붙이지 못했습니다.\n"
            "미디어 풀에는 들어갔을 수 있습니다. 풀에서 타임라인으로 끌어 넣어 보세요."
        )
        _log(msg)
        _alert("Montage Bridge (부분 성공)", msg)
        return

    ok_msg = f"완료\n\n{newest.name}\n→ 타임라인에 추가했습니다."
    _log(ok_msg)
    _alert("Montage Bridge", ok_msg)


def main() -> None:
    try:
        run()
    except Exception as ex:
        _log_exception("run()", ex)
        _alert("Montage Bridge 오류", str(ex)[:800])


if __name__ == "__main__":
    main()
