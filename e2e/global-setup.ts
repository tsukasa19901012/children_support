import { chromium, type FullConfig } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config({ path: path.resolve(".env.local") });
dotenv.config({ path: path.resolve(".env.e2e.local") });

const AUTH_DIR = path.resolve("e2e/.auth");
const AUTH_FILE = path.join(AUTH_DIR, "user.json");

type GenerateLinkResponse = {
  email_otp?: string;
};

async function fetchEmailOtp(
  supabaseUrl: string,
  serviceKey: string,
  email: string
): Promise<string> {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      type: "magiclink",
      email,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`generate_link failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as GenerateLinkResponse;
  const otp = json.email_otp;
  if (!otp) throw new Error("email_otp がレスポンスにありません");
  return otp;
}

async function verifySessionInBrowser(
  page: import("@playwright/test").Page,
  email: string,
  token: string,
  supabaseUrl: string,
  anonKey: string
): Promise<void> {
  const result = await page.evaluate(
    async ({
      email,
      token,
      supabaseUrl,
      anonKey,
    }: {
      email: string;
      token: string;
      supabaseUrl: string;
      anonKey: string;
    }) => {
      const res = await fetch(`${supabaseUrl}/auth/v1/verify`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token, type: "email" }),
      });

      if (!res.ok) {
        return { error: await res.text() };
      }

      const session = (await res.json()) as {
        access_token: string;
        refresh_token: string;
      };

      const { createBrowserClient } = await import(
        "https://esm.sh/@supabase/ssr@0.6.1"
      );
      const client = createBrowserClient(supabaseUrl, anonKey);
      const { error } = await client.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      return { error: error?.message ?? null };
    },
    { email, token, supabaseUrl, anonKey }
  );

  if (result.error) {
    throw new Error(`OTP 検証に失敗: ${result.error}`);
  }
}

async function loginWithAdminOtp(
  page: import("@playwright/test").Page,
  baseURL: string,
  email: string,
  supabaseUrl: string,
  serviceKey: string,
  anonKey: string
): Promise<void> {
  const otp = await fetchEmailOtp(supabaseUrl, serviceKey, email);

  await page.goto(`${baseURL.replace(/\/$/, "")}/login`, {
    waitUntil: "domcontentloaded",
  });

  await verifySessionInBrowser(page, email, otp, supabaseUrl, anonKey);
  await page.goto(`${baseURL.replace(/\/$/, "")}/`);

  await page.waitForURL(
    (url) =>
      !url.pathname.includes("/login") && !url.pathname.includes("/auth"),
    { timeout: 45_000 }
  );
}

async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    process.env.E2E_BASE_URL?.trim() ||
    config.projects[0]?.use?.baseURL?.toString() ||
    "https://www.tonarikko.com";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email =
    process.env.E2E_TEST_EMAIL?.trim() || "e2e-auto@tonarikko.com";

  if (!supabaseUrl || !serviceKey || !anonKey) {
    console.warn(
      "[e2e setup] SKIP: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY が必要です"
    );
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({ cookies: [], origins: [] }),
      "utf-8"
    );
    return;
  }

  fs.mkdirSync(AUTH_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await loginWithAdminOtp(
    page,
    baseURL,
    email,
    supabaseUrl,
    serviceKey,
    anonKey
  );

  await ensureReadyForChat(page, baseURL);

  await context.storageState({ path: AUTH_FILE });
  await browser.close();

  console.log(`[e2e setup] 認証状態を保存: ${AUTH_FILE} (${email})`);
}

async function ensureReadyForChat(
  page: import("@playwright/test").Page,
  baseURL: string
): Promise<void> {
  await page.goto(`${baseURL.replace(/\/$/, "")}/`);

  const chatInput = page.locator("[data-chat-input]");
  const onboardingName = page.getByPlaceholder("例：たろう");

  await Promise.race([
    chatInput.waitFor({ state: "visible", timeout: 45_000 }),
    onboardingName.waitFor({ state: "visible", timeout: 45_000 }),
  ]).catch(() => {});

  if (await onboardingName.isVisible()) {
    await completeOnboarding(page);
  }

  await chatInput.waitFor({ state: "visible", timeout: 45_000 });
}

async function completeOnboarding(page: import("@playwright/test").Page): Promise<void> {
  const childName = process.env.E2E_CHILD_NAME?.trim() || "E2Eテスト";

  await page.getByPlaceholder("例：たろう").fill(childName);
  await page.getByRole("button", { name: "次へ" }).click();

  await page.getByRole("button", { name: "次へ" }).click();

  await page.getByRole("button", { name: "男の子" }).click();

  await page.waitForURL((url) => !url.pathname.includes("/onboarding"), {
    timeout: 45_000,
  });
}

export default globalSetup;
