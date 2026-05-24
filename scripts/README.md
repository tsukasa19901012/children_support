# scripts/

運用・反映用スクリプト。いずれも `.env.local` を参照します。

| コマンド | ファイル | 用途 |
|----------|----------|------|
| `npm run supabase:apply-email-templates` | `apply-supabase-email-templates.mjs` | Supabase Auth メールテンプレート・Site URL を Management API で反映 |
| `npm run stripe:apply-branding` | `apply-stripe-branding.mjs` | Stripe Checkout / 請求書用ロゴ・ブランド色を `public/logo.png` から反映 |
| `npm run check:deploy` | `check-deploy-status.mjs` | 直近コミットの Vercel デプロイ成功/失敗を表示（要 `gh` ログイン） |

**ロゴ変更時の推奨順序**

1. Vercel にデプロイ（`public/logo.png` が本番で配信されること）
2. `npm run supabase:apply-email-templates`（認証メールのロゴ表示）
3. `npm run stripe:apply-branding` → 表示された `STRIPE_BRAND_LOGO_FILE_ID` を Vercel 環境変数に追加
4. Stripe Dashboard → Settings → Branding に `public/logo.png` を手動アップロード（請求書・メール用）

詳細は [supabase/email-templates/README.md](../supabase/email-templates/README.md) とルート [README.md](../README.md) を参照。
