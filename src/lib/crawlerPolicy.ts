/** robots.txt で /legal 等を拒否する AI・学習向けクローラー */
export const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Google-Extended",
  "anthropic-ai",
  "ClaudeBot",
  "Claude-Web",
  "PerplexityBot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Diffbot",
  "FacebookBot",
  "Meta-ExternalAgent",
  "Applebot-Extended",
  "ImagesiftBot",
  "omgili",
  "YouBot",
] as const;

export const LEGAL_NOINDEX_PATH = "/legal";

/** レスポンスヘッダ・meta 用 */
export const LEGAL_ROBOTS_HEADER =
  "noindex, nofollow, noarchive, nosnippet, noimageindex";
