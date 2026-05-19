import type { PlanId } from "./types";

const PLAN_CACHE_KEY = "parenting_ai_plan";

type CachedPlan = {
  userId: string;
  planId: PlanId;
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

export function saveCachedPlan(userId: string, planId: PlanId): void {
  try {
    sessionStorage.setItem(
      PLAN_CACHE_KEY,
      JSON.stringify({ userId, planId } satisfies CachedPlan)
    );
  } catch {
    // ignore
  }
}
