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
  /** 長期記憶を会話から更新できるか（Freeは読み取りのみ） */
  memoryUpdateEnabled: boolean;
  /** 複数子・関係登録・保護者相談・週次レポート */
  plusFeaturesEnabled: boolean;
};

export type UserPlan = {
  planId: PlanId;
  /** DBからプラン取得済み（未取得時はUIを出さない） */
  planLoaded: boolean;
  /** Plus契約または14日トライアル中 */
  hasPlusAccess: boolean;
  /** トライアル残日数（0 = 終了またはPlus契約中） */
  trialDaysLeft: number;
  /** 本日の送信回数 */
  usedToday: number;
  /** 残り送信回数（null = 無制限） */
  remaining: number | null;
  /** 送信可能か */
  canSend: boolean;
  /** メモリを会話から更新できるか */
  canUpdateMemory: boolean;
  /** 使用回数を1増やす */
  recordUsage: () => void;
  /** 使用回数をlimitに強制同期（上限到達時） */
  syncUsageToLimit: (limit: number) => void;
};
