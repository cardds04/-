#!/usr/bin/env python3
"""
네이버웍스 세션 쿠키 갱신 + .env 및 Vercel 환경변수 자동 업데이트.

사용법:
  python3 scripts/renew_nw_session.py

사전 준비 (.env 에 한 번만 설정):
  VERCEL_TOKEN=xxxx   ← vercel.com → 우상단 아이콘 → Settings → Tokens → Create
"""
import re
import sys
import json
import time
import requests
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from create_folder import _load_dotenv, _e, _find_dotenv_path

_load_dotenv()

VERCEL_PROJECT_ID = "prj_dzogCKlJpByPgEvSJWwqvRL0SumA"
VERCEL_ORG_ID     = "team_bCNkyCa6uNXZUnpW1a7HvoXa"
RL = _e("NAVER_WORKS_RESOURCE_LOCATION") or "24101"


# ── 1. 안내 ──────────────────────────────────────────────────────────────────
print("""
=== 네이버웍스 세션 쿠키 갱신 ===

① 브라우저에서 drive.worksmobile.com 열기 (로그인 상태)
② F12 → Network 탭 → 빨간 녹화 버튼 켜기
③ Drive에서 폴더 하나 직접 생성 (우클릭 → 새 폴더)
④ Network 탭에서 'createfolder?service=drive' 클릭
⑤ Headers 탭 → Request Headers → 'Cookie:' 값 전체 복사
""")

cookie = input("복사한 Cookie 값을 붙여넣고 Enter: ").strip()
if not cookie:
    print("❌ 쿠키가 비어 있습니다.")
    sys.exit(1)


# ── 2. 쿠키 유효성 검증 ──────────────────────────────────────────────────────
print("\n쿠키 유효성 확인 중...", flush=True)
r = requests.post(
    f"https://api.drive.worksmobile.com/rl/{RL}/v1/files/root/createfolder?service=drive",
    headers={"Cookie": cookie, "Content-Type": "application/json"},
    json={"fileName": "__cookie_verify_delete_me__"},
    timeout=15,
)
if r.status_code != 200:
    print(f"❌ 쿠키가 유효하지 않습니다 (HTTP {r.status_code}). 다시 복사하세요.")
    sys.exit(1)
print("✅ 쿠키 유효 확인")
print("   (Drive에서 '__cookie_verify_delete_me__' 폴더를 삭제해주세요)")


# ── 3. .env 업데이트 ──────────────────────────────────────────────────────────
env_path = _find_dotenv_path()
text = env_path.read_text(encoding="utf-8")
pattern = re.compile(r"^NAVER_WORKS_SESSION_COOKIE=.*$", re.MULTILINE)
new_line = f"NAVER_WORKS_SESSION_COOKIE={cookie}"
if pattern.search(text):
    text = pattern.sub(new_line, text)
else:
    text = text.rstrip("\n") + f"\n{new_line}\n"
env_path.write_text(text, encoding="utf-8")
print(f"✅ .env 업데이트 완료 ({env_path})")


# ── 4. public/.env 도 업데이트 ────────────────────────────────────────────────
pub_env = ROOT / "public" / ".env"
if pub_env.is_file():
    pub_text = pub_env.read_text(encoding="utf-8")
    if pattern.search(pub_text):
        pub_text = pattern.sub(new_line, pub_text)
        pub_env.write_text(pub_text, encoding="utf-8")
        print(f"✅ public/.env 업데이트 완료")


# ── 5. Vercel 환경변수 업데이트 ───────────────────────────────────────────────
vercel_token = _e("VERCEL_TOKEN")
if not vercel_token:
    print("""
⚠️  VERCEL_TOKEN 이 없어 Vercel 자동 업데이트를 건너뜁니다.
   아래 절차로 한 번만 설정하면 다음부터 자동 업데이트됩니다:
   1) vercel.com → 우상단 아이콘 → Settings → Tokens → Create
   2) .env 에 VERCEL_TOKEN=발급받은값 추가
   3) Vercel 대시보드에서 직접 NAVER_WORKS_SESSION_COOKIE 값을 수동 업데이트하세요.
""")
    sys.exit(0)

