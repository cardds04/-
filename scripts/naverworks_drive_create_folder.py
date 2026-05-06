#!/usr/bin/env python3
"""
네이버웍스(NAVER WORKS) — Service Account JWT로 토큰 발급 후 내 드라이브에 폴더(0바이트 업로드) 생성.

Works REST: https://www.worksapis.com/v1.0 (NAVER_WORKS_WORKSAPIS_BASE 로 변경 가능)
토큰: https://auth.worksmobile.com/oauth2/v2.0/token

기본 POST(NAVER_WORKS_DRIVE_CREATE_FOLDER_URL 미설정):
  POST {base}/users/{userId}/drive/files/{parentFileId}
  본문: fileName, fileSize(기본 0) 등 — [파일 업로드 URL 생성](https://developers.worksmobile.com/kr/docs/drive-file-create)
  응답 uploadUrl 이 있으면 스토리지에 빈 본문 업로드로 확정 후 fileId 수신.

환경 변수 (또는 NAVER_WORKS_* 별칭):
  CLIENT_ID / NAVER_WORKS_CLIENT_ID — 개발자 콘솔 Client ID
  CLIENT_SECRET / NAVER_WORKS_CLIENT_SECRET — Client Secret
  SERVICE_ACCOUNT / NAVER_WORKS_SERVICE_ACCOUNT — 서비스 계정 메일 형식 주소 (sub)
  PRIVATE_KEY / NAVER_WORKS_PRIVATE_KEY — PEM private key 문자열 (.env 에서 \\n 으로 줄바꿈)
  NAVER_WORKS_PRIVATE_KEY_PATH — PEM 파일 경로 (있으면 PRIVATE_KEY 보다 우선)

선택:
  NAVER_WORKS_OAUTH_SCOPE / NAVER_WORKS_SCOPE — 토큰용 scope(단축 전송 기본). NAVER_WORKS_SCOPE_TOKEN_USE_FULL_URL=1 이면 전체 URL.
  NAVER_WORKS_DRIVE_CREATE_FOLDER_URL — 이 URL로 그대로 POST(고급)
  NAVER_WORKS_DRIVE_OWNER_USER_ID / NAVER_WORKS_DRIVE_FOLDER_USER_PATH=service_account — /users/{…}/ 경로
  NAVER_WORKS_DRIVE_FOLDER_CREATE_FILE_SIZE — 기본 0

성공 시 stdout 에 JSON 한 줄: {"ok": true, "fileId": ..., "response": {...}}
실패 시: {"ok": false, "message": "...", "status": ...)
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import time
from typing import Any, Dict, Tuple
from urllib.parse import quote, urlencode

import jwt
import requests

TOKEN_URL = "https://auth.worksmobile.com/oauth2/v2.0/token"
GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer"
NAVER_WORKS_AUTH_SCOPE_PREFIX = "https://www.worksapis.com/auth/"


def normalize_naver_works_oauth_scope(raw: str) -> str:
    s = raw.replace(",", " ")
    s = re.sub(r"\s+", " ", s.strip())
    if not s:
        return ""
    out: list[str] = []
    for tok in s.split():
        t = tok.strip()
        if not t:
            continue
        if t.startswith(NAVER_WORKS_AUTH_SCOPE_PREFIX):
            out.append(t)
            continue
        if t.startswith("https://") and "worksapis.com/auth/" in t:
            out.append(t)
            continue
        slug = t.lstrip("/")
        out.append(f"{NAVER_WORKS_AUTH_SCOPE_PREFIX}{slug}")
    return " ".join(out)


def works_scope_slugs(tokens_space_sep: str) -> list[str]:
    out: list[str] = []
    for tok in tokens_space_sep.split():
        t = tok.strip()
        if not t:
            continue
        if t.startswith(NAVER_WORKS_AUTH_SCOPE_PREFIX):
            out.append(t[len(NAVER_WORKS_AUTH_SCOPE_PREFIX) :].lstrip("/"))
            continue
        idx = t.find("/auth/")
        if t.startswith("https://") and idx != -1:
            out.append(t[idx + len("/auth/") :].lstrip("/"))
            continue
        out.append(t.lstrip("/"))
    return out


def prune_redundant_works_scope_slugs(slugs: list[str]) -> list[str]:
    """`file.read`는 `file`과 별개로 토큰에 유지(create_folder와 동일)."""
    s = set(slugs)
    kept: list[str] = []
    for p in slugs:
        if len(p) > 5 and p.endswith(".read"):
            base = p[:-5]
            if base == "file":
                kept.append(p)
                continue
            if base and base in s:
                continue
        kept.append(p)
    return kept


def scope_string_for_token_request(normalized_scope: str, use_full_url: bool) -> str:
    slugs = prune_redundant_works_scope_slugs(works_scope_slugs(normalized_scope))
    if use_full_url:
        return " ".join(f"{NAVER_WORKS_AUTH_SCOPE_PREFIX}{x}" for x in slugs)
    return " ".join(slugs)


def _e(name: str, fallback: str | None = None) -> str:
    v = os.getenv(name, fallback or "")
    return v.strip() if isinstance(v, str) else ""


def resolve_worksap_api_base() -> str:
    b = (_e("NAVER_WORKS_WORKSAPIS_BASE") or "https://www.worksapis.com/v1.0").strip().rstrip("/")
    return b


def load_private_key_pem() -> str:
    path = _e("NAVER_WORKS_PRIVATE_KEY_PATH")
    if path and os.path.isfile(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read().strip()
    raw = _e("PRIVATE_KEY") or _e("NAVER_WORKS_PRIVATE_KEY")
    if not raw:
        raise ValueError("PRIVATE_KEY 또는 NAVER_WORKS_PRIVATE_KEY_PATH 가 필요합니다.")
    return raw.replace("\\n", "\n").strip()


def client_config() -> tuple[str, str, str]:
    cid = _e("NAVER_WORKS_CLIENT_ID") or _e("CLIENT_ID")
    secret = _e("NAVER_WORKS_CLIENT_SECRET") or _e("CLIENT_SECRET")
    sub = _e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT")
    if not cid or not secret or not sub:
        raise ValueError("CLIENT_ID, CLIENT_SECRET, SERVICE_ACCOUNT(또는 NAVER_WORKS_* 별칭)이 모두 필요합니다.")
    return cid, secret, sub


def build_jwt_assertion(client_id: str, service_account: str, private_key_pem: str, ttl_seconds: int = 3540) -> str:
    now = int(time.time())
    payload = {"iss": client_id, "sub": service_account, "iat": now, "exp": now + ttl_seconds}
    headers = {"alg": "RS256", "typ": "JWT"}
    return jwt.encode(payload, private_key_pem, algorithm="RS256", headers=headers)


def resolve_oauth_scope_from_env() -> str:
    for key in ("NAVER_WORKS_OAUTH_SCOPE", "NAVER_WORKS_SCOPE", "NAVER_WORKS_AUTH_SCOPE"):
        raw = os.getenv(key)
        if raw is None:
            continue
        s = str(raw).strip()
        if s:
            return normalize_naver_works_oauth_scope(s)
    raise ValueError(
        "NAVER_WORKS_OAUTH_SCOPE 또는 NAVER_WORKS_SCOPE에 권한을 설정하세요(쉼표·공백 구분 가능)."
    )


def _scope_token_use_full_url() -> bool:
    v = (_e("NAVER_WORKS_SCOPE_TOKEN_USE_FULL_URL") or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def fetch_access_token(assertion: str, client_id: str, client_secret: str, scope_normalized: str) -> str:
    use_full = _scope_token_use_full_url()
    scope = scope_string_for_token_request(scope_normalized, use_full)
    print(f"[NAVER WORKS] OAuth token 요청 주소: {TOKEN_URL}", file=sys.stderr)
    print(f"[NAVER WORKS] OAuth scope (.env 정규화): {scope_normalized}", file=sys.stderr)
    print(
        f"[NAVER WORKS] OAuth scope (토큰 POST 전송, {'전체 URL' if use_full else '단축'}): {scope}",
        file=sys.stderr,
    )
    body = {
        "grant_type": GRANT_TYPE,
        "assertion": assertion,
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": scope,
    }
    res = requests.post(
        TOKEN_URL,
        data=urlencode(body),
        headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
        timeout=60,
    )
    try:
        data = res.json()
    except Exception:
        data = {"raw": res.text[:2000]}
    if not res.ok or "access_token" not in data:
        raw = res.text if res.text is not None else ""
        print(
            f"[NAVER WORKS] OAuth token HTTP {res.status_code} 응답 본문 (scope 등 상세):\n{raw}",
            file=sys.stderr,
        )
        msg = data.get("error_description") or data.get("error") or raw or f"HTTP {res.status_code}"
        raise RuntimeError(f"토큰 발급 실패: {msg}")
    return str(data["access_token"])


def resolve_drive_user_path_segment() -> str:
    owner = _e("NAVER_WORKS_DRIVE_OWNER_USER_ID")
    if owner:
        return owner
    path_mode = (_e("NAVER_WORKS_DRIVE_FOLDER_USER_PATH") or "me").strip().lower()
    if path_mode in ("service_account", "serviceaccount", "service", "sub"):
        svc = _e("NAVER_WORKS_SERVICE_ACCOUNT_ID") or _e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT")
        if svc:
            return svc
    return "me"


def resolve_drive_sharedrive_id() -> str:
    return (_e("NAVER_WORKS_DRIVE_SHAREDRIVE_ID") or _e("NAVER_WORKS_SHAREDRIVE_ID")).strip()


def quote_sharedrives_path_segment(sharedrive_id: str) -> str:
    return quote(sharedrive_id.strip(), safe="@")


def resolve_drive_api_hint_segment() -> str:
    sid = resolve_drive_sharedrive_id()
    if sid:
        return f"sharedrives/{sid}"
    return resolve_drive_user_path_segment()


def log_drive_api_target_before_request() -> None:
    sid = resolve_drive_sharedrive_id()
    if sid:
        print(
            "[NAVER WORKS] API 대상: 공용 드라이브(sharedrives). "
            f"NAVER_WORKS_DRIVE_SHAREDRIVE_ID=`{sid}`. 서비스 계정을 공용 폴더 일원으로 등록했는지 확인.",
            file=sys.stderr,
        )
        return
    log_drive_user_path_before_request(resolve_drive_user_path_segment())


PLACEHOLDER_PARENT_MARKERS_KO = frozenset(
    ("실제부모", "상위폴더", "여기에", "예시", "부모폴더", "복사한", "YOUR_", "예:", "예)")
)


def warn_if_parent_file_id_suspicious(parent_file_id: str) -> None:
    pid = (parent_file_id or "").strip()
    pol = pid.lower()
    if not pid or pid in ("root", "루트"):
        return
    if any(marker in pid for marker in PLACEHOLDER_PARENT_MARKERS_KO):
        print(
            "[NAVER WORKS] 경고: parentFileId 에 예시 안내 문자열(예: 실제부모, 상위폴더)이 포함되어 있습니다. "
            "드라이브 API 응답에 나오는 영문·숫자·| 형태의 fileId 를 그대로 복사해 넣으세요.",
            file=sys.stderr,
        )
        return
    suspicious_substrings = ("fileid", "parent_file", "folder_id", "폴더_id")
    for sub in suspicious_substrings:
        if sub in pol and len(pid) < 40:
            print(
                "[NAVER WORKS] 경고: parentFileId 가 너무 짧거나 'fileId' 같은 설명 문자를 포함했습니다.",
                file=sys.stderr,
            )
            return
    if any(ord(c) > 127 for c in pid):
        print(
            "[NAVER WORKS] 경고: parentFileId 에 한글 등 비ASCII 문자가 있습니다. "
            "'MTAwMDA…|MzQ…|RHww' 형태 값인지 확인하세요.",
            file=sys.stderr,
        )


def _jwt_service_account_email() -> str:
    return (_e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT") or "").strip()


def _drive_api_forbidden_hint(path_user_segment: str, parent_file_id: str = "", *, context: str = "post_upload") -> str:
    ps = (path_user_segment or "").strip()
    pil = (parent_file_id or "").strip().lower()
    if ps.startswith("sharedrives/"):
        s = ps[len("sharedrives/") :].strip()
        if context == "drive_list_read":
            return f"403: 공용(sharedrives) 목록 GET 거부(sharedriveId={s}). 구성원·스코프·권한 확인."
        return f"403: 공용(sharedrives) 업로드 URL POST 거부(sharedriveId={s}). 서비스 계정을 공용 드라이브 일원으로 등록했는지 확인."
    svc = _jwt_service_account_email()
    if svc and ps.lower() == svc.lower():
        if context == "drive_list_read":
            return (
                "403: SERVICE_ACCOUNT 경로에서 루트 목록(GET …/drive/files)·children 목록 모두 거부 가능. "
                "Drive API 접근 전반 미허용·SA 미지원. 사람 OAuth 동일 URL 비교·지원 문의."
            )
        return (
            "403: URL users/세그먼트 = JWT SERVICE_ACCOUNT 동일 → 타인 대행 아님. "
            "SA에 Drive upload API 비허용/상품 제한 가능. GET 목록 등 읽기·OAuth(사람)·지원 문의."
        )
    if ps.lower() == "me" and pil in ("root", "루트"):
        return (
            "403 users/me + root 인데 실패 시: 테넌트에서 서비스 계정 내 드라이브(upload) API 차단 또는 me 비지원 가능. "
            "`NAVER_WORKS_DRIVE_FOLDER_USER_PATH=service_account` 로 명시 경로 시험 후 지원 문의."
        )
    if ps.lower() == "me":
        return "403 users/me + 부모 id 불일치 가능. 또는 NAVER_WORKS_DRIVE_FOLDER_USER_PATH=service_account 명시 경로 시험."
    svc2 = _jwt_service_account_email()
    return (
        f"403: 경로 users/`{ps}`. JWT sub≈{svc2 or 'SERVICE_ACCOUNT'}. "
        "경로 사용자≠sub 이면 대행 불가 테넌트일 수 있음. OAuth·sharedrives·지원 문의."
    )


def log_drive_user_path_before_request(path_seg: str) -> None:
    ps = (path_seg or "").strip()
    low = ps.lower()
    if low == "me":
        sa = _e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT")
        print(
            "[NAVER WORKS] 경로 users/me = 토큰 주체 드라이브(서비스 계정 가능). "
            f"SERVICE_ACCOUNT={sa or '?'}. 다른 사람 드라이브면 NAVER_WORKS_DRIVE_OWNER_USER_ID 설정.",
            file=sys.stderr,
        )
        print(
            "[NAVER WORKS] 참고: `users/me` 403 시 `NAVER_WORKS_DRIVE_FOLDER_USER_PATH=service_account` 명시 경로 재시험.",
            file=sys.stderr,
        )
        return
    sa2 = (_e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT") or "").strip()
    if sa2 and low == sa2.lower():
        print(
            "[NAVER WORKS] 경로 = SERVICE_ACCOUNT 본인. 403이면 SA용 Drive API·상품 제한 의심(타인 대행 아님).",
            file=sys.stderr,
        )
        return
    print(f"[NAVER WORKS] 경로 users 세그먼트: {ps}", file=sys.stderr)
    print(
        "[NAVER WORKS] 경로 사용자≠JWT sub 이면 타인 드라이브 대행 403 가능 — OAuth·sharedrives·지원 문의.",
        file=sys.stderr,
    )


def resolve_drive_folder_list_get_url(folder_file_id: str) -> tuple[str, str]:
    api_base = resolve_worksap_api_base()
    fid = (folder_file_id or "").strip()
    sid = resolve_drive_sharedrive_id()
    if sid:
        qs = quote_sharedrives_path_segment(sid)
        if fid.lower() in ("", "root", "루트"):
            return f"{api_base}/sharedrives/{qs}/files", "sharedrive_root_files"
        return f"{api_base}/sharedrives/{qs}/files/{quote(fid, safe='')}/children", "sharedrive_folder_children"
    uid_seg = quote(resolve_drive_user_path_segment(), safe="")
    if fid.lower() in ("", "root", "루트"):
        return f"{api_base}/users/{uid_seg}/drive/files", "root_files"
    return f"{api_base}/users/{uid_seg}/drive/files/{quote(fid, safe='')}/children", "folder_children"


def get_drive_folder_children(token: str, folder_file_id: str) -> Tuple[bool, Dict[str, Any], int]:
    path_seg = resolve_drive_api_hint_segment()
    url, list_kind = resolve_drive_folder_list_get_url(folder_file_id)
    log_drive_api_target_before_request()
    label_map = {
        "root_files": "루트(내 드라이브)",
        "folder_children": "폴더 자식(내 드라이브)",
        "sharedrive_root_files": "루트(공용 드라이브)",
        "sharedrive_folder_children": "폴더 자식(공용 드라이브)",
    }
    label = label_map.get(list_kind, "목록")
    print(f"[NAVER WORKS] Drive {label} GET {url}", file=sys.stderr)
    res = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
        timeout=90,
    )
    try:
        data = res.json() if res.text else {}
    except Exception:
        data = {"raw": res.text[:4000]}
    body: Dict[str, Any] = {
        "ok": res.ok,
        "status": res.status_code,
        "url": url,
        "listKind": list_kind,
        "drivePathUser": path_seg,
        "response": data if isinstance(data, dict) else {},
    }
    if not res.ok:
        msg = ""
        if isinstance(data, dict):
            msg = str(data.get("message") or data.get("error") or data.get("description") or "")
        body["message"] = msg or res.text[:2000]
        if res.status_code == 403:
            body["hint"] = _drive_api_forbidden_hint(path_seg, folder_file_id, context="drive_list_read")
            print(f"[NAVER WORKS] {body['hint']}", file=sys.stderr)
    return res.ok, body, res.status_code


def resolve_create_folder_post_url(parent_file_id: str) -> str:
    api_base = resolve_worksap_api_base()
    direct = _e("NAVER_WORKS_DRIVE_CREATE_FOLDER_URL").strip()
    if direct:
        return direct
    pid = (parent_file_id or "").strip()
    sid = resolve_drive_sharedrive_id()
    if sid:
        qs = quote_sharedrives_path_segment(sid)
        if pid.lower() in ("root", "루트"):
            return f"{api_base}/sharedrives/{qs}/files"
        if not pid:
            raise ValueError(
                "NAVER_WORKS_DRIVE_SHAREDRIVE_ID 설정 시 상위 폴더 필요. 공용 루트 바로 아래면 parent 로 root 를 쓰세요."
            )
        return f"{api_base}/sharedrives/{qs}/files/{quote(pid, safe='')}"
    uid_seg = quote(resolve_drive_user_path_segment(), safe="")
    if pid.lower() in ("root", "루트"):
        return f"{api_base}/users/{uid_seg}/drive/files"
    if not pid:
        raise ValueError(
            "상위 폴더 --parent-file-id 또는 NAVER_WORKS_DRIVE_PARENT_FILE_ID 가 필요합니다. "
            "루트 바로 아래면 parent 로 root 를 사용하세요."
        )
    return f"{api_base}/users/{uid_seg}/drive/files/{quote(pid, safe='')}"


def build_drive_upload_register_body(folder_name: str) -> Dict[str, Any]:
    fn = folder_name.strip()
    raw_sz = (_e("NAVER_WORKS_DRIVE_FOLDER_CREATE_FILE_SIZE") or "0").strip()
    try:
        fsize = int(raw_sz)
    except ValueError:
        fsize = 0
    body: Dict[str, Any] = {"fileName": fn, "fileSize": max(0, fsize)}
    mod = _e("NAVER_WORKS_DRIVE_FOLDER_MODIFIED_TIME").strip()
    if mod:
        body["modifiedTime"] = mod
    extra = _e("NAVER_WORKS_FOLDER_CREATE_JSON_EXTRA")
    if extra:
        try:
            merge = json.loads(extra)
            if isinstance(merge, dict):
                for k, v in merge.items():
                    if k == "fileName":
                        continue
                    body[k] = v
        except json.JSONDecodeError as e:
            raise ValueError(f"NAVER_WORKS_FOLDER_CREATE_JSON_EXTRA JSON 파싱 실패: {e}") from e
    return body


def finalize_drive_via_upload_url(upload_url: str, token: str, folder_name: str) -> tuple[bool, Dict[str, Any], int]:
    name = folder_name.strip()
    files_payload = {"Filedata": (name, io.BytesIO(b""), "application/octet-stream")}
    data_form = {"resourceName": name}
    res = requests.post(
        upload_url,
        headers={"Authorization": f"Bearer {token}"},
        data=data_form,
        files=files_payload,
        timeout=120,
    )
    try:
        up_data = res.json() if res.text.strip() else {}
    except Exception:
        up_data = {"rawUploadText": res.text[:4000]}
    if isinstance(up_data, dict) and up_data.get("fileId") and res.ok:
        return True, up_data, res.status_code
    msg = ""
    if isinstance(up_data, dict):
        msg = str(up_data.get("message") or up_data.get("error") or up_data.get("description") or "")
    err: Dict[str, Any] = {
        "ok": False,
        "phase": "uploadUrl_finalize",
        "status": res.status_code,
        "message": msg or (res.text[:2000] if res.text else str(res.status_code)),
        "uploadResponse": up_data if isinstance(up_data, dict) else {},
    }
    print(f"[NAVER WORKS] uploadUrl 단계 실패 HTTP {res.status_code}: {err.get('message')}", file=sys.stderr)
    return False, err, res.status_code


def extract_file_id(body: Dict[str, Any]) -> str:
    return str(body.get("fileId") or body.get("id") or body.get("file_id") or "").strip()


def create_folder(access_token: str, folder_name: str, parent_file_id: str) -> Dict[str, Any]:
    try:
        url = resolve_create_folder_post_url(parent_file_id)
    except ValueError as e:
        return {"ok": False, "message": str(e), "status": 0}

    path_seg = resolve_drive_api_hint_segment()
    body = build_drive_upload_register_body(folder_name)
    warn_if_parent_file_id_suspicious(parent_file_id)
    log_drive_api_target_before_request()
    print(f"[NAVER WORKS] Drive 업로드 URL 요청 POST {url}", file=sys.stderr)
    res = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json=body,
        timeout=90,
    )
    try:
        data = res.json() if res.text else {}
    except Exception:
        data = {"raw": res.text[:4000]}
    if not res.ok:
        msg = (
            (isinstance(data, dict) and (data.get("message") or data.get("error_description") or data.get("error")))
            or res.text
            or f"HTTP {res.status_code}"
        )
        out: Dict[str, Any] = {"ok": False, "message": str(msg), "status": res.status_code, "response": data}
        if res.status_code == 403:
            out["drivePathUser"] = path_seg
            h = _drive_api_forbidden_hint(path_seg, parent_file_id)
            out["hint"] = h
            print(f"[NAVER WORKS] {h}", file=sys.stderr)
        return out

    if not isinstance(data, dict):
        return {"ok": True, "fileId": "", "response": data}

    if data.get("fileId"):
        fid = extract_file_id(data)
        return {"ok": True, "fileId": fid, "response": data}

    upload_u = data.get("uploadUrl")
    if isinstance(upload_u, str) and upload_u.strip():
        ok_u, up_body, st_u = finalize_drive_via_upload_url(upload_u.strip(), access_token, folder_name)
        merged: Dict[str, Any] = {"registerUploadResponse": dict(data)}
        merged.update(up_body if isinstance(up_body, dict) else {})
        fid = extract_file_id(merged)
        if ok_u and fid:
            merged["fileId"] = fid
            return {"ok": True, "fileId": fid, "response": merged}
        return {
            "ok": False,
            "message": (up_body.get("message") if isinstance(up_body, dict) else "") or "uploadUrl 확정 실패",
            "status": st_u,
            "response": merged,
        }

    return {"ok": False, "message": "응답에 fileId·uploadUrl이 없습니다.", "status": res.status_code, "response": data}


def main() -> int:
    parser = argparse.ArgumentParser(description="NAVER WORKS Drive folder create (Service Account JWT)")
    parser.add_argument("--folder-name", default="", help="생성할 폴더 이름 (--list-folder-children 시 생략)")
    parser.add_argument(
        "--parent-file-id",
        default="",
        help="부모 폴더 fileId(URL 경로). 루트면 root 또는 NAVER_WORKS_DRIVE_PARENT_FILE_ID",
    )
    parser.add_argument(
        "--list-folder-children",
        nargs="?",
        const="root",
        default=None,
        metavar="FILE_ID",
        help="진단: 루트면 GET …/drive/files, 아니면 GET …/files/{id}/children 후 종료",
    )
    args = parser.parse_args()

    try:
        client_id, client_secret, service_account = client_config()
        key_pem = load_private_key_pem()
        scope = resolve_oauth_scope_from_env()
        assertion = build_jwt_assertion(client_id, service_account, key_pem)
        token = fetch_access_token(assertion, client_id, client_secret, scope)

        if args.list_folder_children is not None:
            list_id = (args.list_folder_children or "").strip()
            ok_l, list_body, _st = get_drive_folder_children(token, list_id)
            print(
                json.dumps({"probe": "drive_folder_children", "ok": ok_l, "body": list_body}, ensure_ascii=False)
            )
            return 0 if ok_l else 1

        if not args.folder_name.strip():
            raise ValueError("폴더 이름이 비어 있습니다 (--list-folder-children 가 아니면 --folder-name 필수).")

        parent_raw = (args.parent_file_id or "").strip() or (
            _e("NAVER_WORKS_DRIVE_PARENT_FILE_ID") or _e("NAVER_WORKS_PARENT_FILE_ID")
        )
        out = create_folder(token, args.folder_name.strip(), parent_raw.strip())
        print(json.dumps(out, ensure_ascii=False))
        return 0 if out.get("ok") else 1
    except Exception as e:
        print(json.dumps({"ok": False, "message": str(e)}, ensure_ascii=False))
        return 1


if __name__ == "__main__":
    sys.exit(main())
