import { BRAND } from "../../lib/brand";

/** /legal 表示用。運営責任者・所在地は課金ユーザー増加後に追加予定 */
export const LEGAL_NOTICE = {
  sellerName: BRAND.name,
  phoneDisclosureNote:
    "お問い合わせフォームよりご請求いただければ、遅滞なく開示いたします。",
  salesUrl: "https://www.tonarikko.com",
  price: "Plusプラン 月額980円（税込）",
  additionalFees: "インターネット接続料等はお客様の負担となります。",
  paymentMethod: "クレジットカード（Stripe）",
  paymentTiming: "お申し込み時および毎月の更新日",
  serviceDelivery: "決済完了後、直ちに Plus 機能をご利用いただけます。",
  cancellation:
    "マイページの「お支払い管理」から解約できます。返金は原則行っておりません。個別のご事情はお問い合わせフォームよりご連絡ください。",
  environment:
    "スマートフォン・PC のモダンブラウザ（Safari、Chrome 等）",
  contactLabel: "お問い合わせフォーム（/contact）",
} as const;
