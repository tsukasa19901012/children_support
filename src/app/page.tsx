"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChatMarkdown } from "../features/chat/components/ChatMarkdown";
import { useUserPlan } from "../features/billing/hooks/useUserPlan";
import { UpgradeModal } from "../features/billing/components/UpgradeModal";
import { useChatHistory } from "../features/chat/hooks/useChatHistory";
import type { ChatMessage } from "../features/chat/hooks/useChatHistory";
import { useAuthUserId } from "../hooks/useAuthUserId";
import { useKeyboardInset } from "../hooks/useKeyboardInset";
import { useElementHeight } from "../hooks/useElementHeight";
import { useAutoResizeTextarea } from "../hooks/useAutoResizeTextarea";
import { useChildRedirect } from "../features/child/hooks/useChildRedirect";
import { CHAT_HEADER_FALLBACK } from "../lib/brand";
import { formatAge, buildChildContext } from "../lib/childAge";
import { getPlan } from "../features/billing/plans";
import { shouldShowUpgradeCta } from "../features/billing/billingUi";
import { DeleteConfirmDialog } from "../features/chat/components/DeleteConfirmDialog";
import { deleteMessagesFromDb } from "../features/chat/lib/deleteMessages";
import { rebuildChildMemory } from "../features/chat/lib/rebuildMemory";

type Message = ChatMessage;

type DeleteTarget = {
  userIndex: number;
  ids: string[];
};

