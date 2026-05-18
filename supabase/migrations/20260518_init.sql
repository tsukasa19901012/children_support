-- ============================================================
-- 育児AIアプリ 初期スキーマ
-- Supabase SQL Editor に貼り付けて実行してください
-- ============================================================

-- ────────────────────────────────────────
-- 1. users テーブル
-- ────────────────────────────────────────
create type plan_type as enum ('free', 'lite', 'pro');

create table if not exists public.users (
  id         uuid primary key default gen_random_uuid(),
  plan       plan_type not null default 'free',
  created_at timestamptz not null default now()
);

-- RLS を有効化
alter table public.users enable row level security;

-- 本人だけ自分のレコードを参照できる
create policy "users: select own"
  on public.users for select
  using (id = auth.uid());

-- 本人だけ自分のレコードを更新できる（プランのアップグレード等）
create policy "users: update own"
  on public.users for update
  using (id = auth.uid());

-- 認証済みユーザーは自分のレコードを作成できる
create policy "users: insert own"
  on public.users for insert
  with check (id = auth.uid());


-- ────────────────────────────────────────
-- 2. messages テーブル
-- ────────────────────────────────────────
create type message_role as enum ('user', 'assistant');

create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  role       message_role not null,
  content    text not null,
  created_at timestamptz not null default now()
);

-- インデックス（ユーザーごとの時系列取得を高速化）
create index messages_user_id_created_at_idx
  on public.messages(user_id, created_at asc);

-- RLS を有効化
alter table public.messages enable row level security;

-- 本人のメッセージだけ参照できる
create policy "messages: select own"
  on public.messages for select
  using (user_id = auth.uid());

-- 本人のメッセージだけ作成できる
create policy "messages: insert own"
  on public.messages for insert
  with check (user_id = auth.uid());

-- 本人のメッセージだけ削除できる
create policy "messages: delete own"
  on public.messages for delete
  using (user_id = auth.uid());
