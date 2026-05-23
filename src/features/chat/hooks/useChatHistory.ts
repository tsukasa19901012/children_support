"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";
import {
  loadChatHistoryCache,
  saveChatHistoryCache,
} from "../chatHistoryCache";
import { CHAT_GREETING } from "../../../lib/brand";
import { sortMessagesByChatOrder } from "../lib/sortMessages";

export type ChatMessage = {
  role: "user" | "ai";
  text: string;
  /** DB保存済みメッセージのID（削除可能）。初回挨拶など未保存は undefined */
  id?: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "ai",
  text: CHAT_GREETING,
};

type UseChatHistoryResult = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  historyLoading: boolean;
  historyError: boolean;
};

/**
 * historyDays が null の場合は全件取得。
 * 数値の場合はその日数分のみ取得（Freeプランは14日間）。
 * アップグレード後は即座に全件が表示されるようになる。
 */
export const useChatHistory = (
  userId: string | null,
  childId: string | null,
  historyDays: number | null = null
): UseChatHistoryResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    if (userId === null || childId === null) return;

    const cached =
      loadChatHistoryCache(userId, childId, historyDays) ?? null;
    if (cached) {
      setMessages(cached);
      setHistoryLoading(false);
      setHistoryError(false);
    } else {
      setHistoryLoading(true);
      setHistoryError(false);
    }

    let cancelled = false;

    const load = async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from("messages")
          .select("id, role, content, created_at")
          .eq("user_id", userId)
          .eq("child_id", childId)
          .order("created_at", { ascending: true })
          .order("role", { ascending: false });

        if (historyDays !== null) {
          const since = new Date(
            Date.now() - historyDays * 24 * 60 * 60 * 1000
          ).toISOString();
          query = query.gte("created_at", since);
        }

        const { data, error } = await query;

        if (cancelled) return;

        if (error) {
          console.warn("[useChatHistory] 履歴取得失敗:", error.message);
          if (!cached) setHistoryError(true);
          return;
        }

        if (data && data.length > 0) {
          const sorted = sortMessagesByChatOrder(data);
          const history: ChatMessage[] = sorted.map((row) => ({
            id: row.id,
            role: row.role === "assistant" ? "ai" : ("user" as const),
            text: row.content,
          }));
          setMessages(history);
          saveChatHistoryCache(userId, childId, historyDays, history);
        } else if (!cached) {
          setMessages([INITIAL_MESSAGE]);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("[useChatHistory] 履歴取得例外:", err);
          if (!cached) setHistoryError(true);
        }
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId, childId, historyDays]);

  return { messages, setMessages, historyLoading, historyError };
};
