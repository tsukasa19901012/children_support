"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Implicit フロー: ブラウザクライアントがハッシュから自動的にセッションを取得する
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        subscription.unsubscribe();
        router.replace("/");
        return;
      }
      if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
        subscription.unsubscribe();
        router.replace("/login?error=auth_failed");
      }
    });

    // セッションがすでに存在する場合（再アクセス時など）
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        router.replace("/");
      }
    });

    // タイムアウト: 5秒以内にセッションが取得できなければログインに戻す
    const timer = setTimeout(() => {
      subscription.unsubscribe();
      router.replace("/login?error=auth_failed");
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-dvh bg-gray-50">
      <div className="text-center">
        <div className="text-3xl mb-3">👶</div>
        <p className="text-gray-500 text-sm">ログイン中...</p>
      </div>
    </div>
  );
}
