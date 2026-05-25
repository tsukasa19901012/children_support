"use client";

import { useState } from "react";
import { getPlan } from "../plans";

export function PlusPlanCard() {
  const plan = getPlan("plus");
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
