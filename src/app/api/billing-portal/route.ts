export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStripe } from "../../../lib/stripe";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "../../../lib/supabase-server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/** Stripe Customer Portal セッションを作成（プラン変更・解約） */
export async function POST() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Stripeが設定されていません。STRIPE_SECRET_KEY を確認してください。" },
      { status: 503 }
    );
  }

  const authClient = await createServerSupabaseClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  try {
    const db = createServiceSupabaseClient();
    const { data: userRow, error: userError } = await db
      .from("users")
      .select("plan, stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (userError || !userRow) {
      return NextResponse.json(
        { error: "ユーザー情報の取得に失敗しました。" },
        { status: 500 }
      );
    }

    if (userRow.plan === "free") {
      return NextResponse.json(
        { error: "有料プランをご利用中の方のみお支払い管理が利用できます。" },
        { status: 400 }
      );
    }

    let customerId = userRow.stripe_customer_id as string | null;

    if (!customerId && user.email) {
      const customers = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      customerId = customers.data[0]?.id ?? null;
      if (customerId) {
        await db
          .from("users")
          .update({ stripe_customer_id: customerId })
          .eq("id", user.id);
      }
    }

    if (!customerId) {
      return NextResponse.json(
        {
          error:
            "お支払い情報が見つかりませんでした。お手数ですがサポートへお問い合わせください。",
        },
        { status: 400 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${BASE_URL}/account`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "管理画面の作成に失敗しました。" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[/api/billing-portal]", error);
    return NextResponse.json(
      { error: "お支払い管理画面の作成に失敗しました。" },
      { status: 500 }
    );
  }
}
