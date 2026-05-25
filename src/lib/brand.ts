/** 本番 URL（OG・メール・外部連携の正） */
export const BRAND_SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "") ||
  "https://www.tonarikko.com";

/** ロゴ（public/logo.png）。メール・OG・Stripe 等で共通 */
export const BRAND_LOGO_PATH = "/logo.png";
export const BRAND_LOGO_URL = `${BRAND_SITE_URL}${BRAND_LOGO_PATH}`;

/** プロダクトの表示名・コピー（UI・ドキュメントで共有） */
export const BRAND = {
  name: "となりっこ",
  /** ストア・OG・「サービス名 — 」表記 */
  subtitle: "うちの子を覚える育児AI",
  tagline: "うちの子のこと、覚えながら聞く。",
  subtagline: "0〜6歳の育児の話、落ち着いて。",
  audience: "0〜6歳のママ・パパ向け",
  description:
    "うちの子のことを覚えながら、育児の悩みに寄り添うAI。話せば話すほど、うちの子に合う相談ができます。",
} as const;

/** サービス名＋サブタイトル（ストア・タブタイトル用） */
export const BRAND_DISPLAY = `${BRAND.name} — ${BRAND.subtitle}`;

/** チャット初回の挨拶（履歴なし時） */
export const CHAT_GREETING =
  "こんにちは。いま気になっていること、短くでも大丈夫です。まずは気持ちを聞かせてください。";

/** ヘッダーで子ども未選択時の表示 */
export const CHAT_HEADER_FALLBACK = BRAND.name;
