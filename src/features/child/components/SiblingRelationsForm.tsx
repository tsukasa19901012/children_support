"use client";

import { useState } from "react";
import {
  RELATION_KIND_OPTIONS,
  RELATION_NONE,
  type PeerRelationFormValue,
} from "../types/siblingRelation";

export type SiblingTarget = {
  id: string;
  name: string;
};

type Props = {
  childName: string;
  siblings: SiblingTarget[];
  initialRelations?: Record<string, PeerRelationFormValue>;
  saving: boolean;
  error?: string;
  onSubmit: (relations: Record<string, PeerRelationFormValue>) => void;
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
  const [relations, setRelations] = useState<Record<string, PeerRelationFormValue>>(
    () => {
      const init: Record<string, PeerRelationFormValue> = {};
      for (const s of siblings) {
        init[s.id] = initialRelations[s.id] ?? RELATION_NONE;
      }
      return init;
    }
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-8">
      <p className="text-base font-semibold text-gray-800 mb-1">
        {childName}ちゃんとの関係は？
      </p>
      <p className="text-xs text-gray-400 mb-5 leading-relaxed">
        きょうだい・いとこ・園の友達など、関係があるお子さんだけ選んでください。年上・年下は誕生日から自動で判断します。いま関係が薄い相手は「登録しない」で大丈夫です。
      </p>

      <div className="space-y-4 mb-5">
        {siblings.map((sibling) => (
          <div key={sibling.id}>
            <label className="text-xs text-gray-500 block mb-1.5">
              {sibling.name}ちゃんと{childName}ちゃん
            </label>
            <select
              value={relations[sibling.id] ?? RELATION_NONE}
              onChange={(e) =>
                setRelations((prev) => ({
                  ...prev,
                  [sibling.id]: e.target.value as PeerRelationFormValue,
                }))
              }
              disabled={saving}
              className="w-full border border-gray-300 rounded-xl px-3 py-3 outline-none focus:border-blue-400 bg-white"
            >
              <option value={RELATION_NONE}>登録しない（関係なし）</option>
              {RELATION_KIND_OPTIONS.map((opt) => (
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
        disabled={saving}
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
