"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase-browser";
import { BrandMark } from "../../../features/auth/components/BrandMark";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // PKCE フロー: ?code= パラメータをクライアント側で交換
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (data.session && !error) {
          router.replace("/");
        } else {
          console.error("[callback] PKCE code exchange failed:", error?.message);
          router.replace("/login?error=auth_failed");
        }
      });
      return;
    }

    // Implicit フロー: ハッシュにアクセストークンがある場合
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
        subscription.unsubscribe();
        router.replace("/");
        return;
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe();
        router.replace("/");
      }
    });

    const timer = setTimeout(() => {
      subscription.unsubscribe();
      router.replace("/login?error=auth_failed");
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="flex items-center justify-center h-dvh bg-gray-50">
      <div className="text-center">
        <div className="mb-3 flex justify-center">
          <BrandMark size="md" />
        </div>
        <p className="text-gray-500 text-sm">ログイン中...</p>
      </div>
    </div>
  );
}
