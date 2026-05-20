import type { SupabaseClient } from "@supabase/supabase-js";
import {
  inverseRelation,
  isSavedPeerRelation,
  resolvePeerRelation,
  type ChildGender,
  type ChildPeerRelation,
  type PeerRelationFormValue,
  type PeerRelationKind,
} from "../types/siblingRelation";

export type SiblingRelationRow = {
  child_id: string;
  sibling_id: string;
  relation: ChildPeerRelation;
};

export type SiblingLinkInput = {
  siblingId: string;
  relation: ChildPeerRelation;
};

export type PeerProfileForRelation = {
  birthday: string;
  gender: ChildGender;
};

/** フォーム値を誕生日から解決して保存対象のみ抽出 */
export function peerLinksFromForm(
  relations: Record<string, PeerRelationFormValue>,
  childBirthday: string,
  peers: Record<string, PeerProfileForRelation>
): SiblingLinkInput[] {
  return Object.entries(relations)
    .filter((entry): entry is [string, PeerRelationKind] =>
      isSavedPeerRelation(entry[1])
    )
    .map(([siblingId, kind]) => {
      const peer = peers[siblingId];
      return {
        siblingId,
        relation: resolvePeerRelation(
          kind,
          childBirthday,
          peer?.birthday ?? childBirthday,
          peer?.gender ?? null
        ),
      };
    });
}

/** ある子どもに紐づくきょうだい関係をすべて置き換え（双方向を保存） */
export async function saveChildSiblingRelations(
  supabase: SupabaseClient,
  userId: string,
  childId: string,
  childGender: ChildGender,
  links: SiblingLinkInput[]
): Promise<{ error: string | null }> {
  const { error: delError } = await supabase
    .from("child_sibling_relations")
    .delete()
    .eq("user_id", userId)
    .or(`child_id.eq.${childId},sibling_id.eq.${childId}`);

  if (delError) return { error: delError.message };

  if (links.length === 0) return { error: null };

  const rows: {
    user_id: string;
    child_id: string;
    sibling_id: string;
    relation: ChildPeerRelation;
  }[] = [];

  for (const { siblingId, relation } of links) {
    if (siblingId === childId) continue;
    rows.push({
      user_id: userId,
      child_id: childId,
      sibling_id: siblingId,
      relation,
    });
    rows.push({
      user_id: userId,
      child_id: siblingId,
      sibling_id: childId,
      relation: inverseRelation(relation, childGender),
    });
  }

  const { error: insError } = await supabase
    .from("child_sibling_relations")
    .upsert(rows, { onConflict: "child_id,sibling_id" });

  return { error: insError?.message ?? null };
}

export async function fetchSiblingRelationsForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<SiblingRelationRow[]> {
  const { data, error } = await supabase
    .from("child_sibling_relations")
    .select("child_id, sibling_id, relation")
    .eq("user_id", userId);

  if (error || !data) return [];
  return data as SiblingRelationRow[];
}
