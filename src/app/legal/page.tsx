import type { Metadata } from "next";
import Link from "next/link";
import { BRAND } from "../../lib/brand";
import { LEGAL_ROBOTS_HEADER } from "../../lib/crawlerPolicy";
import { LegalFooter } from "../../features/marketing/components/LegalFooter";
import {
  LEGAL_NOTICE,
  displayLegalField,
} from "../../features/marketing/legalContent";

export const metadata: Metadata = {
  title: `特定商取引法に基づく表記 — ${BRAND.name}`,
  description: `${BRAND.name}の特定商取引法に基づく表記`,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
  other: {
    robots: LEGAL_ROBOTS_HEADER,
  },
};

const ROWS: { label: string; value: string }[] = [
  { label: "販売事業者", value: LEGAL_NOTICE.sellerName },
  {
    label: "運営責任者",
    value: displayLegalField(LEGAL_NOTICE.responsiblePerson),
  },
  { label: "所在地", value: displayLegalField(LEGAL_NOTICE.address) },
  {
    label: "電話番号",
    value: LEGAL_NOTICE.phone.trim()
      ? LEGAL_NOTICE.phone
      : LEGAL_NOTICE.phoneDisclosureNote,
  },
  { label: "お問い合わせ", value: LEGAL_NOTICE.contactLabel },
  { label: "販売URL", value: LEGAL_NOTICE.salesUrl },
  { label: "販売価格", value: LEGAL_NOTICE.price },
  { label: "商品代金以外の必要料金", value: LEGAL_NOTICE.additionalFees },
  { label: "支払方法", value: LEGAL_NOTICE.paymentMethod },
  { label: "支払時期", value: LEGAL_NOTICE.paymentTiming },
  { label: "役務の提供時期", value: LEGAL_NOTICE.serviceDelivery },
  { label: "解約・返金", value: LEGAL_NOTICE.cancellation },
  { label: "動作環境", value: LEGAL_NOTICE.environment },
];

export default function LegalPage() {
  return (
    <div className="min-h-dvh bg-[#f4f7fb] px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <article className="mx-auto max-w-lg rounded-2xl border border-gray-100 bg-white px-6 py-8 shadow-sm">
        <h1 className="text-lg font-bold text-gray-800 mb-2">
          特定商取引法に基づく表記
        </h1>
        <p className="text-xs text-gray-400 mb-6">
          運営責任者・所在地は準備中です（確定後に更新します）。
        </p>
        <dl className="space-y-4 text-sm text-gray-700">
          {ROWS.map(({ label, value }) => (
            <div key={label}>
              <dt className="font-medium text-gray-800">{label}</dt>
              <dd className="mt-1 leading-relaxed break-words">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-center">
          <Link href="/contact" className="text-sm text-blue-600 underline">
            お問い合わせフォーム
          </Link>
        </p>
        <p className="mt-4 text-center">
          <Link href="/login" className="text-sm text-blue-600 underline">
            ログインへ戻る
          </Link>
        </p>
        <LegalFooter className="mt-6" />
      </article>
    </div>
  );
}
