import Link from "next/link";

export default function CancelPage() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-gray-50 px-6 text-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 max-w-sm w-full">
        <div className="text-5xl mb-4">😌</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          お支払いをキャンセルしました
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          またいつでもアップグレードできます。
          <br />
          無料プランは引き続きご利用いただけます。
        </p>
        <Link
          href="/"
          className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-3 rounded-xl transition-colors text-center"
        >
          チャットに戻る
        </Link>
      </div>
    </div>
  );
}
