import type { PlanId } from "./types";

const PLAN_CACHE_KEY = "parenting_ai_plan";
/** この時間内はネットワーク再取得をスキップ（バックグラウンド更新はマイページで実施） */
export const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;

type CachedPlan = {
  userId: string;
  planId: PlanId;
  cachedAt: number;
};

export function loadCachedPlan(userId: string): PlanId | null {
  try {
    const raw = sessionStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPlan;
    if (parsed.userId === userId && parsed.planId) return parsed.planId;
  } catch {
    // ignore
  }
  return null;
}

export function isPlanCacheFresh(userId: string): boolean {
  try {
    const raw = sessionStorage.getItem(PLAN_CACHE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as CachedPlan;
    return (
      parsed.userId === userId &&
      Date.now() - parsed.cachedAt < PLAN_CACHE_TTL_MS
    );
  } catch {
    return false;
  }
}

export function saveCachedPlan(userId: string, planId: PlanId): void {
  try {
    sessionStorage.setItem(
      PLAN_CACHE_KEY,
      JSON.stringify({
        userId,
        planId,
        cachedAt: Date.now(),
      } satisfies CachedPlan)
    );
  } catch {
    // ignore
  }
}
