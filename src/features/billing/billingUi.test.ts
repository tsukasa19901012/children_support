import { describe, expect, it } from "vitest";
import {
  shouldShowBillingPortal,
  shouldShowUpgradeCheckout,
  shouldShowUpgradeCta,
} from "./billingUi";

describe("billingUi", () => {
  describe("shouldShowUpgradeCheckout", () => {
    it("shows checkout for free plan (including trial)", () => {
      expect(shouldShowUpgradeCheckout("free")).toBe(true);
    });

    it("hides checkout for plus subscribers", () => {
      expect(shouldShowUpgradeCheckout("plus")).toBe(false);
    });
  });

  describe("shouldShowBillingPortal", () => {
    it("shows portal only for plus subscribers", () => {
      expect(shouldShowBillingPortal("free")).toBe(false);
      expect(shouldShowBillingPortal("plus")).toBe(true);
    });
  });

  describe("shouldShowUpgradeCta", () => {
    it("shows CTA until plus subscription", () => {
      expect(shouldShowUpgradeCta("free")).toBe(true);
      expect(shouldShowUpgradeCta("plus")).toBe(false);
    });
  });

  it("trial users (plan=free) get checkout, not billing portal", () => {
    expect(shouldShowUpgradeCheckout("free")).toBe(true);
    expect(shouldShowBillingPortal("free")).toBe(false);
  });
});
