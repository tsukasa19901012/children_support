import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, BRAND_DISPLAY } from "../../lib/brand";
import { PLANS } from "../../features/billing/plans";
import { LegalFooter } from "../../features/marketing/components/LegalFooter";
import { BrandMark } from "../../features/auth/components/BrandMark";

export const metadata: Metadata = {
  title: BRAND_DISPLAY,
  description: BRAND.description,
};

const FAQ = [
  {
    q: "無料で使えますか？",
    a: "はい。初回14日間はPlusと同じ機能を無料でお試しいただけます。以降は無料プラン（1日5回など）でもご利用いただけます。",
  },
  {
    q: "料金はいくらですか？",
    a: "Plusプランは月額980円（税込）です。マイページのお支払い管理からいつでも解約できます。",
  },
  {
    q: "医療的なアドバイスですか？",
    a: "いいえ。育児の相談を支援するAIであり、診断や治療は行いません。不安なときは専門家へご相談ください。",
  },
  {
    q: "解約・返金は？",
    a: "解約はマイページから行えます。返金は原則行っておりません。個別の事情がある場合はお問い合わせフォームよりご連絡ください。",
  },
] as const;

export default function LpPage() {
  const free = PLANS.find((p) => p.id === "free")!;
  const plus = PLANS.find((p) => p.id === "plus")!;

  return (
    <div className="min-h-dvh bg-[#f4f7fb]">
      <header className="px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 text-center">
        <div className="flex justify-center mb-4">
          <BrandMark size="lg" />
        </div>
        <h1 className="text-xl font-bold text-gray-800">{BRAND.name}</h1>
        <p className="text-sm text-blue-600 font-medium mt-1">{BRAND.subtitle}</p>
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">{BRAND.tagline}</p>
        <p className="text-xs text-gray-400 mt-1">{BRAND.subtagline}</p>
        <Link
          href="/login"
          className="inline-block mt-6 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-8 py-3 rounded-full transition-colors"
        >
          無料ではじめる
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-5 pb-10 space-y-8">
        <section>
          <h2 className="text-sm font-bold text-gray-800 mb-3">こんなときに</h2>
          <ul className="space-y-2 text-sm text-gray-600 leading-relaxed">
            <li>・夜泣きやイヤイヤが続いて、誰かに聞きたい</li>
            <li>・きょうだいの関係を踏まえて相談したい</li>
            <li>・自分の疲れを、責められずに吐き出したい</li>
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-800 mb-3">できること</h2>
          <ul className="space-y-2 text-sm text-gray-600">
            {plus.features.slice(0, 4).map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-blue-500 font-bold">✓</span>
                {f}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-gray-400 mt-3">
            ※ 医療診断ではありません。緊急時は専門家へご相談ください。
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 p-4 text-sm">
          <h2 className="font-bold text-gray-800 mb-3">プラン</h2>
          <table className="w-full text-left text-xs text-gray-600">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 pr-2" />
                <th className="py-2">体験14日</th>
                <th className="py-2">Free</th>
                <th className="py-2">Plus</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="py-2 pr-2">価格</td>
                <td>無料</td>
                <td>無料</td>
                <td>¥{plus.priceMonthly}/月</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-2 pr-2">1日の相談</td>
                <td>無制限</td>
                <td>{free.dailyLimit}回</td>
                <td>無制限</td>
              </tr>
              <tr>
                <td className="py-2 pr-2">週次レポート</td>
                <td>あり</td>
                <td>—</td>
                <td>あり</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-sm font-bold text-gray-800 mb-3">よくある質問</h2>
          <dl className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <div key={q}>
                <dt className="text-sm font-medium text-gray-800">{q}</dt>
                <dd className="text-sm text-gray-500 mt-1 leading-relaxed">{a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-block w-full max-w-xs bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium py-3 rounded-xl"
          >
            無料ではじめる
          </Link>
        </div>

        <LegalFooter />
      </main>
    </div>
  );
}
