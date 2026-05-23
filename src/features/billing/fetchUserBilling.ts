import { createServiceSupabaseClient } from "../../lib/supabase-server";
import {
  canUpdateMemory,
  hasPlusAccess,
  isTrialActive,
  normalizePlanId,
  trialDaysRemaining,
  type UserBillingRow,
} from "./planAccess";
import type { PlanId } from "./types";

export type UserBillingState = {
  planId: PlanId;
  row: UserBillingRow;
  hasPlusAccess: boolean;
  isTrialActive: boolean;
  trialDaysLeft: number;
  canUpdateMemory: boolean;
};

export async function fetchUserBilling(userId: string): Promise<UserBillingState> {
  const db = createServiceSupabaseClient();

  await db
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  const { data } = await db
    .from("users")
    .select("plan, created_at, trial_ends_at")
    .eq("id", userId)
    .single();

  const row: UserBillingRow = {
    plan: data?.plan ?? "free",
    created_at: data?.created_at ?? new Date().toISOString(),
    trial_ends_at: data?.trial_ends_at ?? null,
  };

  const planId = normalizePlanId(row.plan);
  const now = new Date();

  return {
    planId,
    row,
    hasPlusAccess: hasPlusAccess(row, now),
    isTrialActive: isTrialActive(row, now),
    trialDaysLeft: trialDaysRemaining(row, now),
    canUpdateMemory: canUpdateMemory(row, now),
  };
}
