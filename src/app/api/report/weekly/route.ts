export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
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
以下の情報をもとに、週次の育児振り返りレポートを作成してください。

【お子さんの情報】
名前: ${childName}（${ageText}）
${memorySection}
【今週の相談内容】
${conversationText || "（今週は相談がありませんでした）"}

---

以下の構成で、保護者の自己肯定感を高め、来週への意欲が湧くレポートを作成してください。
メール本文として自然な日本語で書いてください。HTMLタグは不要です。

1. 今週の振り返り
   - 何回相談したか・どんな悩みに向き合ったか
   - 保護者が頑張っていたことを具体的に認める言葉

2. ${childName}ちゃんの成長への気づき
   - 会話から読み取れるお子さんの様子・成長

3. あなたは十分頑張っています
   - 育児の大変さへの共感と、保護者の努力を称える言葉

4. 来週の保護者へのメッセージ
   - 力が抜けて、来週も前向きになれる温かい言葉

トーン：温かく、共感的、押しつけがましくない。専門用語を使わない。`;
};

/** Proプランユーザー全員に週次レポートを送信する */
export async function POST(request: NextRequest) {
  // Vercel Cron の認証チェック
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return NextResponse.json({ error: "RESEND_API_KEY未設定" }, { status: 503 });
  }

  const resend = new Resend(resendApiKey);
  const db = createServiceSupabaseClient();

  // Proプランユーザーを取得（メールアドレスはauth.usersから）
  const { data: proUsers, error: usersError } = await db
    .from("users")
    .select("id, plan")
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
      // auth.usersからメールアドレス取得
      const { data: authUser } = await db.auth.admin.getUserById(user.id);
      const email = authUser?.user?.email;
      if (!email) continue;

      // 子ども情報を取得
      const { data: child } = await db
        .from("children")
        .select("name, birthday, memory")
        .eq("user_id", user.id)
        .maybeSingle();

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
        messages: [{
          role: "user",
          content: REPORT_PROMPT(
            child.name,
            ageText,
            weekMessages ?? [],
            child.memory ?? null
          ),
        }],
        max_tokens: 800,
      });

      const reportText = completion.choices[0]?.message?.content?.trim();
      if (!reportText) continue;

      // メール送信
      await resend.emails.send({
        from: "育児AIチャット <onboarding@resend.dev>",
        to: email,
        subject: `【育児AIチャット】${child.name}ちゃんの今週の振り返りレポート`,
        html: buildEmailHtml(child.name, ageText, reportText),
      });

      sentCount++;
    } catch (err) {
      console.error(`[report/weekly] userId=${user.id} 送信失敗:`, err);
    }
  }

  console.log(`[report/weekly] ${sentCount}件送信完了`);
  return NextResponse.json({ sent: sentCount });
}

function buildEmailHtml(childName: string, ageText: string, reportText: string): string {
  const paragraphs = reportText
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => {
      if (/^\d+\./.test(l) || l.startsWith("【")) {
        return `<h3 style="font-size:15px;font-weight:700;color:#1f2937;margin:20px 0 6px;">${l}</h3>`;
      }
      return `<p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.8;">${l}</p>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ja">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Yu Gothic',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="font-size:40px;line-height:1;">👶</div>
          <h1 style="margin:8px 0 4px;font-size:18px;font-weight:700;color:#1f2937;">育児AIチャット</h1>
          <p style="margin:0;font-size:13px;color:#9ca3af;">週次レポート</p>
        </td></tr>
        <tr><td style="background-color:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:28px;">
          <div style="background-color:#eff6ff;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#3b82f6;font-weight:600;">
              ${childName}ちゃん（${ageText}）の今週の振り返り
            </p>
          </div>
          ${paragraphs}
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
            このレポートはProプランの特典として毎週月曜日にお届けします。<br/>
            育児AIチャット
          </p>
        </td></tr>
        <tr><td align="center" style="padding-top:20px;">
          <p style="margin:0;font-size:12px;color:#d1d5db;">&copy; 育児AIチャット</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
