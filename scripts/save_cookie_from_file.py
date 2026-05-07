#!/usr/bin/env python3
"""쿠키 파일에서 읽어 .env + Vercel 업데이트"""
import sys, re, requests
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from create_folder import _load_dotenv, _e, _find_dotenv_path
_load_dotenv()

cookie_file = sys.argv[1] if len(sys.argv) > 1 else "/tmp/nw_cookie.txt"
cookie = Path(cookie_file).read_text(encoding="utf-8").strip()
rl = _e("NAVER_WORKS_RESOURCE_LOCATION") or "24101"

print(f"쿠키 길이: {len(cookie)}자")
print("유효성 확인 중...")
r = requests.post(
    f"https://api.drive.worksmobile.com/rl/{rl}/v1/files/root/createfolder?service=drive",
    headers={"Cookie": cookie, "Content-Type": "application/json"},
    json={"fileName": "__cookie_verify_delete_me__"},
    timeout=15,
)
print(f"응답: {r.status_code}")
if r.status_code != 200:
    print("❌ 쿠키 유효하지 않음. 다시 복사하세요.")
    sys.exit(1)
print("✅ 쿠키 유효")
print("   (Drive에서 __cookie_verify_delete_me__ 폴더 삭제해주세요)")

# .env 업데이트
env_path = _find_dotenv_path()
text = env_path.read_text("utf-8")
pattern = re.compile(r"^NAVER_WORKS_SESSION_COOKIE=.*$", re.MULTILINE)
new_line = f"NAVER_WORKS_SESSION_COOKIE={cookie}"
text = pattern.sub(new_line, text) if pattern.search(text) else text.rstrip("\n") + f"\n{new_line}\n"
env_path.write_text(text, "utf-8")
print("✅ .env 업데이트 완료")

# Vercel 업데이트
VERCEL_TOKEN = _e("VERCEL_TOKEN")
PID = "prj_dzogCKlJpByPgEvSJWwqvRL0SumA"
TID = "team_bCNkyCa6uNXZUnpW1a7HvoXa"
headers = {"Authorization": f"Bearer {VERCEL_TOKEN}", "Content-Type": "application/json"}
params = {"teamId": TID}
base = f"https://api.vercel.com/v9/projects/{PID}/env"
envs = requests.get(base, headers=headers, params=params, timeout=15).json().get("envs", [])
existing = next((e for e in envs if e.get("key") == "NAVER_WORKS_SESSION_COOKIE"), None)
if existing:
    rv = requests.patch(f"{base}/{existing['id']}", headers=headers, params=params,
        json={"value": cookie, "target": ["production","preview","development"]}, timeout=15)
else:
    rv = requests.post(base, headers=headers, params=params,
        json={"key":"NAVER_WORKS_SESSION_COOKIE","value":cookie,
              "target":["production","preview","development"],"type":"encrypted"}, timeout=15)
print("✅ Vercel 업데이트" if rv.ok else f"❌ Vercel 실패: {rv.status_code}")

# Redeploy
deps = requests.get("https://api.vercel.com/v6/deployments", headers=headers,
    params={"teamId":TID,"projectId":PID,"limit":1,"state":"READY"}, timeout=15).json().get("deployments",[])
if deps:
    rd = requests.post("https://api.vercel.com/v13/deployments", headers=headers,
        params={"teamId":TID},
        json={"deploymentId":deps[0]["uid"],"name":"schedule-site","target":"production"}, timeout=30)
    print("✅ Vercel Redeploy 시작" if rd.ok else f"⚠️ Redeploy 실패: {rd.status_code}")

print("\n완료! 2분 후 sc-pink.vercel.app 에서 테스트해보세요.")
