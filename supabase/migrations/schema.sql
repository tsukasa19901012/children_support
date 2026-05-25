-- ============================================================
-- 育児AIアプリ 完全スキーマ（単一マイグレーション）
--
-- 新規環境: このファイルだけ Supabase SQL Editor で実行
-- 既存環境: supabase/migrations/README.md を参照
-- ============================================================


-- ────────────────────────────────────────
-- 1. 型定義
-- ────────────────────────────────────────
create type plan_type    as enum ('free', 'plus');
create type message_role as enum ('user', 'assistant');


-- ────────────────────────────────────────
-- 2. users テーブル
-- ────────────────────────────────────────
create table if not exists public.users (
  id                uuid        primary key default gen_random_uuid(),
  plan              plan_type   not null default 'free',
  stripe_customer_id text       unique,
  active_child_id   uuid,       -- children(id) への FK は children 作成後に追加
  trial_ends_at     timestamptz not null default (now() + interval '14 days'),
  created_at        timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "users: select own"
  on public.users for select
  using (id = auth.uid());

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
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.users(id) on delete cascade,
  name          text        not null,
  birthday      date,
  gender        text        check (gender in ('male', 'female', 'other')),
  profile_type  text        not null default 'child' check (profile_type in ('child', 'caregiver')),
  memory        text,                -- 会話から学習した子ども・家庭の特徴（Plusで更新）
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists children_one_caregiver_per_user
  on public.children (user_id)
  where profile_type = 'caregiver';

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

create policy "children: delete own"
  on public.children for delete
  using (user_id = auth.uid());

create or replace function public.prevent_last_child_delete()
returns trigger
language plpgsql
security definer
as $$
declare
  remaining int;
begin
  if OLD.profile_type <> 'child' then
    return OLD;
  end if;

  select count(*) into remaining
  from public.children
  where user_id = OLD.user_id
    and profile_type = 'child'
    and id <> OLD.id;

  if remaining < 1 then
    raise exception '最後のお子さんは削除できません';
  end if;

  return OLD;
end;
$$;

create trigger prevent_last_child_delete_trigger
  before delete on public.children
  for each row execute function public.prevent_last_child_delete();


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
  id                  uuid         primary key default gen_random_uuid(),
  user_id             uuid         not null references public.users(id) on delete cascade,
  child_id            uuid         references public.children(id) on delete set null,
  role                message_role not null,
  content             text         not null,
  message_type        text         not null default 'chat' check (message_type in ('chat', 'weekly_report')),
  report_period_start date,
  report_period_end   date,
  created_at          timestamptz  not null default now()
);

create index messages_user_id_created_at_idx
  on public.messages(user_id, created_at asc);
create index messages_child_id_created_at_idx
  on public.messages(child_id, created_at asc);
create index messages_weekly_report_user_idx
  on public.messages(user_id, created_at desc)
  where message_type = 'weekly_report';

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
-- 7. 子ども数・保護者プロフィール制限トリガー
--    Plus または14日トライアル中のみ複数登録可
-- ────────────────────────────────────────
create or replace function public.check_children_plan_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  user_plan      text;
  trial_end      timestamptz;
  user_created   timestamptz;
  children_count int;
  caregiver_count int;
begin
  select plan, trial_ends_at, created_at
  into user_plan, trial_end, user_created
  from public.users
  where id = NEW.user_id;

  if trial_end is null then
    trial_end := user_created + interval '14 days';
  end if;

  if NEW.profile_type = 'caregiver' then
    if user_plan <> 'plus' and now() >= trial_end then
      raise exception '保護者プロフィールの登録にはPlusプランが必要です。';
    end if;

    select count(*) into caregiver_count
    from public.children
    where user_id = NEW.user_id
      and profile_type = 'caregiver';

    if caregiver_count >= 1 then
      raise exception '保護者プロフィールは1人まで登録できます。';
    end if;

    return NEW;
  end if;

  if user_plan = 'plus' then
    return NEW;
  end if;

  if now() < trial_end then
    return NEW;
  end if;

  select count(*) into children_count
  from public.children
  where user_id = NEW.user_id
    and profile_type = 'child';

  if children_count >= 1 then
    raise exception '無料プラン（トライアル終了後）はお子さんを1人しか登録できません。Plusプランへのアップグレードが必要です。';
  end if;

  return NEW;
end;
$$;

create trigger children_plan_limit_check
  before insert on public.children
  for each row execute function public.check_children_plan_limit();


-- ────────────────────────────────────────
-- 8. きょうだい・保護者関係（Plus・複数子ども）
-- ────────────────────────────────────────
create table if not exists public.child_sibling_relations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  child_id    uuid        not null references public.children(id) on delete cascade,
  sibling_id  uuid        not null references public.children(id) on delete cascade,
  relation    text        not null check (relation in (
    'older_brother', 'older_sister', 'younger_brother', 'younger_sister', 'twin',
    'cousin_older', 'cousin_younger',
    'second_cousin_older', 'second_cousin_younger',
    'friend',
    'guardian'
  )),
  created_at  timestamptz not null default now(),
  unique (child_id, sibling_id),
  check (child_id <> sibling_id)
);

create index if not exists child_sibling_relations_child_id_idx
  on public.child_sibling_relations(child_id);
create index if not exists child_sibling_relations_user_id_idx
  on public.child_sibling_relations(user_id);

alter table public.child_sibling_relations enable row level security;

create policy "child_sibling_relations: select own"
  on public.child_sibling_relations for select
  using (user_id = auth.uid());

create policy "child_sibling_relations: insert own"
  on public.child_sibling_relations for insert
  with check (user_id = auth.uid());

create policy "child_sibling_relations: update own"
  on public.child_sibling_relations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "child_sibling_relations: delete own"
  on public.child_sibling_relations for delete
  using (user_id = auth.uid());


-- ────────────────────────────────────────
-- 9. auth.users → public.users 自動作成
-- ────────────────────────────────────────
insert into public.users (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
