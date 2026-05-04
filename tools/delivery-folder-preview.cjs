#!/usr/bin/env node
/**
 * Drive 폴더가 “지금 다음 실행에서” 새로 만들어질 후보만 조회합니다. (폴더/Drive 접근 없음)
 *
 * 일회성 백필 미리보기와 같이 쓰려면:
 *   export DELIVERY_BACKFILL_SHOOT_FROM=2026-04-27
 *   export DELIVERY_BACKFILL_SHOOT_TO=2026-05-05
 *
 * 사용:
 *   export SUPABASE_URL="https://....supabase.co"
 *   export SUPABASE_SERVICE_ROLE_KEY="서비스롤키"
 *   node tools/delivery-folder-preview.cjs
 */
const { previewDeliveryDriveFolders } = require("../lib/delivery-drive-run.cjs");

(async () => {
  try {
    const r = await previewDeliveryDriveFolders();
    console.log("── 오늘 KST:", r.today_kst);
    console.log("── 활성 스케줄(필터 후):", r.active_schedule_count, "건");
    console.log("── 이번에 새로 만들어질 예정:", r.would_create_count, "건\n");

    if (r.would_create.length === 0) {
      console.log("(지금 실행해도 새 폴더가 생기지 않습니다. 조건 미충족이면 아래 목록에서 skip_reason 참고)");
    } else {
      r.would_create.forEach((row, idx) => {
        console.log(
          `${idx + 1}. ${row.company_display} | 촬영 ${row.shoot_date} | ${row.composition}\n   └ 하위폴더명: ${row.shoot_folder_name}`
        );
      });
    }

    const showAll = /^(1|true|yes)$/i.test(process.env.DELIVERY_PREVIEW_ALL || "");
    if (showAll && r.all.length) {
      console.log("\n── 전체 (DELIVERY_PREVIEW_ALL=1 로 표시):\n");
      console.log(JSON.stringify(r.all, null, 2));
    }
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }
})();
