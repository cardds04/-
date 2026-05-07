#!/usr/bin/env python3
"""
네이버웍스 세션 쿠키 상태 확인.
  python3 scripts/check_nw_session.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from create_folder import _load_dotenv, _e
import requests

_load_dotenv()

cookie = _e("NAVER_WORKS_SESSION_COOKIE")
rl = _e("NAVER_WORKS_RESOURCE_LOCATION") or "24101"

if not cookie:
    print("❌ NAVER_WORKS_SESSION_COOKIE 가 .env 에 없습니다.")
    print("   scripts/renew_nw_session.py 를 실행해 갱신하세요.")
    sys.exit(1)

print("세션 쿠키 유효성 확인 중...", flush=True)
try:
    r = requests.post(
        f"https://api.drive.worksmobile.com/rl/{rl}/v1/files/root/createfolder?service=drive",
        headers={"Cookie": cookie, "Content-Type": "application/json"},
        json={"fileName": "__session_check_delete_me__"},
        timeout=15,
    )
except Exception as e:
    print(f"❌ 네트워크 오류: {e}")
    sys.exit(1)

if r.status_code == 200:
    # 테스트용으로 생긴 폴더 fileId 출력 (삭제는 직접)
    import json
    fid = r.json().get("fileId", "")
    print("✅ 세션 쿠키 정상 (아직 유효)")
    if fid:
        print(f"   (테스트 폴더 생성됨, Drive에서 '__session_check_delete_me__' 폴더를 삭제하세요. fileId={fid})")
elif r.status_code == 401:
    print("❌ 세션 쿠키 만료 — 갱신 필요")
    print("   → python3 scripts/renew_nw_session.py 실행")
    sys.exit(1)
else:
    print(f"⚠️  예상치 못한 응답 HTTP {r.status_code}: {r.text[:200]}")
    sys.exit(1)
