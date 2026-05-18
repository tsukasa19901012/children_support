"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase-browser";

type UseAuthUserIdResult = {
  userId: string | null;
  signOut: () => Promise<void>;
};

/**
 * Supabase Auth からログイン中のユーザーIDを取得するフック。
 * 未ログインの場合は middleware がリダイレクトするが、
 * フック側でも null を返して二重に守る。
 */
export const useAuthUserId = (): UseAuthUserIdResult => {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // 初期セッション取得
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });

    // セッション変化を監視（ログアウト等）
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return { userId, signOut };
};
