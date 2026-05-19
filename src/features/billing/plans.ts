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
      "お子さんの性格・傾向を学習",
      "家庭環境を考慮した回答",
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
      "お子さんの性格・傾向を学習",
      "家庭環境を考慮した回答",
      "より深い長期記憶（30往復分）",
      "優先サポート",
    ],
  },
];

export const getPlan = (id: string): Plan =>
  PLANS.find((p) => p.id === id) ?? PLANS[0];
