import type { Plan } from "./types";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "無料",
    priceMonthly: 0,
    stripePriceId: "",
    dailyLimit: 3,
    historyDays: 7,
    memoryEnabled: false,
    personalizeEnabled: false,
    features: [
      "AIチャット（1日3回まで）",
      "会話履歴（7日間）",
    ],
  },
  {
    id: "lite",
    name: "Lite",
    priceMonthly: 980,
    stripePriceId: "",
    dailyLimit: null,
    historyDays: null,
    memoryEnabled: true,
    personalizeEnabled: true,
    features: [
      "AIチャット無制限",
      "会話履歴（無制限）",
      "使うほど我が子に合った回答に",
      "「いつもの悩み」を覚えてくれる",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 2980,
    stripePriceId: "",
    dailyLimit: null,
    historyDays: null,
    memoryEnabled: true,
    personalizeEnabled: true,
    features: [
      "AIチャット無制限",
      "会話履歴（無制限）",
      "使うほど我が子に合った回答に",
      "「いつもの悩み」を覚えてくれる",
      "複数の子どもに対応",
      "きょうだい・友達などの関係を考慮した相談",
      "週1回の育児振り返りレポート（アプリ内）",
    ],
  },
];

export const getPlan = (id: string): Plan =>
  PLANS.find((p) => p.id === id) ?? PLANS[0];
