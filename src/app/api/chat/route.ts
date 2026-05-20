export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "../../../features/billing/plans";
import type { PlanId } from "../../../features/billing/types";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "../../../lib/supabase-server";
import { buildSiblingPromptBlock } from "../../../features/child/lib/buildSiblingPrompt";
import type { ChildPeerRelation } from "../../../features/child/types/siblingRelation";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  messages: Message[];
  childContext?: string;
  childId?: string;
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
  "あなたは育児専門の温かいAIアシスタントです。主に0〜6歳のお子さんを育てる保護者向けに最適化されていますが、それ以外の年齢のお子さんについても可能な範囲で支援してください。保護者の不安を受け止め、まず共感を示してから、簡潔で実用的なアドバイスをしてください。医療診断は行わず、必要な場合は専門家への相談を促してください。";

function buildSystemPrompt(
  childContext?: string,
  memory?: string | null,
  siblingBlock?: string | null
): string {
  let prompt = BASE_SYSTEM_PROMPT;
  if (childContext) {
    prompt += `\n\n【相談者のお子さん】${childContext}回答時は子どもの名前・月齢・年齢を考慮してください。`;
  }
  if (siblingBlock) {
    prompt += `\n\n${siblingBlock}`;
  }
  if (memory) {
    prompt += `\n\n【これまでの会話から学習した情報】\n${memory}\nこの情報を踏まえて、より的確で温かい回答をしてください。`;
  }
  return prompt;
}

