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
- 会話の削除（Lite/Pro はメモリ再計算）

### 子ども管理
- オンボーディングで子どもの名前・誕生日・性別を登録
- 誕生日から月齢・年齢をリアルタイム表示
- マイページから情報の編集・追加・削除（最後の1人は削除不可）
- **Proプランのみ**複数の子どもを登録・切り替え
- **Pro**: 子ども同士の関係（きょうだい・いとこ・友達など）。年上・年下は誕生日から自動判定
- 関係のない組み合わせは「登録しない」で省略可能
- Pro→Free 後は複数子どもデータは保持し、相談する1人を選択

### プラン・課金
- Free / Lite / Pro の3プラン
- Stripe Checkout で新規契約・アップグレード
- マイページ「お支払い管理」→ **Stripe Customer Portal**（プラン変更・解約）
- Webhook でプランを自動反映
- 支払い失敗時のリトライ猶予（即時ダウングレードなし）

### 週次レポート（Proプラン）
- 毎週月曜 AM8:00（JST）にVercel Cronで自動実行
- 前週の会話をもとにAIが育児振り返りレポートを生成
- チャット画面にアシスタントメッセージとして配信

### セキュリティ
- RLSにより各ユーザーは自分のデータのみアクセス可能
- `plan`列はクライアントから直接書き換え不可
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
| テスト | Vitest（ユニットテスト） |

---

## プラン比較

| プラン | 価格 | 1日の上限 | AIメモリ | 複数の子ども | 週次レポート |
|---|---|---|---|---|---|
| Free | 無料 | 3回 | なし | なし | なし |
| Lite | ¥980/月 | 無制限 | あり | なし | なし |
| Pro | ¥2,980/月 | 無制限 | あり | あり（複数登録・切替・関係性） | あり |

---

## フォルダ構成

```
src/
├── app/
│   ├── page.tsx                      # チャット
│   ├── login/                        # OTP ログイン
│   ├── onboarding/                   # 子ども登録・編集・関係設定
│   ├── account/                      # マイページ
│   └── api/
│       ├── chat/                     # AI・メモリ再構築
│       ├── checkout/                 # Stripe Checkout
│       ├── billing-portal/           # Stripe Customer Portal
│       ├── webhook/                  # Stripe Webhook
│       └── report/weekly/            # 週次レポート Cron
├── features/
│   ├── account/hooks/useAccountReturn.ts
│   ├── billing/
│   ├── chat/
│   └── child/                        # 関係性・削除・読み込み
├── lib/
docs/
│   └── CONSIDERATIONS.md             # 仕様・考慮漏れメモ
supabase/migrations/
│   ├── schema.sql                    # 新規環境用（この1ファイルのみ）
│   └── README.md                     # 既存環境向け注意
```

---

## セットアップ

### 1. 依存パッケージ

```bash
npm install
```

### 2. 環境変数

`.env.example` をコピーして `.env.local` を作成してください。

```bash
cp .env.example .env.local
```

### 3. Supabase

**新規環境**では `supabase/migrations/schema.sql` を SQL Editor で**1回だけ**実行します。

既に本番で個別マイグレーションを実行済みの場合は [supabase/migrations/README.md](./supabase/migrations/README.md) を参照してください。

### 4. Supabase 認証

- **Site URL** / **Redirect URLs**: `https://your-domain.vercel.app/auth/callback`
- Email OTP（6桁推奨）

### 5. Stripe

1. Lite / Pro の Price を作成し環境変数に設定
2. Webhook: `https://your-domain.vercel.app/api/webhook`
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
3. **Customer Portal** を有効化（プラン変更・解約）
   - Lite / Pro の Price を変更可能プランに追加

詳細は README 下部の Webhook 表および運用時の [docs/CONSIDERATIONS.md](./docs/CONSIDERATIONS.md) を参照。

### 6. 起動

```bash
npm run dev
```

ローカル Webhook:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

---

## テスト

純粋関数（会話順序・関係性の解決など）のユニットテストです。

```bash
npm test
```

ウォッチモード:

```bash
npm run test:watch
```

---

## デプロイ（Vercel）

1. GitHub リポジトリを連携
2. `.env.example` の変数をすべて設定
3. Cron（週次レポート）: `vercel.json` 参照（日曜 23:00 UTC = 月曜 8:00 JST）

---

## Stripe Webhook

| イベント | 処理 |
|---|---|
| `checkout.session.completed` | Lite/Pro に更新、`stripe_customer_id` 保存 |
| `customer.subscription.updated` | ポータルでの変更を反映。滞納時 Free |
| `customer.subscription.deleted` | Free にダウングレード |
| `invoice.payment_failed` | ログのみ（リトライ猶予） |

---

## ドキュメント

- [docs/CONSIDERATIONS.md](./docs/CONSIDERATIONS.md) — 仕様・既知の挙動・運用メモ
- [supabase/migrations/README.md](./supabase/migrations/README.md) — DB マイグレーション方針

---

## 注意事項

- 本アプリは医療診断を行いません。育児の一般的なアドバイスを提供します。
- AIの回答は参考情報です。症状が気になる場合は医療機関へご相談ください。
