"use client";

import { useMemo, useState } from "react";
import {
  SIBLING_RELATION_OPTIONS,
  type SiblingRelation,
} from "../types/siblingRelation";

export type SiblingTarget = {
  id: string;
  name: string;
};

type Props = {
  childName: string;
  siblings: SiblingTarget[];
  initialRelations?: Record<string, SiblingRelation>;
  saving: boolean;
  error?: string;
  onSubmit: (relations: Record<string, SiblingRelation>) => void;
  onBack?: () => void;
  onSkip?: () => void;
  submitLabel?: string;
};

export function SiblingRelationsForm({
  childName,
  siblings,
  initialRelations = {},
  saving,
  error,
  onSubmit,
  onBack,
  onSkip,
  submitLabel = "保存して完了",
}: Props) {
  const [relations, setRelations] = useState<Record<string, SiblingRelation>>(
    () => {
      const init: Record<string, SiblingRelation> = {};
      for (const s of siblings) {
        init[s.id] = initialRelations[s.id] ?? "younger_sister";
      }
      return init;
    }
  );

  const allSelected = useMemo(
    () => siblings.every((s) => relations[s.id]),
    [siblings, relations]
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
      <p className="text-base font-semibold text-gray-800 mb-1">
        {childName}ちゃんのきょうだいは？
      </p>
      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
        きょうだい同士の相談（嫉妬・喧嘩など）のとき、AIが関係を踏まえて答えます
      </p>

      <div className="space-y-4 mb-5">
        {siblings.map((sibling) => (
          <div key={sibling.id}>
            <label className="text-xs text-gray-500 block mb-1.5">
              {sibling.name}ちゃんは{childName}ちゃんの
            </label>
            <select
              value={relations[sibling.id] ?? ""}
              onChange={(e) =>
                setRelations((prev) => ({
                  ...prev,
                  [sibling.id]: e.target.value as SiblingRelation,
                }))
              }
              disabled={saving}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 outline-none focus:border-blue-400 bg-white"
            >
              {SIBLING_RELATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-500 text-center mb-3">{error}</p>
      )}

      <button
        type="button"
        disabled={saving || !allSelected}
        onClick={() => onSubmit(relations)}
        className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-medium py-3 rounded-xl text-sm transition-colors"
      >
        {saving ? "保存中..." : submitLabel}
      </button>

      {onSkip && (
        <button
          type="button"
          disabled={saving}
          onClick={onSkip}
          className="w-full text-xs text-gray-400 underline mt-3"
        >
          あとで設定する
        </button>
      )}

      {onBack && (
        <button
          type="button"
          disabled={saving}
          onClick={onBack}
          className="w-full text-xs text-gray-400 underline mt-2"
        >
          戻る
        </button>
      )}
    </div>
  );
}
