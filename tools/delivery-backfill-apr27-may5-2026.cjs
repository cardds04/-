#!/usr/bin/env node
/**
 * 일회성 백필: 촬영일 2026-04-27 ~ 2026-05-05 구간은
 * 「촬영 다음날 KST」 조건 없이 활성 스케줄만 Drive 폴더 생성.
 *
 * (직접 다른 구간을 넣으려면 두 env 를 덮어쓰기)
 *
 *   export SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   export GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON='...'
 *   export GOOGLE_DRIVE_PARENT_FOLDER_ID=...
 *   export DELIVERY_SKIP_SMS=1
 *   node tools/delivery-backfill-apr27-may5-2026.cjs
 */
process.env.DELIVERY_BACKFILL_SHOOT_FROM = process.env.DELIVERY_BACKFILL_SHOOT_FROM || "2026-04-27";
process.env.DELIVERY_BACKFILL_SHOOT_TO = process.env.DELIVERY_BACKFILL_SHOOT_TO || "2026-05-05";

console.error(`[delivery-backfill] 촬영일 ${process.env.DELIVERY_BACKFILL_SHOOT_FROM} ~ ${process.env.DELIVERY_BACKFILL_SHOOT_TO}`);
require("./run-delivery-drive-once.cjs");
