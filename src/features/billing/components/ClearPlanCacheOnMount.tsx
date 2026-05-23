"use client";

import { useEffect } from "react";
import { clearPlanCache } from "../planCache";

/** Checkout 成功後に古いプランキャッシュを破棄する */
export function ClearPlanCacheOnMount() {
  useEffect(() => {
    clearPlanCache();
  }, []);
  return null;
}
