import { chromium } from "playwright";

const BASE_URL = "https://sc-pink.vercel.app/";
const uniqueName = `테스트업체_${Date.now()}`;

const networkLogs = [];
let badgeSnapshots = [];

function pickErrorBody(body) {
  if (!body) return "";
  const trimmed = body.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return JSON.stringify(parsed);
    if (parsed.error) return typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error);
    if (parsed.message) return String(parsed.message);
    return JSON.stringify(parsed);
  } catch {
    return trimmed.slice(0, 500);
  }
}

async function collectBadgeText(page, label) {
  const texts = await page
    .locator("text=/서버\\s*반영/i")
    .allTextContents()
    .catch(() => []);
  badgeSnapshots.push({
    label,
    texts: texts.map((t) => t.trim()).filter(Boolean),
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

page.on("response", async (response) => {
  const url = response.url();
  if (!url.includes("/rest/v1/app_state")) return;
  const req = response.request();
  const method = req.method();
  if (method !== "GET" && method !== "POST") return;
  const status = response.status();
  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }
  networkLogs.push({
    method,
    status,
    url,
    errorBody: status >= 400 ? pickErrorBody(body) : "",
    bodyPreview: body.slice(0, 500),
  });
});

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });

  // (1) 업체등록 열기
  const openCandidates = [
    page.getByRole("button", { name: /업체\s*등록/ }),
    page.getByText(/업체\s*등록/),
    page.getByRole("tab", { name: /업체\s*등록/ }),
  ];
  let opened = false;
  for (const c of openCandidates) {
    if (await c.first().isVisible().catch(() => false)) {
      await c.first().click({ timeout: 5000 });
      opened = true;
      break;
    }
  }
  if (!opened) throw new Error("업체등록 열기 요소를 찾지 못했습니다.");

  // (2) 고유한 업체명 입력 후 등록
  const nameInputCandidates = [
    page.getByPlaceholder(/업체명|업체 이름|회사명/),
    page.locator("input[name*=company i], input[id*=company i], input[name*=vendor i], input[id*=vendor i]"),
    page.locator("input[type='text']").first(),
  ];
  let inputFilled = false;
  for (const input of nameInputCandidates) {
    if (await input.first().isVisible().catch(() => false)) {
      await input.first().fill(uniqueName);
      inputFilled = true;
      break;
    }
  }
  if (!inputFilled) throw new Error("업체명 입력 필드를 찾지 못했습니다.");

  await collectBadgeText(page, "등록 전");

  const saveCandidates = [
    page.getByRole("button", { name: /등록|저장|추가/ }),
    page.getByText(/등록|저장|추가/).locator(".."),
  ];
  let saved = false;
  for (const btn of saveCandidates) {
    if (await btn.first().isVisible().catch(() => false)) {
      await btn.first().click({ timeout: 5000 });
      saved = true;
      break;
    }
  }
  if (!saved) throw new Error("등록/저장 버튼을 찾지 못했습니다.");

  // 네트워크 요청이 발생할 시간을 잠깐 대기
  await page.waitForTimeout(1000);
  await collectBadgeText(page, "등록 직후");

  // (3) 즉시 목록 반영 확인
  const immediateVisible = await page.getByText(uniqueName, { exact: false }).first().isVisible().catch(() => false);

  // (4) 3초 대기 후 새로고침
  await page.waitForTimeout(3000);
  await page.reload({ waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  await collectBadgeText(page, "새로고침 후");

  // (5) 유지 여부 확인
  const persistedVisible = await page.getByText(uniqueName, { exact: false }).first().isVisible().catch(() => false);

  console.log(
    JSON.stringify(
      {
        uniqueName,
        immediateVisible,
        persistedVisible,
        badgeSnapshots,
        networkLogs,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
}
