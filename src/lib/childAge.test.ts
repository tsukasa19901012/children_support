import { describe, expect, it } from "vitest";
import {
  birthYearOptions,
  BIRTH_YEAR_SELECT_SPAN,
  caregiverBirthYearOptions,
  CAREGIVER_BIRTH_YEAR_MIN,
  isChildAgeInRecommendedRange,
  RECOMMENDED_MAX_CHILD_AGE_YEARS,
} from "./childAge";

describe("childAge recommended range (0〜6歳)", () => {
  it("treats 0–6 as recommended", () => {
    expect(isChildAgeInRecommendedRange("2024-06-01")).toBe(true);
    expect(isChildAgeInRecommendedRange("2020-01-01")).toBe(true);
  });

  it("treats 7+ as outside recommended but not invalid for use", () => {
    const ref = new Date("2026-06-01");
    const sevenYearOldYear = ref.getFullYear() - 7;
    expect(isChildAgeInRecommendedRange(`${sevenYearOldYear}-01-01`)).toBe(
      false
    );
  });

  it("rejects future birthdays for recommended check", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(
      isChildAgeInRecommendedRange(future.toISOString().slice(0, 10))
    ).toBe(false);
  });

  it("birthYearOptions spans more than recommended max age", () => {
    const years = birthYearOptions(new Date("2026-06-01"));
    expect(years.length).toBeGreaterThan(RECOMMENDED_MAX_CHILD_AGE_YEARS + 1);
    expect(years).toHaveLength(BIRTH_YEAR_SELECT_SPAN);
  });

  it("caregiverBirthYearOptions spans well beyond child span (no age cap)", () => {
    const ref = new Date("2026-06-01");
    const childYears = birthYearOptions(ref);
    const caregiverYears = caregiverBirthYearOptions(ref);
    expect(caregiverYears.length).toBeGreaterThan(childYears.length);
    expect(caregiverYears.at(-1)).toBe(CAREGIVER_BIRTH_YEAR_MIN);
  });
});
