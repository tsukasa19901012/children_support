# データベースマイグレーション

## 新規環境

**`schema.sql` のみ**を Supabase SQL Editor で実行してください。

含まれるもの:

- ユーザー・子ども・メッセージ・トークン使用量
- `trial_ends_at`（14日体験）
- Free / Plus プラン
- 子ども数制限（Plus またはトライアル中のみ複数可）
- Plus 向け `child_sibling_relations`（きょうだい・友達・保護者関係）
- 保護者プロフィール（`profile_type = caregiver`）
- `auth.users` 作成時の `public.users` 自動追加

## 既存環境（本番）

スキーマは適用済みです。**`schema.sql` 全体は再実行しないでください。**

## 今後スキーマを変更する場合

1. `schema.sql` を最新の完全スキーマとして更新
2. 既存 DB 向けに差分 SQL を別ファイル（例: `20260601_add_foo.sql`）で用意し SQL Editor で実行
