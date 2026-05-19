/** 削除後などに学習メモリを残り履歴から再計算する */
export async function rebuildChildMemory(childId: string): Promise<string | null> {
  const res = await fetch("/api/chat/rebuild-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return (data as { error?: string }).error ?? "再計算に失敗しました。";
  }

  return null;
}