export default function Home() {
  const [input, setInput] = useState("");
  const [showChildPicker, setShowChildPicker] = useState(false);
  const { userId } = useAuthUserId();
  const { childId, childName, childBirthday, childChecked, allChildren, switchChild } = useChildRedirect(userId);
  const {
    canSend,
    remaining,
    planId,
    planLoaded,
    recordUsage,
    syncUsageToLimit,
    hasPlusAccess,
    trialDaysLeft,
    canUpdateMemory,
  } = useUserPlan(userId);
  const isLimited = planLoaded && !canSend;
  const historyDays = hasPlusAccess ? null : getPlan("free").historyDays;
  const { messages, setMessages, historyLoading, historyError } = useChatHistory(userId, childId, historyDays);
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rebuildingMemory, setRebuildingMemory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const keyboardInset = useKeyboardInset();
  const composerHeight = useElementHeight(composerRef, [isLimited, childChecked]);
  const inputRef = useAutoResizeTextarea(input, 10);

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
        const limit = getPlan("free").dailyLimit;
        if (limit !== null) syncUsageToLimit(limit);
        setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1));
        setInput(text);
        setShowUpgrade(true);
        return;
      }

      if (!res.ok) throw new Error(`status: ${res.status}`);

      const data: {
        message: string;
        userMessageId?: string | null;
        assistantMessageId?: string | null;
      } = await res.json();
      recordUsage(); // 成功時のみカウントを増やす
      setMessages((prev) => {
        const updated = [...prev];
        const lastUserIdx = updated.length - 1;
        if (updated[lastUserIdx]?.role === "user" && data.userMessageId) {
          updated[lastUserIdx] = { ...updated[lastUserIdx], id: data.userMessageId };
        }
        return [
          ...updated,
          {
            role: "ai" as const,
            text: data.message,
            id: data.assistantMessageId ?? undefined,
          },
        ];
      });
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "エラーが発生しました。もう一度お試しください。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /** ユーザーメッセージと直後のAI回答を削除対象として選ぶ */
  const requestDelete = (userIndex: number) => {
    const userMsg = messages[userIndex];
    if (userMsg.role !== "user" || !userMsg.id) return;

    const ids = [userMsg.id];
    const next = messages[userIndex + 1];
    if (next?.role === "ai" && next.id) ids.push(next.id);

    setDeleteTarget({ userIndex, ids });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const errMsg = await deleteMessagesFromDb(deleteTarget.ids);
    if (errMsg) {
      setDeleting(false);
      alert("削除に失敗しました。もう一度お試しください。");
      return;
    }

    setMessages((prev) => {
      const removeCount =
        prev[deleteTarget.userIndex + 1]?.role === "ai" ? 2 : 1;
      return prev.filter((_, i) => {
        if (i < deleteTarget.userIndex) return true;
        if (i >= deleteTarget.userIndex + removeCount) return true;
        return false;
      });
    });

    setDeleting(false);

    if (canUpdateMemory && childId) {
      setRebuildingMemory(true);
      const rebuildErr = await rebuildChildMemory(childId);
      setRebuildingMemory(false);
      if (rebuildErr) {
        console.warn("[delete] メモリ再計算失敗:", rebuildErr);
      }
    }

    setDeleteTarget(null);
  };

  const showUpgradeCta = planLoaded && shouldShowUpgradeCta(planId);
  const inputDisabled = loading || isLimited;
  const dailyLimit = hasPlusAccess ? null : getPlan("free").dailyLimit;

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
          {/* 子ども名 — Plusで複数いる場合はタップで切替 */}
          {planLoaded && hasPlusAccess && allChildren.length > 1 ? (
            <button
              type="button"
              onClick={() => setShowChildPicker((v) => !v)}
              className="flex items-center gap-1 font-bold text-base text-gray-800 active:opacity-70"
            >
              {childName && childBirthday
                ? `${childName}（${formatAge(childBirthday)}）`
                : CHAT_HEADER_FALLBACK}
              <span className="text-gray-400 text-xs">{showChildPicker ? "▲" : "▼"}</span>
            </button>
          ) : (
            <span className="font-bold text-base">
              {childName && childBirthday
                ? `${childName}（${formatAge(childBirthday)}）`
                : CHAT_HEADER_FALLBACK}
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
          {planLoaded && (
            <PlanBadge
              planId={planId}
              remaining={remaining}
              trialDaysLeft={trialDaysLeft}
            />
          )}
          {showUpgradeCta && (
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
            prefetch
            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
          >
            マイページ
          </Link>
        </div>
      </header>

      {planLoaded && trialDaysLeft > 0 && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-100 px-4 py-2 text-xs text-blue-700 text-center leading-relaxed">
          体験期間中（あと{trialDaysLeft}日）— Plus相当の機能をお試し中です
        </div>
      )}

      {/* History loading */}
      {historyLoading && messages.length <= 1 && (
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

      {/* Messages — 下の固定コンポーザー分だけ余白 */}
      <main
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ paddingBottom: composerHeight > 0 ? composerHeight : undefined }}
      >
        {messages.map((m, i) => (
          <div
            key={m.id ?? `${m.role}-${i}`}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] flex flex-col gap-1 ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                }`}
              >
                {m.role === "user" ? (
                  <span className="whitespace-pre-wrap">{m.text}</span>
                ) : (
                  <ChatMarkdown>{m.text}</ChatMarkdown>
                )}
              </div>
              {m.role === "user" && m.id && !loading && (
                <button
                  type="button"
                  onClick={() => requestDelete(i)}
                  className="text-[11px] text-gray-400 hover:text-red-500 px-1 py-0.5 transition-colors"
                >
                  削除
                </button>
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

      {/* 固定コンポーザー（ChatGPT 方式: bottom のみ visualViewport 追従） */}
      <div
        ref={composerRef}
        className="fixed left-0 right-0 z-10 bg-white border-t border-gray-200"
        style={{ bottom: keyboardInset }}
      >
        {isLimited && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
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
        <footer className="px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex gap-2 items-end touch-manipulation">
          <textarea
            ref={inputRef}
            data-chat-input
            className="flex-1 min-w-0 border border-gray-300 rounded-2xl px-4 py-2.5 leading-normal outline-none focus:border-blue-400 disabled:bg-gray-50 disabled:text-gray-400 resize-none overflow-hidden"
            style={{ fontSize: "16px" }}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isLimited
                ? "本日の利用上限に達しました"
                : loading
                ? "応答を待っています..."
                : "いま気になっていることを、気軽に書いてください..."
            }
            disabled={inputDisabled}
          />
          <button
            type="button"
            onClick={sendMessage}
            disabled={inputDisabled}
            className="shrink-0 mb-0.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white text-sm font-medium px-4 py-2.5 rounded-full transition-colors"
          >
            送信
          </button>
        </footer>
      </div>

      {/* Upgrade modal */}
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {deleteTarget && (
        <DeleteConfirmDialog
          onConfirm={confirmDelete}
          onCancel={() => !deleting && !rebuildingMemory && setDeleteTarget(null)}
          deleting={deleting}
          rebuilding={rebuildingMemory}
          showMemoryNote={canUpdateMemory}
        />
      )}
    </div>
  );
}

function PlanBadge({
  planId,
  remaining,
  trialDaysLeft,
}: {
  planId: string;
  remaining: number | null;
  trialDaysLeft: number;
}) {
  if (trialDaysLeft > 0) {
    return (
      <span className="text-xs font-medium text-blue-600">
        体験 残{trialDaysLeft}日
      </span>
    );
  }
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
      PLUS
    </span>
  );
}
