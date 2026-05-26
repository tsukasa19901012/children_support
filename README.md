# となりっこ — うちの子を覚える育児AI

**うちの子のこと、覚えながら聞く。**

0〜6歳のママ・パパ向け。会話からうちの子のことを覚えながら、育児の悩みに寄り添うAIです（7歳以上も利用可）。

**本番**: [https://www.tonarikko.com](https://www.tonarikko.com)

---

## このアプリでできること

- **うちの子に合う相談** … 会話からうちの子のことを覚え、相談に活かす（Plus）
- **週次の振り返り（Plus）** … 毎週月曜、お子さん・あなた（保護者）それぞれにやさしいレポート
- **複数の子・関係（Plus）** … きょうだいや友達の関係を踏まえた相談（任意）
- **あなた（保護者）の相談（Plus）** … 疲れや気持ちに、登録済みのお子さんの情報を踏まえて寄り添う
- **片手で相談** … 疲れたときでも短く、共感から始まる回答

---

## プラン比較

| | Free（体験期間後） | 初回14日 | Plus |
|---|---|---|---|
| 価格 | 無料 | 無料 | ¥980/月 |
| 1日の上限 | 5回 | 無制限 | 無制限 |
| 複数の子・関係 | 1人 | あり | あり |
| あなた（保護者）の相談 | なし | あり | あり |
| 週次レポート | 配信なし（過去分は閲覧可） | あり | あり |

表示文言の正は `src/lib/brand.ts` と `src/features/billing/plans.ts`。

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 認証 / DB | Supabase |
| AI | OpenAI API (gpt-4o-mini) |
| 決済 | Stripe（サンドボックス / 本番） |
| メール | Resend + Supabase Auth SMTP |
| ホスティング | Vercel |

---

## セットアップ

```bash
cp .env.example .env.local   # 値を設定
npm install
npm run dev
```

`.env.example` を参照。本番 URL は `NEXT_PUBLIC_BASE_URL=https://www.tonarikko.com`。

**既存 DB の移行**は [supabase/migrations/README.md](supabase/migrations/README.md) を参照。

---

## npm scripts

| コマンド | 内容 |
|----------|------|
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド（Vercel と同等） |
| `npm test` | ユニットテスト（Vitest） |
| `npm run test:e2e` | 本番向け E2E（Playwright） |
| `npm run supabase:apply-email-templates` | Auth メールテンプレート反映 |
| `npm run check:deploy` | Vercel デプロイ状態確認 |
| `npm run check:production-env` | 本番疎通・必須環境変数キー確認 |
| `npm run cron:weekly-report` | 週次レポート API 手動実行（要 `CRON_SECRET`） |

---

## CI / デプロイ

- **GitHub Actions** (`.github/workflows/ci.yml`): push/PR で lint・test・build
- **`main` push 後**: CI が Vercel ステータスを確認
- 失敗時はローカルで `npm run build` して原因を特定

---

## ディレクトリ構成

```
src/
├ app/              # ページ・API Routes
├ features/         # auth, chat, child, billing, ...
├ components/
└ lib/              # brand.ts, supabase, ...

e2e/                # Playwright（tsconfig exclude）
supabase/
├ migrations/       # DB スキーマ・移行
└ email-templates/    # Auth メール HTML

scripts/            # 運用スクリプト
docs/               # 仕様・UX・ビジョン
.github/workflows/  # CI
```

---

## ドキュメント

| ファイル | 内容 |
|----------|------|
| [docs/CONSIDERATIONS.md](docs/CONSIDERATIONS.md) | 仕様・プラン・制約 |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | 本番運用（Stripe・週次・環境変数） |
| [docs/vision.md](docs/vision.md) | プロダクトビジョン |
| [docs/ux.md](docs/ux.md) | UX 原則 |
| [supabase/README.md](supabase/README.md) | DB・メール運用 |
| [e2e/README.md](e2e/README.md) | E2E テスト |
| [AGENTS.md](AGENTS.md) | AI / 外部サービス更新方針 |

---

## 認証メール

- 6桁 OTP でログイン（Magic Link テンプレートに OTP 表示）
- テンプレート: [supabase/email-templates/](supabase/email-templates/)
- 反映: `npm run supabase:apply-email-templates`（要 `SUPABASE_ACCESS_TOKEN`）
