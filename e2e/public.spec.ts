import { test, expect } from "@playwright/test";

test.describe("公開ページ", () => {
  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "となりっこ" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "確認コードを送る" })
    ).toBeVisible();
  });

  test("未認証で / は /login にリダイレクト", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("キャンセルページ（未認証は login へ）", async ({ page }) => {
    await page.goto("/cancel");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("API（認証なし）", () => {
  test("chat API は未認証で 401", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { messages: [{ role: "user", content: "test" }] },
    });
    expect(res.status()).toBe(401);
  });

  test("weekly report API は CRON_SECRET なしで 401", async ({ request }) => {
    const res = await request.post("/api/report/weekly");
    expect(res.status()).toBe(401);
  });
});
