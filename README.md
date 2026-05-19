# 育児AIチャット

2〜6歳の子どもを育てる保護者向けのAI育児相談アプリです。

## 機能

- **Magic Link 認証** — パスワード不要のメールログイン
- **AI チャット** — gpt-4o-mini による育児相談
- **プラン制御** — Free / Lite / Pro の3プラン
- **Stripe 課金** — サブスクリプション決済
- **会話履歴** — Supabase によるメッセージ保存
- **トークン使用量記録** — APIコスト管理

## 技術スタック

- [Next.js 16](https://nextjs.org/) (App Router)
- [Supabase](https://supabase.com/) (認証 / データベース)
- [OpenAI API](https://openai.com/) (gpt-4o-mini)
- [Stripe](https://stripe.com/) (サブスクリプション)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)

## セットアップ

### 1. 依存パッケージをインストール

```bash
npm install
```

### 2. 環境変数を設定

`.env.local` を作成して以下を設定してください。

```env
OPENAI_API_KEY=

STRIPE_SECRET_KEY=
STRIPE_PRICE_ID_LITE=
STRIPE_PRICE_ID_PRO=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 3. Supabase のマイグレーションを実行

`supabase/migrations/` 内のSQLファイルをSupabase Dashboard の SQL Editor で実行してください。

```
20260518_init.sql                  ← users・messages テーブル
20260518_add_stripe_customer_id.sql ← Stripe顧客ID追加
20260518_add_token_usage.sql       ← トークン使用量記録
```

### 4. 開発サーバーを起動

```bash
npm run dev
```

## プラン

| プラン | 価格 | 制限 |
|---|---|---|
| Free | 無料 | 1日3回・履歴7日 |
| Lite | ¥980/月 | 無制限 |
| Pro | ¥2,980/月 | 無制限・長期記憶・パーソナライズ |

## デプロイ

[Vercel](https://vercel.com) を推奨します。GitHubリポジトリを連携して環境変数を設定するだけでデプロイできます。
