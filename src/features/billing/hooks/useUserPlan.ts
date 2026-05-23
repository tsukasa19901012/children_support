"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlan } from "../plans";
import { type UserBillingRow } from "../planAccess";
import {
  deriveBillingUI,
  isPlanCacheFresh,
  loadCachedBilling,
  saveCachedBilling,
} from "../planCache";
import type { PlanId, UserPlan } from "../types";
import { createClient } from "../../../lib/supabase-browser";

const STORAGE_KEY = "parenting_ai_usage";

type StoredUsage = {
  date: string; // "YYYY-MM-DD"
  count: number;
};

/** JST 基準の今日の日付 "YYYY-MM-DD" */
const today = (): string => {
  const jstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return jstNow.toISOString().slice(0, 10);
};

const loadUsage = (): StoredUsage => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { date: today(), count: 0 };
    const parsed: StoredUsage = JSON.parse(raw);
    if (parsed.date !== today()) return { date: today(), count: 0 };
    return parsed;
  } catch {
    return { date: today(), count: 0 };
  }
};

const saveUsage = (usage: StoredUsage): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
};

function applyBillingRow(
  row: UserBillingRow,
  setters: {
    setPlanId: (v: PlanId) => void;
    setHasPlus: (v: boolean) => void;
    setTrialDaysLeft: (v: number) => void;
    setCanUpdateMem: (v: boolean) => void;
  }
): void {
  const ui = deriveBillingUI(row);
  setters.setPlanId(ui.planId);
  setters.setHasPlus(ui.hasPlusAccess);
  setters.setTrialDaysLeft(ui.trialDaysLeft);
  setters.setCanUpdateMem(ui.canUpdateMemory);
}

export const useUserPlan = (userId: string | null): UserPlan => {
  const [planId, setPlanId] = useState<PlanId>("free");
  const [planLoaded, setPlanLoaded] = useState(false);
  const [hasPlus, setHasPlus] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [canUpdateMem, setCanUpdateMem] = useState(false);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    setUsedToday(loadUsage().count);
  }, []);

  useEffect(() => {
    if (!userId) {
      setPlanLoaded(false);
      return;
    }

    const setters = {
      setPlanId,
      setHasPlus,
      setTrialDaysLeft,
      setCanUpdateMem,
    };

    const cached = loadCachedBilling(userId);
    if (cached) {
      applyBillingRow(cached.row, setters);
      setPlanLoaded(true);
    }

    if (isPlanCacheFresh(userId)) return;

    const supabase = createClient();
    supabase
      .from("users")
      .select("plan, created_at, trial_ends_at")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        const row: UserBillingRow = {
          plan: data?.plan ?? "free",
          created_at: data?.created_at ?? new Date().toISOString(),
          trial_ends_at: data?.trial_ends_at ?? null,
        };
        applyBillingRow(row, setters);
        saveCachedBilling(userId, row);
        setPlanLoaded(true);
      });
  }, [userId]);

  const recordUsage = useCallback(() => {
    setUsedToday((prev) => {
      const next = prev + 1;
      saveUsage({ date: today(), count: next });
      return next;
    });
  }, []);

  const syncUsageToLimit = useCallback((limit: number) => {
    setUsedToday(limit);
    saveUsage({ date: today(), count: limit });
  }, []);

  const plan = getPlan(planId);
  const dailyLimit = hasPlus ? null : plan.dailyLimit;
  const remaining =
    dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday);
  const canSend = dailyLimit === null || usedToday < dailyLimit;

  return {
    planId,
    planLoaded,
    hasPlusAccess: hasPlus,
    trialDaysLeft,
    usedToday,
    remaining,
    canSend,
    canUpdateMemory: canUpdateMem,
    recordUsage,
    syncUsageToLimit,
  };
};
