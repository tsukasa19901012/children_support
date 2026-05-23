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

PostgreSQL では **enum 値の追加と使用を同じ実行に含められません**（`55P04`）。
次の **2 ファイルを順番に、それぞれ単体で Run** してください。

| 順 | ファイル | 内容 |
|----|----------|------|
| 1 | **`20260520_plan_plus_trial_step1_enum.sql`** | `plan_type` に `plus` を追加 |
| 2 | **`20260520_plan_plus_trial_step2_migrate.sql`** | `trial_ends_at`・`lite`/`pro`→`plus`・トリガー更新 |

`20260520_plan_plus_trial.sql` は案内用です。**中身をそのまま Run しないでください。**

ステップ1が既に成功している場合（`plus` が enum に存在する）は、**ステップ2だけ**実行すれば OK です。

実行後（任意）:

```sql
select plan::text, count(*) from public.users group by plan;
```

`lite` / `pro` が 0 件、`free` / `plus` のみになっていれば OK です。

すでに個別 SQL を実行済みの本番では、`schema.sql` 全体は再実行しないでください。

## public.users が無く onboarding で FK エラーになる場合

**`20260524_auth_users_public_users.sql`** を SQL Editor で実行してください。

- 既存 `auth.users` を `public.users` に backfill
- 新規サインアップ時に自動で `public.users` 行を作成
