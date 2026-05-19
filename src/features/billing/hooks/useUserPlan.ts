"use client";

import { useCallback, useEffect, useState } from "react";
import { getPlan } from "../plans";
import { loadCachedPlan, saveCachedPlan } from "../planCache";
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

export const useUserPlan = (userId: string | null): UserPlan => {
  const [planId, setPlanId] = useState<PlanId>("free");
  const [planLoaded, setPlanLoaded] = useState(false);
  const [usedToday, setUsedToday] = useState(0);

  useEffect(() => {
    setUsedToday(loadUsage().count);
  }, []);

  useEffect(() => {
    if (!userId) {
      setPlanLoaded(false);
      return;
    }

    const cached = loadCachedPlan(userId);
    if (cached) {
      setPlanId(cached);
      setPlanLoaded(true);
    }

    const supabase = createClient();
    supabase
      .from("users")
      .select("plan")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        const id = (data?.plan as PlanId | null) ?? "free";
        setPlanId(id);
        saveCachedPlan(userId, id);
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
  const remaining =
    plan.dailyLimit === null ? null : Math.max(0, plan.dailyLimit - usedToday);
  const canSend = plan.dailyLimit === null || usedToday < plan.dailyLimit;

  return { planId, planLoaded, usedToday, remaining, canSend, recordUsage, syncUsageToLimit };
};
