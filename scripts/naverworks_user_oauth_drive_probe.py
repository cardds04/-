#!/usr/bin/env python3
"""
NAVER WORKS — 구성원(사람) OAuth 로 액세스 토큰 발급 후 Drive 루트 목록 GET 으로 대조 검사.

서비스 계정 JWT로 POST/GET 모두 `403 Not allowed api` 일 때:
  - 같은 Client ID 로 **로그인한 구성원** 토큰으로 `users/me/drive/files` 가 되면 → SA 전용 제한 가능성 큼.
  - 사람도 403 이면 → 앱 스코프·관리 설정·테넌트 드라이브 정책 쪽 우선 검토.

사전 준비:
  1) 개발자 콘솔 클라이언트 앱에 Redirect URL 과 아래 환경 변수가 **글자까지 동일**하게 등록.
  2) .env 는 create_folder 와 동일 위치(schedule-site 루트). CLIENT_ID/CLIENT_SECRET, NAVER_WORKS_SCOPE 등 사용.

  python3 scripts/naverworks_user_oauth_drive_probe.py authorize-url
  python3 scripts/naverworks_user_oauth_drive_probe.py authorize-url --redirect-uri "https://도메인/경로"

  리다이렉트 미지정 시 기본 redirect 는 `http://127.0.0.1:8877/oauth/naverworks-callback`(stderr 안내)·콘솔에 동일 등록.

  교환 시 `exchange-probe --code` 에 넣을 값은 **리다이렉트 URL 의 code= 뒤 실제 코드**(예시 문자열 복사 금지).
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import secrets
import sys
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlencode

import requests

_REPO = Path(__file__).resolve().parents[1]
AUTHORIZE_URL = "https://auth.worksmobile.com/oauth2/v2.0/authorize"


def _load_create_folder_module():
    """create_folder 가 루트에 있다고 보고 재사용(스코프·환경변수·REST 베이스)."""
    path = _REPO / "create_folder.py"
    if not path.is_file():
        raise FileNotFoundError(f"이 스크립트와 함께 {path} 가 필요합니다.")
    spec = importlib.util.spec_from_file_location("_nw_create_folder", path)
    if spec is None or spec.loader is None:
        raise RuntimeError("create_folder 로드 불가")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def oauth_client(cf: Any) -> tuple[str, str]:
    cid = (cf._e("NAVER_WORKS_CLIENT_ID") or cf._e("CLIENT_ID")).strip()
    secret = (cf._e("NAVER_WORKS_CLIENT_SECRET") or cf._e("CLIENT_SECRET")).strip()
    if not cid or not secret:
        raise ValueError(
            "NAVER_WORKS_CLIENT_ID(또는 CLIENT_ID)·NAVER_WORKS_CLIENT_SECRET(또는 CLIENT_SECRET)이 필요합니다."
        )
    return cid, secret


DEFAULT_OAUTH_REDIRECT = "http://127.0.0.1:8877/oauth/naverworks-callback"


def resolve_redirect_uri(cf: Any, cli_redirect: str) -> str:
    """우선순위: CLI --redirect-uri → NAVER_WORKS_OAUTH_REDIRECT_URI → OAUTH_REDIRECT_URI → 로컬 기본값."""
    u = (cli_redirect or "").strip()
    if u:
        return u
    u = (cf._e("NAVER_WORKS_OAUTH_REDIRECT_URI") or cf._e("OAUTH_REDIRECT_URI")).strip()
    if u:
        return u
    print(
        "[NAVER WORKS user OAuth] NAVER_WORKS_OAUTH_REDIRECT_URI 가 비어 있어 **로컬 기본 Redirect URI** 를 씁니다.\n"
        f"  → {DEFAULT_OAUTH_REDIRECT}\n"
        "개발자 콘솔 앱의 Redirect URL 에 **위 문자열과 완전히 동일한 항목**을 추가하세요.\n"
        "(직접 지정: .env NAVER_WORKS_OAUTH_REDIRECT_URI 또는 "
        "`python3 ... authorize-url --redirect-uri 'https://...'` — 콘솔이 HTTPS 만 받으면 해당 형식으로 통일.)",
        file=sys.stderr,
    )
    return DEFAULT_OAUTH_REDIRECT


def build_authorize_url(cf: Any, client_id: str, redirect_uri: str) -> tuple[str, str]:
    normalized = cf.resolve_oauth_scope_from_env()
    use_full = cf._scope_token_use_full_url()
    scope = cf.scope_string_for_token_request(normalized, use_full)
    state = secrets.token_hex(16)
    q: dict[str, str] = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": scope,
        "state": state,
    }
    domain = cf._e("NAVER_WORKS_OAUTH_DOMAIN").strip()
    if domain:
        q["domain"] = domain
    return f"{AUTHORIZE_URL}?{urlencode(q)}", state


def exchange_code(cf: Any, client_id: str, client_secret: str, code: str, redirect_uri: str) -> dict[str, Any]:
    token_url = (cf._e("NAVER_WORKS_AUTH_TOKEN_URL") or cf.TOKEN_URL).strip()
    body: dict[str, str] = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code.strip(),
        "redirect_uri": redirect_uri,
    }
    domain = cf._e("NAVER_WORKS_OAUTH_DOMAIN").strip()
    if domain:
        body["domain"] = domain
    print(
        "[NAVER WORKS user OAuth] 토큰 교환 요청 요약 stderr — "
        f"grant=authorization_code, redirect_uri 반드시 **인가(브라우저) 단계와 동일**해야 합니다.",
        file=sys.stderr,
    )
    print(f"  TOKEN_URL={token_url}\n  redirect_uri={redirect_uri}\n  domain={(domain or '(없음)')}", file=sys.stderr)
    res = requests.post(
        token_url,
        data=urlencode(body),
        headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
        timeout=90,
    )
    try:
        data = res.json()
    except Exception:
        data = {"_raw": (res.text or "")[:6000]}
    if not res.ok:
        raw = res.text if res.text is not None else ""
        extra = ""
        if isinstance(data, dict) and data.get("error") == "unauthorized_client":
            extra = (
                "\n\n[hints] 401 unauthorized_client — 자주 있는 원인:\n"
                "  • SSO/커스텀 로그인 테넌트: authorize·토큰 **양쪽**에 NAVER_WORKS_OAUTH_DOMAIN (공식 domain 파라미터) 필요.\n"
                "  • 교환 때 redirect_uri 가 로그인 직전 URL 의 redirect 와 글자 단위 동일해야 함(.env 미설정 시 기본 localhost 사용했다면 브라우저도 같은 주소였는지 확인).\n"
                "  • 코드는 일회성·약 10분 만료 — 한 번 교환 후 재사용하면 실패.\n"
                "  • CLIENT_SECRET 오타·재발행 후 옛값, 또는 JWT 전용 비밀이 아닌 **현재 OAuth 앱** Secret 인지 확인.\n"
                "  • 개발자 콘솔에서 앱이 **OAuth 연동** 유형인지(SSO 미지원 다른 유형만 있으면 구성원 코드 플로가 막힐 수 있음).\n"
                "  • 공공/별도 호스트 테넌트: TOKEN URL 이 다를 수 있음 → NAVER_WORKS_AUTH_TOKEN_URL 로 지정(https://developers.worksmobile.com/…/auth 참고).\n"
            )
        raise RuntimeError(f"authorization_code 교환 실패 HTTP {res.status_code}: {data!r}\n본문 일부:{raw[:2000]}{extra}")
    if isinstance(data, dict):
        data.setdefault("_httpStatus", res.status_code)
    return data


def drive_list_get(cf: Any, access_token: str, user_segment: str, folder_or_root: str) -> tuple[bool, dict[str, Any]]:
    api_base = cf.resolve_worksap_api_base().rstrip("/")
    fid = (folder_or_root or "").strip().lower()
    sid_raw = cf.resolve_drive_sharedrive_id()
    if sid_raw:
        qs = cf.quote_sharedrives_path_segment(sid_raw)
        if fid in ("", "root", "루트"):
            url = f"{api_base}/sharedrives/{qs}/files"
            kind = "sharedrive_root_files"
        else:
            oid = quote((folder_or_root or "").strip(), safe="")
            url = f"{api_base}/sharedrives/{qs}/files/{oid}/children"
            kind = "sharedrive_folder_children"
        target = f"sharedrives/{sid_raw}"
    else:
        uid_seg = quote((user_segment or "me").strip(), safe="")
        if fid in ("", "root", "루트"):
            url = f"{api_base}/users/{uid_seg}/drive/files"
            kind = "root_files"
        else:
            oid = quote((folder_or_root or "").strip(), safe="")
            url = f"{api_base}/users/{uid_seg}/drive/files/{oid}/children"
            kind = "folder_children"
        target = (user_segment or "me").strip()
    r = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        },
        timeout=90,
    )
    try:
        parsed = r.json() if r.text else {}
    except Exception:
        parsed = {"raw": r.text[:4000]}
    out: dict[str, Any] = {
        "ok": r.ok,
        "status": r.status_code,
        "url": url,
        "listKind": kind,
        "driveUserSegmentUnquoted": target,
        "response": parsed if isinstance(parsed, dict) else {},
    }
    return r.ok, out


def main() -> int:
    cf = _load_create_folder_module()
    cf._load_dotenv()

    parent_r = argparse.ArgumentParser(add_help=False)
    parent_r.add_argument(
        "--redirect-uri",
        default="",
        metavar="URL",
        help="등록된 Redirect URI(생략 시 .env NAVER_WORKS_OAUTH_REDIRECT_URI·OAUTH_REDIRECT_URI, 없으면 로컬 기본값)",
    )

    parser = argparse.ArgumentParser(
        description="NAVER WORKS 구성원 OAuth → Drive 목록 검사(JWT 서비스 계정 대조용)"
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_auth = sub.add_parser(
        "authorize-url",
        parents=[parent_r],
        help="브라우저용 인가 URL 을 stdout, state 는 stderr 출력",
    )

    p_ex = sub.add_parser("exchange", parents=[parent_r], help="authorization code 만 교환 후 토큰 JSON stdout")
    p_ex.add_argument("--code", required=True, help="리다이렉트 Query 의 code 값")

    p_pr = sub.add_parser("probe", help="이미 받은 Bearer 토큰으로 Drive 목록 시험")
    p_pr.add_argument("--access-token", required=True)
    p_pr.add_argument(
        "--user-id",
        default="me",
        help="경로 세그먼트(공식과 동일: me, 리소스ID, 외부키, 서비스계정메일 등). 사람 계정 로그인 토큰이면 보통 me",
    )
    p_pr.add_argument(
        "--folder-id",
        default="",
        metavar="FILE_ID",
        help="비우거나 root 면 GET …/drive/files. 값이 있으면 …/files/{id}/children",
    )

    p_full = sub.add_parser(
        "exchange-probe",
        parents=[parent_r],
        help="코드 교환 후 곧바로 루트 목록.probe",
    )
    p_full.add_argument("--code", required=True)
    p_full.add_argument("--user-id", default="me")
    p_full.add_argument(
        "--folder-id",
        default="",
        help="선택적으로 특정 폴더 자식 목록(children)만 시험",
    )

    args = parser.parse_args()

    if args.cmd == "probe":
        ok, body = drive_list_get(cf, args.access_token.strip(), args.user_id, args.folder_id)
        print(json.dumps({"ok": ok, "body": body}, ensure_ascii=False, indent=2))
        return 0 if ok else 1

    cid, secret = oauth_client(cf)
    cli_redir = (getattr(args, "redirect_uri", None) or "").strip()
    redir = resolve_redirect_uri(cf, cli_redir)

    if args.cmd == "authorize-url":
        url, state = build_authorize_url(cf, cid, redir)
        print(url, flush=True)
        print(
            "[NAVER WORKS user OAuth] 리다이렉트 후 URL 의 state 가 아래 값과 같은지 확인.\n"
            f"state={state}\n"
            "code 를 받은 뒤 **같은 redirect_uri** 로 교환해야 합니다. "
            "기본값만 썼다면 .env 생략 가능·아니면 exchange-probe 에도 동일한 --redirect-uri 를 붙이세요.\n"
            "예: … exchange-probe --code \"…\"   또는   … exchange-probe --redirect-uri \"…\" --code \"…\"",
            file=sys.stderr,
        )
        return 0

    if args.cmd == "exchange":
        print(
            "[NAVER WORKS user OAuth] stdout 에 access_token 이 포함될 수 있습니다. 공유하지 마세요.",
            file=sys.stderr,
        )
        data = exchange_code(cf, cid, secret, args.code, redir)
        print(json.dumps(data, ensure_ascii=False, indent=2))
        return 0 if "access_token" in data else 1

    if args.cmd == "exchange-probe":
        print(
            "[NAVER WORKS user OAuth] stdout JSON 에 access_token 포함됩니다. 채팅·이슈에 붙여넣지 마세요.",
            file=sys.stderr,
        )
        tokens = exchange_code(cf, cid, secret, args.code, redir)
        at = (tokens.get("access_token") or "").strip()
        if not at:
            print(json.dumps({"ok": False, "message": "응답에 access_token 없음", "tokenResponse": tokens}, ensure_ascii=False, indent=2))
            return 1
        ok, body = drive_list_get(cf, at, args.user_id, args.folder_id)
        out = {"ok": ok, "oauthTokenGrant": tokens, "driveProbe": {"ok": ok, "body": body}}
        print(json.dumps(out, ensure_ascii=False, indent=2))
        return 0 if ok else 1

    return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as e:
        print(f"[NAVER WORKS user OAuth] {e}", file=sys.stderr)
        raise SystemExit(2) from None
    except RuntimeError as e:
        print(str(e), file=sys.stderr)
        raise SystemExit(1) from None
    except KeyboardInterrupt:
        raise SystemExit(130) from None
