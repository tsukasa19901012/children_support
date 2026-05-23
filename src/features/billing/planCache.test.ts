import { describe, expect, it } from "vitest";
import { deriveBillingUI } from "./planCache";

describe("deriveBillingUI", () => {
  it("derives plus access during trial from cached row", () => {
    const ui = deriveBillingUI(
      {
        plan: "free",
        created_at: "2026-05-01T00:00:00Z",
        trial_ends_at: "2026-05-15T00:00:00Z",
      },
      new Date("2026-05-10")
    );
    expect(ui.planId).toBe("free");
    expect(ui.hasPlusAccess).toBe(true);
    expect(ui.trialDaysLeft).toBe(5);
    expect(ui.canUpdateMemory).toBe(true);
  });

  it("derives plus subscriber state", () => {
    const ui = deriveBillingUI(
      {
        plan: "plus",
        created_at: "2026-01-01T00:00:00Z",
        trial_ends_at: "2026-01-15T00:00:00Z",
      },
      new Date("2026-05-10")
    );
    expect(ui.planId).toBe("plus");
    expect(ui.hasPlusAccess).toBe(true);
    expect(ui.trialDaysLeft).toBe(0);
  });
});
