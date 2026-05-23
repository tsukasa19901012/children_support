#!/usr/bin/env node
/**
 * 直近コミットの Vercel デプロイ状態を確認する。
 * Usage: npm run check:deploy
 */
import { execSync } from "child_process";

const repo = execSync("gh repo view --json nameWithOwner -q .nameWithOwner", {
  encoding: "utf-8",
}).trim();

const sha = process.argv[2]?.trim() || "HEAD";
const resolvedSha = execSync(`git rev-parse ${sha}`, { encoding: "utf-8" }).trim();

const json = JSON.parse(
  execSync(`gh api repos/${repo}/commits/${resolvedSha}/status`, {
    encoding: "utf-8",
  })
);

const vercel = json.statuses?.find((s) => s.context === "Vercel");

console.log(`Commit: ${resolvedSha.slice(0, 7)}`);
console.log(`Overall: ${json.state}`);

if (!vercel) {
  console.log("Vercel: pending (status not posted yet)");
  process.exit(0);
}

console.log(`Vercel: ${vercel.state}`);
console.log(`Detail: ${vercel.description ?? "(none)"}`);
if (vercel.target_url) console.log(`URL: ${vercel.target_url}`);

if (vercel.state === "failure" || vercel.state === "error") {
  console.error("\nDeploy failed. Run locally: npm run build");
  process.exit(1);
}

process.exit(vercel.state === "success" ? 0 : 0);
