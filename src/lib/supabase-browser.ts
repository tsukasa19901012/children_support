"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * クライアントコンポーネント・hooksで使用するSupabaseクライアント。
 * Cookie ベースのセッションを自動管理する。
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "implicit" } }
  );
