import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileType } from "../types/profileType";

const LAST_CHILD_ERROR = "最後のお子さんは削除できません";

export async function deleteChild(
  supabase: SupabaseClient,
  userId: string,
  childId: string,
  profileType: ProfileType,
  childProfileCount: number
): Promise<{ error: string | null }> {
  if (profileType === "child" && childProfileCount <= 1) {
    return { error: LAST_CHILD_ERROR };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("active_child_id")
    .eq("id", userId)
    .single();

  if (userRow?.active_child_id === childId) {
    const { data: others } = await supabase
      .from("children")
      .select("id")
      .eq("user_id", userId)
      .neq("id", childId)
      .order("created_at")
      .limit(1);

    const nextId = others?.[0]?.id;
    if (nextId) {
      const { error: switchErr } = await supabase
        .from("users")
        .update({ active_child_id: nextId })
        .eq("id", userId);
      if (switchErr) return { error: switchErr.message };
    }
  }

  const { error } = await supabase
    .from("children")
    .delete()
    .eq("id", childId)
    .eq("user_id", userId);

  if (error?.message?.includes("最後のお子さん")) {
    return { error: LAST_CHILD_ERROR };
  }

  return { error: error?.message ?? null };
}
