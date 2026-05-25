export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { sortMessagesByChatOrder } from "../../../../features/chat/lib/sortMessages";
import { hasPlusAccess, type UserBillingRow } from "../../../../features/billing/planAccess";
import { createServiceSupabaseClient } from "../../../../lib/supabase-server";
import { formatAge } from "../../../../lib/childAge";
import { formatWeeklyReportPeriodLabel } from "../../../../lib/date";
import {
  buildCaregiverChildrenContextBlock,
  buildCaregiverWeeklyReportPrompt,
  type ProfileForPrompt,
} from "../../../../features/child/lib/buildCaregiverPrompt";
import { fetchGuardianChildIds } from "../../../../features/child/lib/guardianRelations";
import type { ProfileType } from "../../../../features/child/types/profileType";

const REPORT_PROMPT = (
  childName: string,
  ageText: string,
  messages: { role: string; content: string }[],
  memory: string | null,
  periodLabel: string
) => {
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "保護者" : "AI"}: ${m.content}`)
    .join("\n");

  const memorySection = memory ? `\n【お子さんについての記録】\n${memory}\n` : "";

  return `あなたは、0〜6歳のお子さんを育てる家庭を支える育児相談のAIです。
以下の情報をもとに、週次の育児振り返りレポートをチャットメッセージとして作成してください。うちの子のことを覚えたうえで、寄り添った振り返りを心がけてください。

【お子さんの情報】
名前: ${childName}（${ageText}）
${memorySection}
【${periodLabel}の相談内容】
${conversationText || "（この期間は相談がありませんでした）"}

---

以下の構成で、保護者の自己肯定感を高め、来週への意欲が湧くメッセージを作成してください。
絵文字を適度に使い、読みやすく温かいトーンで書いてください。

1. この期間の振り返り
   - 何回相談したか・どんな悩みに向き合ったかを振り返る
   - 保護者が頑張っていたことを具体的に認める言葉

2. ${childName}ちゃんの成長への気づき
   - 会話から読み取れるお子さんの様子・成長

3. あなたは十分頑張っています
   - 育児の大変さへの共感と、保護者の努力を称える言葉

4. 来週の保護者へのメッセージ
   - 力が抜けて、来週も前向きになれる温かい言葉

最初に「📋 ${periodLabel}の育児振り返りレポート（${childName}ちゃん）」と見出しをつけてください。
トーン：温かく、共感的、押しつけがましくない。専門用語を使わない。`;
};

function isWeeklyReportEligible(row: UserBillingRow): boolean {
  return hasPlusAccess(row);
}

/** Plus・トライアル中ユーザーへ、登録済みプロフィール（お子さん・保護者）ごとに週次レポートを挿入する */
async function runWeeklyReport(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY未設定" }, { status: 503 });
  }

  const db = createServiceSupabaseClient();

  const { data: userRows, error: usersError } = await db
    .from("users")
    .select("id, plan, created_at, trial_ends_at");

  if (usersError) {
    console.error("[report/weekly] ユーザー取得失敗:", usersError.message);
    return NextResponse.json({ error: "ユーザー取得失敗" }, { status: 500 });
  }

  const eligibleUsers = (userRows ?? []).filter((u) =>
    isWeeklyReportEligible({
      plan: u.plan,
      created_at: u.created_at,
      trial_ends_at: u.trial_ends_at,
    })
  );

  if (eligibleUsers.length === 0) {
    console.log("[report/weekly] 対象ユーザーなし");
    return NextResponse.json({ sent: 0, users: 0 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const periodLabel = formatWeeklyReportPeriodLabel();
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let sentCount = 0;

  for (const user of eligibleUsers) {
    try {
      const { data: children, error: childrenError } = await db
        .from("children")
        .select("id, name, birthday, memory, profile_type")
        .eq("user_id", user.id)
        .order("created_at");

      if (childrenError) {
        console.error(
          `[report/weekly] userId=${user.id} 子ども取得失敗:`,
          childrenError.message
        );
        continue;
      }

      if (!children?.length) continue;

      const allProfiles = children as ProfileForPrompt[];

      for (const child of children) {
        try {
          const profileType = (child.profile_type as ProfileType) ?? "child";
          const ageText = formatAge(child.birthday) ?? "年齢未登録";

          const { data: rawWeekMessages } = await db
            .from("messages")
            .select("role, content, created_at")
            .eq("user_id", user.id)
            .eq("child_id", child.id)
            .gte("created_at", oneWeekAgo)
            .order("created_at", { ascending: true })
            .order("role", { ascending: false })
            .limit(50);

          const weekMessages = rawWeekMessages
            ? sortMessagesByChatOrder(rawWeekMessages)
            : null;

          let promptContent: string;
          if (profileType === "caregiver") {
            const linkedChildIds = await fetchGuardianChildIds(
              db,
              user.id,
              child.id
            );
            const childrenContext = buildCaregiverChildrenContextBlock(
              allProfiles,
              linkedChildIds
            );
            promptContent = buildCaregiverWeeklyReportPrompt(
              child.name,
              childrenContext,
              weekMessages ?? [],
              child.memory ?? null,
              periodLabel
            );
          } else {
            promptContent = REPORT_PROMPT(
              child.name,
              ageText,
              weekMessages ?? [],
              child.memory ?? null,
              periodLabel
            );
          }

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: promptContent }],
            max_tokens: 800,
          });

          const reportText = completion.choices[0]?.message?.content?.trim();
          if (!reportText) continue;

          const { error: insertError } = await db.from("messages").insert({
            user_id: user.id,
            child_id: child.id,
            role: "assistant",
            content: reportText,
          });

          if (insertError) {
            console.error(
              `[report/weekly] userId=${user.id} childId=${child.id} 挿入失敗:`,
              insertError.message
            );
            continue;
          }

          sentCount++;
        } catch (err) {
          console.error(
            `[report/weekly] userId=${user.id} childId=${child.id} 処理失敗:`,
            err
          );
        }
      }
    } catch (err) {
      console.error(`[report/weekly] userId=${user.id} 処理失敗:`, err);
    }
  }

  console.log(
    `[report/weekly] ${sentCount}件（${eligibleUsers.length}ユーザー）完了`
  );
  return NextResponse.json({ sent: sentCount, users: eligibleUsers.length });
}

/** Vercel Cron は GET で呼び出す */
export async function GET(request: NextRequest) {
  return runWeeklyReport(request);
}

export async function POST(request: NextRequest) {
  return runWeeklyReport(request);
}
