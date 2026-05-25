import { test, expect } from "@playwright/test";

/** 破壊的操作・課金は除外 */
const SKIP_BUTTON =
  /削除|Plusをはじめる|お支払い管理|確認コード|ログアウト|登録を完了|保存する/;

const RANDOM_INPUTS = [
  "",
  "a",
  "テスト",
  "😀🎉",
  "<script>alert(1)</script>",
  "' OR 1=1 --",
  "x".repeat(800),
  "　\n\t",
  "疲れた。。。助けて",
];

const PATHS = ["/", "/account"] as const;

test("モンキーテスト: ランダム操作でクラッシュしない", async ({ page }) => {
  test.setTimeout(120_000);

  const cookies = await page.context().cookies();
  test.skip(
    cookies.length === 0,
    "E2E_TEST_EMAIL / SUPABASE_SERVICE_ROLE_KEY 未設定のためスキップ"
  );

  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];

  page.on("pageerror", (err) => pageErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  for (let i = 0; i < 35; i++) {
    const path = PATHS[Math.floor(Math.random() * PATHS.length)];
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(200 + Math.floor(Math.random() * 300));

    const buttons = page.getByRole("button");
    const btnCount = await buttons.count();
    if (btnCount > 0) {
      const attempts = Math.min(3, btnCount);
      for (let b = 0; b < attempts; b++) {
        const idx = Math.floor(Math.random() * btnCount);
        const btn = buttons.nth(idx);
        const label = (await btn.textContent()) ?? "";
        if (SKIP_BUTTON.test(label)) continue;
        if (!(await btn.isVisible().catch(() => false))) continue;
        await btn.click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(150);
      }
    }

    const chatInput = page.locator("[data-chat-input]");
    if (await chatInput.isVisible().catch(() => false)) {
      const text =
        RANDOM_INPUTS[Math.floor(Math.random() * RANDOM_INPUTS.length)];
      await chatInput.fill(text).catch(() => {});

      if (text.trim() && Math.random() < 0.25) {
        const send = page.getByRole("button", { name: "送信" });
        if (await send.isEnabled().catch(() => false)) {
          await send.click({ timeout: 3000 }).catch(() => {});
          await page.waitForTimeout(800);
        }
      }
    }

    if (Math.random() < 0.2) {
      await page.goBack({ timeout: 3000 }).catch(() => {});
    }
  }

  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("[data-chat-input]")).toBeVisible({
    timeout: 25_000,
  });

  const benign = (s: string) =>
    s.includes("Failed to load resource") ||
    s.includes("favicon") ||
    s.includes("ResizeObserver");

  const criticalPage = pageErrors.filter((e) => !benign(e));
  const criticalConsole = consoleErrors.filter((e) => !benign(e));

  expect(
    criticalPage,
    `pageerror: ${criticalPage.join(" | ")}`
  ).toEqual([]);
  expect(
    criticalConsole,
    `console.error: ${criticalConsole.join(" | ")}`
  ).toEqual([]);
});
