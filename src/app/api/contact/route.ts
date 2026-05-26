import { NextRequest, NextResponse } from "next/server";
import type { ContactCategory } from "../../../features/marketing/types";

export const dynamic = "force-dynamic";

const CATEGORIES = new Set<ContactCategory>([
  "billing",
  "account",
  "privacy",
  "bug",
  "other",
]);

const CATEGORY_LABELS: Record<ContactCategory, string> = {
  billing: "課金・解約・返金",
  account: "ログイン・アカウント",
  privacy: "個人情報",
  bug: "不具合",
  other: "その他",
};

const MAX_MESSAGE = 2000;

type Body = {
  email?: string;
  category?: string;
  message?: string;
  website?: string;
};

export async function POST(request: NextRequest) {
  const inbox = process.env.CONTACT_INBOX_EMAIL?.trim();
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_FROM_EMAIL?.trim();

  if (!inbox || !apiKey || !from) {
    return NextResponse.json(
      { error: "お問い合わせ機能が設定されていません。しばらくしてからお試しください。" },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストの形式が不正です。" }, { status: 400 });
  }

  if (body.website?.trim()) {
    return NextResponse.json({ ok: true });
  }

  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";
  const category = body.category as ContactCategory;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "有効なメールアドレスを入力してください。" },
      { status: 400 }
    );
  }

  if (!CATEGORIES.has(category)) {
    return NextResponse.json({ error: "お問い合わせ種別が不正です。" }, { status: 400 });
  }

  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `お問い合わせ内容は1〜${MAX_MESSAGE}文字で入力してください。` },
      { status: 400 }
    );
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: inbox,
    replyTo: email,
    subject: `[となりっこ] ${CATEGORY_LABELS[category]}`,
    text: [
      `種別: ${CATEGORY_LABELS[category]}`,
      `返信先: ${email}`,
      "",
      message,
    ].join("\n"),
  });

  if (error) {
    console.error("[/api/contact]", error);
    return NextResponse.json(
      { error: "送信に失敗しました。しばらくしてからお試しください。" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
