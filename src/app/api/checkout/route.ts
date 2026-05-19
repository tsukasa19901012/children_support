export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import { getPlan } from "../../../features/billing/plans";
import { createServerSupabaseClient } from "../../../lib/supabase-server";
import type { PlanId } from "../../../features/billing/types";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/** プランID → Stripe Price ID の対応（環境変数から取得） */
const PRICE_ID_MAP: Record<string, string | undefined> = {
  lite: process.env.STRIPE_PRICE_ID_LITE,
  pro:  process.env.STRIPE_PRICE_ID_PRO,
};

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripeが設定されていません。STRIPE_SECRET_KEY を確認してください。" },
      { status: 503 }
    );
  }

  // ログイン確認
  const authClient = await createServerSupabaseClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const planId: PlanId = body.planId;
    const plan = getPlan(planId);

    if (plan.id === "free") {
      return NextResponse.json(
        { error: "無料プランは選択できません。" },
        { status: 400 }
      );
    }

    const priceId = PRICE_ID_MAP[plan.id];
    if (!priceId) {
      return NextResponse.json(
        { error: `${plan.name} の Price ID が未設定です。.env.local を確認してください。` },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/cancel`,
      // 認証済みユーザーのメールを Stripe に渡す（入力省略のため）
      customer_email: user.email,
      metadata: {
        planId: plan.id,
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          planId: plan.id,
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // JSON パースエラーも含めてここで捕捉
    console.error("[/api/checkout]", error);
    return NextResponse.json(
      { error: "決済セッションの作成に失敗しました。" },
      { status: 500 }
    );
  }
}
