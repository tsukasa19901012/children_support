# 育児AIチャット

0歳からの子どもを育てる保護者向けのAI育児相談アプリです。  
疲れた親でも片手で使えるスマホ最優先設計で、子どもの性格や悩みを学習して最適なアドバイスを返します。

**本番環境**: https://children-support.vercel.app

---

## 機能一覧

### 認証
- メールアドレスへの **6桁OTPコード**でログイン（パスワード不要）
- Supabase Auth + カスタムSMTP（Resend）

### AIチャット
- **gpt-4o-mini** による育児相談
- 子どもの名前・月齢・誕生日をもとにパーソナライズされた回答
- Lite/Proプランでは会話を蓄積して子どもの性格・傾向を学習（メモリ機能）
- プランごとの送信回数制限（Free: 1日3回、Lite/Pro: 無制限）
- 送信履歴ウィンドウ（Free: 5件、Lite: 10件、Pro: 30件）

### 子ども管理
- オンボーディングで子どもの名前・誕生日・性別を登録
- 誕生日から月齢・年齢をリアルタイム表示
- マイページから情報の編集・追加が可能
- **Proプランのみ**複数の子どもを登録・切り替え可能
- ダウングレード時はアクティブな子どもを選択して継続利用

### プラン・課金
- Free / Lite / Pro の3プラン
- Stripe によるサブスクリプション決済（Checkout）
- Stripeポータル経由のプラン変更を自動反映
- 支払い失敗時のリトライ猶予（即時ダウングレードなし）
- 解約・リトライ全失敗時は自動でFreeにダウングレード

### 週次レポート（Proプラン）
- 毎週月曜 AM8:00（JST）にVercel Cronで自動実行
- 前週の会話をもとにAIが育児振り返りレポートを生成
- チャット画面にアシスタントメッセージとして配信

### セキュリティ
- RLSにより各ユーザーは自分のデータのみアクセス可能
- `plan`列はクライアントから直接書き換え不可（列レベル権限）
- 全APIでリクエストバリデーション・認証チェック

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 認証 / DB | Supabase |
| AI | OpenAI API (gpt-4o-mini) |
| 決済 | Stripe |
| スタイル | Tailwind CSS v4 |
| デプロイ | Vercel |
| メール配信 | Resend（カスタムSMTP） |

---

## プラン比較

| プラン | 価格 | 1日の上限 | AIメモリ | 複数の子ども | 週次レポート |
|---|---|---|---|---|---|
| Free | 無料 | 3回 | なし | なし | なし |
| Lite | ¥980/月 | 無制限 | あり | なし | なし |
| Pro | ¥2,980/月 | 無制限 | あり | あり（複数登録・切替） | あり |

---

## フォルダ構成

```
src/
├── app/
│   ├── page.tsx                 # チャット画面（メイン）
│   ├── login/page.tsx           # ログイン（OTP）
│   ├── onboarding/page.tsx      # 子ども情報登録・編集
│   ├── account/
│   │   ├── page.tsx             # マイページ
│   │   └── ChildManager.tsx     # 子ども管理コンポーネント
│   └── api/
│       ├── chat/route.ts        # AIチャットAPI
│       ├── checkout/route.ts    # Stripeチェックアウト
│       ├── webhook/route.ts     # Stripe Webhook
│       └── report/weekly/route.ts # 週次レポート生成
├── features/
│   ├── billing/
│   │   ├── plans.ts             # プラン定義
│   │   ├── types.ts             # 型定義
│   │   ├── hooks/useUserPlan.ts # プラン・使用回数管理
│   │   └── components/UpgradeModal.tsx
│   ├── chat/hooks/useChatHistory.ts
│   └── child/hooks/useChildRedirect.ts
├── lib/
│   ├── supabase-browser.ts
│   ├── supabase-server.ts
│   ├── stripe.ts
│   └── childAge.ts             # 月齢・年齢計算ユーティリティ
└── hooks/
    └── useAuthUserId.ts
```

---

## セットアップ

### 1. 依存パッケージをインストール

```bash
npm install
```

### 2. 環境変数を設定

`.env.local` を作成して以下を設定してください。

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_PRICE_ID_LITE=price_...   # Stripeダッシュボードの価格ID
STRIPE_PRICE_ID_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# アプリURL（本番はhttps://your-domain.vercel.app）
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Vercel Cron 認証（任意の文字列）
CRON_SECRET=任意のランダム文字列
```

### 3. Supabase のマイグレーションを実行

Supabase Dashboard → SQL Editor で以下の**1ファイルだけ**実行してください。

```
supabase/migrations/schema.sql
```

全テーブル・RLS・トリガーが一括で作成されます。

### 4. Supabase 認証の設定

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-domain.vercel.app`
- **Redirect URLs**: `https://your-domain.vercel.app/auth/callback`

Authentication → Email → OTP の有効期限・桁数（6桁推奨）。

### 5. Stripe の設定

1. **商品・価格**を作成し、各価格IDを環境変数に設定
2. **Webhook エンドポイント**を登録: `https://your-domain.vercel.app/api/webhook`
3. Webhook に以下のイベントを追加:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

### 6. 開発サーバーを起動

```bash
npm run dev
```

Stripe Webhook のローカルテストは Stripe CLI を使用してください。

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

---

## デプロイ（Vercel）

1. GitHub リポジトリを Vercel に連携
2. Environment Variables に上記の環境変数をすべて設定
3. `vercel.json` に定義した Cron Job（週次レポート: 毎週日曜 23:00 UTC = 月曜 8:00 JST）が自動で有効になります

---

## Stripe Webhook のイベント処理

| イベント | 処理 |
|---|---|
| `checkout.session.completed` | プランを Lite/Pro に更新 |
| `customer.subscription.updated` | Stripeポータルでのプラン変更を反映。`past_due`/`unpaid` でFreeにダウングレード |
| `customer.subscription.deleted` | Freeにダウングレード |
| `invoice.payment_failed` | ログのみ（リトライ猶予中はダウングレードしない） |

---

## 注意事項

- 本アプリは医療診断を行いません。育児の一般的なアドバイスを提供します。
- AIの回答は参考情報です。症状が気になる場合は医療機関へご相談ください。
