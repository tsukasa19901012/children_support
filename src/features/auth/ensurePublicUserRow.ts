import type { SupabaseClient } from "@supabase/supabase-js";

/** auth.users 登録後、public.users 行が無いと children FK で失敗するため作成する */
export async function ensurePublicUserRow(
  supabase: SupabaseClient,
  userId: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  return { error: error?.message ?? null };
}
