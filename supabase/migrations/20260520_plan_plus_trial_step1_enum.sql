-- ★ ステップ 1 / 2 — このファイルだけ実行してください
--
-- PostgreSQL の制約: enum に新しい値を追加した直後は、
-- 同じトランザクション内でその値を使えません（55P04）。
-- 必ずこのファイル単体で Run → 成功してから step2 へ。
--
-- 新規環境は schema.sql のみで OK。

alter type plan_type add value if not exists 'plus';
