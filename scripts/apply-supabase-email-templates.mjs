#!/usr/bin/env node
/**
 * Supabase Auth メールテンプレートを Management API 経由で反映する。
 *
 * 必要: SUPABASE_ACCESS_TOKEN（https://supabase.com/dashboard/account/tokens）
 * 任意: SUPABASE_PROJECT_REF（未設定時は NEXT_PUBLIC_SUPABASE_URL から抽出）
 *
 * Usage: node scripts/apply-supabase-email-templates.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const templatesDir = path.join(root, "supabase/email-templates");

dotenv.config({ path: path.join(root, ".env.local") });

const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const projectRef =
  process.env.SUPABASE_PROJECT_REF?.trim() ||
  supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

const SITE_URL = "https://www.tonarikko.com";
const REDIRECT_ALLOW = [
  "https://www.tonarikko.com/**",
  "https://tonarikko.com/**",
  "http://localhost:3000/**",
];

function read(file) {
  return fs.readFileSync(path.join(templatesDir, file), "utf-8");
}

function readSubjects() {
  return JSON.parse(
    fs.readFileSync(path.join(templatesDir, "subjects.json"), "utf-8")
  );
}

function mergeAllowList(current) {
  const existing = (current ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const merged = [...new Set([...existing, ...REDIRECT_ALLOW])];
  return merged.join(",");
}

async function api(method, body) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Management API ${method} failed (${res.status}): ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

async function main() {
  if (!accessToken) {
    console.error(
      "SUPABASE_ACCESS_TOKEN が未設定です。\n" +
        "1. https://supabase.com/dashboard/account/tokens でトークンを作成\n" +
        "2. .env.local に SUPABASE_ACCESS_TOKEN=... を追加\n" +
        "3. 再実行"
    );
    process.exit(1);
  }
  if (!projectRef) {
    console.error("SUPABASE_PROJECT_REF または NEXT_PUBLIC_SUPABASE_URL が必要です。");
    process.exit(1);
  }

  const subjects = readSubjects();
  const current = await api("GET");

  const payload = {
    site_url: SITE_URL,
    uri_allow_list: mergeAllowList(current.uri_allow_list),

    mailer_subjects_magic_link: subjects.magic_link,
    mailer_templates_magic_link_content: read("magic-link.html"),

    mailer_subjects_confirmation: subjects.confirmation,
    mailer_templates_confirmation_content: read("confirm-signup.html"),

    mailer_subjects_invite: subjects.invite,
    mailer_templates_invite_content: read("invite.html"),

    mailer_subjects_recovery: subjects.recovery,
    mailer_templates_recovery_content: read("recovery.html"),

    mailer_subjects_email_change: subjects.email_change,
    mailer_templates_email_change_content: read("email-change.html"),

    mailer_subjects_reauthentication: subjects.reauthentication,
    mailer_templates_reauthentication_content: read("reauthentication.html"),

    smtp_sender_name: "となりっこ",
  };

  console.log(`Applying email templates to project ${projectRef}...`);
  console.log(`  site_url: ${SITE_URL}`);

  await api("PATCH", payload);

  console.log("Done. Templates and URL config updated.");
  console.log("Verify: Dashboard → Authentication → Email Templates");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
