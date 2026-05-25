export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "../../../features/billing/plans";
import { fetchUserBilling } from "../../../features/billing/fetchUserBilling";
import { canUseRelations } from "../../../features/billing/planAccess";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "../../../lib/supabase-server";
import { buildSiblingPromptBlock } from "../../../features/child/lib/buildSiblingPrompt";
import {
  buildCaregiverContext,
  buildCaregiverMemoryExtractPrompt,
  buildCaregiverSystemPrompt,
  buildCaregiverChildrenContextBlock,
  type ProfileForPrompt,
} from "../../../features/child/lib/buildCaregiverPrompt";
import { fetchGuardianChildIds } from "../../../features/child/lib/guardianRelations";
import type { ChildPeerRelation } from "../../../features/child/types/siblingRelation";
import type { ProfileType } from "../../../features/child/types/profileType";
import type OpenAI from "openai";

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
  "あなたは、0〜6歳のお子さんを育てる保護者に寄り添う育児AIです。会話からうちの子のことを覚え、話せば話すほど的確で温かい支援を目指します。きょうだいや友達の話題があれば、関係性とそれぞれの立場を踏まえて助言してください。まず共感し、短く落ち着いた口調で実用的な一歩を示してください。医療診断は行わず、必要なら専門家への相談を促してください。";

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

/** Plus: 登録済みのきょうだい関係をプロンプト用に取得 */
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

  if (!activeChild?.birthday) return null;

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

/** 子ども/保護者プロフィールをDBから取得する。user_id で所有権を検証。 */
async function fetchProfileMemory(
  childId: string,
  userId: string
): Promise<{
  id: string;
  name: string;
  birthday: string | null;
  profile_type: ProfileType;
  memory: string | null;
} | null> {
  const db = createServiceSupabaseClient();
  const { data } = await db
    .from("children")
    .select("id, name, birthday, profile_type, memory")
    .eq("id", childId)
    .eq("user_id", userId)
    .maybeSingle();
  return data ?? null;
}

async function fetchUserProfilesForPrompt(
  userId: string
): Promise<ProfileForPrompt[]> {
  const db = createServiceSupabaseClient();
  const { data } = await db
    .from("children")
    .select("id, name, birthday, profile_type, memory")
    .eq("user_id", userId)
    .order("created_at");
  return (data ?? []) as ProfileForPrompt[];
}

/** 会話内容からメモリを更新する（非同期・非致命的）。user_id で所有権を検証。 */
async function updateProfileMemory(
  profileId: string,
  userId: string,
  profileType: ProfileType,
  currentMemory: string | null,
  userMessage: string,
  aiMessage: string,
  openai: OpenAI
): Promise<void> {
  try {
    const extractPrompt =
      profileType === "caregiver"
        ? buildCaregiverMemoryExtractPrompt(
            currentMemory,
            userMessage,
            aiMessage
          )
        : buildChildMemoryExtractPrompt(currentMemory, userMessage, aiMessage);

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
      .eq("id", profileId)
      .eq("user_id", userId);
  } catch (err) {
    console.warn("[/api/chat] メモリ更新失敗（非致命的）:", err);
  }
}

function buildChildMemoryExtractPrompt(
  currentMemory: string | null,
  userMessage: string,
  aiMessage: string
): string {
  const memoryPrompt = currentMemory
    ? `以下は子どもについての既存の学習メモです:\n${currentMemory}\n\n`
    : "";

  return `${memoryPrompt}以下の育児相談の会話から、子どもの性格・特徴・家庭環境・よくある悩みに関する新たな情報を抽出し、学習メモを更新してください。
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
}

function getUpgradeMessage(dailyLimit: number): string {
  const plus = getPlan("plus");
  return `本日の無料枠（${dailyLimit}回）を使い切りました。Plusプラン（月${plus.priceMonthly.toLocaleString()}円）にすると無制限で、うちの子の記憶も更新し続けられます。`;
}

const HISTORY_WINDOW_FREE = 5;
const HISTORY_WINDOW_PLUS = 30;

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

    // 3. プラン・トライアル状態を取得
    const billing = await fetchUserBilling(userId);
    const plan = getPlan(billing.planId);
    const dailyLimit = billing.hasPlusAccess ? null : plan.dailyLimit;
    const profileData = childId ? await fetchProfileMemory(childId, userId) : null;
    const childMemoryData = profileData
      ? { id: profileData.id, memory: profileData.memory }
      : null;

    // 4. 無料枠の回数制限チェック（競合状態対策：先にDB挿入して原子的にカウント）
    const db = createServiceSupabaseClient();
    let insertedMessageId: string | null = null;

    if (dailyLimit !== null) {
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
        if (fallbackCount >= dailyLimit) {
          return NextResponse.json(
            { error: getUpgradeMessage(dailyLimit), limitReached: true },
            { status: 429 }
          );
        }
      } else {
        insertedMessageId = inserted?.id ?? null;
      }

      // 挿入後にカウントを確認（並行リクエストがあっても正確）
      const usedToday = await fetchTodayUsage(userId);
      if (usedToday > dailyLimit) {
        // 超過していたら挿入したメッセージを削除して制限エラーを返す
        if (insertedMessageId) {
          await db.from("messages").delete().eq("id", insertedMessageId);
        }
        return NextResponse.json(
          { error: getUpgradeMessage(dailyLimit), limitReached: true },
          { status: 429 }
        );
      }
    }

    // 5. プランに応じて送信履歴ウィンドウを適用
    const historyWindow = billing.hasPlusAccess
      ? HISTORY_WINDOW_PLUS
      : HISTORY_WINDOW_FREE;
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
    const isCaregiver = profileData?.profile_type === "caregiver";

    let systemPrompt: string;
    if (isCaregiver && profileData) {
      const [allProfiles, linkedChildIds] = await Promise.all([
        fetchUserProfilesForPrompt(userId),
        fetchGuardianChildIds(db, userId, profileData.id),
      ]);
      const childrenBlock = buildCaregiverChildrenContextBlock(
        allProfiles,
        linkedChildIds
      );
      systemPrompt = buildCaregiverSystemPrompt(
        buildCaregiverContext(profileData.name, profileData.birthday),
        childrenBlock,
        profileData.memory
      );
    } else {
      const siblingBlock =
        canUseRelations(billing.row) && childId && !isCaregiver
          ? await fetchSiblingPromptBlock(childId, userId)
          : null;
      systemPrompt = buildSystemPrompt(
        childContext,
        childMemoryData?.memory,
        siblingBlock
      );
    }

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        ...trimmedMessages,
      ],
    });

    const aiMessage = completion.choices[0]?.message?.content ?? "";
    const usage = completion.usage;

    // 7. Plus/トライアル: メモリを非同期更新（Freeは読み取りのみ）
    const effectiveChildId = childMemoryData?.id ?? childId ?? null;
    if (billing.canUpdateMemory && effectiveChildId && lastUserMessage && profileData) {
      void updateProfileMemory(
        effectiveChildId,
        userId,
        profileData.profile_type,
        profileData.memory ?? null,
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
