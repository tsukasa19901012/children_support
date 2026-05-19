"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";

export type ChatMessage = {
  role: "user" | "ai";
  text: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "ai",
  text: "こんにちは。育児の相談をどうぞ。",
};

type UseChatHistoryResult = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  historyLoading: boolean;
};

/**
 * historyDays が null の場合は全件取得。
 * 数値の場合はその日数分のみ取得（Freeプランは7日間）。
 * アップグレード後は即座に全件が表示されるようになる。
 */
export const useChatHistory = (
  userId: string | null,
  historyDays: number | null = null
): UseChatHistoryResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    if (userId === null) return;

    const load = async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from("messages")
          .select("role, content")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (historyDays !== null) {
          const since = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", since);
        }

        const { data, error } = await query;

        if (error) {
          console.warn("[useChatHistory] 履歴取得失敗:", error.message);
          return;
        }

        if (data && data.length > 0) {
          const history: ChatMessage[] = data.map((row) => ({
            role: row.role === "assistant" ? "ai" : ("user" as const),
            text: row.content,
          }));
          setMessages(history);
        }
      } catch (err) {
        console.warn("[useChatHistory] 履歴取得例外:", err);
      } finally {
        setHistoryLoading(false);
      }
    };

    load();
  }, [userId, historyDays]);

  return { messages, setMessages, historyLoading };
};
