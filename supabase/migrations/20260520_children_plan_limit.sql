-- Free/Lite プランは子どもを1人のみ登録可能にするトリガー
-- Pro プランは複数登録可能（制限なし）

create or replace function public.check_children_plan_limit()
returns trigger
language plpgsql
security definer
as $$
declare
  user_plan text;
  children_count int;
begin
  -- ユーザーのプランを取得
  select plan into user_plan from public.users where id = NEW.user_id;

  -- Pro プランは制限なし
  if user_plan = 'pro' then
    return NEW;
  end if;

  -- Free/Lite は既に1件あれば追加不可
  select count(*) into children_count
  from public.children
  where user_id = NEW.user_id;

  if children_count >= 1 then
    raise exception 'Free/Lite プランは子どもを1人しか登録できません。Pro プランへのアップグレードが必要です。';
  end if;

  return NEW;
end;
$$;

-- 既存トリガーがあれば削除してから作成
drop trigger if exists children_plan_limit_check on public.children;

create trigger children_plan_limit_check
  before insert on public.children
  for each row execute function public.check_children_plan_limit();
