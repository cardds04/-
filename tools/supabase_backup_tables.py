#!/usr/bin/env python3
"""
Supabase public.companies / public.customers (및 선택 테이블) JSON 백업.

사용:
  export SUPABASE_URL="https://xxxx.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="eyJ..."   # 권장(RLS 우회로 전체 행)
  # 또는 SUPABASE_ANON_KEY (RLS로 읽기 허용된 행만)

  python3 tools/supabase_backup_tables.py

출력: backups/supabase-YYYYMMDD-HHMMSS/*.json
"""

from __future__ import annotations

import json
import os
import ssl
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


def _fetch_json(url: str, headers: dict[str, str]) -> list | dict:
    req = urllib.request.Request(url, headers=headers)
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _paginate_rest(base_url: str, table: str, select: str, headers: dict[str, str]) -> list:
    """limit/offset 으로 전체 행 수집."""
    rows: list = []
    offset = 0
    page = 1000
    while True:
        from urllib.parse import quote

        sel = quote(select, safe="(),")
        url = f"{base_url}/rest/v1/{table}?select={sel}&limit={page}&offset={offset}"
        req = urllib.request.Request(url, headers=headers)
        ctx = ssl.create_default_context()
        with urllib.request.urlopen(req, context=ctx, timeout=120) as resp:
            chunk = json.loads(resp.read().decode("utf-8"))
        if not isinstance(chunk, list) or not chunk:
            break
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return rows


def main() -> None:
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
    if not base or not key:
        raise SystemExit(
            "SUPABASE_URL 와 SUPABASE_SERVICE_ROLE_KEY(권장) 또는 SUPABASE_ANON_KEY 가 필요합니다."
        )

    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
    }

    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
    out_dir = Path(__file__).resolve().parent.parent / "backups" / f"supabase-{stamp}"
    out_dir.mkdir(parents=True, exist_ok=True)

    snapshots: dict[str, list | dict] = {}

    # 통합 업체·고객 테이블 (구 companies/customers 대체)
    try:
        snapshots["company_directory"] = _paginate_rest(
            base,
            "company_directory",
            "id,name,phone,code,login_id,password,site_type,customer_phone,created_at,updated_at",
            headers,
        )
    except Exception as e:
        snapshots["company_directory_error"] = str(e)

    meta = {
        "exported_at_utc": stamp,
        "supabase_url": base,
        "note": "비밀번호(평문)가 company_directory에 포함될 수 있습니다. 공유·커밋 금지.",
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (out_dir / "snapshot.json").write_text(
        json.dumps(snapshots, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    for name, data in snapshots.items():
        if name.endswith("_error"):
            continue
        if isinstance(data, list):
            (out_dir / f"{name}.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

    print(f"백업 완료: {out_dir}")


if __name__ == "__main__":
    main()
