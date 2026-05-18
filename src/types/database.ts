import type { PlanId } from "../features/billing/types";

export type DbUser = {
  id: string;
  plan: PlanId;
  stripe_customer_id: string | null;
  created_at: string;
};

export type MessageRole = "user" | "assistant";

export type DbMessage = {
  id: string;
  user_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export type DbTokenUsage = {
  id: string;
  user_id: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  created_at: string;
};
