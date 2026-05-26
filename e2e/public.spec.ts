import { test, expect } from "@playwright/test";

test.describe("公開ページ", () => {
  test("ログインページが表示される", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "となりっこ" })).toBeVisible();
    await expect(page.locator('img[src="/logo.png"]').first()).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "確認コードを送る" })
    ).toBeVisible();
  });

  test("ロゴと PWA manifest が配信される", async ({ request }) => {
    expect((await request.get("/logo.png")).status()).toBe(200);
    expect((await request.get("/site.webmanifest")).status()).toBe(200);
  });

  test("sitemap.xml と robots.txt が配信される", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    const body = await sitemap.text();
    expect(body).toContain("/lp");
    expect(body).toContain("/terms");

    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    const robotsText = await robots.text();
    expect(robotsText).toContain("Sitemap:");
    expect(robotsText).toContain("/legal");
  });

  test("未認証で / は /login にリダイレクト", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("法務・LP ページが未認証で表示される", async ({ page }) => {
    for (const path of ["/lp", "/terms", "/privacy", "/contact", "/legal"]) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    }
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
    const getRes = await request.get("/api/report/weekly");
    expect(getRes.status()).toBe(401);
    const postRes = await request.post("/api/report/weekly");
    expect(postRes.status()).toBe(401);
  });

  test("checkout API は未認証で拒否される", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      data: { planId: "plus" },
    });
    expect([401, 403]).toContain(res.status());
  });
});
