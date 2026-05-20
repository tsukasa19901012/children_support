# データベースマイグレーション

## 新規環境

**`schema.sql` のみ**を Supabase SQL Editor で実行してください。

含まれるもの:

- ユーザー・子ども・メッセージ・トークン使用量
- Free/Lite の子ども1人制限トリガー
- 子ども削除（最後の1人は不可）
- Pro 向け `child_sibling_relations`（きょうだい・いとこ・友達など）

## 既存環境（2026-05 以前に個別 SQL を実行済みの場合）

すでに本番で以下を実行済みなら、**`schema.sql` は再実行しない**でください（`IF NOT EXISTS` でも制約名の衝突などがあり得ます）。

| 旧ファイル（削除済み） | 内容 |
|---|---|
| `20260521_child_sibling_relations.sql` | 関係テーブル新設 |
| `20260522_expand_child_relations.sql` | いとこ・友達などの relation 追加 |
| `20260523_children_delete_policy.sql` | 子ども削除ポリシー・最後の1人保護 |

未適用の変更だけ必要な場合は、該当セクションを `schema.sql` から抜き出して実行してください。
