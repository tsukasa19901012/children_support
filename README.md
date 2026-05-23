# となりっこ — うちの子を覚える育児AI

**うちの子のこと、覚えながら聞く。**

0〜6歳のママ・パパ向け。会話からうちの子のことを覚えながら、育児の悩みに寄り添うAIです（7歳以上も利用可）。

**本番環境**: https://children-support.vercel.app

---

## このアプリでできること

- **うちの子に合う相談** … 会話から性格・よくある悩みを学習（Freeは読み取り、Plusで更新）
- **週次の振り返り（Plus）** … 毎週月曜、先週の相談をもとにやさしいレポート
- **複数の子・関係（Plus）** … きょうだいや友達の関係を踏まえた相談（任意）
- **片手で相談** … 疲れたときでも短く、共感から始まる回答

---

## プラン比較

| | Free（トライアル後） | 初回14日 | Plus |
|---|---|---|---|
| 価格 | 無料 | 無料 | ¥980/月 |
| 1日の上限 | 5回 | 無制限 | 無制限 |
| メモリ | 読み取りのみ | 更新あり | 更新あり |
| 複数の子・関係 | 1人 | あり | あり |
| 週次レポート | なし | あり | あり |

---

## 機能一覧

### 認証
- メールアドレスへの **6桁OTPコード**でログイン
- Supabase Auth + Resend（カスタムSMTP）
- メールテンプレート: [`supabase/email-templates/`](supabase/email-templates/)

### 相談（チャット）
- **gpt-4o-mini** による育児相談（0〜6歳最適化）
- お子さんの名前・月齢をもとにパーソナライズ
- メモリの読み取り（Free）／更新（Plus・トライアル）
- 会話の削除（Plus・トライアルはメモリ再計算）

### プラン・課金
- Free / Plus（Stripe Checkout・Customer Portal）
- 初回14日は Plus 相当の体験（案Cトライアル）
- Webhook でプラン自動反映

### 週次レポート（Plus・トライアル）
- 毎週月曜 8:00（JST）に自動生成
- Plus 契約中、または14日トライアル中のユーザーが対象
- **登録済みのお子さんごと**に、その子の会話・メモリをもとにレポートを生成

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 認証 / DB | Supabase |
| AI | OpenAI API (gpt-4o-mini) |
| 決済 | Stripe |
| ホスティング | Vercel |

---

## セットアップ

`.env.example` を `.env.local` にコピーして値を設定してください。

**既存DB**では `supabase/migrations/20260520_plan_plus_trial.sql` を実行してください。

```bash
npm install
npm run dev
```

---

## ディレクトリ構成（抜粋）

```
src/
├ app/           # ページ・API Routes
├ features/      # auth, chat, child, billing, ...
├ components/
├ lib/
└ prompts/       # （将来）プロンプト管理
```
