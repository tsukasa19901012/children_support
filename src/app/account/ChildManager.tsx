"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { formatAge } from "../../lib/childAge";
import {
  relationLabel,
  type SiblingRelation,
} from "../../features/child/types/siblingRelation";
import { DeleteChildConfirmDialog } from "../../features/child/components/DeleteChildConfirmDialog";
import { deleteChild } from "../../features/child/lib/deleteChild";

export type ChildRow = {
  id: string;
  name: string;
  birthday: string;
  gender: string | null;
};

type SiblingRelationRow = {
  child_id: string;
  sibling_id: string;
  relation: string;
};

type Props = {
  isPro: boolean;
  userId: string;
  initialChildren: ChildRow[];
  initialActiveChildId: string | null;
  siblingRelations: SiblingRelationRow[];
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
  siblingRelations,
}: Props) {
  const router = useRouter();
  const [children, setChildren] = useState(initialChildren);
  const [activeChildId, setActiveChildId] = useState(initialActiveChildId);
  const [relations, setRelations] = useState(siblingRelations);
  const [switching, setSwitching] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChildRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setChildren(initialChildren);
    setActiveChildId(initialActiveChildId);
    setRelations(siblingRelations);
  }, [initialChildren, initialActiveChildId, siblingRelations]);

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
  const canDelete = children.length > 1;
  const needsSelection = !isPro && hasMultiple;

  const confirmDelete = async () => {
    if (!deleteTarget || !canDelete) return;
    setDeleting(true);
    setDeleteError("");
    const supabase = createClient();
    const { error } = await deleteChild(
      supabase,
      userId,
      deleteTarget.id,
      children.length
    );
    if (error) {
      setDeleteError(error);
      setDeleting(false);
      return;
    }
    const remaining = children.filter((c) => c.id !== deleteTarget.id);
    setChildren(remaining);
    setRelations((prev) =>
      prev.filter(
        (r) =>
          r.child_id !== deleteTarget.id && r.sibling_id !== deleteTarget.id
      )
    );
    if (activeChildId === deleteTarget.id) {
      setActiveChildId(remaining[0]?.id ?? null);
    }
    setDeleteTarget(null);
    setDeleting(false);
    router.refresh();
  };

  const childNameMap = new Map(children.map((c) => [c.id, c.name]));

  const peerRelations = (childId: string) =>
    relations
      .filter((r) => r.child_id === childId)
      .map((r) => ({
        key: r.sibling_id,
        relation: relationLabel(r.relation as SiblingRelation),
        name: childNameMap.get(r.sibling_id) ?? "お子さん",
      }));

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
            className={`flex items-start justify-between rounded-2xl border px-4 py-3 transition-colors ${
              isActive ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white"
            }`}
          >
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${isActive ? "bg-blue-500" : "bg-gray-300"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-800">
                  {child.name}
                  {child.gender && (
                    <span className="ml-1 text-xs font-normal text-gray-400">
                      {GENDER_LABEL[child.gender] ?? ""}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{formatAge(child.birthday)}</p>
                {isPro && hasMultiple && peerRelations(child.id).length > 0 && (
                  <ul className="mt-2 space-y-1" aria-label="登録されている関係">
                    {peerRelations(child.id).map((peer) => (
                      <li
                        key={peer.key}
                        className="flex items-baseline gap-1.5 text-xs leading-snug"
                      >
                        <span className="shrink-0 rounded-md bg-violet-100 text-violet-700 px-1.5 py-0.5 text-[10px] font-medium">
                          {peer.relation}
                        </span>
                        <span className="text-gray-600 truncate">
                          {peer.name}ちゃん
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              {isPro && hasMultiple && (
                <button
                  type="button"
                  onClick={() =>
                    router.push(`/onboarding?mode=siblings&childId=${child.id}`)
                  }
                  className="text-xs text-violet-500 hover:text-violet-700 px-2 py-1 rounded-lg hover:bg-violet-50"
                >
                  関係
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push(`/onboarding?mode=edit&childId=${child.id}`)}
                className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded-lg hover:bg-gray-100"
              >
                編集
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    setDeleteError("");
                    setDeleteTarget(child);
                  }}
                  className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  削除
                </button>
              )}

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

      {!canDelete && children.length === 1 && (
        <p className="text-xs text-center text-gray-400 pt-1">
          お子さんが1人のときは削除できません
        </p>
      )}

      {deleteError && (
        <p className="text-xs text-center text-red-500">{deleteError}</p>
      )}

      {deleteTarget && (
        <DeleteChildConfirmDialog
          childName={deleteTarget.name}
          deleting={deleting}
          onConfirm={confirmDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
