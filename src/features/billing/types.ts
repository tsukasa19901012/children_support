export type PlanId = "free" | "plus";

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
  /** 長期記憶を会話に反映できるか */
  memoryEnabled: boolean;
  /** 会話からうちの子の記憶を更新できるか（Freeは覚えた分の反映のみ） */
  memoryUpdateEnabled: boolean;
  /** 複数子・関係登録・あなた（保護者）の相談・週次レポート */
  plusFeaturesEnabled: boolean;
};

export type UserPlan = {
  planId: PlanId;
  /** DBからプラン取得済み（未取得時はUIを出さない） */
  planLoaded: boolean;
  /** Plus契約または14日体験期間中 */
  hasPlusAccess: boolean;
  /** 体験期間残日数（0 = 終了またはPlus契約中） */
  trialDaysLeft: number;
  /** 本日の送信回数 */
  usedToday: number;
  /** 残り送信回数（null = 無制限） */
  remaining: number | null;
  /** 送信可能か */
  canSend: boolean;
  /** 会話から記憶（memory）を更新できるか */
  canUpdateMemory: boolean;
  /** 使用回数を1増やす */
  recordUsage: () => void;
  /** 使用回数をlimitに強制同期（上限到達時） */
  syncUsageToLimit: (limit: number) => void;
};
