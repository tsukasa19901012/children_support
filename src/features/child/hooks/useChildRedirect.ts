"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import { ensurePublicUserRow } from "../../auth/ensurePublicUserRow";
import {
  activeChildFromCache,
  hasRegisteredChild,
  loadChildCache,
  saveChildCache,
  type ChildInfo,
} from "../childCache";
import { PROFILE_TYPE_CHILD, type ProfileType } from "../types/profileType";

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
  const [profileType, setProfileType] = useState<ProfileType>(PROFILE_TYPE_CHILD);
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
      setProfileType(active.profileType);
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
        await ensurePublicUserRow(supabase, userId);

        const [childrenRes, userRes] = await Promise.all([
          supabase
            .from("children")
            .select("id, name, birthday, profile_type")
            .eq("user_id", userId)
            .order("created_at"),
          supabase
            .from("users")
            .select("active_child_id")
            .eq("id", userId)
            .single(),
        ]);

        if (cancelled) return;

        const rows = childrenRes.data;
        if (!rows || !hasRegisteredChild(
          rows.map((c) => ({
            id: c.id,
            name: c.name,
            birthday: c.birthday as string | null,
            profileType: (c.profile_type as ProfileType) ?? PROFILE_TYPE_CHILD,
          }))
        )) {
          router.replace("/onboarding");
          return;
        }

        const children: ChildInfo[] = rows.map((c) => ({
          id: c.id,
          name: c.name,
          birthday: c.birthday as string | null,
          profileType: (c.profile_type as ProfileType) ?? PROFILE_TYPE_CHILD,
        }));

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
      setProfileType(target.profileType);
    },
    [userId, allChildren]
  );

  return {
    childId,
    childName,
    childBirthday,
    profileType,
    childChecked,
    allChildren,
    switchChild,
  };
}
