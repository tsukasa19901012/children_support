export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "../../../lib/stripe";
import { createServiceSupabaseClient } from "../../../lib/supabase-server";
import type { PlanId } from "../../../features/billing/types";

const VALID_PLAN_IDS: PlanId[] = ["free", "lite", "pro"];

function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (VALID_PLAN_IDS as string[]).includes(value);
}

/**
 * Supabase の users テーブルを更新する。
 * - plan を新プランに変更
 * - stripe_customer_id を保存（初回のみ）
 */
async function updateUserPlan(
  userId: string,
  planId: PlanId,
  stripeCustomerId: string
): Promise<void> {
  const db = createServiceSupabaseClient();

  // ユーザーが存在しない場合は作成する
  await db
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  const { error } = await db
    .from("users")
    .update({
      plan: planId,
      stripe_customer_id: stripeCustomerId,
    })
    .eq("id", userId);

  if (error) {
    throw new Error(`users テーブル更新失敗: ${error.message}`);
  }
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripeが設定されていません。" },
      { status: 503 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET が未設定です。");
    return NextResponse.json(
      { error: "Webhook シークレットが未設定です。" },
      { status: 503 }
    );
  }

  // 署名検証のために生のボディが必要
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "署名がありません。" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[webhook] 署名検証失敗:", err);
    return NextResponse.json({ error: "署名が無効です。" }, { status: 400 });
  }

  // ── イベント処理 ──────────────────────────────────────

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId  = session.metadata?.userId;
    const planId  = session.metadata?.planId;
    const customerId = typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

    if (!userId || !isPlanId(planId) || !customerId) {
      console.error("[webhook] metadata が不正です:", { userId, planId, customerId });
      // Stripe に 200 を返さないと再試行されるので 200 で返す
      return NextResponse.json({ received: true });
    }

    try {
      await updateUserPlan(userId, planId, customerId);
      console.log(`[webhook] プラン更新完了 userId=${userId} plan=${planId}`);
    } catch (err) {
      console.error("[webhook] プラン更新失敗:", err);
      return NextResponse.json(
        { error: "プラン更新に失敗しました。" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
