"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import { formatAge } from "../../lib/childAge";
import {
  ACCOUNT_RELOAD_CHILDREN_KEY,
  markAccountReturnStack,
} from "../../features/account/hooks/useAccountReturn";
import {
  loadAccountChildren,
  type AccountChildRow,
  type AccountSiblingRelationRow,
} from "../../features/child/lib/loadAccountChildren";
import {
  relationLabel,
  type SiblingRelation,
} from "../../features/child/types/siblingRelation";
import { DeleteChildConfirmDialog } from "../../features/child/components/DeleteChildConfirmDialog";
import { deleteChild } from "../../features/child/lib/deleteChild";

export type ChildRow = AccountChildRow;
type SiblingRelationRow = AccountSiblingRelationRow;

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

const actionBtn =
  "flex-1 min-w-[calc(50%-0.25rem)] text-xs font-medium py-2.5 rounded-xl transition-colors";

export function ChildManager({
  isPro,
  userId,
  initialChildren,
  initialActiveChildId,
  siblingRelations,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
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

  const reloadChildren = useCallback(async () => {
    const supabase = createClient();
    const data = await loadAccountChildren(supabase, userId);
    setChildren(data.children);
    setActiveChildId(data.activeChildId);
    setRelations(data.siblingRelations);
  }, [userId]);

  useEffect(() => {
    if (pathname !== "/account") return;
    if (sessionStorage.getItem(ACCOUNT_RELOAD_CHILDREN_KEY) !== "1") return;
    sessionStorage.removeItem(ACCOUNT_RELOAD_CHILDREN_KEY);
    void reloadChildren();
  }, [pathname, reloadChildren]);

  const goToOnboarding = (path: string) => {
    markAccountReturnStack();
    router.push(path);
  };

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
          <p className="text-xs text-amber-700 font-medium mb-0.5">
            相談するお子さんを選択してください
          </p>
          <p className="text-xs text-amber-600">
            Proプランに戻るとすべてのお子さんのデータが復活します
          </p>
        </div>
      )}

      {children.map((child) => {
        const isActive = child.id === activeChildId;
        const peers = peerRelations(child.id);
        const showPeers = isPro && hasMultiple && peers.length > 0;

        return (
          <div
            key={child.id}
            className={`rounded-2xl border px-4 py-3 transition-colors ${
              isActive ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${isActive ? "bg-blue-500" : "bg-gray-300"}`}
              />
              <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {child.name}
                    {child.gender && (
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        {GENDER_LABEL[child.gender] ?? ""}
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">{formatAge(child.birthday)}</p>
                </div>
                {isActive ? (
                  <span className="shrink-0 text-xs text-blue-500 font-medium whitespace-nowrap">
                    ✓ 相談中
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={switching === child.id}
                    onClick={() => handleSwitch(child.id)}
                    className="shrink-0 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors"
                  >
                    {switching === child.id
                      ? "切り替え中..."
                      : needsSelection
                        ? "この子で相談"
                        : "相談に切り替え"}
                  </button>
                )}
              </div>
            </div>

            {showPeers && (
              <ul
                className="mt-3 ml-5 space-y-2 border-l-2 border-violet-100 pl-3"
                aria-label="登録されている関係"
              >
                {peers.map((peer) => (
                  <li key={peer.key} className="text-xs leading-relaxed">
                    <span className="inline-block rounded-md bg-violet-100 text-violet-700 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap">
                      {peer.relation}
                    </span>
                    <span className="text-gray-700 ml-2 break-words">
                      {peer.name}ちゃん
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-3 pt-3 flex flex-wrap gap-2 border-t border-gray-100">
              {isPro && hasMultiple && (
                <button
                  type="button"
                  onClick={() =>
                    goToOnboarding(
                      `/onboarding?mode=siblings&childId=${child.id}`
                    )
                  }
                  className={`${actionBtn} text-violet-600 bg-violet-50 hover:bg-violet-100`}
                >
                  関係を編集
                </button>
              )}
              <button
                type="button"
                onClick={() =>
                  goToOnboarding(`/onboarding?mode=edit&childId=${child.id}`)
                }
                className={`${actionBtn} text-gray-700 bg-gray-50 hover:bg-gray-100`}
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
                  className={`${actionBtn} text-red-600 bg-red-50 hover:bg-red-100`}
                >
                  削除
                </button>
              )}
            </div>
          </div>
        );
      })}

      {isPro && (
        <button
          type="button"
          onClick={() => goToOnboarding("/onboarding?mode=add")}
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
