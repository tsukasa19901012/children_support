"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";

export type ChatMessage = {
  role: "user" | "ai";
  text: string;
  /** DB保存済みメッセージのID（削除可能）。初回挨拶など未保存は undefined */
  id?: string;
};

const INITIAL_MESSAGE: ChatMessage = {
  role: "ai",
  text: "こんにちは。育児の相談をどうぞ。",
};

type UseChatHistoryResult = {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  historyLoading: boolean;
  historyError: boolean;
};

/**
 * historyDays が null の場合は全件取得。
 * 数値の場合はその日数分のみ取得（Freeプランは7日間）。
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
    // userId と childId が両方確定してから取得する
    if (userId === null || childId === null) return;

    setMessages([INITIAL_MESSAGE]);
    setHistoryLoading(true);
    setHistoryError(false);

    const load = async () => {
      try {
        const supabase = createClient();
        let query = supabase
          .from("messages")
          .select("id, role, content")
          .eq("user_id", userId)
          .eq("child_id", childId)   // 子どもごとに履歴を分ける
          .order("created_at", { ascending: true });

        if (historyDays !== null) {
          const since = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000).toISOString();
          query = query.gte("created_at", since);
        }

        const { data, error } = await query;

        if (error) {
          console.warn("[useChatHistory] 履歴取得失敗:", error.message);
          setHistoryError(true);
          return;
        }

        if (data && data.length > 0) {
          const history: ChatMessage[] = data.map((row) => ({
            id: row.id,
            role: row.role === "assistant" ? "ai" : ("user" as const),
            text: row.content,
          }));
          setMessages(history);
        }
      } catch (err) {
        console.warn("[useChatHistory] 履歴取得例外:", err);
        setHistoryError(true);
      } finally {
        setHistoryLoading(false);
      }
    };

    load();
  }, [userId, childId, historyDays]);

  return { messages, setMessages, historyLoading, historyError };
};
