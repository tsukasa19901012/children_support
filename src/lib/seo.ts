import type { Metadata } from "next";
import { BRAND, BRAND_DISPLAY, BRAND_LOGO_PATH, BRAND_SITE_URL } from "./brand";

/** 検索エンジンに載せる公開ページ */
export const SEO_INDEXABLE_PATHS = [
  "/lp",
  "/terms",
  "/privacy",
  "/contact",
] as const;

/** robots.txt でクロールさせないアプリ内パス */
export const SEO_DISALLOW_PATHS = [
  "/api/",
  "/account",
  "/onboarding",
  "/auth/",
  "/success",
  "/cancel",
  "/legal",
] as const;

export const SEO_KEYWORDS = [
  "育児",
  "育児AI",
  "子育て",
  "育児相談",
  "0歳",
  "1歳",
  "2歳",
  "3歳",
  "4歳",
  "5歳",
  "6歳",
  "ママ",
  "パパ",
  "イヤイヤ",
  "夜泣き",
  "となりっこ",
] as const;

type PublicMetadataOptions = {
  /** ブラウザタブ用（`— となりっこ` は template で付与） */
  title: string;
  description: string;
  /** 例: `/lp` */
  path: `/${string}` | "";
  /** 一覧ページより優先したい場合 */
  priorityTitle?: boolean;
};

export function absoluteUrl(path: string): string {
  const base = BRAND_SITE_URL.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 公開マーケティング・法務ページ向け（index 許可） */
export function createPublicMetadata({
  title,
  description,
  path,
  priorityTitle = false,
}: PublicMetadataOptions): Metadata {
  const url = absoluteUrl(path);

  return {
    title: priorityTitle ? { absolute: title } : title,
    description,
    keywords: [...SEO_KEYWORDS],
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      locale: "ja_JP",
      url,
      siteName: BRAND.name,
      title: priorityTitle ? title : `${title} — ${BRAND.name}`,
      description,
      images: [
        {
          url: BRAND_LOGO_PATH,
          width: 512,
          height: 512,
          alt: BRAND.name,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: priorityTitle ? title : `${title} — ${BRAND.name}`,
      description,
      images: [BRAND_LOGO_PATH],
    },
  };
}

/** ログイン・決済結果など（index 拒否） */
export function createNoIndexMetadata(
  title: string,
  description?: string
): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}

/** トップ LP 用の既定 description（OG 兼用） */
export const SEO_LP_DESCRIPTION =
  `${BRAND.description} ${BRAND.audience}。${BRAND.tagline} 初回14日間はPlusと同じ機能を無料でお試し。`;

export const SEO_LP_TITLE = BRAND_DISPLAY;
