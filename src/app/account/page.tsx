import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient, createServiceSupabaseClient } from "../../lib/supabase-server";
import { getPlan } from "../../features/billing/plans";
import type { PlanId } from "../../features/billing/types";
import { getJSTDayStartISO } from "../../lib/date";
import { AccountActions } from "./AccountActions";
import { ChildManager } from "./ChildManager";
import { PlanCacheWriter } from "../../features/billing/components/PlanCacheWriter";

const PLAN_COLOR: Record<PlanId, string> = {
  free: "bg-gray-100 text-gray-700",
  lite: "bg-blue-100 text-blue-700",
  pro:  "bg-violet-100 text-violet-700",
};

async function fetchAccountData(userId: string) {
  const db = createServiceSupabaseClient();

  const [userRes, usageRes, childrenRes] = await Promise.all([
    db.from("users").select("plan, active_child_id").eq("id", userId).single(),
    db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("role", "user")
      .gte("created_at", getJSTDayStartISO()),
    db
      .from("children")
      .select("id, name, birthday, gender")
      .eq("user_id", userId)
      .order("created_at"),
  ]);

  const planId = (userRes.data?.plan as PlanId | null) ?? "free";
  const children = childrenRes.data ?? [];
  const activeChildId =
    (userRes.data?.active_child_id as string | null) ??
    children[0]?.id ??
    null;

  return {
    planId,
    todayUsage: usageRes.count ?? 0,
    children,
    activeChildId,
  };
}

export default async function AccountPage() {
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/login");

  const { planId, todayUsage, children, activeChildId } = await fetchAccountData(user.id);
  const plan = getPlan(planId);
  const isFree = planId === "free";
  const remaining = isFree && plan.dailyLimit !== null
    ? Math.max(0, plan.dailyLimit - todayUsage)
    : null;

  return (
    <div className="min-h-dvh bg-gray-50">
      <PlanCacheWriter userId={user.id} planId={planId} />
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
          ← チャットに戻る
        </Link>
        <span className="font-bold text-sm text-gray-800">マイページ</span>
        <div className="w-16" />
      </header>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {/* プラン */}
        <section className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">現在のプラン</h2>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_COLOR[planId]}`}>
              {plan.name.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {isFree ? "無料プランをご利用中です" : "有料プランをご利用中です"}
          </p>
          <ul className="space-y-1.5">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                <span className="text-green-500 font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* 利用状況 */}
        <section className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">本日の利用状況</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">送信回数</span>
            <span className="font-semibold text-gray-800">
              {todayUsage}
              {plan.dailyLimit !== null ? (
                <span className="text-gray-400 font-normal"> / {plan.dailyLimit}回</span>
              ) : (
                <span className="text-gray-400 font-normal"> 回（無制限）</span>
              )}
            </span>
          </div>
          {isFree && remaining !== null && (
            <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-500">残り回数</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                remaining === 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
              }`}>
                {remaining === 0 ? "上限到達" : `あと ${remaining} 回`}
              </span>
            </div>
          )}
          {!isFree && (
            <div className="flex items-center justify-between text-sm mt-3 pt-3 border-t border-gray-100">
              <span className="text-gray-500">制限</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                無制限
              </span>
            </div>
          )}
        </section>

        {/* アカウント */}
        <section className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-3">アカウント</h2>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">メールアドレス</span>
            <span className="text-gray-700 truncate max-w-[180px]">{user.email}</span>
          </div>
        </section>

        {/* 子ども情報 */}
        <section className="bg-white rounded-xl border border-gray-100 p-4">
          <h2 className="text-sm font-bold text-gray-800 mb-1">お子さんの情報</h2>
          {planId === "pro" && (
            <p className="text-xs text-gray-400 mb-3">Proプランは複数のお子さんを登録できます</p>
          )}
          <ChildManager
            isPro={planId === "pro"}
            userId={user.id}
            initialChildren={children}
            initialActiveChildId={activeChildId}
          />
        </section>

        <AccountActions planId={planId} />
      </div>
    </div>
  );
}
