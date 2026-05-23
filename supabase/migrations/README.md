# データベースマイグレーション

## 新規環境

**`schema.sql` のみ**を Supabase SQL Editor で実行してください。

含まれるもの:

- ユーザー・子ども・メッセージ・トークン使用量
- `trial_ends_at`（14日体験）
- Free / Plus プラン
- 子ども数制限（Plus またはトライアル中のみ複数可）
- Plus 向け `child_sibling_relations`

## 既存環境（旧2段階プランからの移行）

**`20260520_plan_plus_trial.sql`** を SQL Editor で実行してください。

- `trial_ends_at` 列の追加
- 旧有料プラン（DB enum）のユーザーを `plus` に統合
- 子ども数制限トリガーの更新

すでに個別 SQL を実行済みの本番では、`schema.sql` 全体は再実行しないでください。
