"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../lib/supabase-browser";

type UseAuthUserIdResult = {
  userId: string | null;
  signOut: () => Promise<void>;
};

export const useAuthUserId = (): UseAuthUserIdResult => {
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // createClient() はブラウザでのみ呼ぶ（SSR では実行しない）
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUserId(session?.user?.id ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return { userId, signOut };
};
