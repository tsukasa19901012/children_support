import { BRAND } from "../../lib/brand";

/** /legal 表示用。未確定項目は空文字のまま UI で「—」表示 */
export const LEGAL_NOTICE = {
  sellerName: BRAND.name,
  /** 通信販売に関する業務の責任者 — 確定後に填入 */
  responsiblePerson: "",
  /** 事業用所在地 — 確定後に填入 */
  address: "",
  /** 電話。空のときは開示請求の一文のみ表示 */
  phone: "",
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

export function displayLegalField(value: string): string {
  return value.trim() || "—";
}
