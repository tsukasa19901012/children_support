#!/usr/bin/env node
/**
 * Supabase Dashboard でメールテンプレートを反映（Management API トークン不要）。
 * 初回のみブラウザで Supabase にログインが必要です（セッションは .playwright-supabase-profile に保存）。
 *
 * Usage: node scripts/apply-supabase-email-templates-dashboard.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "@playwright/test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const templatesDir = path.join(root, "supabase/email-templates");
const profileDir = path.join(root, ".playwright-supabase-profile");

const PROJECT_REF = "lyqkheynqotduakofdmc";
const SITE_URL = "https://www.tonarikko.com";

const TEMPLATES = [
  { slug: "magic-link", label: /magic link|マジック/i, file: "magic-link.html", subjectKey: "magic_link" },
  { slug: "confirm-signup", label: /confirm signup|サインアップ|signup/i, file: "confirm-signup.html", subjectKey: "confirmation" },
  { slug: "invite", label: /invite user|招待/i, file: "invite.html", subjectKey: "invite" },
  { slug: "recovery", label: /reset password|パスワード/i, file: "recovery.html", subjectKey: "recovery" },
  { slug: "email-change", label: /change email|メール.*変更/i, file: "email-change.html", subjectKey: "email_change" },
  { slug: "reauthentication", label: /reauthentication|再認証/i, file: "reauthentication.html", subjectKey: "reauthentication" },
];

function read(file) {
  return fs.readFileSync(path.join(templatesDir, file), "utf-8");
}

function readSubjects() {
  return JSON.parse(
    fs.readFileSync(path.join(templatesDir, "subjects.json"), "utf-8")
  );
}

async function waitForDashboard(page, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = page.url();
    if (url.includes(`/project/${PROJECT_REF}/`) && !url.includes("sign-in")) {
      return;
    }
    await page.waitForTimeout(1500);
  }
  throw new Error("Supabase へのログインがタイムアウトしました。");
}

async function openTemplateTab(page, label) {
  const tab = page.getByRole("tab", { name: label }).or(
    page.getByRole("button", { name: label })
  ).or(
    page.locator("a, button").filter({ hasText: label })
  );
  await tab.first().click({ timeout: 15_000 });
  await page.waitForTimeout(800);
}

async function fillTemplateEditor(page, subject, html) {
  const subjectInput = page
    .locator('input[name="subject"], input[placeholder*="Subject"], input[placeholder*="件名"]')
    .or(page.getByLabel(/subject|件名/i))
    .first();

  if (await subjectInput.isVisible().catch(() => false)) {
    await subjectInput.fill(subject);
  }

  const codeMirror = page.locator(".cm-content").first();
  const textarea = page
    .locator('textarea[name="content"], textarea[placeholder*="HTML"], textarea')
    .first();

  if (await codeMirror.isVisible().catch(() => false)) {
    await codeMirror.click();
    await page.keyboard.press("Meta+A");
    await page.keyboard.insertText(html);
  } else if (await textarea.isVisible().catch(() => false)) {
    await textarea.fill(html);
  } else {
    throw new Error("HTML エディタが見つかりません");
  }

  const saveBtn = page
    .getByRole("button", { name: /save|保存|update|更新/i })
    .first();
  await saveBtn.click({ timeout: 10_000 });
  await page.waitForTimeout(1200);
}

async function configureUrls(page) {
  await page.goto(
    `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/url-configuration`,
    { waitUntil: "domcontentloaded" }
  );
  await page.waitForTimeout(1500);

  const siteUrl = page
    .locator('input[name="site_url"], input[placeholder*="Site URL"]')
    .or(page.getByLabel(/site url/i))
    .first();
  if (await siteUrl.isVisible().catch(() => false)) {
    await siteUrl.fill(SITE_URL);
  }

  const redirectInput = page
    .locator('textarea[name="uri_allow_list"], textarea')
    .filter({ hasNot: page.locator("[aria-hidden=true]") })
    .first();

  const allowList = [
    "https://www.tonarikko.com/**",
    "https://tonarikko.com/**",
    "http://localhost:3000/**",
  ].join("\n");

  if (await redirectInput.isVisible().catch(() => false)) {
    const current = await redirectInput.inputValue().catch(() => "");
    const merged = [...new Set([...current.split("\n").map((s) => s.trim()).filter(Boolean), ...allowList.split("\n")])];
    await redirectInput.fill(merged.join("\n"));
  }

  const saveBtn = page.getByRole("button", { name: /save|保存/i }).first();
  if (await saveBtn.isVisible().catch(() => false)) {
    await saveBtn.click();
    await page.waitForTimeout(1000);
  }
  console.log("  URL configuration updated");
}

async function main() {
  const subjects = readSubjects();

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: "chrome",
    viewport: { width: 1400, height: 900 },
  });

  const page = context.pages()[0] ?? (await context.newPage());

  console.log("Opening Supabase Dashboard...");
  await page.goto(
    `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/templates`,
    { waitUntil: "domcontentloaded" }
  );

  if (page.url().includes("sign-in")) {
    console.log("Supabase にログインしてください（最大3分待機）...");
    await waitForDashboard(page);
    await page.goto(
      `https://supabase.com/dashboard/project/${PROJECT_REF}/auth/templates`,
      { waitUntil: "domcontentloaded" }
    );
  }

  await page.waitForTimeout(2000);
  console.log("Applying email templates...");

  for (const tpl of TEMPLATES) {
    console.log(`  → ${tpl.slug}`);
    await openTemplateTab(page, tpl.label);
    await fillTemplateEditor(
      page,
      subjects[tpl.subjectKey],
      read(tpl.file)
    );
  }

  console.log("Updating URL configuration...");
  await configureUrls(page);

  console.log("Done.");
  await context.close();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
