"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";

/**
 * ログイン済みユーザーのアクティブな子ども情報を取得し、
 * 未登録であれば /onboarding にリダイレクトする。
 */
export function useChildRedirect(userId: string | null) {
  const router = useRouter();
  const [childId, setChildId] = useState<string | null>(null);
  const [childName, setChildName] = useState<string | null>(null);
  const [childBirthday, setChildBirthday] = useState<string | null>(null);
  const [childChecked, setChildChecked] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();

    (async () => {
      try {
        // users.active_child_id を取得
        const { data: userData } = await supabase
          .from("users")
          .select("active_child_id")
          .eq("id", userId)
          .single();

        const activeId = userData?.active_child_id as string | null;

        if (activeId) {
          // active_child_id が設定されている場合はその子どもを取得
          const { data: child } = await supabase
            .from("children")
            .select("id, name, birthday")
            .eq("id", activeId)
            .maybeSingle();

          if (child) {
            setChildId(child.id);
            setChildName(child.name);
            setChildBirthday(child.birthday);
            setChildChecked(true);
            return;
          }
        }

        // active_child_id が未設定の場合は最初の子どもを取得
        const { data: firstChild } = await supabase
          .from("children")
          .select("id, name, birthday")
          .eq("user_id", userId)
          .order("created_at")
          .limit(1)
          .maybeSingle();

        if (!firstChild) {
          router.replace("/onboarding");
          return;
        }

        // active_child_id を設定してキャッシュ
        await supabase.from("users").update({ active_child_id: firstChild.id }).eq("id", userId);
        setChildId(firstChild.id);
        setChildName(firstChild.name);
        setChildBirthday(firstChild.birthday);
        setChildChecked(true);
      } catch (err) {
        console.error("[useChildRedirect] エラー:", err);
        // エラー時も永久ローディングを防ぐ
        setChildChecked(true);
      }
    })();
  }, [userId, router]);

  return { childId, childName, childBirthday, childChecked };
}
