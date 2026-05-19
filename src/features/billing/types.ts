export type PlanId = "free" | "lite" | "pro";

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  stripePriceId: string;
  features: string[];
  /** 1日の送信上限（null = 無制限） */
  dailyLimit: number | null;
  /** 会話履歴の保持日数（null = 無制限） */
  historyDays: number | null;
  /** 長期記憶機能を利用できるか */
  memoryEnabled: boolean;
  /** パーソナライズ機能を利用できるか */
  personalizeEnabled: boolean;
};

export type UserPlan = {
  planId: PlanId;
  /** 本日の送信回数 */
  usedToday: number;
  /** 残り送信回数（null = 無制限） */
  remaining: number | null;
  /** 送信可能か */
  canSend: boolean;
  /** 使用回数を1増やす */
  recordUsage: () => void;
  /** 使用回数をlimitに強制同期（上限到達時） */
  syncUsageToLimit: (limit: number) => void;
};
