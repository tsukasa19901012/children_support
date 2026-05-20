"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * クライアントコンポーネント・hooksで使用するSupabaseクライアント。
 * Cookie ベースのセッションを自動管理する（シングルトン）。
 */
let browserClient: SupabaseClient | undefined;

export const createClient = (): SupabaseClient => {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { flowType: "implicit" } }
    );
  }
  return browserClient;
};
