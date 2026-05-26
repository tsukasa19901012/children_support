# 運用メモ（となりっこ）

本番: [https://www.tonarikko.com](https://www.tonarikko.com)

## 本番環境変数（Vercel Production）

`.env.example` と同じキーを **Production** に設定し、変更後は再デプロイする。

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 認証（公開） |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー DB 書き込み |
| `OPENAI_API_KEY` | チャット・週次レポート |
| `STRIPE_SECRET_KEY` | 課金（**Live**） |
| `STRIPE_PRICE_ID_PLUS` | Plus 月額 Price（**Live**） |
| `STRIPE_WEBHOOK_SECRET` | 本番 Webhook の `whsec_` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_` |
| `NEXT_PUBLIC_BASE_URL` | `https://www.tonarikko.com`（**www 必須**） |
| `CRON_SECRET` | 週次レポート Cron（Vercel と同じ値） |
| `STRIPE_BRAND_LOGO_FILE_ID` | Checkout ロゴ（任意） |

確認コマンド: `npm run check:production-env`

---

## 週次レポート（月曜 8:00 JST）

- Cron: `vercel.json` → `POST /api/report/weekly`（日曜 23:00 UTC）
- 対象: Plus 契約中 **または** 14日体験期間中のユーザー
- **登録済みのお子さんごと**に 1 件生成

手動実行（本番）:

```bash
npm run cron:weekly-report
```

- `CRON_SECRET` は **Vercel Production と同じ値** を `.env.local` に設定すること
- `NEXT_PUBLIC_BASE_URL` は **`https://www.tonarikko.com`**（www なし URL では Cron が別デプロイになり 401 になることがある）

成功時の例: `{"sent":9,"users":5}`

---

## Stripe サポート対応

### 解約（アプリを Free にする）

1. Stripe → **サブスクリプション** → **キャンセル**（テストなら **即時**）
2. Webhook `customer.subscription.deleted` が **200** か確認
3. Supabase `users.plan` が `free`、マイページが無料表示か確認

Customer Portal からユーザー自身が解約しても同様（Webhook で `free`）。

### 返金（金銭のみ）

1. Stripe → **決済** → **全額返金**
2. **返金だけでは `plan` は変わらない**（現仕様）
3. Plus 権限も外す場合は **必ず解約も行う**

### 照合

| 確認 | 場所 |
|------|------|
| 課金状態 | Stripe 顧客・サブスク |
| アプリ権限 | Supabase `users.plan` / `stripe_customer_id` |
| Webhook | Stripe → 開発者 → Webhook → イベント |

---

## デプロイ確認

```bash
npm run check:deploy          # 直近コミットの Vercel 状態（要 gh）
npm run build                 # ローカルでビルド再現
npm run test:e2e              # 本番 URL 向け E2E
```

---

## よくある問い合わせ

| 症状 | 確認 |
|------|------|
| Plus にならない | Webhook URL・`STRIPE_WEBHOOK_SECRET`・Live/Test の取り違え |
| チャットエラー | Vercel ログ `/api/chat`、OpenAI クォータ |
| ホーム画面追加で入力がおかしい | `www` 付き URL から再追加・再ログイン |
| 週次が来ない | `CRON_SECRET`、対象プラン・体験期間、月曜以降の実行ログ |
