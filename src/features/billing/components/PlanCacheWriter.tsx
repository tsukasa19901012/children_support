"use client";

import { useEffect } from "react";
import { saveCachedPlan } from "../planCache";
import type { PlanId } from "../types";

/** マイページ表示時にプランをキャッシュし、チャット遷移時のチラつきを防ぐ */
export function PlanCacheWriter({
  userId,
  planId,
}: {
  userId: string;
  planId: PlanId;
}) {
  useEffect(() => {
    saveCachedPlan(userId, planId);
  }, [userId, planId]);

  return null;
}
