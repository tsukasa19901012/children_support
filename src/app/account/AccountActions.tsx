"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import {
  shouldShowBillingPortal,
  shouldShowUpgradeCheckout,
} from "../../features/billing/billingUi";
import { PlusPlanCard } from "../../features/billing/components/PlusPlanCard";
import { UpgradePlanIntro } from "../../features/billing/components/UpgradeModal";
import type { PlanId } from "../../features/billing/types";

type Props = {
  planId: PlanId;
};

export function AccountActions({ planId }: Props) {
  const router = useRouter();
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const showUpgrade = shouldShowUpgradeCheckout(planId);
  const showBillingPortal = shouldShowBillingPortal(planId);

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

  const handleSignOut = async () => {
    setSignOutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="space-y-3">
      {showUpgrade && (
        <section className="bg-white rounded-xl border border-gray-100 p-4">
          <UpgradePlanIntro />
          <PlusPlanCard />
        </section>
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
            disabled={portalLoading}
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