print("\nVercel 환경변수 업데이트 중...", flush=True)
headers = {"Authorization": f"Bearer {vercel_token}", "Content-Type": "application/json"}
base = f"https://api.vercel.com/v9/projects/{VERCEL_PROJECT_ID}/env"
params = {"teamId": VERCEL_ORG_ID}

# 기존 env var ID 조회
resp = requests.get(base, headers=headers, params=params, timeout=15)
envs = resp.json().get("envs", [])
existing = next((e for e in envs if e.get("key") == "NAVER_WORKS_SESSION_COOKIE"), None)

if existing:
    # PATCH로 값 업데이트
    patch = requests.patch(
        f"{base}/{existing['id']}",
        headers=headers,
        params=params,
        json={"value": cookie, "target": ["production", "preview", "development"]},
        timeout=15,
    )
    if patch.ok:
        print("✅ Vercel NAVER_WORKS_SESSION_COOKIE 업데이트 완료")
    else:
        print(f"❌ Vercel 업데이트 실패: {patch.status_code} {patch.text[:200]}")
else:
    # POST로 새로 생성
    post = requests.post(
        base,
        headers=headers,
        params=params,
        json={"key": "NAVER_WORKS_SESSION_COOKIE", "value": cookie,
              "target": ["production", "preview", "development"], "type": "encrypted"},
        timeout=15,
    )
    if post.ok:
        print("✅ Vercel NAVER_WORKS_SESSION_COOKIE 등록 완료")
    else:
        print(f"❌ Vercel 등록 실패: {post.status_code} {post.text[:200]}")


# ── 6. NAVER_WORKS_RELAY_URL 도 Vercel에 저장 (있는 경우) ────────────────────
relay_url = _e("NAVER_WORKS_RELAY_URL").strip()
if relay_url:
    resp2 = requests.get(base, headers=headers, params=params, timeout=15)
    envs2 = resp2.json().get("envs", [])
    ex_relay = next((e for e in envs2 if e.get("key") == "NAVER_WORKS_RELAY_URL"), None)
    if ex_relay:
        pr = requests.patch(
            f"{base}/{ex_relay['id']}",
            headers=headers, params=params,
            json={"value": relay_url, "target": ["production", "preview", "development"]},
            timeout=15,
        )
        print("✅ Vercel NAVER_WORKS_RELAY_URL 업데이트" if pr.ok else f"❌ RELAY_URL 업데이트 실패: {pr.status_code}")
    else:
        pr = requests.post(
            base, headers=headers, params=params,
            json={"key": "NAVER_WORKS_RELAY_URL", "value": relay_url,
                  "target": ["production", "preview", "development"], "type": "plain"},
            timeout=15,
        )
        print("✅ Vercel NAVER_WORKS_RELAY_URL 등록" if pr.ok else f"❌ RELAY_URL 등록 실패: {pr.status_code}")

# ── 7. Vercel Redeploy ────────────────────────────────────────────────────────
print("\nVercel Redeploy 중...", flush=True)
dep_resp = requests.get(
    f"https://api.vercel.com/v6/deployments",
    headers=headers,
    params={"teamId": VERCEL_ORG_ID, "projectId": VERCEL_PROJECT_ID, "limit": 1, "state": "READY"},
    timeout=15,
)
deps = dep_resp.json().get("deployments", [])
if deps:
    latest_uid = deps[0]["uid"]
    rd = requests.post(
        f"https://api.vercel.com/v13/deployments",
        headers=headers,
        params={"teamId": VERCEL_ORG_ID},
        json={"deploymentId": latest_uid, "name": "schedule-site", "target": "production"},
        timeout=30,
    )
    if rd.ok:
        new_url = rd.json().get("url", "")
        print(f"✅ Redeploy 시작됨 → {new_url}")
    else:
        print(f"⚠️  Redeploy 실패 ({rd.status_code}): 수동으로 Vercel 대시보드에서 Redeploy 하세요.")
else:
    print("⚠️  배포 이력 없음. 수동으로 Vercel 대시보드에서 Redeploy 하세요.")

print("""
완료! 약 1-2분 후 sc-pink.vercel.app 에서 폴더 생성이 다시 작동합니다.
릴레이 서버를 사용 중이라면 Mac에서 실행 상태인지 확인하세요:
  python3 scripts/nw_relay_server.py
""")
