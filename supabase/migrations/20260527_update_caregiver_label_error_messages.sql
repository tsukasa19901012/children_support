-- UI 文言に合わせて保護者ラベルを あなた（保護者） に更新

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
      raise exception 'あなた（保護者）の登録にはPlusプランが必要です。';
    end if;

    select count(*) into caregiver_count
    from public.children
    where user_id = NEW.user_id
      and profile_type = 'caregiver';

    if caregiver_count >= 1 then
      raise exception 'あなた（保護者）は1人まで登録できます。';
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
    raise exception '無料プラン（体験期間終了後）ではお子さんを1人のみ登録できます。Plusプランへのアップグレードが必要です。';
  end if;

  return NEW;
end;
$$;
