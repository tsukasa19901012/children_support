#!/usr/bin/env node
/**
 * 本番の週次レポート API を手動実行する。
 * Usage: npm run cron:weekly-report
 * Requires: CRON_SECRET in .env.local or environment
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadCronSecret() {
  if (process.env.CRON_SECRET?.trim()) return process.env.CRON_SECRET.trim();
  const path = resolve(".env.local");
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const t = line.trim();
    if (t.startsWith("CRON_SECRET=")) {
      return t.slice("CRON_SECRET=".length).trim();
    }
  }
  return null;
}

const DEFAULT_BASE = "https://www.tonarikko.com";

function resolveBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_BASE_URL?.trim() || DEFAULT_BASE;
  if (raw === "https://tonarikko.com") return DEFAULT_BASE;
  return raw;
}

const BASE_URL = resolveBaseUrl();
const secret = loadCronSecret();

if (!secret) {
  console.error("CRON_SECRET が未設定です。.env.local に追加してください。");
  process.exit(1);
}

console.log(`POST ${BASE_URL}/api/report/weekly`);

const res = await fetch(`${BASE_URL}/api/report/weekly`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const text = await res.text();
console.log(`Status: ${res.status}`);
if (text) console.log(text.slice(0, 2000));

if (!res.ok) {
  if (res.status === 401) {
    console.error(
      "\n401: CRON_SECRET が Vercel Production の値と一致しているか確認してください。"
    );
  } else {
    console.error("\n週次レポートの手動実行に失敗しました。");
  }
  process.exit(1);
}

console.log("\n週次レポートの手動実行が完了しました。");
