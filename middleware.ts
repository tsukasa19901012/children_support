import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  AI_CRAWLER_USER_AGENTS,
  LEGAL_NOINDEX_PATH,
  LEGAL_ROBOTS_HEADER,
} from "./src/lib/crawlerPolicy";
import { isSeoMetaPath } from "./src/lib/seo";

/** 未ログインでも閲覧可能（法務・LP） */
const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/auth",
  "/legal",
  "/terms",
  "/privacy",
  "/contact",
  "/lp",
] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAiCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return AI_CRAWLER_USER_AGENTS.some((bot) =>
    ua.includes(bot.toLowerCase())
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // sitemap / robots 等は未認証でも配信（Search Console・クローラー向け）
  if (isSeoMetaPath(pathname)) {
    return NextResponse.next();
  }

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

  if (pathname === LEGAL_NOINDEX_PATH || pathname.startsWith(`${LEGAL_NOINDEX_PATH}/`)) {
    response.headers.set("X-Robots-Tag", LEGAL_ROBOTS_HEADER);
    if (isAiCrawler(request.headers.get("user-agent"))) {
      return new NextResponse("Forbidden", { status: 403 });
    }
  }

  // API ルートはリダイレクトしない（各ハンドラが認証エラーを返す）
  // /api/webhook は Stripe からのリクエストなので必ず通す
  if (pathname.startsWith("/api/")) {
    return response;
  }

  // 未認証かつ保護ルートへのアクセス → /login にリダイレクト
  if (!user && !isPublicPath(pathname)) {
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
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|site\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
