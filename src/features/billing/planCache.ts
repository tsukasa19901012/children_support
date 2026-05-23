import {
  canUpdateMemory,
  hasPlusAccess,
  normalizePlanId,
  trialDaysRemaining,
  type UserBillingRow,
} from "./planAccess";
import type { PlanId } from "./types";

const PLAN_CACHE_KEY = "parenting_ai_plan";
/** この時間内はネットワーク再取得をスキップ（マイページ・決済完了で更新） */
export const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedBilling = {
  userId: string;
  row: UserBillingRow;
  cachedAt: number;
};

export type DerivedBillingUI = {
  planId: PlanId;
  hasPlusAccess: boolean;
  trialDaysLeft: number;
  canUpdateMemory: boolean;
};

export function deriveBillingUI(
  row: UserBillingRow,
  now = new Date()
): DerivedBillingUI {
  return {
    planId: normalizePlanId(row.plan),
    hasPlusAccess: hasPlusAccess(row, now),
    trialDaysLeft: trialDaysRemaining(row, now),
    canUpdateMemory: canUpdateMemory(row, now),
  };
}

function readCache(): CachedBilling | null {
  try {
    const raw = sessionStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedBilling;
    if (!parsed.userId || !parsed.row?.created_at) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadCachedBilling(userId: string): CachedBilling | null {
  const parsed = readCache();
  if (parsed?.userId === userId) return parsed;
  return null;
}

/** @deprecated planId のみ必要な場合は loadCachedBilling + deriveBillingUI を使用 */
export function loadCachedPlan(userId: string): PlanId | null {
  const cached = loadCachedBilling(userId);
  return cached ? deriveBillingUI(cached.row).planId : null;
}

export function isPlanCacheFresh(userId: string): boolean {
  const parsed = readCache();
  if (!parsed || parsed.userId !== userId) return false;
  return Date.now() - parsed.cachedAt < PLAN_CACHE_TTL_MS;
}

export function saveCachedBilling(userId: string, row: UserBillingRow): void {
  try {
    sessionStorage.setItem(
      PLAN_CACHE_KEY,
      JSON.stringify({
        userId,
        row,
        cachedAt: Date.now(),
      } satisfies CachedBilling)
    );
  } catch {
    // ignore
  }
}

/** @deprecated saveCachedBilling を使用 */
export function saveCachedPlan(userId: string, planId: PlanId): void {
  saveCachedBilling(userId, {
    plan: planId,
    created_at: new Date().toISOString(),
    trial_ends_at: null,
  });
}

export function clearPlanCache(): void {
  try {
    sessionStorage.removeItem(PLAN_CACHE_KEY);
  } catch {
    // ignore
  }
}
