# 업체 · 고객 계정 통합 (`company_directory`)

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
