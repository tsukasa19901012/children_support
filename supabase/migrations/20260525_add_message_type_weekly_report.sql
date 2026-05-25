-- 既存環境向け: 週次レポート識別用カラム
-- schema.sql にも反映済み。本番は SQL Editor でこのファイルのみ実行。

alter table public.messages
  add column if not exists message_type text not null default 'chat'
    check (message_type in ('chat', 'weekly_report'));

alter table public.messages
  add column if not exists report_period_start date;

alter table public.messages
  add column if not exists report_period_end date;

create index if not exists messages_weekly_report_user_idx
  on public.messages(user_id, created_at desc)
  where message_type = 'weekly_report';

-- 過去の週次レポートをバックフィル
update public.messages
set message_type = 'weekly_report'
where role = 'assistant'
  and message_type = 'chat'
  and content like '📋 %振り返り%';
