"use client";

import { BRAND } from "../../../lib/brand";
import { PlusPlanCard } from "./PlusPlanCard";

type Props = {
  onClose: () => void;
};

export function UpgradeModal({ onClose }: Props) {
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
          <UpgradePlanIntro />
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2">
          <PlusPlanCard />
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

/** チャットのモーダル・マイページで共通の見出し */
export function UpgradePlanIntro() {
  return (
    <>
      <h2 className="text-base font-bold text-gray-800 mb-1">Plusプランにする</h2>
      <p className="text-sm text-gray-500 mb-1 leading-relaxed">
        {BRAND.tagline}
        <br />
        {BRAND.subtagline}
      </p>
      <p className="text-xs text-gray-400 mb-4">
        トライアル終了後も、うちの子の記憶を更新し続けられます
      </p>
    </>
  );
}
