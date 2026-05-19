"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { formatAge } from "../../lib/childAge";

export type ChildRow = {
  id: string;
  name: string;
  birthday: string;
  gender: string | null;
};

type Props = {
  isPro: boolean;
  userId: string;
  initialChildren: ChildRow[];
  initialActiveChildId: string | null;
};

const GENDER_LABEL: Record<string, string> = {
  male: "男の子",
  female: "女の子",
  other: "未回答",
};

export function ChildManager({
  isPro,
  userId,
  initialChildren,
  initialActiveChildId,
}: Props) {
  const router = useRouter();
  const [children] = useState(initialChildren);
  const [activeChildId, setActiveChildId] = useState(initialActiveChildId);
  const [switching, setSwitching] = useState<string | null>(null);

  const handleSwitch = async (childId: string) => {
    setSwitching(childId);
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ active_child_id: childId })
      .eq("id", userId);
    if (!error) setActiveChildId(childId);
    setSwitching(null);
  };

  const hasMultiple = children.length > 1;
  const needsSelection = !isPro && hasMultiple;

  return (
    <div className="space-y-3">
      {needsSelection && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700 font-medium mb-0.5">相談するお子さんを選択してください</p>
          <p className="text-xs text-amber-600">
            Proプランに戻るとすべてのお子さんのデータが復活します
          </p>
        </div>
      )}

      {children.map((child) => {
        const isActive = child.id === activeChildId;
        return (
          <div
            key={child.id}
            className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
              isActive ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-blue-500" : "bg-gray-300"}`} />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {child.name}
                  {child.gender && (
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {GENDER_LABEL[child.gender] ?? ""}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{formatAge(child.birthday)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push(`/onboarding?mode=edit&childId=${child.id}`)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
              >
                編集
              </button>

              {!isActive && (
                <button
                  type="button"
                  disabled={switching === child.id}
                  onClick={() => handleSwitch(child.id)}
                  className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 disabled:opacity-50"
                >
                  {switching === child.id ? "..." : needsSelection ? "選択する" : "切り替え"}
                </button>
              )}

              {isActive && (
                <span className="text-xs text-blue-500 font-medium px-2 py-1">
                  ✓ 相談中
                </span>
              )}
            </div>
          </div>
        );
      })}

      {isPro && (
        <button
          type="button"
          onClick={() => router.push("/onboarding?mode=add")}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-gray-300 rounded-2xl py-3 text-sm text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors"
        >
          <span className="text-lg leading-none">+</span>
          子どもを追加する
        </button>
      )}

      {needsSelection && (
        <p className="text-xs text-center text-gray-400 pt-1">
          Proプランにアップグレードするとすべてのお子さんに同時対応できます
        </p>
      )}
    </div>
  );
}
