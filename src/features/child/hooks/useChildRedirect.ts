"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";

/**
 * ログイン済みユーザーの子ども情報を確認し、
 * 未登録であれば /onboarding にリダイレクトする。
 */
export function useChildRedirect(userId: string | null) {
  const router = useRouter();
  const [childName, setChildName] = useState<string | null>(null);
  const [childBirthday, setChildBirthday] = useState<string | null>(null);
  const [childChecked, setChildChecked] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    supabase
      .from("children")
      .select("name, birthday")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          router.replace("/onboarding");
        } else {
          setChildName(data.name);
          setChildBirthday(data.birthday);
          setChildChecked(true);
        }
      });
  }, [userId, router]);

  return { childName, childBirthday, childChecked };
}
