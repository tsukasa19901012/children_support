import type { PlanId } from "./types";

/** Stripe Checkout / Webhook で使う Plus の Price ID */
export function getPlusStripePriceId(): string | undefined {
  const value = process.env.STRIPE_PRICE_ID_PLUS?.trim();
  return value || undefined;
}

/** price_id → 保存プラン（Plus の Price のみ） */
export function buildStripePriceToPlanMap(): Record<string, PlanId> {
  const map: Record<string, PlanId> = {};
  const plusId = getPlusStripePriceId();
  if (plusId) map[plusId] = "plus";
  return map;
}
