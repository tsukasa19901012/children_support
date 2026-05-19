-- ============================================================
-- 育児AIアプリ 完全スキーマ
-- 新規環境構築時はこのファイルだけ Supabase SQL Editor で実行してください
-- ============================================================


-- ────────────────────────────────────────
-- 1. 型定義
-- ────────────────────────────────────────
create type plan_type    as enum ('free', 'lite', 'pro');
create type message_role as enum ('user', 'assistant');


-- ────────────────────────────────────────
-- 2. users テーブル
-- ────────────────────────────────────────
create table if not exists public.users (
  id                uuid        primary key default gen_random_uuid(),
  plan              plan_type   not null default 'free',
  stripe_customer_id text       unique,
  active_child_id   uuid,       -- children(id) への FK は children 作成後に追加
  created_at        timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: select own"
  on public.users for select
  using (id = auth.uid());

-- plan 列はクライアントから直接書き換え不可（service_role のみ更新可）
create policy "users: update own (non-plan columns)"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users: insert own"
  on public.users for insert
  with check (id = auth.uid());

revoke update (plan) on public.users from anon;
revoke update (plan) on public.users from authenticated;


-- ────────────────────────────────────────
-- 3. children テーブル
-- ────────────────────────────────────────
create table if not exists public.children (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  name       text        not null,
  birthday   date        not null,
  gender     text        check (gender in ('male', 'female', 'other')),
  memory     text,                -- Lite/Pro: 会話から学習した子ども・家庭の特徴
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- unique 制約なし（Pro プランは複数子ども登録可能）

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


-- ────────────────────────────────────────
-- 4. users.active_child_id に FK を追加
-- ────────────────────────────────────────
alter table public.users
  add constraint users_active_child_id_fkey
  foreign key (active_child_id)
  references public.children(id)
  on delete set null;


-- ────────────────────────────────────────
-- 5. messages テーブル
-- ────────────────────────────────────────
create table if not exists public.messages (
  id         uuid         primary key default gen_random_uuid(),
  user_id    uuid         not null references public.users(id) on delete cascade,
  child_id   uuid         references public.children(id) on delete set null,
  role       message_role not null,
  content    text         not null,
  created_at timestamptz  not null default now()
);

-- インデックス
create index messages_user_id_created_at_idx
  on public.messages(user_id, created_at asc);
create index messages_child_id_created_at_idx
  on public.messages(child_id, created_at asc);

alter table public.messages enable row level security;

create policy "messages: select own"
  on public.messages for select
  using (user_id = auth.uid());

create policy "messages: insert own"
  on public.messages for insert
  with check (user_id = auth.uid());

create policy "messages: delete own"
  on public.messages for delete
  using (user_id = auth.uid());


-- ────────────────────────────────────────
-- 6. token_usage テーブル
-- ────────────────────────────────────────
create table if not exists public.token_usage (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.users(id) on delete cascade,
  model             text        not null,
  prompt_tokens     int         not null default 0,
  completion_tokens int         not null default 0,
  total_tokens      int         not null default 0,
  created_at        timestamptz not null default now()
);

create index token_usage_user_id_created_at_idx
  on public.token_usage(user_id, created_at desc);

alter table public.token_usage enable row level security;

create policy "token_usage: select own"
  on public.token_usage for select
  using (user_id = auth.uid());


-- ────────────────────────────────────────
-- 7. Free/Lite プランの子ども数制限トリガー
--    Pro プランのみ複数の子どもを登録可能
-- ────────────────────────────────────────
create or replace function public.check_children_plan_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  user_plan      text;
  children_count int;
begin
  select plan into user_plan from public.users where id = NEW.user_id;

  if user_plan = 'pro' then
    return NEW;
  end if;

  select count(*) into children_count
  from public.children
  where user_id = NEW.user_id;

  if children_count >= 1 then
    raise exception 'Free/Lite プランは子どもを1人しか登録できません。Pro プランへのアップグレードが必要です。';
  end if;

  return NEW;
end;
$$;

create trigger children_plan_limit_check
  before insert on public.children
  for each row execute function public.check_children_plan_limit();
