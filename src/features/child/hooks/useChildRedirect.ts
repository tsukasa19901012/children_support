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
  const [childAge, setChildAge] = useState<number | null>(null);
  const [childChecked, setChildChecked] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    supabase
      .from("children")
      .select("name, age")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          router.replace("/onboarding");
        } else {
          setChildName(data.name);
          setChildAge(data.age);
          setChildChecked(true);
        }
      });
  }, [userId, router]);

  return { childName, childAge, childChecked };
}
