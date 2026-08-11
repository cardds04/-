#!/usr/bin/env python3
"""
네이버웍스 Drive 로컬 릴레이 서버.

Vercel이 직접 api.drive.worksmobile.com 을 호출하면 IP 바인딩된 세션쿠키가
거부되므로(401), 이 서버가 Mac mini(브라우저와 같은 IP)에서 대신 호출해줌.

실행:
  python3 scripts/nw_relay_server.py          # 기본 포트 9337
  python3 scripts/nw_relay_server.py --port 9337

ngrok으로 외부 공개:
  ngrok http 9337
  → 발급된 URL을 Vercel 환경변수 NAVER_WORKS_RELAY_URL 에 저장
  → python3 scripts/renew_nw_session.py 실행하면 자동 저장됨

엔드포인트:
  POST /createfolder
    body: {"folderName": "...", "parentFileId": "root", "resourceLocation": "24101"}
    응답: {"ok": true, "fileId": "...", ...}  또는  {"ok": false, "message": "..."}

  GET /health
    응답: {"ok": true, "cookie_valid": true/false}
"""
import json
import sys
import os
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
import argparse

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
import requests


def _load_dotenv():
    """루트 .env 를 환경변수로 로드(자체 구현 — create_folder.py 의 jwt 의존을 피한다)."""
    envp = ROOT / ".env"
    if not envp.is_file():
        return
    for line in envp.read_text(encoding="utf-8", errors="ignore").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def _e(key: str) -> str:
    return str(os.environ.get(key, "") or "")

_load_dotenv()

DEFAULT_PORT = 9337
RELAY_SECRET = None  # .env에 NAVER_WORKS_RELAY_SECRET 이 있으면 Bearer 인증


def _get_relay_secret():
    return _e("NAVER_WORKS_RELAY_SECRET").strip()


def _cookie():
    return _e("NAVER_WORKS_SESSION_COOKIE").strip()


def _rl():
    return _e("NAVER_WORKS_RESOURCE_LOCATION").strip() or "24101"


def _mybox_session():
    """크롬 쿠키(pycookiecheat)로 마이박스 세션 — .env 쿠키 만료 문제 없음(크롬 로그인만 유지되면 됨)."""
    from pycookiecheat import chrome_cookies
    ck = chrome_cookies("https://mybox.naver.com")
    s = requests.Session()
    s.headers.update({"User-Agent": "Mozilla/5.0", "Referer": "https://mybox.naver.com/"})
    s.cookies.update(ck)
    return s


MYBOX_API = "https://api.mybox.naver.com"
MYBOX_FS = "https://fs.mybox.naver.com/file"


def _mybox_resolve_parent(s, parent: str):
    """부모 지정: http(s) 공유링크(naver.me/…)면 shareKey→resourceKey 해석, 아니면 resourceKey 그대로."""
    p = (parent or "").strip()
    if not p:
        return None, "부모 폴더가 비어 있습니다"
    if p.lower().startswith("http"):
        try:
            r = s.get(p, allow_redirects=True, timeout=30)
            from urllib.parse import urlparse, parse_qs
            sk = parse_qs(urlparse(r.url).query).get("shareKey", [None])[0]
            if not sk:
                import re as _re
                m = _re.search(r"shareKey=([A-Za-z0-9_\-]+)", r.url)
                sk = m.group(1) if m else None
            if not sk:
                return None, "공유링크에서 shareKey 를 찾지 못했습니다"
            pr = s.get(f"{MYBOX_API}/service/v2/link/property?shareKey={sk}", timeout=30).json()
            rk = (pr.get("result") or {}).get("resourceKey")
            if not rk:
                return None, f"공유링크 해석 실패: {str(pr)[:200]}"
            return rk, ""
        except Exception as e:
            return None, f"공유링크 해석 오류: {e}"
    return p, ""


def _mybox_mkdir(s, parent_key: str, name: str):
    """마이박스 폴더 생성. code 0=신규, 1008=이미 존재(기존 resourceKey 반환) → 둘 다 성공 취급."""
    r = s.get(
        f"{MYBOX_FS}/mkdir.api",
        params={"svcType": "MYBOX-WEB", "resourceKey": parent_key, "resourceName": name},
        timeout=30,
    ).json()
    code = r.get("code")
    if code == 0:
        return {"ok": True, "fileId": r["result"]["resourceKey"], "reused": False}
    if code == 1008:
        rk = (r.get("result") or {}).get("resourceKey")
        if rk:
            return {"ok": True, "fileId": rk, "reused": True}
    return {"ok": False, "message": f"mybox mkdir 실패 code={code} {str(r)[:200]}"}


