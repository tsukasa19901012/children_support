export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "../../../../lib/supabase-server";
import { buildRebuildMemoryPrompt } from "../../../../lib/childMemory";
import type { PlanId } from "../../../../features/billing/types";

const MAX_REBUILD_MESSAGES = 100;

/** 削除後などに、残りの会話履歴から学習メモリを再生成する */
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const body = await request.json() as { childId?: string };
    const { childId } = body;
    if (!childId || typeof childId !== "string") {
      return NextResponse.json({ error: "childId が必要です。" }, { status: 400 });
    }

    const db = createServiceSupabaseClient();

    const { data: userRow } = await db
      .from("users")
      .select("plan")
      .eq("id", user.id)
      .single();

    const planId = (userRow?.plan as PlanId | null) ?? "free";
    if (planId !== "lite" && planId !== "pro") {
      return NextResponse.json({ rebuilt: false });
    }

    const { data: child } = await db
      .from("children")
      .select("id")
      .eq("id", childId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!child) {
      return NextResponse.json({ error: "子ども情報が見つかりません。" }, { status: 404 });
    }

    const { data: messages } = await db
      .from("messages")
      .select("role, content")
      .eq("user_id", user.id)
      .eq("child_id", childId)
      .order("created_at", { ascending: true })
      .limit(MAX_REBUILD_MESSAGES);

    // 会話がなければメモリをクリア
    if (!messages || messages.length === 0) {
      await db
        .from("children")
        .update({ memory: null, updated_at: new Date().toISOString() })
        .eq("id", childId)
        .eq("user_id", user.id);
      return NextResponse.json({ rebuilt: true, cleared: true });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "AIサービスが設定されていません。" }, { status: 503 });
    }

    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildRebuildMemoryPrompt(messages) }],
      max_tokens: 400,
    });

    const newMemory = completion.choices[0]?.message?.content?.trim() ?? null;

    await db
      .from("children")
      .update({
        memory: newMemory,
        updated_at: new Date().toISOString(),
      })
      .eq("id", childId)
      .eq("user_id", user.id);

    return NextResponse.json({ rebuilt: true, cleared: !newMemory });
  } catch (error) {
    console.error("[/api/chat/rebuild-memory]", error);
    return NextResponse.json(
      { error: "学習メモリの再計算に失敗しました。" },
      { status: 500 }
    );
  }
}
