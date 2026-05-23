import Link from "next/link";
import { BRAND } from "../../lib/brand";
import { ClearPlanCacheOnMount } from "../../features/billing/components/ClearPlanCacheOnMount";

export default function SuccessPage() {
  return (
    <div className="flex flex-col items-center justify-center h-dvh bg-gray-50 px-6 text-center">
      <ClearPlanCacheOnMount />
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10 max-w-sm w-full">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">
          ご登録ありがとうございます
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          {BRAND.name}のプランが有効になりました。
          <br />
          {BRAND.tagline}
          <br />
          気軽に話してみてください。
        </p>
        <Link
          href="/"
          className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-3 rounded-xl transition-colors text-center"
        >
          相談をはじめる
        </Link>
      </div>
    </div>
  );
}
