#!/usr/bin/env python3
"""authorize-url → 브라우저 로그인 → code 입력 → .env에 토큰 저장까지 한 번에."""
import importlib.util, json, re, secrets, sys
from pathlib import Path
from urllib.parse import urlencode

ROOT = Path(__file__).resolve().parents[1]

def load_probe():
    spec = importlib.util.spec_from_file_location("probe", ROOT / "scripts/naverworks_user_oauth_drive_probe.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

def main():
    probe = load_probe()
    cf = probe._load_create_folder_module()
    cf._load_dotenv()

    client_id, client_secret = probe.oauth_client(cf)
    redirect_uri = probe.resolve_redirect_uri(cf, "")
    url, state = probe.build_authorize_url(cf, client_id, redirect_uri)

    print("\n=== 1단계: 아래 URL을 브라우저에서 열고 로그인하세요 ===")
    print(url)
    print(f"\nstate 확인값: {state}")
    print("\n로그인 후 브라우저 주소창의 전체 URL을 복사하세요.")
    print("예: http://127.0.0.1:8877/...?code=XXXXX&state=...\n")

    raw = input("리다이렉트된 전체 URL (또는 code=뒤 값만) 붙여넣기: ").strip()

    # URL 전체 또는 code 값만 받기
    m = re.search(r'[?&]code=([^&\s]+)', raw)
    code = m.group(1) if m else raw

    print(f"\n[info] code = {code[:20]}...")
    result = probe.exchange_code(cf, client_id, client_secret, code, redirect_uri)

    access_token = result.get("access_token", "")
    refresh_token = result.get("refresh_token", "")
    expires_in = int(result.get("expires_in", 3600))

    if not access_token:
        print("토큰 발급 실패:", json.dumps(result, ensure_ascii=False, indent=2))
        sys.exit(1)

    # create_folder 모듈의 save_tokens_to_dotenv 재사용
    cf = probe._load_create_folder_module()
    cf.save_tokens_to_dotenv(access_token, refresh_token, expires_in)
    print(f"\n✓ 토큰이 .env에 저장됐습니다 (약 {expires_in//60}분 유효, 이후 자동 갱신)")
    print("이제 실행하세요: python3 create_folder.py --folder-name \"폴더이름\"")

if __name__ == "__main__":
    main()
