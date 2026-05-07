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
from create_folder import _load_dotenv, _e
import requests

_load_dotenv()

DEFAULT_PORT = 9337
RELAY_SECRET = None  # .env에 NAVER_WORKS_RELAY_SECRET 이 있으면 Bearer 인증


def _get_relay_secret():
    return _e("NAVER_WORKS_RELAY_SECRET").strip()


def _cookie():
    return _e("NAVER_WORKS_SESSION_COOKIE").strip()


def _rl():
    return _e("NAVER_WORKS_RESOURCE_LOCATION").strip() or "24101"


def _createfolder(folder_name: str, parent_file_id: str, resource_location: str):
    pid = (parent_file_id or "root").strip()
    if not pid or pid.lower() == "루트":
        pid = "root"
    url = (
        f"https://api.drive.worksmobile.com/rl/{resource_location}"
        f"/v1/files/{requests.utils.quote(pid, safe='')}/createfolder?service=drive"
    )
    cookie = _cookie()
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Cookie": cookie,
    }
    resp = requests.post(url, headers=headers, json={"fileName": folder_name}, timeout=30)
    return resp.status_code, resp.text


def _check_cookie_valid():
    rl = _rl()
    cookie = _cookie()
    if not cookie:
        return False
    try:
        r = requests.post(
            f"https://api.drive.worksmobile.com/rl/{rl}/v1/files/root/createfolder?service=drive",
            headers={"Cookie": cookie, "Content-Type": "application/json"},
            json={"fileName": "__relay_health_check_delete_me__"},
            timeout=10,
        )
        return r.status_code == 200
    except Exception:
        return False


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

            status, text = _createfolder(folder_name, parent_file_id, resource_location)
            try:
                data = json.loads(text)
            except Exception:
                data = {"rawText": text[:2000]}

            if status == 200:
                file_id = data.get("fileId", "")
                self._send_json(200, {"ok": True, "fileId": file_id, "body": data})
            else:
                msg = data.get("message") or data.get("error") or f"HTTP {status}"
                self._send_json(status, {"ok": False, "status": status, "message": msg, "body": data})
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
