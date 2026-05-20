"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import {
  activeChildFromCache,
  loadChildCache,
  saveChildCache,
  type ChildInfo,
} from "../childCache";

export type { ChildInfo };

/**
 * ログイン済みユーザーのアクティブな子ども情報を取得し、
 * 未登録であれば /onboarding にリダイレクトする。
 * allChildren と switchChild を返すことでヘッダーから切替可能。
 */
export function useChildRedirect(userId: string | null) {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [childBirthday, setChildBirthday] = useState<string | null>(null);
  const [childChecked, setChildChecked] = useState(false);
  const [allChildren, setAllChildren] = useState<ChildInfo[]>([]);

  const applyActiveChild = useCallback(
    (children: ChildInfo[], activeId: string) => {
      const active =
        children.find((c) => c.id === activeId) ?? children[0] ?? null;
      if (!active) return;
      setAllChildren(children);
      setChildId(active.id);
      setChildName(active.name);
      setChildBirthday(active.birthday);
      setChildChecked(true);
    },
    []
  );

  useLayoutEffect(() => {
    if (!userId) return;
    const cached = loadChildCache(userId);
    if (!cached) return;
    const active = activeChildFromCache(cached);
    if (active) applyActiveChild(cached.children, active.id);
  }, [userId, applyActiveChild]);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    let cancelled = false;

    (async () => {
      try {
        const [childrenRes, userRes] = await Promise.all([
          supabase
            .from("children")
            .select("id, name, birthday")
            .eq("user_id", userId)
            .order("created_at"),
          supabase
            .from("users")
            .select("active_child_id")
            .eq("id", userId)
            .single(),
        ]);

        if (cancelled) return;

        const children = childrenRes.data;
        if (!children || children.length === 0) {
          router.replace("/onboarding");
          return;
        }

        const activeId = userRes.data?.active_child_id as string | null;
        const active =
          children.find((c) => c.id === activeId) ?? children[0];

        if (!activeId || !children.find((c) => c.id === activeId)) {
          await supabase
            .from("users")
            .update({ active_child_id: active.id })
            .eq("id", userId);
        }

        saveChildCache(userId, children, active.id);
        applyActiveChild(children, active.id);
      } catch (err) {
        console.error("[useChildRedirect] エラー:", err);
        if (!cancelled) setChildChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, router, applyActiveChild]);

  const switchChild = useCallback(
    async (newChildId: string) => {
      if (!userId) return;
      const target = allChildren.find((c) => c.id === newChildId);
      if (!target) return;

      const supabase = createClient();
      await supabase
        .from("users")
        .update({ active_child_id: newChildId })
        .eq("id", userId);
      saveChildCache(userId, allChildren, newChildId);
      setChildId(target.id);
      setChildName(target.name);
      setChildBirthday(target.birthday);
    },
    [userId, allChildren]
  );

  return { childId, childName, childBirthday, childChecked, allChildren, switchChild };
}
