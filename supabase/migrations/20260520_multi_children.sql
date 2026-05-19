-- ============================================================
-- 複数子ども対応
-- 1. children の unique 制約を削除（Proプランで複数登録可能に）
-- 2. users に active_child_id を追加（アクティブな子どもを管理）
-- ============================================================

-- unique インデックスを削除
drop index if exists children_user_id_idx;

-- users にアクティブ子ども列を追加
alter table public.users
  add column if not exists active_child_id uuid references public.children(id) on delete set null;
