import { test, expect } from "@playwright/test";
import { setE2eUserBilling } from "./helpers/billingState";

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

  test("相談に切り替えでチャット画面へ遷移する", async ({ page }) => {
    await page.goto("/account");

    const switchBtn = page
      .getByRole("button", { name: /相談に切り替え|この子で相談/ })
      .first();
    const canSwitch = await switchBtn.isVisible().catch(() => false);
    if (!canSwitch) {
      test.skip(true, "お子さんが1人のため切り替えボタンなし");
    }

    const card = switchBtn.locator("xpath=ancestor::div[contains(@class,'rounded-2xl')]");
    const switchedName = await card.locator("p.font-semibold").first().textContent();

    await switchBtn.click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("[data-chat-input]")).toBeVisible();

    await page.goto("/account");
    const activeCard = page
      .locator("div.rounded-2xl.border")
      .filter({ hasText: switchedName ?? "" });
    await expect(activeCard.getByText("✓ 相談中")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("課金 UI（Free / トライアル / Plus）", () => {
  test.afterAll(async () => {
    try {
      await setE2eUserBilling("trial");
    } catch {
      // 認証未設定の CI 等では no-op
    }
  });

  test("トライアル中は Plus 登録ボタンが表示され、お支払い管理は出ない", async ({
    page,
  }) => {
    await setE2eUserBilling("trial");
    await page.goto("/account");

    await expect(page.getByText(/体験期間中（あと\d+日）/)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Plus.*\/月/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "お支払い管理を開く" })
    ).toBeHidden();
  });

  test("トライアル終了後の Free でも Plus 登録ボタンが表示される", async ({
    page,
  }) => {
    await setE2eUserBilling("free");
    await page.goto("/account");

    await expect(page.getByText("無料プランをご利用中です")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Plus.*\/月/ })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "お支払い管理を開く" })
    ).toBeHidden();
  });

  test("Plus 契約中はお支払い管理が表示され、Checkout ボタンは出ない", async ({
    page,
  }) => {
    await setE2eUserBilling("plus");
    await page.goto("/account");

    await expect(page.getByText("Plusプランをご利用中です")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "お支払い管理を開く" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Plus.*\/月/ })
    ).toBeHidden();
  });

  test("トライアル中は Checkout API が成功し billing-portal は拒否される", async ({
    page,
  }) => {
    await setE2eUserBilling("trial");
    await page.goto("/account");

    const checkout = await page.request.post("/api/checkout", {
      data: { planId: "plus" },
    });
    expect(checkout.ok()).toBeTruthy();
    const checkoutBody = (await checkout.json()) as { url?: string };
    expect(checkoutBody.url).toMatch(/checkout\.stripe\.com/);

    const portal = await page.request.post("/api/billing-portal");
    expect(portal.status()).toBe(400);
    const portalBody = (await portal.json()) as { error?: string };
    expect(portalBody.error).toMatch(/有料プラン/);
  });
});

test.describe("Stripe Checkout（サンドボックス）", () => {
  test.afterAll(async () => {
    try {
      await setE2eUserBilling("trial");
    } catch {
      // no-op
    }
  });

  test("Checkout が Stripe に遷移する", async ({ page }) => {
    await setE2eUserBilling("trial");
    await page.goto("/account");

    const upgradeBtn = page.getByRole("button", {
      name: /Plus.*\/月/,
    });
    await expect(upgradeBtn).toBeVisible();
    await upgradeBtn.click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });
});
