export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServiceSupabaseClient } from "../../../../lib/supabase-server";
import { formatAge } from "../../../../lib/childAge";

const REPORT_PROMPT = (
  childName: string,
  ageText: string,
  messages: { role: string; content: string }[],
  memory: string | null
) => {
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "保護者" : "AI"}: ${m.content}`)
    .join("\n");

  const memorySection = memory ? `\n【お子さんについての記録】\n${memory}\n` : "";

  return `あなたは育児中の保護者に寄り添う温かいAIアシスタントです。
以下の情報をもとに、週次の育児振り返りレポートをチャットメッセージとして作成してください。

【お子さんの情報】
名前: ${childName}（${ageText}）
${memorySection}
【今週の相談内容】
${conversationText || "（今週は相談がありませんでした）"}

---

以下の構成で、保護者の自己肯定感を高め、来週への意欲が湧くメッセージを作成してください。
絵文字を適度に使い、読みやすく温かいトーンで書いてください。

1. 今週の振り返り
   - 何回相談したか・どんな悩みに向き合ったかを振り返る
   - 保護者が頑張っていたことを具体的に認める言葉

2. ${childName}ちゃんの成長への気づき
   - 会話から読み取れるお子さんの様子・成長

3. あなたは十分頑張っています
   - 育児の大変さへの共感と、保護者の努力を称える言葉

4. 来週の保護者へのメッセージ
   - 力が抜けて、来週も前向きになれる温かい言葉

最初に「📋 今週の育児振り返りレポート」と見出しをつけてください。
トーン：温かく、共感的、押しつけがましくない。専門用語を使わない。`;
};

/** Proプランユーザー全員の週次レポートをチャットに挿入する */
export async function POST(request: NextRequest) {
  // Vercel Cron の認証チェック
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY未設定" }, { status: 503 });
  }

  const db = createServiceSupabaseClient();

  // Proプランユーザーを取得
  const { data: proUsers, error: usersError } = await db
    .from("users")
    .select("id")
    .eq("plan", "pro");

  if (usersError || !proUsers?.length) {
    console.log("[report/weekly] Proプランユーザーなし");
    return NextResponse.json({ sent: 0 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { default: OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let sentCount = 0;

  for (const user of proUsers) {
    try {
      // active_child_id を優先し、未設定なら最初の子どもを使用
      const { data: userData } = await db
        .from("users")
        .select("active_child_id")
        .eq("id", user.id)
        .maybeSingle();

      const activeChildId = userData?.active_child_id as string | null;

      const childQuery = activeChildId
        ? db.from("children").select("name, birthday, memory").eq("id", activeChildId).eq("user_id", user.id)
        : db.from("children").select("name, birthday, memory").eq("user_id", user.id).order("created_at").limit(1);

      const { data: child } = await childQuery.maybeSingle();

      if (!child) continue;

      const ageText = formatAge(child.birthday);

      // 今週のメッセージを取得（最大50件）
      const { data: weekMessages } = await db
        .from("messages")
        .select("role, content")
        .eq("user_id", user.id)
        .gte("created_at", oneWeekAgo)
        .order("created_at", { ascending: true })
        .limit(50);

      // OpenAIでレポート生成
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: REPORT_PROMPT(
          child.name,
          ageText,
          weekMessages ?? [],
          child.memory ?? null
        )}],
        max_tokens: 800,
      });

      const reportText = completion.choices[0]?.message?.content?.trim();
      if (!reportText) continue;

      // チャットにアシスタントメッセージとして挿入
      const { error: insertError } = await db
        .from("messages")
        .insert({
          user_id: user.id,
          role: "assistant",
          content: reportText,
        });

      if (insertError) {
        console.error(`[report/weekly] userId=${user.id} 挿入失敗:`, insertError.message);
        continue;
      }

      sentCount++;
    } catch (err) {
      console.error(`[report/weekly] userId=${user.id} 処理失敗:`, err);
    }
  }

  console.log(`[report/weekly] ${sentCount}件完了`);
  return NextResponse.json({ sent: sentCount });
}
