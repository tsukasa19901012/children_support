/** 会話表示順: created_at 昇順、同一時刻は user → assistant */
export function sortMessagesByChatOrder<
  T extends { created_at: string; role: string },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const diff =
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (diff !== 0) return diff;
    if (a.role === b.role) return 0;
    return a.role === "user" ? -1 : 1;
  });
}
