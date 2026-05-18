import Stripe from "stripe";

let _stripe: Stripe | null = null;

/**
 * Stripeクライアントを返す。
 * STRIPE_SECRET_KEY 未設定時は null を返す。
 */
export const getStripe = (): Stripe | null => {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return _stripe;
};
