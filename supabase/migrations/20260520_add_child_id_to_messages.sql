-- messages テーブルに child_id 列を追加（子どもごとにチャット履歴を分ける）
alter table public.messages
  add column if not exists child_id uuid references public.children(id) on delete set null;

-- バックフィル: 既存メッセージをそのユーザーの最初の子どもに紐付ける
-- （複数子ども対応前は1人しかいないため安全）
update public.messages m
set child_id = (
  select c.id
  from public.children c
  where c.user_id = m.user_id
  order by c.created_at
  limit 1
)
where m.child_id is null;

-- 子どもごとの時系列取得を高速化するインデックス
create index if not exists messages_child_id_created_at_idx
  on public.messages(child_id, created_at asc);
