import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // セッションを更新する（アクセストークンの自動リフレッシュ）
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // API ルートはリダイレクトしない（各ハンドラが認証エラーを返す）
  // /api/webhook は Stripe からのリクエストなので必ず通す
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // 未認証かつ保護ルートへのアクセス → /login にリダイレクト
  if (!user && pathname !== "/login" && pathname !== "/onboarding" && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 認証済みで /login にアクセス → / にリダイレクト
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // 静的ファイル・_next内部を除くすべてのルートに適用
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
