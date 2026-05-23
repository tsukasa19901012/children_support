"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { getPlan } from "../../features/billing/plans";
import {
  shouldShowBillingPortal,
  shouldShowUpgradeCheckout,
} from "../../features/billing/billingUi";
import type { PlanId } from "../../features/billing/types";

type Props = {
  planId: PlanId;
  isTrialActive?: boolean;
};

export function AccountActions({ planId, isTrialActive = false }: Props) {
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const showUpgrade = shouldShowUpgradeCheckout(planId);
  const showBillingPortal = shouldShowBillingPortal(planId);
  const billingBusy = checkoutLoading || portalLoading;
  const plus = getPlan("plus");

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

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    setBillingError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "plus" }),
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
      {showUpgrade && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800">Plusプランにする</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            相談し放題、うちの子の記憶の更新、複数の子の登録、週次の振り返りレポートが使えます。
            {isTrialActive && (
              <>
                <br />
                体験期間中でも登録できます。登録後はトライアル終了後もPlus機能が続きます。
              </>
            )}
          </p>

          {billingError && (
            <p className="text-xs text-red-500">{billingError}</p>
          )}

          <button
            type="button"
            onClick={handleUpgrade}
            disabled={billingBusy}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
          >
            {checkoutLoading ? "処理中..." : `Plus ¥${plus.priceMonthly.toLocaleString()}/月`}
          </button>
        </div>
      )}

      {showBillingPortal && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800">お支払い・プラン管理</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            解約や支払い方法の変更は Stripe の管理画面から行えます。変更後は自動でアプリに反映されます。
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
