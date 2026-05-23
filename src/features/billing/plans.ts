import type { Plan } from "./types";

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "無料",
    priceMonthly: 0,
    stripePriceId: "",
    dailyLimit: 5,
    historyDays: 14,
    memoryEnabled: true,
    memoryUpdateEnabled: false,
    plusFeaturesEnabled: false,
    features: [
      "相談（1日5回まで）",
      "会話履歴（14日間）",
      "うちの子の記憶を読み取り（更新はPlus）",
      "お子さん1人分",
      "初回14日間はPlus相当の体験",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    priceMonthly: 980,
    stripePriceId: "",
    dailyLimit: null,
    historyDays: null,
    memoryEnabled: true,
    memoryUpdateEnabled: true,
    plusFeaturesEnabled: true,
    features: [
      "相談し放題",
      "会話履歴（無制限）",
      "うちの子の記憶を更新しながら相談",
      "お子さんを複数登録・切り替え",
      "きょうだい・友達など関係を登録して相談",
      "毎週月曜、先週の育児をやさしく振り返るレポート",
    ],
  },
];

export const getPlan = (id: string): Plan =>
  PLANS.find((p) => p.id === id) ?? PLANS[0];
