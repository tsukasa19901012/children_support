-- Free + Plus プラン、14日トライアル（既存 DB 向け）
-- 新規は schema.sql のみで OK。Supabase SQL Editor で実行

alter table public.users
  add column if not exists trial_ends_at timestamptz;

update public.users
set trial_ends_at = created_at + interval '14 days'
where trial_ends_at is null;

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
begin
  select plan, trial_ends_at, created_at
  into user_plan, trial_end, user_created
  from public.users
  where id = NEW.user_id;

  if user_plan = 'plus' then
    return NEW;
  end if;

  if trial_end is null then
    trial_end := user_created + interval '14 days';
  end if;

  if now() < trial_end then
    return NEW;
  end if;

  select count(*) into children_count
  from public.children
  where user_id = NEW.user_id;

  if children_count >= 1 then
    raise exception '無料プラン（トライアル終了後）はお子さんを1人しか登録できません。Plusプランへのアップグレードが必要です。';
  end if;

  return NEW;
end;
$$;
