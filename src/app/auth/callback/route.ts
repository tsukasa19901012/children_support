import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "../../../lib/supabase-server";

/**
 * Supabase Magic Link の認証コールバック。
 * メールリンクをクリックすると /auth/callback?code=xxx にリダイレクトされる。
 * コードをセッションと交換してから / へ転送する。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  // コードなし・エラー時はログイン画面に戻す
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
