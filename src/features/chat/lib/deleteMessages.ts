import { createClient } from "../../../lib/supabase-browser";

/** DBからメッセージを削除する（RLSで本人のみ） */
export async function deleteMessagesFromDb(ids: string[]): Promise<string | null> {
  if (ids.length === 0) return null;
  const supabase = createClient();
  const { error } = await supabase.from("messages").delete().in("id", ids);
  return error?.message ?? null;
}
