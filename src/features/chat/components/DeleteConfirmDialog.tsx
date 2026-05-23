"use client";

type Props = {
  onConfirm: () => void;
  onCancel: () => void;
  deleting?: boolean;
  /** 削除後の学習メモリ再計算中 */
  rebuilding?: boolean;
  /** メモリ更新可のプラン向け：削除時に学習も更新される旨 */
  showMemoryNote?: boolean;
};

/** メッセージ削除の確認ダイアログ */
export function DeleteConfirmDialog({
  onConfirm,
  onCancel,
  deleting,
  rebuilding,
  showMemoryNote,
}: Props) {
  const busy = deleting || rebuilding;
  const busyLabel = rebuilding
    ? "学習内容を更新中..."
    : deleting
    ? "削除中..."
    : "削除する";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => !busy && onCancel()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-6 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-bold text-gray-800 mb-2">この会話を削除しますか？</p>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          あなたのメッセージとAIの回答が削除されます。この操作は取り消せません。
          {showMemoryNote && (
            <span className="block mt-2 text-gray-400">
              残りの会話から学習内容も更新されます。
            </span>
          )}
        </p>
        <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {busy ? busyLabel : "削除する"}
            </button>
        </div>
      </div>
    </div>
  );
}
