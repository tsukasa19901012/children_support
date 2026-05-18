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
    memoryEnabled: false,
    personalizeEnabled: false,
    features: [
      "AIチャット無制限",
      "通常AI",
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
      "長期記憶",
      "パーソナライズ",
    ],
  },
];

export const getPlan = (id: string): Plan =>
  PLANS.find((p) => p.id === id) ?? PLANS[0];
