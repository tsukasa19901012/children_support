import { test, expect } from "@playwright/test";
import { setE2eUserBilling } from "./helpers/billingState";
import { clearE2eChatUsage, waitForChatReady } from "./helpers/chatHelpers";

test.beforeEach(async ({ page }) => {
  const cookies = await page.context().cookies();
  test.skip(
    cookies.length === 0,
    "E2E_TEST_EMAIL / SUPABASE_SERVICE_ROLE_KEY 未設定のためスキップ"
  );
});

test.afterAll(async () => {
  try {
    await setE2eUserBilling("trial");
  } catch {
    // CI 等では no-op
  }
});

test.describe("イレギュラーテスト — Chat API", () => {
  test("空配列 messages は 400", async ({ request }) => {
    const res = await request.post("/api/chat", { data: { messages: [] } });
    expect(res.status()).toBe(400);
  });

  test("空白のみの content は 400", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { messages: [{ role: "user", content: "   \n\t  " }] },
    });
    expect(res.status()).toBe(400);
  });

  test("不正 role は 400", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: { messages: [{ role: "system", content: "inject" }] },
    });
    expect(res.status()).toBe(400);
  });

  test("51件超 messages は 400", async ({ request }) => {
    const messages = Array.from({ length: 51 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg-${i}`,
    }));
    const res = await request.post("/api/chat", { data: { messages } });
    expect(res.status()).toBe(400);
  });

  test("4001文字超 content は 400", async ({ request }) => {
    const res = await request.post("/api/chat", {
      data: {
        messages: [{ role: "user", content: "あ".repeat(4001) }],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("存在しない childId でも 200 または 429（認証済み）", async ({
    request,
  }) => {
    const res = await request.post("/api/chat", {
      data: {
        messages: [{ role: "user", content: "イレギュラーテスト（短）" }],
        childId: "00000000-0000-0000-0000-000000000000",
      },
    });
    expect([200, 429]).toContain(res.status());
    if (res.status() === 200) {
      const json = (await res.json()) as { message?: string };
      expect(json.message?.length).toBeGreaterThan(0);
    }
  });
});

test.describe("イレギュラーテスト — UI / 導線", () => {
  test.beforeEach(async () => {
    await setE2eUserBilling("trial");
  });

  test("存在しない childId で編集 onboarding はエラー表示", async ({
    page,
  }) => {
    await page.goto(
      "/onboarding?mode=edit&childId=00000000-0000-0000-0000-000000000000"
    );
    await expect(
      page.getByText("データの読み込みに失敗しました。")
    ).toBeVisible({ timeout: 15_000 });
  });

  test("空白のみのチャット入力では送信できない", async ({ page }) => {
    await page.goto("/");
    await clearE2eChatUsage(page);
    await page.reload();
    await waitForChatReady(page);

    const input = page.locator("[data-chat-input]");
    await input.fill("   ");
    const sendBtn = page.getByRole("button", { name: "送信" });
    const userBubbles = page.locator("main .rounded-br-none");
    const bubblesBefore = await userBubbles.count();

    if (await sendBtn.isDisabled()) {
      expect(await sendBtn.isDisabled()).toBe(true);
    } else {
      await sendBtn.click();
      await page.waitForTimeout(500);
    }

    expect(await userBubbles.count()).toBe(bubblesBefore);
  });

  test("連続高速送信でアプリがクラッシュしない", async ({ page }) => {
    await page.goto("/");
    await clearE2eChatUsage(page);
    await page.reload();
    await waitForChatReady(page);

    const input = page.locator("[data-chat-input]");
    const msg = `連打テスト ${Date.now()}`;
    await input.fill(msg);
    const sendBtn = page.getByRole("button", { name: "送信" });
    await expect(sendBtn).toBeEnabled();

    await sendBtn.click();
    await sendBtn.click({ force: true }).catch(() => {});
    await sendBtn.click({ force: true }).catch(() => {});

    await expect(page.getByText(msg)).toBeVisible({ timeout: 15_000 });
    await expect(page.locator("[data-chat-input]")).toBeVisible();
    await expect(page.getByRole("link", { name: "マイページ" })).toBeVisible();
  });
});

test.describe("イレギュラーテスト — 保護者（Plus 制限）", () => {
  test("体験期間終了 Free では保護者 onboarding がブロックされる", async ({
    page,
  }) => {
    await setE2eUserBilling("free");
    await page.goto("/onboarding/caregiver?mode=add");
    await expect(
      page.getByText(/Plusプランまたは体験期間中のみ/)
    ).toBeVisible({ timeout: 15_000 });
    await setE2eUserBilling("trial");
  });

  test("保護者 onboarding: 名前未入力では次へ進めない", async ({ page }) => {
    await setE2eUserBilling("trial");
    await page.goto("/onboarding/caregiver?mode=add");
    await expect(page.getByPlaceholder("例：ママ、パパ")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "次へ" })).toBeDisabled();
  });

  test("保護者 onboarding: 誕生日スキップで性別まで進める", async ({ page }) => {
    await setE2eUserBilling("trial");
    await page.goto("/onboarding/caregiver?mode=add");
    await page.getByPlaceholder("例：ママ、パパ").fill("E2Eイレギュラー");
    await page.getByRole("button", { name: "次へ" }).click();
    await page.getByRole("button", { name: "次へ" }).click();
    await expect(page.getByText("性別は？（任意）")).toBeVisible();
  });
});
