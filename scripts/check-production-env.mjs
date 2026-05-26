#!/usr/bin/env node
/**
 * 本番の疎通とローカル .env.local の必須キー有無を確認する。
 * Usage: npm run check:production-env
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const DEFAULT_BASE = "https://www.tonarikko.com";

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || DEFAULT_BASE;
  if (raw === "https://tonarikko.com") return DEFAULT_BASE;
  return raw;
}

const BASE_URL = resolveBaseUrl();

const REQUIRED_KEYS = [
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID_PLUS",
  "STRIPE_WEBHOOK_SECRET",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_BASE_URL",
  "CRON_SECRET",
];

function loadEnvLocal() {
  const path = resolve(".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function checkLocalEnv() {
  const env = { ...loadEnvLocal(), ...process.env };
  console.log("--- Local / .env.local (keys only) ---");
  let missing = 0;
  for (const key of REQUIRED_KEYS) {
    const val = env[key]?.trim();
    const ok = !!val;
    if (!ok) missing++;
    console.log(`${ok ? "✓" : "✗"} ${key}`);
  }
  const localBase = env.NEXT_PUBLIC_BASE_URL?.trim();
  if (localBase && localBase !== DEFAULT_BASE) {
    console.warn(
      `⚠ NEXT_PUBLIC_BASE_URL=${localBase} (推奨: ${DEFAULT_BASE} — www なしだと週次手動実行が 401 になることがあります)`
    );
  }
  return missing;
}

async function checkRemote() {
  console.log(`\n--- Production (${BASE_URL}) ---`);
  let failed = 0;

  try {
    const home = await fetch(BASE_URL, { redirect: "follow" });
    console.log(`${home.ok ? "✓" : "✗"} GET / → ${home.status}`);
    if (!home.ok) failed++;
  } catch (e) {
    console.log(`✗ GET / → ${e.message}`);
    failed++;
  }

  try {
    const weekly = await fetch(`${BASE_URL}/api/report/weekly`, {
      method: "POST",
    });
    const ok401 = weekly.status === 401;
    console.log(
      `${ok401 ? "✓" : "✗"} POST /api/report/weekly (no auth) → ${weekly.status} (expect 401)`
    );
    if (!ok401) failed++;
  } catch (e) {
    console.log(`✗ POST /api/report/weekly → ${e.message}`);
    failed++;
  }

  return failed;
}

const localMissing = checkLocalEnv();
const remoteFailed = await checkRemote();

console.log("\n--- Summary ---");
if (localMissing > 0) {
  console.log(`Local: ${localMissing} required key(s) missing in .env.local`);
}
if (remoteFailed > 0) {
  console.log(`Remote: ${remoteFailed} check(s) failed`);
}
if (localMissing === 0 && remoteFailed === 0) {
  console.log("All automated checks passed.");
  console.log(
    "Vercel Production の環境変数は Dashboard で上記キーが揃っているか手動確認してください。"
  );
  process.exit(0);
}
process.exit(1);
