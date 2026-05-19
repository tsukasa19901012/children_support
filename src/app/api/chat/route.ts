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
  childContext?: string;
};

const ALLOWED_ROLES = new Set<string>(["user", "assistant"]);
const MAX_MESSAGES = 50;
const MAX_CONTENT_LENGTH = 4000;

/** JST の本日 0:00 を UTC で返す */
function getJSTDayStart(): Date {
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(Date.now() + jstOffset);
  const jstMidnight = new Date(Date.UTC(
    jstNow.getUTCFullYear(),
    jstNow.getUTCMonth(),
    jstNow.getUTCDate(),
  ));
  return new Date(jstMidnight.getTime() - jstOffset);
}

const BASE_SYSTEM_PROMPT =
  "あなたは育児専門の温かいAIアシスタントです。保護者の不安を受け止め、まず共感を示してから、簡潔で実用的なアドバイスをしてください。医療診断は行わず、必要な場合は専門家への相談を促してください。";

function buildSystemPrompt(childContext?: string): string {
  if (!childContext) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\n【相談者のお子さん】${childContext}回答時は子どもの名前・月齢・年齢を考慮してください。`;
}

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

/** 本日（JST基準）のユーザー送信回数をDBから取得する */
async function fetchTodayUsage(userId: string): Promise<number> {
  const db = createServiceSupabaseClient();

  const { count } = await db
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "user")
    .gte("created_at", getJSTDayStart().toISOString());

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
    const { messages, childContext } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "messages は空でない配列で指定してください。" },
        { status: 400 }
      );
    }

    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `messages は${MAX_MESSAGES}件以下で指定してください。` },
        { status: 400 }
      );
    }

    const hasInvalid = messages.some(
      (m) =>
        !ALLOWED_ROLES.has(m.role) ||
        typeof m.content !== "string" ||
        m.content.trim() === "" ||
        m.content.length > MAX_CONTENT_LENGTH
    );
    if (hasInvalid) {
      return NextResponse.json(
        { error: "メッセージの形式が不正です。" },
        { status: 400 }
      );
    }

    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUserMessage) {
      return NextResponse.json(
        { error: "ユーザーメッセージが含まれていません。" },
        { status: 400 }
      );
    }

    // 3. DBからプランを取得
    const planId = await fetchUserPlan(userId);
    const plan = getPlan(planId);

    // 4. free プランの回数制限チェック（競合状態対策：先にDB挿入して原子的にカウント）
    const db = createServiceSupabaseClient();
    let insertedMessageId: string | null = null;

    if (plan.dailyLimit !== null) {
      // ユーザーメッセージを先にDB挿入
      const { data: inserted, error: insertError } = await db
        .from("messages")
        .insert({ user_id: userId, role: "user", content: lastUserMessage.content })
        .select("id")
        .single();

      if (insertError) {
        console.warn("[/api/chat] ユーザーメッセージ事前挿入失敗:", insertError.message);
      } else {
        insertedMessageId = inserted?.id ?? null;
      }

      // 挿入後にカウントを確認（並行リクエストがあっても正確）
      const usedToday = await fetchTodayUsage(userId);
      if (usedToday > plan.dailyLimit) {
        // 超過していたら挿入したメッセージを削除して制限エラーを返す
        if (insertedMessageId) {
          await db.from("messages").delete().eq("id", insertedMessageId);
        }
        return NextResponse.json({ message: UPGRADE_MESSAGE });
      }
    }

    // 5. プランに応じて送信履歴ウィンドウを適用
    const historyWindow = HISTORY_WINDOW[planId];
    const trimmedMessages = messages.slice(-historyWindow);

    // 6. OpenAI を動的インポート（ビルド時に評価させない）
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "AIサービスが設定されていません。" },
        { status: 503 }
      );
    }
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const MODEL = "gpt-4o-mini";
    const systemPrompt = buildSystemPrompt(childContext);
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
    });

    const aiMessage = completion.choices[0]?.message?.content ?? "";
    const usage = completion.usage;

    // 7. アシスタントメッセージ保存 & トークン使用量記録（並列・非致命的）
    // free プラン以外はここでユーザーメッセージも保存する
    const savePromises: Promise<void>[] = [
      usage
        ? saveTokenUsage(userId, MODEL, {
            prompt_tokens:     usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens:      usage.total_tokens,
          })
        : Promise.resolve(),
    ];

    if (insertedMessageId) {
      // 事前挿入済みのためアシスタントメッセージのみ追加
      savePromises.push(
        (async () => {
          try {
            const { error } = await db
              .from("messages")
              .insert({ user_id: userId, role: "assistant", content: aiMessage });
            if (error) console.warn("[/api/chat] assistantメッセージ保存失敗:", error.message);
          } catch (err) {
            console.warn("[/api/chat] assistantメッセージ保存例外:", err);
          }
        })()
      );
    } else {
      savePromises.push(saveMessages(userId, lastUserMessage.content, aiMessage));
    }

    await Promise.all(savePromises);

    return NextResponse.json({ message: aiMessage });
  } catch (error) {
    console.error("[/api/chat]", error);
    return NextResponse.json(
      { error: "AIの応答取得中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
