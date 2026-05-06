#!/usr/bin/env python3
"""
네이버웍스(NAVER WORKS) Drive — 폴더 생성 + 「편집 가능」(EDIT 권한) 공유 링크 발급

사용:
  1. 프로젝트 루트에 .env, auth_key.key (또는 PRIVATE_KEY 문자열 / NAVER_WORKS_PRIVATE_KEY_PATH) 둡니다.
  2. pip install -r requirements-naverworks.txt
  3. python3 create_folder.py --folder-name "0506래미안" --parent-file-id "상위폴더_fileId"
  4. 진단(POST 403 시): python3 create_folder.py --list-folder-children   # 루트: GET …/drive/files (공식 루트 목록 API)
    또는 --list-folder-children <폴더fileId>  # 하위: GET …/files/{id}/children
  5. 서비스 계정만 403·사람 로그인은 되게 하려면: python3 scripts/naverworks_user_oauth_drive_probe.py authorize-url
     → 브라우저 로그인 후 exchange-probe --code "코드" (환경변수 NAVER_WORKS_OAUTH_REDIRECT_URI·콘솔 Redirect URL 일치 필요)

.env 예시:
  CLIENT_ID=...
  CLIENT_SECRET=...
  SERVICE_ACCOUNT=...@example.com
  # 키는 auth_key.key 파일로 두거나 PRIVATE_KEY=... 사용
  NAVER_WORKS_DRIVE_OWNER_USER_ID=작가드라이브소유자_리소스ID_또는_메일
  NAVER_WORKS_DRIVE_SHAREDRIVE_ID=@2101000000000008   # 공용(포토영상) 드라이브 — 비우면 내 드라이브(users/…)
  NAVER_WORKS_DRIVE_PARENT_FILE_ID=상위폴더_fileId   # 생략 시 --parent-file-id 필수

API(Works 공식): https://www.worksapis.com/v1.0
  • 내 드라이브 — POST /users/{userId}/drive/files / drive/files/{parentId} ([drive-file-create](https://developers.worksmobile.com/kr/docs/drive-file-create))
  • 공용 드라이브 — .env 에 NAVER_WORKS_DRIVE_SHAREDRIVE_ID(예: @210100…) 를 두면 POST /sharedrives/{id}/files 및 …/files/{parentId} · 링크 POST …/sharedrives/{id}/files/{fileId}/link ([sharedrive-file-root-create](https://developers.worksmobile.com/kr/docs/sharedrive-file-root-create), [sharedrive-file-link-create](https://developers.worksmobile.com/kr/docs/sharedrive-file-link-create))
NAVER_WORKS_WORKSAPIS_BASE 로 베이스만 교체 가능. NAVER_WORKS_DRIVE_CREATE_FOLDER_URL 이 있으면 그 URL 로 전체 요청 그대로 POST.
토큰: …/oauth2/v2.0/token. 공용이 아닐 때 공유 링크: …/users/{userId}/drive/files/{fileId}/link
  - accessType 기본 ORGANIZATION(구성원). 외부 작가면 ANYONE 또는 SPECIFIC_PEOPLE + NAVER_WORKS_LINK_SPECIFIC_PEOPLE (콤마 구분 메일)
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlencode

import jwt
import requests

TOKEN_URL = "https://auth.worksmobile.com/oauth2/v2.0/token"  # OAuth 2.0 (API 2.0) — 유지
INTERNAL_DRIVE_API_HOST = "https://api.drive.worksmobile.com"

GRANT_TYPE = "urn:ietf:params:oauth:grant-type:jwt-bearer"

# 이 스크립트·.env·auth_key.key 가 같이 있는 디렉터리
_ROOT = Path(__file__).resolve().parent


def _apply_dotenv_contents(raw: str) -> None:
    if raw.startswith("\ufeff"):
        raw = raw[1:]
    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("export "):
            line = line[7:].lstrip()
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2).strip()
        if (val.startswith('"') and val.endswith('"')) or (val.startswith("'") and val.endswith("'")):
            val = val[1:-1]
        os.environ[key] = val


def _load_dotenv() -> list[Path]:
    """스크립트 위치와 현재 작업 디렉터리의 .env 를 순서대로 읽습니다(뒤에서 덮어씀)."""
    candidates: list[Path] = []
    for p in (_ROOT / ".env", Path.cwd() / ".env"):
        try:
            rp = p.resolve()
        except OSError:
            continue
        if rp in {c.resolve() for c in candidates}:
            continue
        if not p.is_file():
            continue
        candidates.append(p)
    loaded: list[Path] = []
    for path in candidates:
        try:
            raw = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        _apply_dotenv_contents(raw)
        loaded.append(path.resolve())
    return loaded


def _e(name: str, default: str = "") -> str:
    v = os.getenv(name, default)
    return v.strip() if isinstance(v, str) else ""


def resolve_worksap_api_base() -> str:
    """Works REST API 호스트(+버전경로). 공식 내 드라이브 예: https://www.worksapis.com/v1.0"""
    b = (_e("NAVER_WORKS_WORKSAPIS_BASE") or "https://www.worksapis.com/v1.0").strip().rstrip("/")
    return b


def load_private_key_pem() -> str:
    path = _e("NAVER_WORKS_PRIVATE_KEY_PATH")
    if path:
        p = Path(path).expanduser()
        if not p.is_absolute():
            p = (_ROOT / p).resolve()
        if p.is_file():
            return p.read_text(encoding="utf-8").strip()
    fallback = _ROOT / "auth_key.key"
    if fallback.is_file():
        return fallback.read_text(encoding="utf-8").strip()
    raw = _e("PRIVATE_KEY") or _e("NAVER_WORKS_PRIVATE_KEY")
    if not raw:
        raise ValueError(
            "PRIVATE_KEY 문자열 또는 NAVER_WORKS_PRIVATE_KEY_PATH 또는 "
            "같은 폴더의 auth_key.key 가 필요합니다."
        )
    return raw.replace("\\n", "\n").strip()


