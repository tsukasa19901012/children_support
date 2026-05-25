import type { PlanId } from "./types";

/**
 * Stripe Checkout への導線を出すか。
 * hasPlusAccess ではなく planId で判定する（体験期間中は plan=free だが Plusと同じ機能あり）。
 */
export function shouldShowUpgradeCheckout(planId: PlanId): boolean {
  return planId !== "plus";
}

/** Stripe Customer Portal を出すか（Plus 契約済みのみ） */
export function shouldShowBillingPortal(planId: PlanId): boolean {
  return planId === "plus";
}

/** チャット画面などの Upgrade CTA を出すか */
export function shouldShowUpgradeCta(planId: PlanId): boolean {
  return planId !== "plus";
}
