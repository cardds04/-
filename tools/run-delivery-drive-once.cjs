#!/usr/bin/env node
/**
 * 납품 잡 한 번 즉시 실행 (로컬 / CI). 문자를 막으려면 DELIVERY_SKIP_SMS=1
 *
 *   export SUPABASE_URL=...
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   export GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
 *   export GOOGLE_DRIVE_PARENT_FOLDER_ID=...
 *   export DELIVERY_DRIVE_ALLOW_NEW_FOLDERS=1   # 새 폴더 생성 허용(미설정이면 생성 단계 오류 가능)
 *   node tools/run-delivery-drive-once.cjs
 */
const { runDeliveryDriveJob } = require("../lib/delivery-drive-run.cjs");

(async () => {
  const stats = await runDeliveryDriveJob((msg) => console.error(msg));
  console.log(JSON.stringify(stats, null, 2));
  if (stats.errors.length) process.exit(1);
})();
