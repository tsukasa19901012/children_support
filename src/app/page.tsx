"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useUserPlan } from "../features/billing/hooks/useUserPlan";
import { UpgradeModal } from "../features/billing/components/UpgradeModal";
import { useChatHistory } from "../features/chat/hooks/useChatHistory";
import type { ChatMessage } from "../features/chat/hooks/useChatHistory";
import { useAuthUserId } from "../hooks/useAuthUserId";
import { useChildRedirect } from "../features/child/hooks/useChildRedirect";
import type { ChildInfo } from "../features/child/hooks/useChildRedirect";
import { formatAge, buildChildContext } from "../lib/childAge";
import { getPlan } from "../features/billing/plans";

type Message = ChatMessage;

export default function Home() {
  const [input, setInput] = useState("");
  const [showChildPicker, setShowChildPicker] = useState(false);
  const { userId } = useAuthUserId();
  const { childId, childName, childBirthday, childChecked, allChildren, switchChild } = useChildRedirect(userId);
  const { canSend, remaining, planId, usedToday, recordUsage, syncUsageToLimit } = useUserPlan();
  const historyDays = getPlan(planId).historyDays;
  const { messages, setMessages, historyLoading, historyError } = useChatHistory(userId, childId, historyDays);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !canSend || !userId) return;

    const userMessage: Message = { role: "user", text };
    const nextMessages: Message[] = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
          childContext: childName && childBirthday
            ? buildChildContext(childName, childBirthday)
            : undefined,
          childId: childId ?? undefined,
        }),
      });

      // 上限到達: 楽観的に追加したメッセージを戻し、入力欄を復元してモーダルを表示
      if (res.status === 429) {
        const limit = getPlan(planId).dailyLimit;
        if (limit !== null) syncUsageToLimit(limit);
        setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1));
        setInput(text);
        setShowUpgrade(true);
        return;
      }

      if (!res.ok) throw new Error(`status: ${res.status}`);

      const data: { message: string } = await res.json();
      recordUsage(); // 成功時のみカウントを増やす
      setMessages((prev) => [...prev, { role: "ai", text: data.message }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "エラーが発生しました。もう一度お試しください。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isLimited = !canSend;
  const isFree = planId === "free";
  const inputDisabled = loading || isLimited;
  const dailyLimit = getPlan(planId).dailyLimit;

  // 子ども情報の確認が終わるまでローディング
  if (userId && !childChecked) {
    return (
      <div className="flex items-center justify-center h-dvh bg-gray-50">
        <div className="text-center">
          <div className="text-3xl mb-3">👶</div>
          <p className="text-gray-400 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-gray-100">
      {/* Header */}
      <header className="shrink-0 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="relative flex items-center gap-1">
          {/* 子ども名 — Proで複数いる場合はタップで切替 */}
          {planId === "pro" && allChildren.length > 1 ? (
            <button
              type="button"
              onClick={() => setShowChildPicker((v) => !v)}
              className="flex items-center gap-1 font-bold text-base text-gray-800 active:opacity-70"
            >
              {childName && childBirthday
                ? `${childName}（${formatAge(childBirthday)}）`
                : "育児AIチャット"}
              <span className="text-gray-400 text-xs">{showChildPicker ? "▲" : "▼"}</span>
            </button>
          ) : (
            <span className="font-bold text-base">
              {childName && childBirthday
                ? `${childName}（${formatAge(childBirthday)}）`
                : "育児AIチャット"}
            </span>
          )}

          {/* 子ども切替ドロップダウン */}
          {showChildPicker && (
            <>
              {/* オーバーレイ */}
              <div
                className="fixed inset-0 z-20"
                onClick={() => setShowChildPicker(false)}
              />
              <div className="absolute top-full left-0 mt-2 z-30 bg-white rounded-2xl shadow-lg border border-gray-100 min-w-[200px] overflow-hidden">
                {allChildren.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => {
                      switchChild(child.id);
                      setShowChildPicker(false);
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                      child.id === childId
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-50 active:bg-gray-100"
                    }`}
                  >
                    <span className="text-lg">👶</span>
                    <div>
                      <p className="text-sm font-medium">{child.name}</p>
                      <p className="text-xs text-gray-400">{formatAge(child.birthday)}</p>
                    </div>
                    {child.id === childId && (
                      <span className="ml-auto text-blue-500 text-xs font-bold">表示中</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <PlanBadge planId={planId} remaining={remaining} />
          {isFree && (
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="text-xs font-medium bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-full transition-colors"
            >
              アップグレード
            </button>
          )}
          <Link
            href="/account"
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            マイページ
          </Link>
        </div>
      </header>

      {/* History loading */}
      {historyLoading && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-500 text-center">
          会話履歴を読み込んでいます...
        </div>
      )}

      {/* History error */}
      {historyError && !historyLoading && (
        <div className="shrink-0 bg-red-50 border-b border-red-100 px-4 py-2 text-xs text-red-500 text-center">
          会話履歴の読み込みに失敗しました。ページを再読み込みしてください。
        </div>
      )}

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
              }`}
            >
              {m.role === "user" ? (
                <span className="whitespace-pre-wrap">{m.text}</span>
              ) : (
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                    li: ({ children }) => <li>{children}</li>,
                    // javascript: スキームのリンクを無害化
                    a: ({ href, children }) => {
                      const safe = href?.startsWith("http") || href?.startsWith("https");
                      return safe
                        ? <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{children}</a>
                        : <span>{children}</span>;
                    },
                  }}
                >
                  {m.text}
                </ReactMarkdown>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3">
              <span className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      {/* Limit banner */}
      {isLimited && (
        <div className="shrink-0 bg-amber-50 border-t border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
          本日の無料利用回数（{dailyLimit}回）を使い切りました。
          <button
            type="button"
            onClick={() => setShowUpgrade(true)}
            className="ml-2 font-medium underline text-amber-900"
          >
            プランを見る →
          </button>
        </div>
      )}

      {/* Input */}
      <footer className="shrink-0 bg-white border-t px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex gap-2 items-center">
        <textarea
          className="flex-1 border border-gray-300 rounded-2xl px-4 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400 resize-none"
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isLimited
              ? "本日の利用上限に達しました"
              : loading
              ? "応答を待っています..."
              : "育児の相談を入力..."
          }
          disabled={inputDisabled}
        />
        <button
          type="button"
          onClick={sendMessage}
          disabled={inputDisabled}
          className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
        >
          送信
        </button>
      </footer>

      {/* Upgrade modal */}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}

function PlanBadge({
  planId,
  remaining,
}: {
  planId: string;
  remaining: number | null;
}) {
  if (planId === "free") {
    return (
      <span className="text-xs text-gray-500">
        FREE
        {remaining !== null && (
          <span
            className={`ml-1 font-medium ${
              remaining === 0 ? "text-red-500" : "text-gray-600"
            }`}
          >
            残り{remaining}回
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="text-xs font-bold text-blue-600 uppercase tracking-wide">
      {planId}
    </span>
  );
}
