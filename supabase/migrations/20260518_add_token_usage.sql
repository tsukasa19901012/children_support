-- ============================================================
-- token_usage テーブル：AI APIのトークン消費を記録
-- Supabase SQL Editor に貼り付けて実行してください
-- ============================================================

create table if not exists public.token_usage (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  model             text        not null,
  prompt_tokens     int         not null default 0,
  completion_tokens int         not null default 0,
  total_tokens      int         not null default 0,
  created_at        timestamptz not null default now()
);

-- 月間集計に使うインデックス
create index token_usage_user_id_created_at_idx
  on public.token_usage(user_id, created_at desc);

-- RLS を有効化
alter table public.token_usage enable row level security;

-- 本人のデータだけ参照できる
create policy "token_usage: select own"
  on public.token_usage for select
  using (user_id = auth.uid());
