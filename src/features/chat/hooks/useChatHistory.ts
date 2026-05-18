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

export const useChatHistory = (userId: string | null): UseChatHistoryResult => {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    // userId が確定するまで待つ
    if (userId === null) return;

    const load = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("messages")
          .select("role, content")
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

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
  }, [userId]);

  return { messages, setMessages, historyLoading };
};
