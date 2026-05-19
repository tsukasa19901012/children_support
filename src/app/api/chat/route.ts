export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "../../../features/billing/plans";
import type { PlanId } from "../../../features/billing/types";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "../../../lib/supabase-server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  messages: Message[];
};

const SYSTEM_PROMPT =
  "あなたは育児専門のAIアシスタントです。簡潔で実用的に答えてください。";

const UPGRADE_MESSAGE =
  "本日の無料枠（3回）を使い切りました。月980円の Lite プランにアップグレードすると無制限でご利用いただけます。";

/** プランごとの送信履歴ウィンドウ（トークン最適化） */
const HISTORY_WINDOW: Record<PlanId, number> = {
  free: 5,
  lite: 10,
  pro:  30,
};

/** DBからユーザーのプランを取得する */
async function fetchUserPlan(userId: string): Promise<PlanId> {
  const db = createServiceSupabaseClient();

  await db
    .from("users")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });

  const { data } = await db
    .from("users")
    .select("plan")
    .eq("id", userId)
    .single();

  return (data?.plan as PlanId | null) ?? "free";
}

/** 本日のユーザー送信回数をDBから取得する */
async function fetchTodayUsage(userId: string): Promise<number> {
  const db = createServiceSupabaseClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", todayStart.toISOString());

  return count ?? 0;
}

/** メッセージをDBに保存する（失敗は非致命的） */
async function saveMessages(
  userId: string,
  userContent: string,
  assistantContent: string
): Promise<void> {
  try {
    const db = createServiceSupabaseClient();
    const { error } = await db.from("messages").insert([
      { user_id: userId, role: "user",      content: userContent },
      { user_id: userId, role: "assistant", content: assistantContent },
    ]);
    if (error) {
      console.warn("[/api/chat] messages保存失敗（非致命的）:", error.message);
    }
  } catch (err) {
    console.warn("[/api/chat] messages保存例外（非致命的）:", err);
  }
}

/** トークン使用量をDBに記録する（失敗は非致命的） */
async function saveTokenUsage(
  userId: string,
  model: string,
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
): Promise<void> {
  try {
    const db = createServiceSupabaseClient();
    const { error } = await db.from("token_usage").insert({
      user_id:           userId,
      model,
      prompt_tokens:     usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens:      usage.total_tokens,
    });
    if (error) {
      console.warn("[/api/chat] token_usage保存失敗（非致命的）:", error.message);
    }
  } catch (err) {
    console.warn("[/api/chat] token_usage保存例外（非致命的）:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. 認証チェック
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }
    const userId = user.id;

    // 2. リクエスト検証
    const body: RequestBody = await request.json();
    const { messages } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages は空でない配列で指定してください。" },
        { status: 400 }
      );
    }

    const hasInvalid = messages.some(
      (m) =>
        !m.content ||
        typeof m.content !== "string" ||
        m.content.trim() === "" ||
        m.content.length > 4000
    );
    if (hasInvalid) {
      return NextResponse.json(
        { error: "メッセージは1〜4000文字で入力してください。" },
        { status: 400 }
      );
    }

    // 3. DBからプランを取得
    const planId = await fetchUserPlan(userId);
    const plan = getPlan(planId);

    // 4. free プランの回数制限チェック
    if (plan.dailyLimit !== null) {
      const usedToday = await fetchTodayUsage(userId);
      if (usedToday >= plan.dailyLimit) {
        return NextResponse.json({ message: UPGRADE_MESSAGE });
      }
    }

    // 5. プランに応じて送信履歴ウィンドウを適用
    const historyWindow = HISTORY_WINDOW[planId];
    const trimmedMessages = messages.slice(-historyWindow);

    // 6. OpenAI を動的インポート（ビルド時に評価させない）
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const MODEL = "gpt-4o-mini";
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...trimmedMessages,
      ],
    });

    const aiMessage = completion.choices[0]?.message?.content ?? "";
    const usage = completion.usage;

    // 7. メッセージ保存 & トークン使用量記録（並列・非致命的）
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    await Promise.all([
      lastUserMessage
        ? saveMessages(userId, lastUserMessage.content, aiMessage)
        : Promise.resolve(),
      usage
        ? saveTokenUsage(userId, MODEL, {
            prompt_tokens:     usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens:      usage.total_tokens,
          })
        : Promise.resolve(),
    ]);

    return NextResponse.json({ message: aiMessage });
  } catch (error) {
    console.error("[/api/chat]", error);
    return NextResponse.json(
      { error: "AIの応答取得中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
