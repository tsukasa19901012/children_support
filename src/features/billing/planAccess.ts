import type { PlanId } from "./types";

/** 初回体験（案C）の日数 */
export const TRIAL_DAYS = 14;

export type UserBillingRow = {
  plan: string | null;
  created_at: string;
  trial_ends_at?: string | null;
};

/** DB の plan 列をアプリの PlanId に正規化 */
export function normalizePlanId(raw: string | null | undefined): PlanId {
  return raw === "plus" ? "plus" : "free";
}

export function getTrialEndsAt(row: UserBillingRow): Date {
  if (row.trial_ends_at) return new Date(row.trial_ends_at);
  const created = new Date(row.created_at);
  return new Date(created.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function isTrialActive(row: UserBillingRow, now = new Date()): boolean {
  if (normalizePlanId(row.plan) === "plus") return false;
  return now < getTrialEndsAt(row);
}

/** Plus 契約中、または14日体験期間中 */
export function hasPlusAccess(row: UserBillingRow, now = new Date()): boolean {
  return normalizePlanId(row.plan) === "plus" || isTrialActive(row, now);
}

/** 会話に既存の記憶（memory）を載せる — Free でも可 */
export function canReadMemory(): boolean {
  return true;
}

/** 会話から記憶を更新する — Plus または体験期間中のみ */
export function canUpdateMemory(row: UserBillingRow, now = new Date()): boolean {
  return hasPlusAccess(row, now);
}

export function canUseRelations(row: UserBillingRow, now = new Date()): boolean {
  return hasPlusAccess(row, now);
}

export function canRegisterMultipleChildren(row: UserBillingRow, now = new Date()): boolean {
  return hasPlusAccess(row, now);
}

export function trialDaysRemaining(row: UserBillingRow, now = new Date()): number {
  if (!isTrialActive(row, now)) return 0;
  const ms = getTrialEndsAt(row).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
