-- =============================================================================
-- 여러 표기(예: "꿈의공간", "꿈의공간(무료무)")를 하나의 정식 업체명으로 통일
--
-- 실행 전: python3 tools/supabase_backup_tables.py
-- Supabase SQL Editor 에서 한 번에 실행하거나, BEGIN/COMMIT 을 직접 조정하세요.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 설정: 여기만 수정 (정식명 + 합칠 옛 이름 목록)
-- canonical 은 최종 표시명. aliases 에는 정식명과 다른 문자열만 넣어도 되고,
-- 동일 업체로 취급할 모든 변형을 넣어도 됩니다.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  canonical text := '꿈의공간(무료무)';
  aliases text[] := ARRAY[
    '꿈의공간',
    '꿈의공간(무료)',
    '꿈의공간(무료무)'
  ];
  variant_lower text[];
  s int;
  p int;
  cu int;
  cp_del int;
  total int;
  dir_u int;
  keep_id uuid;
  drop_rec record;
BEGIN
  -- canonical 포함해 소문자 비교용 집합 (공백 무시는 trim)
  SELECT array_agg(DISTINCT lower(trim(x)))
  INTO variant_lower
  FROM unnest(aliases || ARRAY[canonical]) AS x;

  -- 1) schedules
  UPDATE public.schedules AS sch
  SET company_name = canonical
  WHERE lower(trim(sch.company_name)) = ANY (variant_lower)
    AND lower(trim(sch.company_name)) IS DISTINCT FROM lower(trim(canonical));
  GET DIAGNOSTICS s = ROW_COUNT;
  RAISE NOTICE 'schedules updated: %', s;

  -- 2) payments
  UPDATE public.payments AS pay
  SET company_name = canonical
  WHERE lower(trim(pay.company_name)) = ANY (variant_lower)
    AND lower(trim(pay.company_name)) IS DISTINCT FROM lower(trim(canonical));
  GET DIAGNOSTICS p = ROW_COUNT;
  RAISE NOTICE 'payments updated: %', p;

  -- 3) coupon_usage_history (이력만 문자열 통일)
  UPDATE public.coupon_usage_history AS h
  SET company_name = canonical
  WHERE lower(trim(h.company_name)) = ANY (variant_lower)
    AND lower(trim(h.company_name)) IS DISTINCT FROM lower(trim(canonical));
  GET DIAGNOSTICS cu = ROW_COUNT;
  RAISE NOTICE 'coupon_usage_history updated: %', cu;

  -- 4) coupon_passes: 잔여 횟수 합산 후 한 행만 남김 (PK 가 company_name 인 스키마 기준)
  IF to_regclass('public.coupon_passes') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coupon_passes' AND column_name = 'company_name'
    ) THEN
      SELECT COALESCE(SUM(cp.remaining_count), 0)::int
      INTO total
      FROM public.coupon_passes AS cp
      WHERE lower(trim(cp.company_name)) = ANY (variant_lower);

      DELETE FROM public.coupon_passes AS cp
      WHERE lower(trim(cp.company_name)) = ANY (variant_lower);
      GET DIAGNOSTICS cp_del = ROW_COUNT;

      IF total > 0 THEN
        INSERT INTO public.coupon_passes (company_name, remaining_count, updated_at)
        VALUES (canonical, GREATEST(total, 0), now())
        ON CONFLICT (company_name) DO UPDATE
        SET remaining_count = EXCLUDED.remaining_count,
            updated_at = now();
      END IF;
      RAISE NOTICE 'coupon_passes: deleted % rows, merged total into canonical (count=%)', cp_del, total;
    ELSE
      RAISE NOTICE 'coupon_passes has no company_name column — skipped (check company_id schema manually)';
    END IF;
  END IF;

  -- 5) customer_submission_receipts (있을 때만)
  IF to_regclass('public.customer_submission_receipts') IS NOT NULL THEN
    UPDATE public.customer_submission_receipts AS r
    SET company_name = canonical
    WHERE lower(trim(r.company_name)) = ANY (variant_lower)
      AND lower(trim(r.company_name)) IS DISTINCT FROM lower(trim(canonical));
    GET DIAGNOSTICS s = ROW_COUNT;
    RAISE NOTICE 'customer_submission_receipts updated: %', s;
  END IF;

  -- 6) company_directory: 이름 통일
  IF to_regclass('public.company_directory') IS NOT NULL THEN
    UPDATE public.company_directory AS d
    SET name = canonical
    WHERE lower(trim(d.name)) = ANY (variant_lower)
      AND lower(trim(d.name)) IS DISTINCT FROM lower(trim(canonical));
    GET DIAGNOSTICS dir_u = ROW_COUNT;
    RAISE NOTICE 'company_directory name updated: %', dir_u;

    -- 동일 canonical 이름의 중복 행: login_id 가 있는 행을 우선 남기고 나머지 삭제
    -- (login_id 는 unique 이므로 보통 한 행만 계정이 있음)
    SELECT d.id INTO keep_id
    FROM public.company_directory AS d
    WHERE lower(trim(d.name)) = lower(trim(canonical))
    ORDER BY
      CASE WHEN d.login_id IS NOT NULL AND trim(d.login_id) <> '' THEN 0 ELSE 1 END,
      d.created_at ASC NULLS LAST
    LIMIT 1;

    IF keep_id IS NOT NULL THEN
      FOR drop_rec IN
        SELECT d.id, d.login_id, d.password, d.site_type, d.customer_phone
        FROM public.company_directory AS d
        WHERE lower(trim(d.name)) = lower(trim(canonical))
          AND d.id <> keep_id
      LOOP
        -- 유지 행에 계정이 없고 삭제 예정 행에만 login 이 있으면 이전
        UPDATE public.company_directory AS k
        SET
          login_id = COALESCE(NULLIF(trim(k.login_id), ''), drop_rec.login_id),
          password = CASE WHEN NULLIF(trim(k.login_id), '') IS NULL THEN drop_rec.password ELSE k.password END,
          site_type = CASE WHEN NULLIF(trim(k.login_id), '') IS NULL THEN COALESCE(nullif(trim(drop_rec.site_type), ''), k.site_type) ELSE k.site_type END,
          customer_phone = CASE WHEN NULLIF(trim(k.login_id), '') IS NULL AND NULLIF(trim(drop_rec.customer_phone), '') IS NOT NULL
            THEN drop_rec.customer_phone ELSE k.customer_phone END
        WHERE k.id = keep_id
          AND NULLIF(trim(k.login_id), '') IS NULL
          AND NULLIF(trim(drop_rec.login_id), '') IS NOT NULL;

        DELETE FROM public.company_directory WHERE id = drop_rec.id;
        RAISE NOTICE 'company_directory removed duplicate id %', drop_rec.id;
      END LOOP;
    END IF;
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- 실행 후: 관리자 페이지에서 「서버 → 로컬 동기화」로 브라우저 캐시를 맞추세요.
-- =============================================================================
