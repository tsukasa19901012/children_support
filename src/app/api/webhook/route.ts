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

/** Stripe 価格ID → プランIDのマッピング（環境変数から構築） */
function buildPriceMap(): Record<string, PlanId> {
  const map: Record<string, PlanId> = {};
  if (process.env.STRIPE_PRICE_ID_LITE) map[process.env.STRIPE_PRICE_ID_LITE] = "lite";
  if (process.env.STRIPE_PRICE_ID_PRO)  map[process.env.STRIPE_PRICE_ID_PRO]  = "pro";
  return map;
}

/** Supabase の users テーブルを更新する */
async function updateUserPlan(
  userId: string,
  planId: PlanId,
  stripeCustomerId: string
): Promise<void> {
  const db = createServiceSupabaseClient();

  await db.from("users").upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  const { error } = await db
    .from("users")
    .update({ plan: planId, stripe_customer_id: stripeCustomerId })
    .eq("id", userId);

  if (error) throw new Error(`users テーブル更新失敗: ${error.message}`);
}

/** Stripe 顧客IDからユーザーを特定してプランを更新する */
async function updatePlanByCustomerId(
  stripeCustomerId: string,
  planId: PlanId
): Promise<boolean> {
  const db = createServiceSupabaseClient();

  const { data: user } = await db
    .from("users")
    .select("id, plan")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (!user) {
    console.warn(`[webhook] stripe_customer_id=${stripeCustomerId} に対応するユーザーなし`);
    return false;
  }

  if (user.plan === planId) return true; // 変更不要

  const { error } = await db.from("users").update({ plan: planId }).eq("id", user.id);
  if (error) throw new Error(`プラン更新失敗: ${error.message}`);
  return true;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripeが設定されていません。" }, { status: 503 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET が未設定です。");
    return NextResponse.json({ error: "Webhook シークレットが未設定です。" }, { status: 503 });
  }

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

  // ① 初回チェックアウト完了 / アップグレード
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId    = session.metadata?.userId;
    const planId    = session.metadata?.planId;
    const customerId = typeof session.customer === "string"
      ? session.customer : session.customer?.id;

    if (!userId || !isPlanId(planId) || !customerId) {
      console.error("[webhook] metadata が不正:", { userId, planId, customerId });
      return NextResponse.json({ received: true });
    }

    try {
      await updateUserPlan(userId, planId, customerId);
      console.log(`[webhook] チェックアウト完了 userId=${userId} plan=${planId}`);
    } catch (err) {
      console.error("[webhook] プラン更新失敗:", err);
      return NextResponse.json({ error: "プラン更新に失敗しました。" }, { status: 500 });
    }
  }

  // ② サブスクリプション更新（Stripeポータルでのプラン変更・ステータス変化）
  if (event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
    if (!customerId) return NextResponse.json({ received: true });

    const status = sub.status;

    // サブスクリプションがアクティブ: 価格IDからプランを判定して更新
    if (status === "active" || status === "trialing") {
      const priceId = sub.items.data[0]?.price?.id;
      const priceMap = buildPriceMap();
      const planId   = priceId ? priceMap[priceId] : undefined;

      if (planId) {
        try {
          await updatePlanByCustomerId(customerId, planId);
          console.log(`[webhook] サブスク更新 customerId=${customerId} plan=${planId} status=${status}`);
        } catch (err) {
          console.error("[webhook] サブスク更新失敗:", err);
          return NextResponse.json({ error: "プラン更新失敗。" }, { status: 500 });
        }
      } else {
        console.warn(`[webhook] 未知の price_id=${priceId}`);
      }
    }

    // 支払い滞納・回収不能 → ダウングレード
    if (status === "past_due" || status === "unpaid" || status === "incomplete_expired") {
      try {
        await updatePlanByCustomerId(customerId, "free");
        console.log(`[webhook] サブスク滞納によりダウングレード customerId=${customerId} status=${status}`);
      } catch (err) {
        console.error("[webhook] ダウングレード失敗:", err);
        return NextResponse.json({ error: "ダウングレード失敗。" }, { status: 500 });
      }
    }
  }

  // ③ サブスクリプション解約（全リトライ失敗後の最終キャンセル）
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

    if (!customerId) {
      console.error("[webhook] customer ID が取得できません:", event.type);
      return NextResponse.json({ received: true });
    }

    try {
      await updatePlanByCustomerId(customerId, "free");
      console.log(`[webhook] 解約によりダウングレード customerId=${customerId}`);
    } catch (err) {
      console.error("[webhook] ダウングレード失敗:", err);
      return NextResponse.json({ error: "ダウングレード失敗。" }, { status: 500 });
    }
  }

  // ④ 支払い失敗（リトライ中は猶予を与えダウングレードしない）
  //    → サブスクが past_due になる前のアーリーウォーニング。ログのみ。
  //    → 最終的に customer.subscription.updated(past_due) か
  //       customer.subscription.deleted で処理する。
  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const customerId = typeof invoice.customer === "string"
      ? invoice.customer : (invoice.customer as Stripe.Customer)?.id;
    const attemptCount = invoice.attempt_count ?? 1;

    console.warn(
      `[webhook] 支払い失敗（${attemptCount}回目） customerId=${customerId} ` +
      `invoice=${invoice.id} — サブスクのステータス変化を待機中`
    );
    // リトライ中はダウングレードしない。past_due/deleted イベントで処理。
  }

  return NextResponse.json({ received: true });
}
