# 업체 · 고객 계정 통합 (`company_directory`)

## 자주 하는 오해

- **저장소에 마이그레이션 파일이 있다 = Supabase에 이미 테이블이 여러 개 생긴다**가 아닙니다. SQL을 **실제로 실행(또는 `supabase db push`)**했을 때만 DB에 반영됩니다.
- **테이블이 많아서 연결이 끊긴다**기보다, 앱이 조회하는 **테이블 이름이 DB에 없을 때**(예: 아직 `company_directory`를 만들지 않았는데 코드만 통합 버전) 404·오류가 나기 쉽습니다.
- 이 통합 마이그레이션은 **새 테이블을 무한히 쌓는** 구조가 아니라, `companies` + `customers`를 **한 테이블로 합친 뒤** 옛 테이블 이름을 `_deprecated_*`로 바꾸는 **일회성** 작업입니다. 적용 후에는 이 도메인은 **한 테이블**입니다.

## 배포하지 않았거나, 기존 `companies` / `customers` 만 쓰고 싶다면

1. **Supabase에 `20260330120000_company_directory_unified.sql` 을 적용하지 않는다**면, 원칙적으로는 **`public.company_directory` 테이블이 없습니다.**
2. 그런데 **현재 이 저장소의 `index.html` / `customer.html` 등은 `company_directory` 를 REST로 조회하도록 되어 있습니다.** 따라서 마이그레이션 없이 이 코드만 배포하면, 테이블이 없어 요청이 실패할 수 있습니다.
3. 선택지는 둘 중 하나입니다.
   - **통합 스키마로 간다:** 백업 후 위 마이그레이션을 적용하고, 앱 그대로 사용한다.
   - **옛 스키마만 쓴다:** 마이그레이션을 적용하지 않고, **`companies` + `customers` 를 가리키는 예전 앱 코드**로 맞춘다(Git에서 통합 이전 커밋을 쓰거나, 수동으로 REST 경로를 되돌림).

## 현재 구조 (권장)

**`public.company_directory` 단일 테이블**에 업체 정보(`name`, `phone`, `code`)와 고객 로그인(`login_id`, `password`, `site_type`, `customer_phone`)을 한 행에 둡니다. 로그인이 없으면 `login_id` 는 NULL 입니다.

- 마이그레이션: `supabase/migrations/20260330120000_company_directory_unified.sql`
- 기존 `companies` / `customers` 는 `_deprecated_*` 로 이름만 바뀌고 **권한이 막혀** REST 로는 쓰지 않습니다.

구버전(뷰만 있던) 파일 `20260329120000_customers_company_id.sql` 은 **통합 마이그레이션으로 대체**되었습니다.

## 백업 (마이그레이션 전 필수)

환경 변수 설정 후:

```bash
export SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="..."   # 서비스 롤 권장(전체 행)
python3 tools/supabase_backup_tables.py
```

`backups/supabase-날짜-시간/` 아래에 JSON 이 생성됩니다. **저장소에 커밋하지 마세요** (`backups/`는 `.gitignore` 됨).

## 이미 갈라진 「꿈의공간」 / 「꿈의공간(무료)」 병합 절차

1. **백업** 실행.
2. Table Editor에서 `companies` 행 두 개의 **`id`** 확인.
3. **유지할 한 줄**을 정합니다 (보통 이름이 맞는 `꿈의공간(무료)`).
4. `supabase/sql/merge_two_company_names_manual.sql` 주석을 참고해:
   - `customers.company_id` / `company_name` 정리
   - `schedules.company_name` 문자열 치환 (과거 스케줄에 옛 이름이 남은 경우)
   - `coupon_passes`는 PK가 `company_name` 이라 **행 합치기·삭제**를 신중히 (잔여 횟수 합산)
   - 마지막에 **중복 `companies` 행 삭제**

항상 **트랜잭션(`begin` … `commit`)** 안에서 검토 후 적용하세요.

## 앱(index.html) 변경

마이그레이션 적용 후:

- 업체 목록에 Supabase `companies.id`를 `dbId`로 보존.
- 고객 저장 시 가능하면 `customers.company_id`까지 함께 PATCH/POST.

컬럼이 아직 없으면 API가 실패할 수 있으므로, **SQL 마이그레이션을 먼저** 적용합니다.
