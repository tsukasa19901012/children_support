-- ============================================================
-- children テーブル（子ども情報）
-- ============================================================

create table if not exists public.children (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.users(id) on delete cascade,
  name       text not null,
  age        int  not null check (age between 1 and 12),
  gender     text check (gender in ('male', 'female', 'other')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1ユーザー1子どもに制限（MVP: 複数子ども対応は将来）
create unique index children_user_id_idx on public.children(user_id);

-- RLS
alter table public.children enable row level security;

create policy "children: select own"
  on public.children for select
  using (user_id = auth.uid());

create policy "children: insert own"
  on public.children for insert
  with check (user_id = auth.uid());

create policy "children: update own"
  on public.children for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
