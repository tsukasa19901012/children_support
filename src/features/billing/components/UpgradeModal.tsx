"use client";

import { useState } from "react";
import { BRAND } from "../../../lib/brand";
import { PLANS, getPlan } from "../plans";

type Props = {
  onClose: () => void;
};

export function UpgradeModal({ onClose }: Props) {
  const plus = getPlan("plus");

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl flex flex-col max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-5" />
          <h2 className="text-base font-bold text-gray-800 mb-1">
            Plusプランにする
          </h2>
          <p className="text-sm text-gray-500 mb-1 leading-relaxed">
            {BRAND.tagline}
            <br />
            {BRAND.subtagline}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            トライアル終了後も、うちの子の記憶を更新し続けられます
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <PlanCard plan={plus} />
        </div>

        <div className="px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3 shrink-0 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full text-sm text-gray-400 py-2"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: (typeof PLANS)[number] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "plus" }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setError(data.error ?? "エラーが発生しました。");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative rounded-2xl border border-blue-400 bg-blue-50 p-4">
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
        className="w-full text-center text-sm font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50 bg-blue-500 hover:bg-blue-600 text-white"
      >
        {loading ? "処理中..." : "Plusをはじめる"}
      </button>
    </div>
  );
}
