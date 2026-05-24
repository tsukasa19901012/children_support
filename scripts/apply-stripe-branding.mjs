#!/usr/bin/env node
/**
 * Stripe にロゴをアップロードし、Checkout 用 file ID を表示する。
 *
 * 標準アカウントは Dashboard → Settings → Branding への手動アップロードも必要です。
 *
 * 必要: STRIPE_SECRET_KEY（.env.local）
 * Usage: npm run stripe:apply-branding
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const logoPath = path.join(root, "public/logo.png");

dotenv.config({ path: path.join(root, ".env.local") });

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

async function main() {
  if (!secretKey) {
    console.error("STRIPE_SECRET_KEY が未設定です（.env.local）。");
    process.exit(1);
  }
  if (!fs.existsSync(logoPath)) {
    console.error(`ロゴが見つかりません: ${logoPath}`);
    process.exit(1);
  }

  const stripe = new Stripe(secretKey);
  const buffer = fs.readFileSync(logoPath);

  console.log("Uploading logo to Stripe Files API...");
  const file = await stripe.files.create({
    purpose: "business_logo",
    file: {
      data: buffer,
      name: "tonarikko-logo.png",
      type: "image/png",
    },
  });

  console.log("\nDone.");
  console.log(`  file id: ${file.id}`);
  console.log("\nCheckout でロゴを使うには .env.local に追加:");
  console.log(`  STRIPE_BRAND_LOGO_FILE_ID=${file.id}`);
  console.log("\n請求書・メール等の全体ブランディングは");
  console.log("  Dashboard → Settings → Branding");
  console.log("  に public/logo.png を手動アップロードしてください（標準アカウントは API 不可）。");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
