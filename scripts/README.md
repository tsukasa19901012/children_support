# scripts/

運用・反映用スクリプト。いずれも `.env.local` を参照します。

| コマンド | ファイル | 用途 |
|----------|----------|------|
| `npm run supabase:apply-email-templates` | `apply-supabase-email-templates.mjs` | Supabase Auth メールテンプレート・Site URL を Management API で反映 |
| `npm run check:deploy` | `check-deploy-status.mjs` | 直近コミットの Vercel デプロイ成功/失敗を表示（要 `gh` ログイン） |

詳細は [supabase/email-templates/README.md](../supabase/email-templates/README.md) とルート [README.md](../README.md) を参照。
