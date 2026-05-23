-- ★ ステップ 2 / 2 — step1_enum.sql の実行成功後に、このファイルだけ実行
--
-- 新規環境は schema.sql のみで OK。
-- 再実行しても害のないよう idempotent に記述。

-- 1. trial_ends_at 列
alter table public.users
  add column if not exists trial_ends_at timestamptz;

update public.users
set trial_ends_at = created_at + interval '14 days'
where trial_ends_at is null;

-- 2. 旧有料プラン（lite / pro）を plus に統合
--    ※ step1 で plan_type に plus を追加済みであること
update public.users
set plan = 'plus'
where plan::text in ('lite', 'pro');

-- 3. 子ども数制限トリガー（plus またはトライアル中は複数可）
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

-- 実行後の確認（任意）:
-- select plan::text, count(*) from public.users group by plan;
