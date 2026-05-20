"use client";

type Props = {
  childName: string;
  onConfirm: () => void;
  onCancel: () => void;
  deleting?: boolean;
};

export function DeleteChildConfirmDialog({
  childName,
  onConfirm,
  onCancel,
  deleting,
}: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={() => !deleting && onCancel()}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xs mx-6 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-base font-bold text-gray-800 mb-2">
          {childName}ちゃんを削除しますか？
        </p>
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          このお子さんの会話履歴・学習内容・きょうだいの関係も削除されます。取り消せません。
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {deleting ? "削除中..." : "削除する"}
          </button>
        </div>
      </div>
    </div>
  );
}
