#!/usr/bin/env python3
"""
company_directory 테이블의 naver_works_company_share_link(및 URL의 resourceKey → folder id)를
CSV에 적어 둔 **네이버 웍스 공유 주소**로 일괄 덮어씁니다.

※ 네이버 마이박스(naver.me 등) 주소만 있고 과거 웍스 URL 백업이 없으면
   마이박스 링크에서 웍스 주소를 “환산”할 수 없습니다.
   과거 웍스 링크 스프레드시트 · DB 백업 · 메일 등에서 목록을 복구한 뒤 이 스크립트를 씁니다.

환경변수:
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY  (권장) 또는 SUPABASE_ANON_KEY

CSV (UTF-8, 첫 행 헤더):
  name,works_url
  업체명은 company_directory.name 과 정확히 일치(앞뒤 공백 제거)해야 합니다.

또는 id 컬럼으로 매칭:
  id,works_url
  실행: python ... 맵.csv --match id

  --dry-run: 실제 PATCH 없이 매칭·검증만
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import urllib.error
import urllib.request
from urllib.parse import parse_qs, quote, urlparse


def env(key: str) -> str:
    v = os.environ.get(key, "").strip()
    if not v:
        raise SystemExit(f"환경변수 {key} 가 필요합니다.")
    return v


def build_patch_body(raw_url: str) -> dict | None:
    candidate = (raw_url or "").strip()
    if not candidate:
        return {"naver_works_company_share_link": None, "naver_works_company_folder_id": None}
    if "://" not in candidate:
        candidate = "https://" + candidate
    u = urlparse(candidate)
    if u.scheme not in ("http", "https"):
        return None
    # 정규화된 전체 URL
    canonical = u.geturl()
    qs = parse_qs(u.query)
    rk_list = qs.get("resourceKey")
    rk = rk_list[0] if rk_list else None
    body = {"naver_works_company_share_link": canonical}
    if rk and rk != "root":
        body["naver_works_company_folder_id"] = rk
    return body


def rest_headers(apikey: str) -> dict:
    return {
        "apikey": apikey,
        "Authorization": f"Bearer {apikey}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }


def fetch_all_directory(supabase_url: str, apikey: str) -> list[dict]:
    sel = "id,name,naver_works_company_share_link,naver_works_company_folder_id"
    path = f"/rest/v1/company_directory?select={sel}"
    req = urllib.request.Request(
        supabase_url.rstrip("/") + path,
        headers=rest_headers(apikey),
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read().decode())


def patch_row(supabase_url: str, apikey: str, row_id: str, body: dict) -> None:
    path = f"/rest/v1/company_directory?id=eq.{quote(row_id, safe='')}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(
        supabase_url.rstrip("/") + path,
        data=data,
        headers=rest_headers(apikey),
        method="PATCH",
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        r.read()


def main() -> None:
    ap = argparse.ArgumentParser(description="company_directory 웍스 공유 링크 CSV 일괄 반영")
    ap.add_argument("csv", type=argparse.FileType("r", encoding="utf-8-sig"))
    ap.add_argument("--match", choices=("name", "id"), default="name", help="매칭 키 (기본 name)")
    ap.add_argument("--dry-run", action="store_true", help="PATCH 하지 않고 확인만")
    args = ap.parse_args()

    supabase_url = env("SUPABASE_URL")
    apikey = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip() or os.environ.get(
        "SUPABASE_ANON_KEY", ""
    ).strip()
    if not apikey:
        raise SystemExit("SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY 가 필요합니다.")

    rows = list(csv.DictReader(args.csv))
    if not rows:
        print("CSV에 데이터 행이 없습니다.", file=sys.stderr)
        sys.exit(1)

    url_col = None
    for c in ("works_url", "naver_works_company_share_link", "url", "link"):
        if c in rows[0]:
            url_col = c
            break
    if not url_col:
        raise SystemExit(
            "CSV에 works_url (또는 naver_works_company_share_link / url / link) 열이 있어야 합니다."
        )

    key_col = "name" if args.match == "name" else "id"
    if key_col not in rows[0]:
        raise SystemExit(f"CSV에 {key_col} 열이 있어야 합니다.")

    print("[fetch] company_directory 조회 중…", flush=True)
    db = fetch_all_directory(supabase_url, apikey)
    by_name = {str(r.get("name") or "").strip(): r for r in db}
    by_id = {str(r.get("id") or "").strip(): r for r in db}

    ok = 0
    skip = 0
    missing = []

    for i, row in enumerate(rows, start=2):
        key = str(row.get(key_col) or "").strip()
        url_val = row.get(url_col) or ""
        if not key:
            print(f"행 {i}: {key_col} 비어 있음 — 스킵", flush=True)
            skip += 1
            continue
        rec = by_name.get(key) if args.match == "name" else by_id.get(key)
        if not rec:
            missing.append((i, key))
            continue
        patch = build_patch_body(str(url_val))
        if patch is None:
            print(f"행 {i} ({key}): URL 형식 오류 — {url_val!r}", flush=True)
            skip += 1
            continue
        rid = str(rec.get("id") or "").strip()
        if args.dry_run:
            print(f"[dry-run] {key} → id={rid} PATCH {patch}", flush=True)
        else:
            patch_row(supabase_url, apikey, rid, patch)
            print(f"[ok] {key} (id={rid})", flush=True)
        ok += 1

    if missing:
        print("\n[경고] DB에서 찾지 못한 키:", flush=True)
        for line, k in missing:
            print(f"  CSV 행 {line}: {k!r}", flush=True)

    print(f"\n완료: 반영(또는 dry-run) {ok}건, 스킵 {skip}건, 미매칭 {len(missing)}건", flush=True)


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        sys.exit(1)
