-- 子ども削除（本人のみ）と、最後の1人は削除不可
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
  select count(*) into remaining
  from public.children
  where user_id = OLD.user_id
    and id <> OLD.id;

  if remaining < 1 then
    raise exception '最後のお子さんは削除できません';
  end if;

  return OLD;
end;
$$;

drop trigger if exists prevent_last_child_delete_trigger on public.children;
create trigger prevent_last_child_delete_trigger
  before delete on public.children
  for each row execute function public.prevent_last_child_delete();
