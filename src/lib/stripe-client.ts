import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";

let _stripePromise: Promise<Stripe | null> | null = null;

/**
 * クライアントサイドの Stripe インスタンスを返す。
 * NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY 未設定時は null を返す（クラッシュしない）。
 */
export const getStripePromise = (): Promise<Stripe | null> => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (!key) return Promise.resolve(null);
  if (!_stripePromise) _stripePromise = loadStripe(key);
  return _stripePromise;
};
