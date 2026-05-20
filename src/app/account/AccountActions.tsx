"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import type { PlanId } from "../../features/billing/types";

type Props = {
  planId: PlanId;
};

export function AccountActions({ planId }: Props) {
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const isFree = planId === "free";
  const billingBusy = checkoutLoading || portalLoading;

  const handleOpenBillingPortal = async () => {
    setPortalLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setBillingError(data.error ?? "エラーが発生しました。");
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingError("通信エラーが発生しました。");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (targetPlanId: "lite" | "pro") => {
    setCheckoutLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: targetPlanId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setBillingError(data.error ?? "エラーが発生しました。");
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingError("通信エラーが発生しました。");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSignOutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-3">
      {/* アップグレードボタン（フリープランのみ表示） */}
      {isFree && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800">プランをアップグレード</p>
          <p className="text-xs text-gray-500">
            有料プランで回数制限なしにAI育児相談をご利用いただけます。
          </p>

          {billingError && (
            <p className="text-xs text-red-500">{billingError}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleUpgrade("lite")}
              disabled={billingBusy}
              className="flex-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {checkoutLoading ? "処理中..." : "Lite ¥980/月"}
            </button>
            <button
              type="button"
              onClick={() => handleUpgrade("pro")}
              disabled={billingBusy}
              className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
            >
              {checkoutLoading ? "処理中..." : "Pro ¥2,980/月"}
            </button>
          </div>
        </div>
      )}

      {!isFree && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800">お支払い・プラン管理</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            プランの変更（Lite ↔ Pro）や解約は Stripe の管理画面から行えます。変更後は自動でアプリに反映されます。
          </p>
          {billingError && (
            <p className="text-xs text-red-500">{billingError}</p>
          )}
          <button
            type="button"
            onClick={handleOpenBillingPortal}
            disabled={billingBusy}
            className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-800 text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            {portalLoading ? "接続中..." : "お支払い管理を開く"}
          </button>
        </div>
      )}

      {/* ログアウト */}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signOutLoading}
        className="w-full text-sm text-gray-400 hover:text-gray-600 py-3 transition-colors disabled:opacity-50"
      >
        {signOutLoading ? "ログアウト中..." : "ログアウト"}
      </button>
    </div>
  );
}
