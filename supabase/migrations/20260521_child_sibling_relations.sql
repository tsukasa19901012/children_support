-- Pro: 子ども同士のきょうだい関係（相談プロンプト用）
create table if not exists public.child_sibling_relations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.users(id) on delete cascade,
  child_id    uuid        not null references public.children(id) on delete cascade,
  sibling_id  uuid        not null references public.children(id) on delete cascade,
  relation    text        not null check (relation in (
    'older_brother', 'older_sister', 'younger_brother', 'younger_sister', 'twin'
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
