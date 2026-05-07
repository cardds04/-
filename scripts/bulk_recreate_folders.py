#!/usr/bin/env python3
"""
네이버웍스 Drive — 전체 업체 폴더 재생성 + 공개(모든 사람) 공유 링크 발급

1. Supabase company_directory 에서 업체 목록 조회
2. 업체별 폴더 생성: POST https://api.drive.worksmobile.com/rl/{rl}/v1/files/root/createfolder?service=drive
3. 공개 링크 생성: POST https://api.drive.worksmobile.com/rl/{rl}/v1/files/{fileId}/link?service=drive
   Body: {"linkType":"PUBLIC","linkPermissionType":"EDIT","linkValidityPeriod":30,"useDownload":true}
4. Supabase company_directory 업데이트 (naver_works_company_folder_id, naver_works_company_share_link)

사전 조건:
  - .env 에 NAVER_WORKS_SESSION_COOKIE, NAVER_WORKS_RESOURCE_LOCATION, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요
  - 기존 폴더는 수동으로 삭제 후 실행
"""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path
from urllib.parse import quote

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from create_folder import _load_dotenv, _e

_load_dotenv()

INTERNAL_DRIVE_API_HOST = "https://api.drive.worksmobile.com"

# https://works.do/xFpgr1I 공유폴더의 실제 fileId
PARENT_FOLDER_ID = "MTAwMDAxNTA2NTQ2OTI3fDM0NzI2MTI1NTA3Nzc1NTkwNDl8RHww"


def get_session_cookie() -> str:
    cookie = _e("NAVER_WORKS_SESSION_COOKIE")
    if not cookie:
        print("❌ .env에 NAVER_WORKS_SESSION_COOKIE 가 없습니다.")
        sys.exit(1)
    return cookie.strip()


def get_resource_location() -> str:
    rl = _e("NAVER_WORKS_RESOURCE_LOCATION")
    if not rl:
        print("❌ .env에 NAVER_WORKS_RESOURCE_LOCATION 가 없습니다. (예: 24101)")
        sys.exit(1)
    return rl.strip()


def get_companies() -> list[dict]:
    supabase_url = _e("SUPABASE_URL")
    supabase_key = _e("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        print("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 없음")
        sys.exit(1)

    url = f"{supabase_url}/rest/v1/company_directory"
    # 전체 업체 (폴더 없는 것도 포함)
    params = "select=id,name&order=name.asc"
    r = requests.get(
        f"{url}?{params}",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    return [c for c in data if c.get("name")]


def create_folder(session_cookie: str, rl: str, folder_name: str) -> tuple[bool, str, str]:
    """폴더 생성 → (success, fileId, error_message)"""
    pid_q = quote(PARENT_FOLDER_ID, safe="")
    url = f"{INTERNAL_DRIVE_API_HOST}/rl/{rl}/v1/files/{pid_q}/createfolder?service=drive"
    headers = {
        "Cookie": session_cookie,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    body = {"fileName": folder_name.strip()}
    r = requests.post(url, headers=headers, json=body, timeout=30)
    try:
        data = r.json() if r.text.strip() else {}
    except Exception:
        data = {}

    if r.status_code in (200, 201):
        file_id = data.get("fileId") or data.get("id") or ""
        return True, file_id, ""
    else:
        msg = data.get("message") or data.get("error") or r.text[:200]
        return False, "", f"{r.status_code} {msg}"


def create_public_link(session_cookie: str, rl: str, file_id: str) -> tuple[bool, str, str]:
    """공개 링크 생성 → (success, link_url, error_message)"""
    fid_q = quote(file_id, safe="")
    url = f"{INTERNAL_DRIVE_API_HOST}/rl/{rl}/v1/files/{fid_q}/link?service=drive"
    headers = {
        "Cookie": session_cookie,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    body = {
        "linkType": "PUBLIC",
        "linkPermissionType": "EDIT",
        "linkValidityPeriod": 0,  # 0 = 유효기간 없음
        "useDownload": True,
    }
    r = requests.post(url, headers=headers, json=body, timeout=30)
    try:
        data = r.json() if r.text.strip() else {}
    except Exception:
        data = {}

    if r.status_code in (200, 201):
        link_url = data.get("linkUrl") or data.get("url") or ""
        return True, link_url, ""
    else:
        msg = data.get("message") or data.get("error") or r.text[:200]
        return False, "", f"{r.status_code} {msg}"


def update_supabase(company_id: str, folder_id: str, share_link: str) -> bool:
    supabase_url = _e("SUPABASE_URL")
    supabase_key = _e("SUPABASE_SERVICE_ROLE_KEY")
    url = f"{supabase_url}/rest/v1/company_directory"
    r = requests.patch(
        f"{url}?id=eq.{company_id}",
        headers={
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        json={
            "naver_works_company_folder_id": folder_id,
            "naver_works_company_share_link": share_link,
        },
        timeout=30,
    )
    return r.status_code in (200, 204)


def main():
    print("=== 네이버웍스 폴더 재생성 + 공개 링크 발급 ===\n")

    session_cookie = get_session_cookie()
    rl = get_resource_location()
    print(f"✅ 세션 쿠키 로드 완료 (길이 {len(session_cookie)})")
    print(f"✅ Resource Location: {rl}\n")

    print("업체 목록 조회 중...")
    companies = get_companies()
    print(f"✅ 대상 업체 {len(companies)}개\n")

    ok_count = 0
    fail_count = 0
    results = []

    for i, company in enumerate(companies, 1):
        name = company.get("name", "?")
        company_id = company.get("id", "")

        # 1. 폴더 생성
        folder_ok, file_id, folder_err = create_folder(session_cookie, rl, name)
        if not folder_ok:
            print(f"[{i:3d}/{len(companies)}] ❌ {name} — 폴더 생성 실패: {folder_err}")
            fail_count += 1
            results.append({"name": name, "status": "FOLDER_FAIL", "error": folder_err})
            time.sleep(0.3)
            continue

        # 2. 공개 링크 생성
        link_ok, link_url, link_err = create_public_link(session_cookie, rl, file_id)
        if not link_ok:
            print(f"[{i:3d}/{len(companies)}] ⚠️  {name} — 폴더 생성 OK (fileId={file_id[:30]}), 링크 실패: {link_err}")
            fail_count += 1
            results.append({"name": name, "status": "LINK_FAIL", "fileId": file_id, "error": link_err})
            time.sleep(0.3)
            continue

        # 3. Supabase 업데이트
        db_ok = update_supabase(company_id, file_id, link_url)
        if db_ok:
            print(f"[{i:3d}/{len(companies)}] ✅ {name} — {link_url[:70]}")
            ok_count += 1
            results.append({"name": name, "status": "OK", "fileId": file_id, "link": link_url})
        else:
            print(f"[{i:3d}/{len(companies)}] ⚠️  {name} — Supabase 업데이트 실패 (폴더/링크는 생성됨)")
            print(f"       fileId: {file_id}")
            print(f"       link:   {link_url}")
            fail_count += 1
            results.append({"name": name, "status": "DB_FAIL", "fileId": file_id, "link": link_url})

        time.sleep(0.3)  # rate limit

    # 결과 저장
    out_path = ROOT / "scripts" / "bulk_recreate_results.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"\n=== 완료 ===")
    print(f"✅ 성공: {ok_count}")
    print(f"❌ 실패/문제: {fail_count}")
    print(f"📄 결과 저장: {out_path}")


if __name__ == "__main__":
    main()
