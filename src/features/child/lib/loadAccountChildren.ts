import type { SupabaseClient } from "@supabase/supabase-js";

export type AccountChildRow = {
  id: string;
  name: string;
  birthday: string;
  gender: string | null;
};

export type AccountSiblingRelationRow = {
  child_id: string;
  sibling_id: string;
  relation: string;
};

export async function loadAccountChildren(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  children: AccountChildRow[];
  siblingRelations: AccountSiblingRelationRow[];
  activeChildId: string | null;
}> {
  const [childrenRes, siblingRes, userRes] = await Promise.all([
    supabase
      .from("children")
      .select("id, name, birthday, gender")
      .eq("user_id", userId)
      .order("created_at"),
    supabase
      .from("child_sibling_relations")
      .select("child_id, sibling_id, relation")
      .eq("user_id", userId),
    supabase.from("users").select("active_child_id").eq("id", userId).single(),
  ]);

  const children = childrenRes.data ?? [];

  return {
    children,
    siblingRelations: siblingRes.data ?? [],
    activeChildId:
      (userRes.data?.active_child_id as string | null) ??
      children[0]?.id ??
      null,
  };
}
