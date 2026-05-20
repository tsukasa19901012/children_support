import type { ChatMessage } from "./hooks/useChatHistory";

const CHAT_HISTORY_CACHE_KEY = "parenting_ai_chat_history";

type CachedChatHistory = {
  userId: string;
  childId: string;
  historyDays: number | null;
  messages: ChatMessage[];
};

function cacheKey(
  userId: string,
  childId: string,
  historyDays: number | null
): string {
  return `${userId}:${childId}:${historyDays ?? "all"}`;
}

export function loadChatHistoryCache(
  userId: string,
  childId: string,
  historyDays: number | null
): ChatMessage[] | null {
  try {
    const raw = sessionStorage.getItem(CHAT_HISTORY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedChatHistory;
    if (
      cacheKey(parsed.userId, parsed.childId, parsed.historyDays) !==
      cacheKey(userId, childId, historyDays)
    ) {
      return null;
    }
    return parsed.messages?.length ? parsed.messages : null;
  } catch {
    return null;
  }
}

export function saveChatHistoryCache(
  userId: string,
  childId: string,
  historyDays: number | null,
  messages: ChatMessage[]
): void {
  if (messages.length === 0) return;
  try {
    sessionStorage.setItem(
      CHAT_HISTORY_CACHE_KEY,
      JSON.stringify({
        userId,
        childId,
        historyDays,
        messages,
      } satisfies CachedChatHistory)
    );
  } catch {
    // ignore
  }
}
