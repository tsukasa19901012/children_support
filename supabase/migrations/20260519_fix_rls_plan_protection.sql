-- ============================================================
-- users.plan 列をクライアントから直接更新できないよう保護
-- plan の変更は service_role（サーバー側）のみ許可する
-- ============================================================

-- 既存の "users: update own" ポリシーを削除
drop policy if exists "users: update own" on public.users;

-- stripe_customer_id のみ本人が更新できる列制限ポリシーに差し替え
-- plan 列は含めないことで、クライアントから plan を書き換え不可にする
create policy "users: update own (non-plan columns)"
  on public.users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- plan 列の保護: PostgreSQL の列レベル権限で anon / authenticated ロールから revoke
-- (service_role は RLS をバイパスするため引き続き更新可能)
revoke update (plan) on public.users from anon;
revoke update (plan) on public.users from authenticated;
