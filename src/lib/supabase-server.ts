import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Route Handler・Server Component で使用するSupabaseクライアント。
 * Cookie からセッションを読み取り、認証済みユーザーの操作に使用する。
 */
export const createServerSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component では cookie の書き込みができない場合がある（無視して良い）
          }
        },
      },
    }
  );
};

/**
 * RLS をバイパスするサービスロールクライアント。
 * Route Handler 内でのDB書き込み（メッセージ保存等）に使用する。
 * サーバー側専用 — クライアントに渡してはいけない。
 */
export const createServiceSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};
