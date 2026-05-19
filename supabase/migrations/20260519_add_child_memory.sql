-- ============================================================
-- children テーブルに memory 列を追加
-- Lite/Pro プランのみ使用。会話から学習した子ども・家庭の特徴を保存。
-- ============================================================

alter table public.children
  add column if not exists memory text;
