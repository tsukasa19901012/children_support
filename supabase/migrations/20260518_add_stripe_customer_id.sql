-- ============================================================
-- users テーブルに stripe_customer_id を追加
-- Supabase SQL Editor に貼り付けて実行してください
-- ============================================================

alter table public.users
  add column if not exists stripe_customer_id text unique;
