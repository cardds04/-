#!/usr/bin/env python3
"""
네이버웍스 Drive — 전체 업체 공유 폴더 링크를 ANYONE+WRITE로 일괄 업데이트.

폴더 ID가 공유드라이브 형식(@2001...) 이므로 sharedrives API 사용:
  DELETE/POST https://www.worksapis.com/v1.0/sharedrives/{sharedrive_id}/files/{fileId}/link
"""
from __future__ import annotations

import base64
import json
import sys
import time
from pathlib import Path
from urllib.parse import quote

import jwt
import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from create_folder import _load_dotenv, _e, _find_dotenv_path

_load_dotenv()

TOKEN_URL = "https://auth.worksmobile.com/oauth2/v2.0/token"
GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer"
API_BASE = "https://www.worksapis.com/v1.0"


def build_jwt_assertion(client_id: str, service_account: str, private_key_pem: str) -> str:
    now = int(time.time())
    payload = {
        "iss": client_id,
        "sub": service_account,
        "iat": now,
        "exp": now + 3540,
    }
    return jwt.encode(payload, private_key_pem, algorithm="RS256")


def get_token() -> str:
    client_id = _e("NAVER_WORKS_CLIENT_ID") or _e("CLIENT_ID")
    client_secret = _e("NAVER_WORKS_CLIENT_SECRET") or _e("CLIENT_SECRET")
    service_account = _e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT")
    key_pem = (_e("NAVER_WORKS_PRIVATE_KEY") or _e("PRIVATE_KEY")).replace("\\n", "\n")

    private_key_path = _e("NAVER_WORKS_PRIVATE_KEY_PATH") or _e("PRIVATE_KEY_PATH")
    if private_key_path:
        key_path = Path(private_key_path) if Path(private_key_path).is_absolute() else ROOT / private_key_path
        if key_path.exists():
            key_pem = key_path.read_text()

    assertion = build_jwt_assertion(client_id, service_account, key_pem)

    scope = "file,file.read"
    r = requests.post(TOKEN_URL, data={
        "grant_type": GRANT_TYPE,
        "client_id": client_id,
        "client_secret": client_secret,
        "assertion": assertion,
        "scope": scope,
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def decode_folder_id(fid_enc: str) -> tuple[str, str]:
    """폴더 base64 ID → (sharedrive_id, raw_decoded)"""
    pad = 4 - len(fid_enc) % 4
    padded = fid_enc + ("=" * pad if pad != 4 else "")
    try:
        decoded = base64.b64decode(padded).decode("utf-8")
    except Exception:
        return "", fid_enc
    parts = decoded.split("|")
    sharedrive_id = parts[0] if parts[0].startswith("@") else ""
    return sharedrive_id, decoded


def get_companies() -> list[dict]:
    import os
    supabase_url = _e("SUPABASE_URL")
    supabase_key = _e("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not supabase_key:
        print("❌ SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 없음")
        sys.exit(1)

    url = f"{supabase_url}/rest/v1/company_directory"
    params = "select=id,name,naver_works_company_folder_id&naver_works_company_folder_id=not.is.null"
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
    return [c for c in data if c.get("naver_works_company_folder_id")]


def delete_link(token: str, sharedrive_id: str, fid_enc: str) -> int:
    fid_q = quote(fid_enc, safe="")
    sd_q = quote(sharedrive_id, safe="@")
    url = f"{API_BASE}/sharedrives/{sd_q}/files/{fid_q}/link"
    r = requests.delete(url, headers={"Authorization": f"Bearer {token}"}, timeout=30)
    return r.status_code


def create_link(token: str, sharedrive_id: str, fid_enc: str) -> tuple[int, dict]:
    fid_q = quote(fid_enc, safe="")
    sd_q = quote(sharedrive_id, safe="@")
    url = f"{API_BASE}/sharedrives/{sd_q}/files/{fid_q}/link"
    body = {
        "accessType": "ANYONE",
        "linkPermissionType": "WRITE",
    }
    r = requests.post(url, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }, json=body, timeout=30)
    try:
        resp_json = r.json()
    except Exception:
        resp_json = {"raw": r.text}
    return r.status_code, resp_json


def main():
    print("=== 네이버웍스 공유링크 일괄 업데이트 (ANYONE + WRITE) ===\n")

    print("토큰 발급 중...")
    token = get_token()
    print("✅ 토큰 발급 완료\n")

    print("업체 목록 조회 중...")
    companies = get_companies()
    print(f"✅ 대상 업체 {len(companies)}개\n")

    ok_count = 0
    fail_count = 0
    skip_count = 0

    for i, company in enumerate(companies, 1):
        name = company.get("name", "?")
        fid_enc = company.get("naver_works_company_folder_id", "")

        sharedrive_id, decoded = decode_folder_id(fid_enc)
        if not sharedrive_id:
            print(f"[{i:3d}] ⚠️  {name} — 공유드라이브 ID 없음 (decoded: {decoded[:40]}), 건너뜀")
            skip_count += 1
            continue

        # 1. 기존 링크 삭제
        del_status = delete_link(token, sharedrive_id, fid_enc)
        # 204 = deleted, 404 = no link existed (ok to proceed)
        if del_status not in (204, 404):
            print(f"[{i:3d}] ⚠️  {name} — 삭제 응답 {del_status}, 계속 진행")

        # 2. 새 링크 생성
        create_status, resp = create_link(token, sharedrive_id, fid_enc)

        if create_status in (200, 201):
            link_url = resp.get("url", resp.get("linkUrl", ""))
            print(f"[{i:3d}] ✅ {name} — {link_url[:60] if link_url else 'OK'}")
            ok_count += 1
        else:
            print(f"[{i:3d}] ❌ {name} — {create_status} {json.dumps(resp, ensure_ascii=False)[:80]}")
            print(f"       decoded: {decoded}")
            fail_count += 1

        # 토큰 만료 방지: 3540초 TTL, 처리 중 갱신
        if i % 100 == 0:
            try:
                token = get_token()
                print(f"  [토큰 갱신 완료 ({i}번째)]")
            except Exception as e:
                print(f"  [토큰 갱신 실패: {e}]")

        time.sleep(0.2)  # rate limit

    print(f"\n=== 완료 ===")
    print(f"✅ 성공: {ok_count}")
    print(f"❌ 실패: {fail_count}")
    print(f"⚠️  건너뜀: {skip_count}")


if __name__ == "__main__":
    main()
