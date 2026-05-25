import type { SupabaseClient } from "@supabase/supabase-js";

/** 保護者プロフィールが「誰の保護者か」を一方向で保存（child → caregiver, relation=guardian） */
export async function saveGuardianRelations(
  supabase: SupabaseClient,
  userId: string,
  caregiverId: string,
  childIds: string[]
): Promise<{ error: string | null }> {
  const { error: delError } = await supabase
    .from("child_sibling_relations")
    .delete()
    .eq("user_id", userId)
    .eq("sibling_id", caregiverId)
    .eq("relation", "guardian");

  if (delError) return { error: delError.message };

  if (childIds.length === 0) return { error: null };

  const rows = childIds.map((childId) => ({
    user_id: userId,
    child_id: childId,
    sibling_id: caregiverId,
    relation: "guardian" as const,
  }));

  const { error: insError } = await supabase
    .from("child_sibling_relations")
    .upsert(rows, { onConflict: "child_id,sibling_id" });

  return { error: insError?.message ?? null };
}

/** 保護者が担当するお子さん ID 一覧 */
export async function fetchGuardianChildIds(
  supabase: SupabaseClient,
  userId: string,
  caregiverId: string
): Promise<string[]> {
  const { data } = await supabase
    .from("child_sibling_relations")
    .select("child_id")
    .eq("user_id", userId)
    .eq("sibling_id", caregiverId)
    .eq("relation", "guardian");

  return (data ?? []).map((r) => r.child_id as string);
}
