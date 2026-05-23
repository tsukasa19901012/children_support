"use client";

import { useEffect } from "react";
import { saveChildCache } from "../childCache";
import type { ChildInfo } from "../childCache";

/** マイページ表示時に子ども一覧をキャッシュし、チャット遷移の待ち時間を短縮 */
export function ChildCacheWriter({
  userId,
  childList,
  activeChildId,
}: {
  userId: string;
  childList: ChildInfo[];
  activeChildId: string | null;
}) {
  useEffect(() => {
    if (!activeChildId || childList.length === 0) return;
    saveChildCache(userId, childList, activeChildId);
  }, [userId, childList, activeChildId]);

  return null;
}
