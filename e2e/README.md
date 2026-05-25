# E2E（Playwright）

本番 [https://www.tonarikko.com](https://www.tonarikko.com) 向けの自動テスト。

## セットアップ

```bash
npx playwright install chromium   # 初回のみ
cp .env.e2e.example .env.e2e.local   # 任意（未設定時は e2e-auto@tonarikko.com を使用）
```

`.env.local` の Supabase キー（`SUPABASE_SERVICE_ROLE_KEY` 等）と併用します。

## 実行

```bash
npm run test:e2e              # 公開 + 認証済み + イレギュラー + モンキー
npm run test:e2e:irregular    # イレギュラー（境界値・異常系）のみ
npm run test:e2e:monkey       # モンキー（ランダム操作）のみ
npm run test:e2e:ui           # UI モード
```

### イレギュラー / モンキー

| ファイル | 内容 |
|----------|------|
| `irregular.spec.ts` | API 境界値、不正入力、保護者 Plus 制限、存在しない ID |
| `monkey.spec.ts` | チャット・マイページ間のランダムクリック・入力（削除・課金は除外） |

## 認証方式

`global-setup.ts` が Admin API で OTP を取得し、ブラウザにセッションを注入します（Resend SMTP 不要）。  
未オンボーディングの場合は子ども登録まで自動完了します。

## 注意

- `e2e/` は `tsconfig.json` の exclude 対象（Next.js ビルドに含めない）
- 認証状態 `e2e/.auth/user.json` は gitignore 済み
- 課金 UI の回帰テストは `e2e/helpers/billingState.ts` で E2E ユーザーの `plan` / `trial_ends_at` を切り替える
