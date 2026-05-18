"use client";

import { useState } from "react";
import { PLANS } from "../plans";
import type { Plan } from "../types";

type Props = {
  onClose: () => void;
};

export function UpgradeModal({ onClose }: Props) {
  const paidPlans = PLANS.filter((p) => p.id !== "free");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl px-5 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />

        <h2 className="text-base font-bold text-gray-800 mb-1">
          プランをアップグレード
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          無制限でAI育児相談をご利用いただけます。
        </p>

        <div className="flex flex-col gap-3">
          {paidPlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 w-full text-sm text-gray-400 py-2"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPro = plan.id === "pro";

  const handleSelect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "エラーが発生しました。");
        return;
      }

      // Stripe Checkout ページへリダイレクト
      window.location.href = data.url;
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl border p-4 ${
        isPro ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
      }`}
    >
      {isPro && (
        <span className="absolute -top-2.5 left-4 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          おすすめ
        </span>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <span className="font-bold text-gray-800">{plan.name}</span>
          <span className="ml-2 text-xs text-gray-500">プラン</span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-gray-800">
            ¥{plan.priceMonthly.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">/月</span>
        </div>
      </div>

      <ul className="mb-4 space-y-1">
        {plan.features.map((f) => (
          <li key={f} className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="text-blue-500 font-bold">✓</span>
            {f}
          </li>
        ))}
      </ul>

      {error && (
        <p className="mb-2 text-xs text-red-500 text-center">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSelect}
        disabled={loading}
        className={`w-full text-center text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 ${
          isPro
            ? "bg-blue-500 hover:bg-blue-600 text-white"
            : "bg-gray-100 hover:bg-gray-200 text-gray-800"
        }`}
      >
        {loading ? "処理中..." : "このプランを選択"}
      </button>
    </div>
  );
}