/** Pro: 登録済みのきょうだい関係をプロンプト用に取得 */
async function fetchSiblingPromptBlock(
  childId: string,
  userId: string
): Promise<string | null> {
  const db = createServiceSupabaseClient();

  const { data: activeChild } = await db
    .from("children")
    .select("name, birthday")
    .eq("id", childId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!activeChild) return null;

  const { data: rels } = await db
    .from("child_sibling_relations")
    .select("relation, sibling_id")
    .eq("child_id", childId)
    .eq("user_id", userId);

  if (!rels?.length) return null;

  const siblingIds = rels.map((r) => r.sibling_id);
  const { data: siblings } = await db
    .from("children")
    .select("id, name, birthday")
    .in("id", siblingIds)
    .eq("user_id", userId);

  if (!siblings?.length) return null;

  const siblingMap = new Map(siblings.map((s) => [s.id, s]));
  const forPrompt = rels
    .map((r) => {
      const s = siblingMap.get(r.sibling_id);
      if (!s) return null;
      return {
        name: s.name,
        birthday: s.birthday,
        relation: r.relation as ChildPeerRelation,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return buildSiblingPromptBlock(
    activeChild.name,
    activeChild.birthday,
    forPrompt
  );
}

/** 子どものメモリをDBから取得する（Lite/Pro のみ）。user_id で所有権を検証。 */
async function fetchChildMemory(childId: string, userId: string): Promise<{ id: string; memory: string | null } | null> {
  const db = createServiceSupabaseClient();
  const { data } = await db
    .from("children")
    .select("id, memory")
    .eq("id", childId)
    .eq("user_id", userId)   // 他人の子どもへのアクセスを防止
    .maybeSingle();
  return data ?? null;
}

/** 会話内容からメモリを更新する（非同期・非致命的）。user_id で所有権を検証。 */
async function updateChildMemory(
  childId: string,
  userId: string,
  currentMemory: string | null,
  userMessage: string,
  aiMessage: string,
  openai: { chat: { completions: { create: Function } } }
): Promise<void> {
  try {
    const memoryPrompt = currentMemory
      ? `以下は子どもについての既存の学習メモです:\n${currentMemory}\n\n`
      : "";

    const extractPrompt = `${memoryPrompt}以下の育児相談の会話から、子どもの性格・特徴・家庭環境・よくある悩みに関する新たな情報を抽出し、学習メモを更新してください。
重複は排除し、400文字以内で以下の形式でまとめてください（該当なければ省略可）:

【子どもの特徴】
- （性格・行動パターンなど）

【家庭環境】
- （家族構成・生活スタイルなど）

【よくある悩み・傾向】
- （睡眠・食事・癇癪・兄弟関係など）

---
保護者の相談: ${userMessage}
AIの回答: ${aiMessage}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: extractPrompt }],
      max_tokens: 400,
    });

    const newMemory = completion.choices[0]?.message?.content?.trim();
    if (!newMemory) return;

    const db = createServiceSupabaseClient();
    await db
      .from("children")
      .update({ memory: newMemory, updated_at: new Date().toISOString() })
      .eq("id", childId)
      .eq("user_id", userId); // 所有権を再確認して更新
  } catch (err) {
    console.warn("[/api/chat] メモリ更新失敗（非致命的）:", err);
  }
}

function getUpgradeMessage(dailyLimit: number): string {
  return `本日の無料枠（${dailyLimit}回）を使い切りました。月980円の Lite プランにアップグレードすると無制限でご利用いただけます。`;
}

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

type SavedMessageIds = { userMessageId: string; assistantMessageId: string };

/** メッセージをDBに保存する（失敗は非致命的） */
async function saveMessages(
  userId: string,
  userContent: string,
  assistantContent: string,
  childId?: string | null
): Promise<SavedMessageIds | null> {
  try {
    const db = createServiceSupabaseClient();
    const base = { user_id: userId, child_id: childId ?? null };

    const { data: userRow, error: userError } = await db
      .from("messages")
      .insert({ ...base, role: "user", content: userContent })
      .select("id")
      .single();

    if (userError || !userRow) {
      console.warn("[/api/chat] userメッセージ保存失敗:", userError?.message);
      return null;
    }

    const { data: assistantRow, error: assistantError } = await db
      .from("messages")
      .insert({ ...base, role: "assistant", content: assistantContent })
      .select("id")
      .single();

    if (assistantError || !assistantRow) {
      console.warn("[/api/chat] assistantメッセージ保存失敗:", assistantError?.message);
      return null;
    }

    return {
      userMessageId: userRow.id,
      assistantMessageId: assistantRow.id,
    };
  } catch (err) {
    console.warn("[/api/chat] messages保存例外（非致命的）:", err);
    return null;
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
    const { messages, childContext, childId } = body;

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

    // 3. DBからプランを取得、Lite/Proはメモリも取得
    const planId = await fetchUserPlan(userId);
    const plan = getPlan(planId);
    const hasMemory = planId === "lite" || planId === "pro";
    const childMemoryData = (hasMemory && childId) ? await fetchChildMemory(childId, userId) : null;

    // 4. free プランの回数制限チェック（競合状態対策：先にDB挿入して原子的にカウント）
    const db = createServiceSupabaseClient();
    let insertedMessageId: string | null = null;

    if (plan.dailyLimit !== null) {
      // ユーザーメッセージを先にDB挿入（child_id付き）
      const { data: inserted, error: insertError } = await db
        .from("messages")
        .insert({ user_id: userId, child_id: childId ?? null, role: "user", content: lastUserMessage.content })
        .select("id")
        .single();

      if (insertError) {
        console.warn("[/api/chat] ユーザーメッセージ事前挿入失敗:", insertError.message);
        // insert失敗時でも独立してカウントチェックし、上限を超えていたらブロック
        const fallbackCount = await fetchTodayUsage(userId);
        if (fallbackCount >= plan.dailyLimit) {
          return NextResponse.json(
            { error: getUpgradeMessage(plan.dailyLimit), limitReached: true },
            { status: 429 }
          );
        }
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
        return NextResponse.json(
          { error: getUpgradeMessage(plan.dailyLimit!), limitReached: true },
          { status: 429 }
        );
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
    const siblingBlock =
      planId === "pro" && childId
        ? await fetchSiblingPromptBlock(childId, userId)
        : null;
    const systemPrompt = buildSystemPrompt(
      childContext,
      childMemoryData?.memory,
      siblingBlock
    );
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
    });

    const aiMessage = completion.choices[0]?.message?.content ?? "";
    const usage = completion.usage;

    // 7. Lite/Pro: メモリを非同期更新（レスポンスをブロックしない）
    const effectiveChildId = childMemoryData?.id ?? childId ?? null;
    if (hasMemory && effectiveChildId && lastUserMessage) {
      void updateChildMemory(
        effectiveChildId,
        userId,
        childMemoryData?.memory ?? null,
        lastUserMessage.content,
        aiMessage,
        openai
      );
    }

    // 8. アシスタントメッセージ保存 & トークン使用量記録
    let savedUserMessageId: string | null = insertedMessageId;
    let savedAssistantMessageId: string | null = null;

    const tokenSavePromise = usage
      ? saveTokenUsage(userId, MODEL, {
          prompt_tokens:     usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens:      usage.total_tokens,
        })
      : Promise.resolve();

    if (insertedMessageId) {
      // 事前挿入済みのためアシスタントメッセージのみ追加
      try {
        const { data: assistantRow, error } = await db
          .from("messages")
          .insert({ user_id: userId, child_id: childId ?? null, role: "assistant", content: aiMessage })
          .select("id")
          .single();
        if (error) console.warn("[/api/chat] assistantメッセージ保存失敗:", error.message);
        else savedAssistantMessageId = assistantRow?.id ?? null;
      } catch (err) {
        console.warn("[/api/chat] assistantメッセージ保存例外:", err);
      }
    } else {
      const saved = await saveMessages(userId, lastUserMessage.content, aiMessage, childId);
      if (saved) {
        savedUserMessageId = saved.userMessageId;
        savedAssistantMessageId = saved.assistantMessageId;
      }
    }

    await tokenSavePromise;

    return NextResponse.json({
      message: aiMessage,
      userMessageId: savedUserMessageId,
      assistantMessageId: savedAssistantMessageId,
    });
  } catch (error) {
    console.error("[/api/chat]", error);
    return NextResponse.json(
      { error: "AIの応答取得中にエラーが発生しました。" },
      { status: 500 }
    );
  }
}
