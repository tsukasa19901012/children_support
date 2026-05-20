"use client";

import { useEffect } from "react";
import { saveChildCache } from "../childCache";
import type { ChildInfo } from "../childCache";

/** マイページ表示時に子ども一覧をキャッシュし、チャット遷移の待ち時間を短縮 */
export function ChildCacheWriter({
  userId,
  children,
  activeChildId,
}: {
  userId: string;
  children: ChildInfo[];
  activeChildId: string | null;
}) {
  useEffect(() => {
    if (!activeChildId || children.length === 0) return;
    saveChildCache(userId, children, activeChildId);
  }, [userId, children, activeChildId]);

  return null;
}
