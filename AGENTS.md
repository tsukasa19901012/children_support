<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# External Services（外部サービス更新方針）

エージェントは、以下の方針に従い Supabase / Vercel / Stripe 等の外部サービス更新を**自律的に実行してよい**。

## 自動 OK（確認不要）

- **Supabase（サンドボックス / 開発）**: マイグレーション SQL 作成、`supabase db push`、RLS・トリガー・Auth 設定の更新
- **Stripe サンドボックス**: Webhook / Price / Checkout 関連の確認・設定
- **Vercel（プレビュー / 開発）**: 環境変数の追加・更新（CLI または Dashboard 手順の実行）
- **E2E / CI**: テスト実行、設定ファイル更新
- **Resend / DNS**: 設定内容の確認、不足レコードの提案と追記手順の実行

## 実行前に必ずユーザー確認

- **Supabase 本番 DB**: 破壊的変更（enum 変更、データ移行、削除）、本番への `db push` / SQL 直接実行
- **Auth 本番設定**: Site URL、Redirect URLs 変更（全ユーザーのログインに影響）
- **Stripe Live モード**: 一切触らない（サンドボックスのみ）
- **DNS・ドメイン・課金プラン**: 変更前に確認
- **秘密鍵の新規発行・ローテーション**: 実行前に確認

## 実行ルール

1. `.env.local` のキーを使用する。**秘密情報はコミットしない**
2. 本番変更は「変更内容の要約 → 確認 → 実行」の順を守る
3. 可能な限り `supabase/migrations/` に SQL を残し、Dashboard 直編集より再現可能な方法を優先
4. 変更後は関連テスト（`npm test` / `npm run test:e2e`）を実行し、結果を報告する
5. CLI 未ログイン時はログイン手順を案内するか、ユーザーに実行を依頼する

## 推奨フロー

```
コード変更 → マイグレーション追加 → テスト実行 → （本番 DB は確認後）反映
```