def client_config(dotenv_loaded: list[Path]) -> tuple[str, str, str]:
    cid = _e("NAVER_WORKS_CLIENT_ID") or _e("CLIENT_ID")
    secret = _e("NAVER_WORKS_CLIENT_SECRET") or _e("CLIENT_SECRET")
    sub = _e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT")
    if not cid or not secret or not sub:
        parts = []
        if not cid:
            parts.append("NAVER_WORKS_CLIENT_ID 또는 CLIENT_ID")
        if not secret:
            parts.append("NAVER_WORKS_CLIENT_SECRET 또는 CLIENT_SECRET")
        if not sub:
            parts.append("NAVER_WORKS_SERVICE_ACCOUNT 또는 SERVICE_ACCOUNT")
        hint = (
            "**에디터에만 있고 디스크에 저장되지 않은 경우** 같은 오류가 납니다. .env 저장(Cmd+S) 후 다시 실행하세요.\n"
            f"이번에 읽은 파일: {', '.join(str(p) for p in dotenv_loaded) or '(없음 — schedule-site/.env 가 있는지 확인)'}"
        )
        raise ValueError(f"{', '.join(parts)} 가 비어 있습니다.\n{hint}")
    return cid, secret, sub


def build_jwt_assertion(client_id: str, service_account: str, private_key_pem: str, ttl_seconds: int = 3540) -> str:
    now = int(time.time())
    payload = {"iss": client_id, "sub": service_account, "iat": now, "exp": now + ttl_seconds}
    return jwt.encode(
        payload, private_key_pem, algorithm="RS256", headers={"alg": "RS256", "typ": "JWT"}
    )


# 네이버웍스 OAuth2 · scope 권한 URL 접두 (단축 식별자에 자동 부착)
NAVER_WORKS_AUTH_SCOPE_PREFIX = "https://www.worksapis.com/auth/"


def normalize_naver_works_oauth_scope(raw: str) -> str:
    """쉼표(,) → 공백, 각 토큰에 https://www.worksapis.com/auth/ 접두(없을 때만).

    실제 토큰 발급 POST에는 단축 식별자(file 등)를 쓰는 것이 일반적이며,
    scope_string_for_token_request() 에서 최종 문자열을 만듭니다.
    """
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


def resolve_oauth_scope_from_env() -> str:
    """NAVER_WORKS_OAUTH_SCOPE / NAVER_WORKS_SCOPE / NAVER_WORKS_AUTH_SCOPE → OAuth2 규격에 맞게 정규화."""
    for key in ("NAVER_WORKS_OAUTH_SCOPE", "NAVER_WORKS_SCOPE", "NAVER_WORKS_AUTH_SCOPE"):
        raw = os.getenv(key)
        if raw is None:
            continue
        s = str(raw).strip()
        if s:
            return normalize_naver_works_oauth_scope(s)
    raise ValueError(
        "토큰 발급용 scope가 비어 있습니다. .env에 NAVER_WORKS_OAUTH_SCOPE 또는 NAVER_WORKS_SCOPE에 "
        "권한을 적어 주세요(쉼표 또는 공백으로 구분, 접두는 자동 추가)."
    )


def works_scope_slugs(tokens_space_sep: str) -> list[str]:
    """공백 구분 토큰 → OAuth Scopes 표의 단축 식별자 목록(접두 제거)."""
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
    """공식 가이드처럼 상위(write) 범위가 있으면 대응 .read 동시 요청 생략(user/user.read 등).

    NAVER WORKS `file` 과 `file.read` 는 문서상 별도이며, Drive 조회·목록에 `file.read` 가
    따로 필요할 수 있어 `file` 이 있어도 `file.read` 는 제거하지 않는다.
    """
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


