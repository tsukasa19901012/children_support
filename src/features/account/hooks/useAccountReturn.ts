"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/** マイページから onboarding へ進んだときに付与（戻るで router.back 可能に） */
export const ACCOUNT_RETURN_STACK_KEY = "account-return-stack";

export function useAccountReturn() {
  const router = useRouter();

  const returnToAccount = useCallback(
    (_reloadChildren = false) => {
      if (typeof window === "undefined") {
        router.replace("/account");
        return;
      }

      const useBack = !!sessionStorage.getItem(ACCOUNT_RETURN_STACK_KEY);
      if (useBack) {
        sessionStorage.removeItem(ACCOUNT_RETURN_STACK_KEY);
        router.back();
        return;
      }

      router.replace("/account");
      router.refresh();
    },
    [router]
  );

  return returnToAccount;
}

/** マイページから onboarding へ遷移する直前に呼ぶ */
export function markAccountReturnStack() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(ACCOUNT_RETURN_STACK_KEY, "1");
  }
}
