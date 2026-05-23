export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import { getPlan } from "../../../features/billing/plans";
import { getPlusStripePriceId } from "../../../features/billing/stripePrices";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "../../../lib/supabase-server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripeが設定されていません。STRIPE_SECRET_KEY を確認してください。" },
      { status: 503 }
    );
  }

  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  try {
    await request.json();
    const plan = getPlan("plus");
    const priceId = getPlusStripePriceId();

    if (!priceId) {
      return NextResponse.json(
        {
          error: `${plan.name} の Price ID が未設定です。STRIPE_PRICE_ID_PLUS を確認してください。`,
        },
        { status: 400 }
      );
    }

    const db = createServiceSupabaseClient();
    const { data: userRow } = await db
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    const existingCustomerId = userRow?.stripe_customer_id as string | null;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel`,
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_email: user.email ?? undefined }),
      metadata: {
        planId: "plus",
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          planId: "plus",
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[/api/checkout]", error);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました。" },
      { status: 500 }
    );
  }
}