def _scope_token_use_full_url() -> bool:
    v = (_e("NAVER_WORKS_SCOPE_TOKEN_USE_FULL_URL") or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _is_shared_drive() -> bool:
    """NAVER_WORKS_SHARED_DRIVE=true 이면 users/ 없는 공용 드라이브 경로 사용."""
    v = (_e("NAVER_WORKS_SHARED_DRIVE") or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _find_dotenv_path() -> Path:
    for p in (_ROOT / ".env", Path.cwd() / ".env"):
        if p.is_file():
            return p.resolve()
    return _ROOT / ".env"


def save_tokens_to_dotenv(access_token: str, refresh_token: str, expires_in: int = 3600) -> None:
    """access_token·refresh_token·만료시각을 .env에 저장(기존 값 교체)."""
    expires_at = int(time.time()) + int(expires_in) - 60
    env_path = _find_dotenv_path()
    try:
        text = env_path.read_text(encoding="utf-8")
    except OSError:
        text = ""
    for key, val in [
        ("NAVER_WORKS_ACCESS_TOKEN", access_token),
        ("NAVER_WORKS_REFRESH_TOKEN", refresh_token),
        ("NAVER_WORKS_TOKEN_EXPIRES_AT", str(expires_at)),
    ]:
        pattern = re.compile(rf"^{key}=.*$", re.MULTILINE)
        line = f"{key}={val}"
        if pattern.search(text):
            text = pattern.sub(line, text)
        else:
            text = text.rstrip("\n") + f"\n{line}\n"
    env_path.write_text(text, encoding="utf-8")
    print("[NAVER WORKS] 토큰 .env 저장 완료", file=sys.stderr)


def refresh_user_token(client_id: str, client_secret: str, refresh_tok: str) -> tuple[str, str, int]:
    """refresh_token으로 새 access_token 발급."""
    body = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_tok,
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
        data = {}
    if not res.ok or "access_token" not in data:
        raise RuntimeError(f"토큰 자동 갱신 실패 HTTP {res.status_code}: {data}")
    new_access = str(data["access_token"])
    new_refresh = str(data.get("refresh_token") or refresh_tok)
    exp_in = int(data.get("expires_in", 3600))
    return new_access, new_refresh, exp_in


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
        data = {}
    if not res.ok or "access_token" not in data:
        raw = res.text if res.text is not None else ""
        print(
            f"[NAVER WORKS] OAuth token HTTP {res.status_code} 응답 본문 (scope 등 상세):\n{raw}",
            file=sys.stderr,
        )
        msg = data.get("error_description") or data.get("error") or raw or str(res.status_code)
        raise RuntimeError(f"액세스 토큰 발급 실패: {msg}")
    return str(data["access_token"])


def resolve_drive_sharedrive_id() -> str:
    """공용 드라이브(collaborative drive) ID. 예: @2101000000000008 (API 공용 드라이브 목록 등에서 확인)."""
    return (_e("NAVER_WORKS_DRIVE_SHAREDRIVE_ID") or _e("NAVER_WORKS_SHAREDRIVE_ID")).strip()


def quote_sharedrives_path_segment(sharedrive_id: str) -> str:
    """공용 드라이브 ID 를 URL 경로 세그먼트로 (공식 예시의 @ 유지)."""
    return quote(sharedrive_id.strip(), safe="@")


def resolve_drive_api_hint_segment() -> str:
    """403 힌트·로그용. 공용이면 sharedrives/..., 아니면 users/… 세그먼트."""
    sid = resolve_drive_sharedrive_id()
    if sid:
        return f"sharedrives/{sid}"
    return resolve_drive_user_path_segment()


def log_drive_api_target_before_request() -> None:
    """POST/GET 직전: 공용 드라이브 vs 내 드라이브 안내."""
    sid = resolve_drive_sharedrive_id()
    if sid:
        print(
            "[NAVER WORKS] API 대상: **공용 드라이브**(sharedrives). "
            f"NAVER_WORKS_DRIVE_SHAREDRIVE_ID=`{sid}`. "
            "관리자 화면에서 서비스 계정을 이 공용 폴더(예: 포토영상) **일원**으로 등록했는지 확인하세요.",
            file=sys.stderr,
        )
        return
    log_drive_user_path_before_request(resolve_drive_user_path_segment())


def resolve_drive_user_path_segment() -> str:
    """POST /users/{이 값}/drive/… 경로 세그먼트(메일·리소스 ID·externalKey:{…}·me)."""
    owner = _e("NAVER_WORKS_DRIVE_OWNER_USER_ID")
    if owner:
        return owner
    path_mode = (_e("NAVER_WORKS_DRIVE_FOLDER_USER_PATH") or "me").strip().lower()
    if path_mode in ("service_account", "serviceaccount", "service", "sub"):
        svc = _e("NAVER_WORKS_SERVICE_ACCOUNT_ID") or _e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT")
        if svc:
            return svc
    return "me"


PLACEHOLDER_PARENT_MARKERS_KO = frozenset(
    ("실제부모", "상위폴더", "여기에", "예시", "부모폴더", "복사한", "YOUR_", "예:", "예)")
)


def warn_if_parent_file_id_suspicious(parent_file_id: str) -> None:
    """안내 문장을 그대로 넣었는지 등 휴리스틱 경고 stderr."""
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
                "[NAVER WORKS] 경고: parentFileId 가 너무 짧거나 'fileId' 같은 설명 문자를 포함했습니다. "
                "네이버웍스 목록 조회 등에서 받은 진짜 fileId 인지 확인하세요.",
                file=sys.stderr,
            )
            return
    # 일반적인 fileId: ASCII 위주이고 길이가 있음(문서 예: NzExNTMwMDF8MTQ2...)
    if any(ord(c) > 127 for c in pid):
        print(
            "[NAVER WORKS] 경고: parentFileId 에 한글 등 비ASCII 문자가 있습니다. 보통 Works fileId 는 "
            "'MTAwMDA…|MzQ…|RHww' 같이 표시된 값만 사용합니다.",
            file=sys.stderr,
        )


def _jwt_service_account_email() -> str:
    return (_e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT") or "").strip()


def _drive_api_forbidden_hint(path_user_segment: str, parent_file_id: str = "", *, context: str = "post_upload") -> str:
    ps = (path_user_segment or "").strip()
    pil = (parent_file_id or "").strip().lower()
    tail = (
        "Developer Console에서 file 스코프·웍스 드라이브 이용 가능 여부 확인. 부모가 공용 드라이브면 users/경로가 아니라 sharedrives API."
    )
    if ps.startswith("sharedrives/"):
        sid_show = ps[len("sharedrives/") :].strip()
        if context == "drive_list_read":
            return (
                f"403 Not allowed api — 공용 드라이브 목록/자식 조회 GET 이 거부되었습니다 (sharedriveId={sid_show}). "
                "토큰 주체(서비스 계정)가 해당 공용 폴더 **구성원**인지·file+file.read 스코프인지 관리자 설정을 확인하세요. "
                + tail
            )
        return (
            f"403 Not allowed api — 공용 드라이브에 폴더(업로드 URL) 생성 POST 가 거부되었습니다 (sharedriveId={sid_show}). "
            "서비스 계정을 포토영상 등 공용 드라이브 **일원**으로 등록했는지·쓰기 권한인지 확인하세요. "
            + tail
        )
    svc = _jwt_service_account_email()
    if svc and ps.lower() == svc.lower():
        if context == "drive_list_read":
            return (
                "403 Not allowed api — 같은 SERVICE_ACCOUNT 경로에서 **Drive 목록 GET**(루트 `…/drive/files` 또는 `…/{id}/children`)도 거부되었습니다. "
                "**이 테넌트·앱 토큰으로 Drive API(users/…/drive/) 접근 자체가 막혔거나**(file+file.read·라이선스), "
                "서비스 계정은 Drive를 쓸 수 없는 설정일 가능성이 큽니다. **사람 계정 OAuth**로 동일 GET URL 비교, "
                "네이버웍스/파트너 지원에 SA Drive API 허용 여부 문의. "
                + tail
            )
        return (
            "403 Not allowed api — URL의 users/세그먼트가 JWT의 SERVICE_ACCOUNT(서비스 계정)와 **같습니다**. "
            "‘다른 구성원 드라이브 대행 불가’가 원인이 아닙니다. "
            "이 테넌트/앱에서 **서비스 계정에 Drive 업로드 URL 발급(POST …/drive/files)이 막혀 있거나**, "
            "웍스 드라이브·API가 **일반 구성원 계정만 허용**일 수 있습니다. "
            "동일 토큰으로 `GET …/drive/files`(루트 목록)·`GET …/{folderId}/children` 등 **읽기**가 되는지 확인하고, "
            "안 되면 **사람 계정 OAuth 토큰**으로 같은 URL을 비교·네이버웍스/파트너 지원에 SA Drive 사용 가능 여부를 문의하세요. "
            + tail
        )
    if ps.lower() == "me":
        msg = (
            "403 Not allowed api — 지금 경로가 users/me(JWT 보통 서비스 계정 sub). "
        )
        if pil in ("root", "루트"):
            msg += (
                "**부모가 root 인데도 403이면 ‘다른 사람 폴더 id 불일치’가 아니라**, "
                "테넌트에서 **서비스 계정에 개인 내 드라이브(upload URL 생성) API가 막혀 있거나**, "
                "**`me`가 서비스 계정으로 해석되지 않을 수 있습니다.** 시도 순서: "
                "(1) `.env`에 `NAVER_WORKS_DRIVE_FOLDER_USER_PATH=service_account` → URL이 "
                "`users/{SERVICE_ACCOUNT메일}/drive/files` 로 바뀌는지 재실험 "
                "(2) 같은 앱·토큰으로 **Drive 파일 목록 GET** 같은 읽기 API가 되는지 확인 "
                "(3) 네이버웍스/파트너 지원에 **서비스 계정 JWT Drive 쓰기 허용** 문의 "
                "(4) 사람 계정 OAuth 토큰으로 users/me 검증 "
            )
        else:
            msg += (
                "부모 folder fileId가 그 계정 내 드라이브 소속이 아니면 403. "
                "다른 사람 폴더면 NAVER_WORKS_DRIVE_OWNER_USER_ID + 그 사용자 기준 부모 id. "
                "위가 아니면 `NAVER_WORKS_DRIVE_FOLDER_USER_PATH=service_account` 로 명시 경로 시험·지원 문의 "
            )
        return msg + tail
    svc2 = _jwt_service_account_email()
    return (
        f"403 Not allowed api — URL은 이미 users/`{ps}` 입니다(JWT 서비스 계정 호출 시 sub는 보통 {svc2 or 'SERVICE_ACCOUNT'}). "
        "**경로의 사용자≠JWT sub** 일 때 커뮤니티에 나온 것처럼 대행 불가 테넌트일 수 있습니다. "
        "대안: 해당 구성원 OAuth 토큰 + users/me, sharedrives API, 또는 지원 문의 "
        + tail
    )


def log_drive_user_path_before_request(path_seg: str) -> None:
    """403 해석 도움: URL의 users/세그먼트가 어떤 드라이브를 가리키는지 안내."""
    ps = (path_seg or "").strip()
    low = ps.lower()
    if low == "me":
        sa = _e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT")
        print(
            "[NAVER WORKS] 지금 호출 경로: users/me → 이 토큰의 주체(JWT sub·보통 서비스 계정)의 **내 드라이브**만 대상입니다. "
            f"(SERVICE_ACCOUNT={sa or '?'} …) "
            "부모 폴더가 **다른 사람** 웍스 내 드라이브라면 무조건 403이 나기 쉽습니다. "
            "해결: `.env`에 `NAVER_WORKS_DRIVE_OWNER_USER_ID=<그 사람 웍스 메일 또는 user 리소스 ID>` 후 같은 부모 작업 재시도. "
            "부모 fileId도 그 사람으로 **파일 목록 API** 호출했을 때 나오는 값이어야 합니다.",
            file=sys.stderr,
        )
        print(
            "[NAVER WORKS] 참고: `users/me` 가 막히면 `.env`에 `NAVER_WORKS_DRIVE_FOLDER_USER_PATH=service_account` 로 "
            "`users/{SERVICE_ACCOUNT}/drive/` 명시 경로를 시험해 보세요.",
            file=sys.stderr,
        )
        return
    sa = (_e("NAVER_WORKS_SERVICE_ACCOUNT") or _e("SERVICE_ACCOUNT") or "").strip()
    if sa and low == sa.lower():
        print(
            "[NAVER WORKS] 경로가 JWT SERVICE_ACCOUNT 와 동일합니다. "
            "**여기서 403이면 ‘타 구성원 대행’ 문제가 아니라**, 테넌트에서 **서비스 계정용 Drive(upload) API 자체 미허용**·상품 제한 가능성을 의심하세요.",
            file=sys.stderr,
        )
        return
    print(
        f"[NAVER WORKS] 지금 호출 경로 사용자 세그먼트: `{ps}` (OWNER_USER_ID 또는 service_account 등). 부모 폴더도 이 사용자 드라이브 안의 id 여야 합니다.",
        file=sys.stderr,
    )
    print(
        "[NAVER WORKS] 참고: 경로 사용자≠JWT sub 이면, 테넌트에서 타 사용자 users/…/drive/ 대행이 막혀 있을 수 있습니다.",
        file=sys.stderr,
    )


def resolve_drive_folder_list_get_url(folder_file_id: str) -> tuple[str, str]:
    """목록 GET URL + listKind.

    NAVER_WORKS_SHARED_DRIVE=true: /drive/files/{fileId}/children (driveId 없이 fileId 직접).
    NAVER_WORKS_DRIVE_SHAREDRIVE_ID 설정 시: /sharedrives/{driveId}/files[/{fileId}/children].
    내 드라이브: /users/{userId}/drive/files[/{fileId}/children].
    """
    api_base = resolve_worksap_api_base()
    fid = (folder_file_id or "").strip()
    if _is_shared_drive():
        if fid.lower() in ("", "root", "루트"):
            pid = (_e("NAVER_WORKS_DRIVE_PARENT_FILE_ID") or _e("PARENT_FILE_ID") or "").strip()
            if pid:
                return f"{api_base}/drive/files/{quote(pid, safe='')}/children", "shared_root_children"
            return f"{api_base}/drive/files", "shared_drive_files"
        return f"{api_base}/drive/files/{quote(fid, safe='')}/children", "folder_children"
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


def get_drive_folder_children(token: str, folder_file_id: str) -> tuple[bool, dict[str, Any], int]:
    """진단용: 동일 토큰으로 Drive 목록 조회(GET). 루트는 공식 경로 …/drive/files 또는 sharedrives/…/files."""
    path_seg = resolve_drive_api_hint_segment()
    url, list_kind = resolve_drive_folder_list_get_url(folder_file_id)
    log_drive_api_target_before_request()
    label_map = {
        "root_files": "루트 파일 목록(내 드라이브)",
        "folder_children": "폴더 자식 목록(내 드라이브)",
        "sharedrive_root_files": "루트 파일 목록(공용 드라이브)",
        "sharedrive_folder_children": "폴더 자식 목록(공용 드라이브)",
    }
    label = label_map.get(list_kind, "파일 목록")
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
    body: dict[str, Any] = {
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
    """업로드 URL 발급 POST.

    NAVER_WORKS_SHARED_DRIVE=true: /drive/files/{parentId} (driveId 없이 fileId 직접).
    NAVER_WORKS_DRIVE_SHAREDRIVE_ID 설정 시: /sharedrives/{driveId}/files[/{parentId}].
    내 드라이브: /users/{userId}/drive/files[/{parentId}].
    """
    api_base = resolve_worksap_api_base()
    direct = _e("NAVER_WORKS_DRIVE_CREATE_FOLDER_URL").strip()
    if direct:
        return direct
    pid = (parent_file_id or "").strip()
    if _is_shared_drive():
        if not pid or pid.lower() in ("root", "루트"):
            raise ValueError(
                "NAVER_WORKS_SHARED_DRIVE=true 모드에서는 상위 폴더 PARENT_FILE_ID 가 필요합니다."
            )
        return f"{api_base}/drive/files/{quote(pid, safe='')}"
    sid = resolve_drive_sharedrive_id()
    if sid:
        qs = quote_sharedrives_path_segment(sid)
        if pid.lower() in ("root", "루트"):
            return f"{api_base}/sharedrives/{qs}/files"
        if not pid:
            raise ValueError(
                "공용 드라이브 모드(NAVER_WORKS_DRIVE_SHAREDRIVE_ID 설정)에서는 상위 폴더 parentFileId 가 필요합니다. "
                "공용 루트 바로 아래에 만들 때는 --parent-file-id root 를 사용하세요."
            )
        return f"{api_base}/sharedrives/{qs}/files/{quote(pid, safe='')}"
    uid_seg = quote(resolve_drive_user_path_segment(), safe="")
    if pid.lower() in ("root", "루트"):
        return f"{api_base}/users/{uid_seg}/drive/files"
    if not pid:
        raise ValueError(
            "상위 폴더 parentFileId 가 필요합니다(.env 또는 --parent-file-id). "
            "루트 바로 아래 만들 때는 문자열 root 를 parent 로 두세요."
        )
    return f"{api_base}/users/{uid_seg}/drive/files/{quote(pid, safe='')}"


def build_drive_upload_register_body(folder_name: str) -> dict[str, Any]:
    """POST 내 드라이브 업로드 URL 생성 — 폴더는 보통 fileSize 0 후 uploadUrl 에서 업로드 완료."""
    fn = folder_name.strip()
    raw_sz = (_e("NAVER_WORKS_DRIVE_FOLDER_CREATE_FILE_SIZE") or "0").strip()
    try:
        fsize = int(raw_sz)
    except ValueError:
        fsize = 0
    body: dict[str, Any] = {"fileName": fn, "fileSize": max(0, fsize), "fileType": "FOLDER"}
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


def finalize_drive_via_upload_url(upload_url: str, token: str, folder_name: str) -> tuple[bool, dict[str, Any], int]:
    """uploadUrl 에 완료 요청 — 폴더는 Filedata 없이 resourceName 만 전송."""
    name = folder_name.strip()
    headers = {"Authorization": f"Bearer {token}"}
    data_form = {"resourceName": name}
    files_payload = {"Filedata": (name, io.BytesIO(b""), "inode/directory")}
    res = requests.post(
        upload_url,
        headers=headers,
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
    err = {"ok": False, "phase": "uploadUrl_finalize", "status": res.status_code, "message": msg or (res.text[:2000])}
    err["uploadResponse"] = up_data if isinstance(up_data, dict) else {}
    print(f"[NAVER WORKS] uploadUrl 단계 실패 HTTP {res.status_code}: {err.get('message')}", file=sys.stderr)
    return False, err, res.status_code


def resolve_internal_resource_location() -> str:
    """NAVER_WORKS_RESOURCE_LOCATION — Drive URL의 resourceLocation 파라미터값(예: 24101)."""
    return _e("NAVER_WORKS_RESOURCE_LOCATION").strip()


def create_folder_via_internal_api(
    token: str, folder_name: str, parent_file_id: str, resource_location: str
) -> tuple[bool, dict[str, Any], int]:
    """브라우저가 실제로 사용하는 내부 Drive API로 폴더 생성.

    POST https://api.drive.worksmobile.com/rl/{resourceLocation}/v1/files/{parentId}/createfolder?service=drive
    Body: {"fileName": "폴더이름"}

    인증: NAVER_WORKS_SESSION_COOKIE 가 있으면 쿠키로, 없으면 Bearer 시도.
    쿠키는 브라우저 DevTools → createfolder 요청 → Headers → Cookie 값 복사 후 .env에 저장.
    """
    pid = (parent_file_id or "root").strip()
    if pid.lower() in ("", "루트"):
        pid = "root"
    url = (
        f"{INTERNAL_DRIVE_API_HOST}/rl/{resource_location}/v1/files/{quote(pid, safe='')}/createfolder?service=drive"
    )
    body = {"fileName": folder_name.strip()}

    session_cookie = _e("NAVER_WORKS_SESSION_COOKIE").strip()
    if session_cookie:
        headers = {
            "Cookie": session_cookie,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        print(f"[NAVER WORKS] 내부 폴더 생성 POST {url} (세션 쿠키 사용)", file=sys.stderr)
    else:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        print(f"[NAVER WORKS] 내부 폴더 생성 POST {url} (Bearer 토큰 사용)", file=sys.stderr)

    res = requests.post(url, headers=headers, json=body, timeout=90)
    try:
        data = res.json() if res.text.strip() else {}
    except Exception:
        data = {"raw": res.text[:4000]}
    if not res.ok:
        msg = ""
        if isinstance(data, dict):
            msg = str(data.get("message") or data.get("error") or data.get("description") or "")
        if res.status_code == 401 and not session_cookie:
            msg = (
                (msg + " ") if msg else ""
            ) + (
                "내부 Drive API는 웹 세션 쿠키가 필요합니다. "
                "브라우저 DevTools → createfolder 네트워크 요청 → Headers 탭 → Cookie 값을 복사해 "
                ".env에 NAVER_WORKS_SESSION_COOKIE=<복사한값> 으로 저장하세요."
            )
        return (
            False,
            {"ok": False, "status": res.status_code, "message": msg or res.text[:2000], "response": data},
            res.status_code,
        )
    if not isinstance(data, dict):
        data = {"raw": data}
    data["_source"] = "internal_createfolder"
    return True, data, res.status_code


def post_create_folder(token: str, folder_name: str, parent_file_id: str) -> tuple[bool, dict[str, Any], int]:
    rl = resolve_internal_resource_location()
    if rl:
        return create_folder_via_internal_api(token, folder_name, parent_file_id, rl)

    try:
        url = resolve_create_folder_post_url(parent_file_id)
    except ValueError as e:
        return False, {"ok": False, "status": 0, "message": str(e)}, 0

    path_seg = resolve_drive_api_hint_segment()
    payload = build_drive_upload_register_body(folder_name)
    warn_if_parent_file_id_suspicious(parent_file_id)
    log_drive_api_target_before_request()
    print(f"[NAVER WORKS] Drive 업로드 URL 요청 POST {url}", file=sys.stderr)
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    res = requests.post(url, headers=headers, json=payload, timeout=90)
    try:
        data = res.json() if res.text else {}
    except Exception:
        data = {"raw": res.text[:4000]}
    if not res.ok:
        msg = ""
        if isinstance(data, dict):
            msg = str(data.get("message") or data.get("error") or data.get("description") or "")
        out: dict[str, Any] = {"ok": False, "status": res.status_code, "message": msg or res.text[:2000], "response": data}
        if res.status_code == 403:
            out["drivePathUser"] = path_seg
            h = _drive_api_forbidden_hint(path_seg, parent_file_id)
            out["hint"] = h
            print(f"[NAVER WORKS] {h}", file=sys.stderr)
        return False, out, res.status_code

    if not isinstance(data, dict):
        return True, {"raw": data}, res.status_code

    if data.get("fileId"):
        return True, data, res.status_code

    upload_u = data.get("uploadUrl")
    if isinstance(upload_u, str) and upload_u.strip():
        ok_u, up_body, st_u = finalize_drive_via_upload_url(upload_u.strip(), token, folder_name)
        merged: dict[str, Any] = {"registerUploadResponse": dict(data)}
        merged.update(up_body if isinstance(up_body, dict) else {"uploadRaw": up_body})
        fid = extract_file_id(merged)
        if ok_u and fid:
            merged["fileId"] = fid
            return True, merged, res.status_code
        merged.setdefault("message", up_body.get("message") if isinstance(up_body, dict) else "")
        return False, merged, st_u if not ok_u else res.status_code

    return False, {"ok": False, "message": "응답에 fileId·uploadUrl이 없습니다.", "response": data}, res.status_code


def extract_file_id(body: dict[str, Any]) -> str:
    if not isinstance(body, dict):
        return ""
    # 내부 API는 응답 안에 file 객체를 wrapping할 수 있음
    inner = body.get("file") or body.get("folder") or body.get("data")
    if isinstance(inner, dict):
        fid = str(inner.get("fileId") or inner.get("id") or inner.get("file_id") or "").strip()
        if fid:
            return fid
    return str(body.get("fileId") or body.get("id") or body.get("file_id") or "").strip()


def find_existing_folder_id_in_list_response(resp: Any, folder_name: str) -> str:
    """목록 조회 응답에서 동일 이름 폴더 fileId 검색(API 응답 형태 차이 허용)."""
    want = (folder_name or "").strip()
    if not want:
        return ""
    if not isinstance(resp, dict):
        return ""

    cand_lists: list[list[Any]] = []

    def push_list(v: Any) -> None:
        if isinstance(v, list):
            cand_lists.append(v)

    push_list(resp.get("files"))
    push_list(resp.get("elements"))
    push_list(resp.get("items"))
    push_list(resp.get("childFiles"))
    push_list(resp.get("folders"))
    inner = resp.get("response")
    if isinstance(inner, dict):
        push_list(inner.get("files"))
        push_list(inner.get("elements"))
        push_list(inner.get("items"))

    page = resp.get("fileListPage")
    if isinstance(page, dict):
        push_list(page.get("files"))
        push_list(page.get("elements"))

    for arr in cand_lists:
        for it in arr:
            if not isinstance(it, dict):
                continue
            name = str(it.get("fileName") or it.get("name") or it.get("displayName") or "").strip()
            if name != want:
                continue
            typ = str(it.get("fileType") or it.get("type") or it.get("mimeType") or "").lower()
            if typ and "folder" not in typ and typ not in ("directory", "dir", "fold"):
                continue
            found = extract_file_id(it)
            if found:
                return found
    return ""


def resolve_drive_user_for_link() -> str:
    """링크 생성 경로 `/users/{userId}/...` 에 쓸 ID. 서비스 계정은 보통 `me` 사용 불가."""
    u = _e("NAVER_WORKS_DRIVE_OWNER_USER_ID") or _e("NAVER_WORKS_DRIVE_USER_ID_FOR_LINK")
    return u


def create_edit_share_link(token: str, drive_user_id: str, file_id: str) -> dict[str, Any]:
    """POST …/drive/files/{fileId}/link — 편집(EDIT) 권한 링크."""
    access_type = _e("NAVER_WORKS_LINK_ACCESS_TYPE", "ORGANIZATION").upper()
    perm_type = _e("NAVER_WORKS_LINK_PERMISSION_TYPE", "EDIT").upper()
    body: dict[str, Any] = {
        "accessType": access_type,
        "linkPermissionType": perm_type,
    }
    exp = _e("NAVER_WORKS_LINK_EXPIRATION")
    if exp:
        body["expirationTime"] = exp
    pw = _e("NAVER_WORKS_LINK_PASSWORD")
    if pw and access_type == "ANYONE":
        body["password"] = pw
    spec_raw = _e("NAVER_WORKS_LINK_SPECIFIC_PEOPLE")
    if access_type == "SPECIFIC_PEOPLE" and spec_raw:
        body["specificPeople"] = [x.strip() for x in spec_raw.split(",") if x.strip()]

    uid = quote(drive_user_id, safe="")
    fid = quote(file_id, safe="")
    api_base = resolve_worksap_api_base()
    sid = resolve_drive_sharedrive_id()
    if _is_shared_drive():
        url = f"{api_base}/drive/files/{fid}/link"
    elif sid:
        qs = quote_sharedrives_path_segment(sid)
        url = f"{api_base}/sharedrives/{qs}/files/{fid}/link"
    else:
        url = f"{api_base}/users/{uid}/drive/files/{fid}/link"
    res = requests.post(
        url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=body,
        timeout=60,
    )
    try:
        data = res.json() if res.text else {}
    except Exception:
        data = {"text": res.text[:2000]}
    if not res.ok:
        msg = ""
        if isinstance(data, dict):
            msg = str(data.get("message") or data.get("error_description") or data.get("error") or "")
        if not msg:
            msg = res.text[:2000] if res.text else str(res.status_code)
        return {"ok": False, "status": res.status_code, "message": msg, "response": data}
    if isinstance(data, dict):
        data["ok"] = True
        return data
    return {"ok": True, "raw": data}


def resolve_drive_link_user_id(_file_id: str, folder_body: dict[str, Any]) -> str:
    """링크 생성용 userId 후보 결정."""
    explicit = resolve_drive_user_for_link()
    if explicit:
        return explicit
    if isinstance(folder_body, dict):
        uid = folder_body.get("userId") or folder_body.get("ownerUserId") or folder_body.get("ownerId")
        if uid:
            return str(uid).strip()
    return ""


def main() -> int:
    dotenv_loaded = _load_dotenv()

    parser = argparse.ArgumentParser(description="NAVER WORKS Drive 폴더 생성 + 편집 공유 링크")
    parser.add_argument("--folder-name", default="", help="새 폴더 이름 (--list-folder-children 시 생략 가능)")
    parser.add_argument(
        "--parent-file-id",
        default="",
        help="부모 폴더 fileId (.env 의 NAVER_WORKS_DRIVE_PARENT_FILE_ID 가 비어 있으면 필수)",
    )
    parser.add_argument(
        "--list-folder-children",
        nargs="?",
        const="root",
        default=None,
        metavar="FILE_ID",
        help="진단 후 종료. 생략·root 시 GET …/drive/files(공식 루트 목록). 그 외 FILE_ID 에 대해 GET …/files/{id}/children. 문서: developers.worksmobile.com/kr/docs/drive-file-root-list",
    )
    parser.add_argument(
        "--no-link",
        action="store_true",
        help="폴더만 만들고 링크 API는 호출하지 않음",
    )
    parser.add_argument(
        "--reuse-if-exists",
        action="store_true",
        help="부모 아래 같은 이름 폴더가 있으면 새로 만들지 않고 해당 fileId 를 사용합니다.",
    )
    args = parser.parse_args()

    parent_default = _e("NAVER_WORKS_DRIVE_PARENT_FILE_ID") or _e("NAVER_WORKS_PARENT_FILE_ID")
    parent_file_id = (args.parent_file_id or parent_default or "").strip()
    folder_name = args.folder_name.strip()

    result: dict[str, Any] = {
        "ok": False,
        "folderName": folder_name,
        "parentFileId": parent_file_id,
    }

    try:
        direct_token = _e("NAVER_WORKS_ACCESS_TOKEN").strip()
        refresh_tok = _e("NAVER_WORKS_REFRESH_TOKEN").strip()
        if direct_token:
            expires_at_str = _e("NAVER_WORKS_TOKEN_EXPIRES_AT").strip()
            needs_refresh = False
            if expires_at_str:
                try:
                    needs_refresh = time.time() >= float(expires_at_str)
                except ValueError:
                    pass
            if needs_refresh and refresh_tok:
                print("[NAVER WORKS] 액세스 토큰 만료 — 자동 갱신 중...", file=sys.stderr)
                cid = _e("NAVER_WORKS_CLIENT_ID") or _e("CLIENT_ID")
                secret = _e("NAVER_WORKS_CLIENT_SECRET") or _e("CLIENT_SECRET")
                new_access, new_refresh, exp_in = refresh_user_token(cid, secret, refresh_tok)
                save_tokens_to_dotenv(new_access, new_refresh, exp_in)
                os.environ["NAVER_WORKS_ACCESS_TOKEN"] = new_access
                token = new_access
                print("[NAVER WORKS] 토큰 자동 갱신 완료", file=sys.stderr)
            else:
                print("[NAVER WORKS] NAVER_WORKS_ACCESS_TOKEN 사용 (JWT 건너뜀)", file=sys.stderr)
                token = direct_token
        else:
            client_id, client_secret, service_account = client_config(dotenv_loaded)
            key_pem = load_private_key_pem()
            scope = resolve_oauth_scope_from_env()
            assertion = build_jwt_assertion(client_id, service_account, key_pem)
            token = fetch_access_token(assertion, client_id, client_secret, scope)

        if args.list_folder_children is not None:
            list_id = (args.list_folder_children or "").strip()
            ok_l, list_body, _st = get_drive_folder_children(token, list_id)
            print(json.dumps({"probe": "drive_folder_children", "ok": ok_l, "body": list_body}, ensure_ascii=False, indent=2))
            return 0 if ok_l else 1

        if not folder_name:
            raise ValueError("폴더 이름이 비어 있습니다 (--list-folder-children 모드가 아니면 --folder-name 필수).")
        if not parent_file_id and not _e("NAVER_WORKS_DRIVE_CREATE_FOLDER_URL"):
            raise ValueError("--parent-file-id 또는 .env 의 NAVER_WORKS_DRIVE_PARENT_FILE_ID 가 필요합니다.")

        ok = False
        folder_body: dict[str, Any] = {}
        _status = 0
        if args.reuse_if_exists:
            ok_l, list_wrap, _st_l = get_drive_folder_children(token, parent_file_id)
            existing_id = ""
            if ok_l and isinstance(list_wrap, dict):
                lr = list_wrap.get("response")
                existing_id = find_existing_folder_id_in_list_response(lr if isinstance(lr, dict) else {}, folder_name)
            if existing_id:
                ok = True
                folder_body = {"fileId": existing_id, "reuseExisting": True}
                result["listChildrenForReuse"] = {"ok": ok_l, "wrap": list_wrap if isinstance(list_wrap, dict) else {}}
            else:
                ok, folder_body, _status = post_create_folder(token, folder_name, parent_file_id)
        else:
            ok, folder_body, _status = post_create_folder(token, folder_name, parent_file_id)

        result["createFolderHttp"] = {"ok": ok, "body": folder_body}
        if not ok:
            result["message"] = folder_body.get("message") or "폴더 생성 실패"
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 1

        fid = extract_file_id(folder_body)
        result["folderId"] = fid
        result["folderResponse"] = folder_body
        if not fid:
            result["ok"] = False
            result["message"] = "폴더 생성 응답에 fileId가 없습니다."
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 1

        if args.no_link:
            result["shareLinkUrl"] = None
            result["shareLinkNote"] = "링크 미생성 (--no-link)."
            result["ok"] = True
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0

        drive_uid = resolve_drive_link_user_id(fid, folder_body)
        if resolve_drive_sharedrive_id():
            link_out = create_edit_share_link(token, "", fid)
        elif not drive_uid:
            result["shareLinkUrl"] = None
            result["shareLinkNote"] = (
                "링크 생성에 필요한 사용자 ID가 없습니다. 내 드라이브 공유 시 .env 에 NAVER_WORKS_DRIVE_OWNER_USER_ID "
                "(또는 리소스 ID/메일)를 설정하세요."
            )
            result["ok"] = True
            print(json.dumps(result, ensure_ascii=False, indent=2))
            return 0
        else:
            link_out = create_edit_share_link(token, drive_uid, fid)
        result["shareLink"] = link_out
        if link_out.get("ok") or link_out.get("linkUrl"):
            result["shareLinkUrl"] = link_out.get("linkUrl")
            result["ok"] = True
        else:
            result["shareLinkUrl"] = None
            result["shareLinkError"] = link_out.get("message") or link_out

        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result.get("ok") else 1
    except Exception as e:
        result["ok"] = False
        result["message"] = str(e)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 1



if __name__ == "__main__":
    sys.exit(main())