def _createfolder_mybox(folder_name: str, parent: str):
    """마이박스(공유폴더) 폴더 생성 — 2026-08-11 사장님 확인: 납품 폴더의 실체는
    네이버웍스 드라이브가 아니라 사장님 마이박스의 「공유폴더」다(naver.me 링크 → mybox.naver.com).
    웍스 내부 API 경로는 드라이브 서비스 권한이 없어 401 — 마이박스 API 가 정답."""
    try:
        s = _mybox_session()
    except Exception as e:
        return 500, json.dumps({"ok": False, "message": f"크롬 마이박스 쿠키 로드 실패: {e}"})
    try:
        parent_key, err = _mybox_resolve_parent(s, parent)
        if not parent_key:
            return 400, json.dumps({"ok": False, "message": err})
        out = _mybox_mkdir(s, parent_key, folder_name)
        if out.get("ok"):
            return 200, json.dumps({"ok": True, "fileId": out["fileId"], "reused": out.get("reused", False)})
        return 502, json.dumps({"ok": False, "message": out.get("message", "mkdir 실패")})
    finally:
        # ‼️세션을 닫지 않으면 fd 누수 → 밤새 Too many open files 로 릴레이가 죽는다(2026-08-12 실사고)
        try:
            s.close()
        except Exception:
            pass


def _check_cookie_valid():
    """마이박스 루트 목록 조회로 세션 판정(quota 엔드포인트는 404)."""
    s = None
    try:
        s = _mybox_session()
        r = s.get(f"{MYBOX_API}/service/v2/file/list?resourceKey=root&fileOption=all&sort=name&order=asc&startNum=0&pagingRow=1", timeout=10)
        return r.status_code == 200 and str(r.json().get("code")) == "0"
    except Exception:
        return False
    finally:
        try:
            if s is not None:
                s.close()
        except Exception:
            pass


class RelayHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[relay] {self.address_string()} {fmt % args}", flush=True)

    def _send_json(self, code: int, obj: dict):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _check_auth(self):
        secret = _get_relay_secret()
        if not secret:
            return True  # 비밀키 없으면 인증 생략
        auth = self.headers.get("Authorization", "")
        if auth == f"Bearer {secret}":
            return True
        self._send_json(401, {"ok": False, "message": "릴레이 인증 실패"})
        return False

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length <= 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def do_GET(self):
        if self.path == "/health":
            valid = _check_cookie_valid()
            self._send_json(200, {"ok": True, "cookie_valid": valid})
        else:
            self._send_json(404, {"ok": False, "message": "Not found"})

    def do_POST(self):
        if self.path == "/createfolder":
            if not self._check_auth():
                return
            body = self._read_body()
            folder_name = str(body.get("folderName") or body.get("folder_name") or "").strip()
            parent_file_id = str(body.get("parentFileId") or body.get("parent_file_id") or "root").strip()
            resource_location = str(body.get("resourceLocation") or body.get("resource_location") or _rl()).strip()

            if not folder_name:
                self._send_json(400, {"ok": False, "message": "folderName 이 비어 있습니다"})
                return

            # .env 재로드 (쿠키 갱신 후 서버 재시작 없이 반영)
            _load_dotenv()

            status, text = _createfolder_mybox(folder_name, parent_file_id)
            try:
                data = json.loads(text)
            except Exception:
                data = {"rawText": text[:2000]}

            if status == 200 and data.get("ok"):
                self._send_json(200, {"ok": True, "fileId": data.get("fileId", ""), "reused": data.get("reused", False), "body": data})
            else:
                msg = data.get("message") or f"HTTP {status}"
                self._send_json(status if status != 200 else 502, {"ok": False, "status": status, "message": msg, "body": data})
        else:
            self._send_json(404, {"ok": False, "message": "Not found"})


def main():
    parser = argparse.ArgumentParser(description="네이버웍스 Drive 로컬 릴레이 서버")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()

    secret = _get_relay_secret()
    print(f"[relay] 포트 {args.port} 에서 시작 (인증: {'있음 (NAVER_WORKS_RELAY_SECRET)' if secret else '없음'})")
    print(f"[relay] 세션 쿠키: {'있음 (' + str(len(_cookie())) + '자)' if _cookie() else '없음 ← 갱신 필요'}")
    print(f"[relay] 리소스 위치: {_rl()}")
    print(f"[relay] 중지: Ctrl+C")
    print()
    print("  외부 공개 (ngrok 없으면 먼저 설치):  brew install ngrok")
    print(f"  ngrok http {args.port}")
    print("  → 발급된 https://xxxx.ngrok-free.app 를 Vercel 환경변수 NAVER_WORKS_RELAY_URL 에 저장")
    print()

    server = HTTPServer((args.host, args.port), RelayHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[relay] 종료")


if __name__ == "__main__":
    main()
