"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";

export type ChildInfo = {
  id: string;
  name: string;
  birthday: string;
};

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

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    (async () => {
      try {
        // 全子どもを取得
        const { data: children } = await supabase
          .from("children")
          .select("id, name, birthday")
          .eq("user_id", userId)
          .order("created_at");

        if (!children || children.length === 0) {
          router.replace("/onboarding");
          return;
        }

        setAllChildren(children);

        // active_child_id を取得
        const { data: userData } = await supabase
          .from("users")
          .select("active_child_id")
          .eq("id", userId)
          .single();

        const activeId = userData?.active_child_id as string | null;
        const active = children.find((c) => c.id === activeId) ?? children[0];

        // active_child_id が未設定または無効なら最初の子どもに設定
        if (!activeId || !children.find((c) => c.id === activeId)) {
          await supabase.from("users").update({ active_child_id: active.id }).eq("id", userId);
        }

        setChildId(active.id);
        setChildName(active.name);
        setChildBirthday(active.birthday);
        setChildChecked(true);
      } catch (err) {
        console.error("[useChildRedirect] エラー:", err);
        setChildChecked(true);
      }
    })();
  }, [userId, router]);

  /** アクティブな子どもをヘッダーから切り替える */
  const switchChild = useCallback(async (newChildId: string) => {
    if (!userId) return;
    const target = allChildren.find((c) => c.id === newChildId);
    if (!target) return;

    const supabase = createClient();
    await supabase.from("users").update({ active_child_id: newChildId }).eq("id", userId);
    setChildId(target.id);
    setChildName(target.name);
    setChildBirthday(target.birthday);
  }, [userId, allChildren]);

  return { childId, childName, childBirthday, childChecked, allChildren, switchChild };
}
