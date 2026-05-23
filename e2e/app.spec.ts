import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  const cookies = await page.context().cookies();
  test.skip(
    cookies.length === 0,
    "E2E_TEST_EMAIL / SUPABASE_SERVICE_ROLE_KEY 未設定のためスキップ"
  );
});

test.describe("認証済みフロー", () => {
  test("チャット画面が開く", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole("link", { name: "マイページ" })).toBeVisible();
    await expect(page.locator("[data-chat-input]")).toBeVisible();
  });

  test("メッセージ送信と AI 応答", async ({ page }) => {
    await page.goto("/");
    const input = page.locator("[data-chat-input]");
    const testMsg = `E2E自動テスト ${Date.now()}`;
    await input.fill(testMsg);
    await page.getByRole("button", { name: "送信" }).click();

    await expect(page.getByText(testMsg)).toBeVisible();
    await expect(page.locator(".animate-bounce").first()).toBeHidden({
      timeout: 45_000,
    });

    const aiBubbles = page.locator("main .rounded-2xl").filter({
      hasNotText: testMsg,
    });
    await expect(aiBubbles.last()).not.toBeEmpty();
  });

  test("マイページ", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByText("現在のプラン")).toBeVisible();
    await expect(page.getByText("本日の利用状況")).toBeVisible();
    await expect(page.getByText("お子さんと、まわりの関係")).toBeVisible();
  });
});

test.describe("Stripe Checkout（サンドボックス）", () => {
  test("Checkout が Stripe に遷移する", async ({ page }) => {
    await page.goto("/account");

    const upgradeBtn = page.getByRole("button", {
      name: /Plus|アップグレード|\/月/,
    });
    const hasUpgrade = await upgradeBtn.first().isVisible().catch(() => false);

    if (!hasUpgrade) {
      test.info().annotations.push({
        type: "note",
        description: "Plus 契約中のため Checkout スキップ",
      });
      return;
    }

    await upgradeBtn.first().click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });
});
