# 설치 없이 URL로 운영하기

아래 순서대로 하면, 고객/작가/관리자가 같은 데이터(공용 DB)를 사이트 주소 하나로 함께 사용합니다.

## 1) Supabase 만들기

1. [Supabase](https://supabase.com/) 로그인
2. `New project` 생성
3. 왼쪽 `SQL Editor` 열기
4. 이 프로젝트의 `supabase-schema.sql` 파일 내용을 전체 붙여넣고 실행

## 2) 키 복사

Supabase 프로젝트에서:

- `Project URL`
- `anon public key`

를 복사해 둡니다.

## 3) 코드에 키 1회 입력 (모든 사용자 공통 적용)

`sync-config.js` 파일을 열어 아래 2칸만 입력하세요.

```js
window.SCHEDULE_SITE_SYNC_CONFIG = {
  supabaseUrl: "여기에_Project_URL",
  supabaseAnonKey: "여기에_anon_public_key",
  remoteSyncEndpoint: ""
};
```

저장 후 배포하면, 고객/작가/관리자 모두 자동으로 같은 DB를 사용합니다.

## 4) 사이트를 인터넷에 배포 (URL 생성)

가장 쉬운 방법: [Vercel](https://vercel.com/)

1. GitHub에 이 프로젝트 업로드
2. Vercel에서 `New Project` -> 해당 저장소 선택
3. 배포 완료 후 생성된 URL 공유

사용자(고객/작가/관리자)는 설치 없이 URL 접속 후 가입/로그인해서 사용하면 됩니다.

## 선택: 로컬 테스트용 쉬운 설정 페이지

로컬에서 먼저 시험할 때는 `setup.html`을 열어 URL/키를 입력해도 됩니다.

## 중요 안내

- 현재 구조는 `app_state` 한 행에 전체 상태를 저장하는 방식입니다.
- 빠르게 운영 시작하기에는 좋지만, 동시 수정이 많아지면 마지막 저장이 우선됩니다.
- 사용자 증가 시에는 테이블 분리형(사용자/스케줄/결제/휴무요청 분리)으로 2차 고도화를 권장합니다.
