import { describe, expect, it } from "vitest";
import {
  canUpdateMemory,
  getTrialEndsAt,
  hasPlusAccess,
  isTrialActive,
  normalizePlanId,
  trialDaysRemaining,
} from "./planAccess";

const baseRow = {
  plan: "free" as const,
  created_at: "2026-05-01T00:00:00Z",
  trial_ends_at: "2026-05-15T00:00:00Z",
};

describe("normalizePlanId", () => {
  it("accepts only free and plus", () => {
    expect(normalizePlanId("plus")).toBe("plus");
    expect(normalizePlanId("free")).toBe("free");
    expect(normalizePlanId("lite")).toBe("free");
    expect(normalizePlanId(null)).toBe("free");
  });
});

describe("trial", () => {
  it("is active before trial_ends_at", () => {
    expect(isTrialActive(baseRow, new Date("2026-05-10"))).toBe(true);
    expect(isTrialActive(baseRow, new Date("2026-05-16"))).toBe(false);
  });

  it("plus subscribers are not in trial", () => {
    expect(isTrialActive({ ...baseRow, plan: "plus" }, new Date("2026-05-10"))).toBe(
      false
    );
  });

  it("derives trial end from created_at when trial_ends_at missing", () => {
    const ends = getTrialEndsAt({
      plan: "free",
      created_at: "2026-05-01T00:00:00Z",
    });
    expect(ends.toISOString()).toBe("2026-05-15T00:00:00.000Z");
  });
});

describe("hasPlusAccess", () => {
  it("grants access during trial or plus plan", () => {
    expect(hasPlusAccess(baseRow, new Date("2026-05-10"))).toBe(true);
    expect(hasPlusAccess(baseRow, new Date("2026-05-20"))).toBe(false);
    expect(hasPlusAccess({ ...baseRow, plan: "plus" }, new Date("2026-05-20"))).toBe(
      true
    );
  });
});

describe("memory", () => {
  it("allows updates only with plus access", () => {
    expect(canUpdateMemory(baseRow, new Date("2026-05-10"))).toBe(true);
    expect(canUpdateMemory(baseRow, new Date("2026-05-20"))).toBe(false);
  });
});

describe("trialDaysRemaining", () => {
  it("returns ceil days left", () => {
    expect(trialDaysRemaining(baseRow, new Date("2026-05-14T12:00:00Z"))).toBe(1);
    expect(trialDaysRemaining(baseRow, new Date("2026-05-20"))).toBe(0);
  });
});
