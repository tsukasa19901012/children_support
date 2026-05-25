import { expect, type Page } from "@playwright/test";

const USAGE_KEY = "parenting_ai_usage";

/** ローカルストレージの日次利用カウントをリセット */
export async function clearE2eChatUsage(page: Page): Promise<void> {
  await page.evaluate((key) => localStorage.removeItem(key), USAGE_KEY);
}

/** チャット画面が操作可能になるまで待つ */
export async function waitForChatReady(page: Page): Promise<void> {
  const input = page.locator("[data-chat-input]");
  await expect(input).toBeVisible({ timeout: 20_000 });
  await expect(
    page.getByText("会話履歴を読み込んでいます...")
  ).toBeHidden({ timeout: 20_000 });
  await expect(page.getByRole("link", { name: "マイページ" })).toBeVisible({
    timeout: 20_000,
  });
}
