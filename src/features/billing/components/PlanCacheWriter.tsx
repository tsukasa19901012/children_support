"use client";

import { useEffect } from "react";
import { saveCachedBilling } from "../planCache";
import type { UserBillingRow } from "../planAccess";

/** マイページ表示時に課金状態をキャッシュし、チャット遷移時のチラつきを防ぐ */
export function PlanCacheWriter({
  userId,
  billingRow,
}: {
  userId: string;
  billingRow: UserBillingRow;
}) {
  useEffect(() => {
    saveCachedBilling(userId, billingRow);
  }, [userId, billingRow]);

  return null;
}
