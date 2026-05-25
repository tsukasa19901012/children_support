import { describe, expect, it } from "vitest";
import {
  isWeeklyReportContent,
  parseWeeklyReportHeader,
  resolveWeeklyReportPeriodLabel,
} from "./parseWeeklyReportMessage";

describe("parseWeeklyReportHeader", () => {
  it("お子さん向け（日付範囲）をパースする", () => {
    const content =
      "📋 5月18日〜5月24日の育児振り返りレポート（たろうちゃん）\n\n本文";
    expect(parseWeeklyReportHeader(content)).toEqual({
      periodLabel: "5月18日〜5月24日",
      profileName: "たろうちゃん",
      kind: "child",
    });
  });

  it("保護者向け（日付範囲）をパースする", () => {
    const content =
      "📋 5月18日〜5月24日の振り返りレポート（ママ・保護者）\n\n本文";
    expect(parseWeeklyReportHeader(content)).toEqual({
      periodLabel: "5月18日〜5月24日",
      profileName: "ママ",
      kind: "caregiver",
    });
  });

  it("旧形式（今週・お子さん）をパースする", () => {
    const content = "📋 今週の育児振り返りレポート（はなちゃん）\n\n本文";
    expect(parseWeeklyReportHeader(content)).toEqual({
      periodLabel: "今週",
      profileName: "はなちゃん",
      kind: "child",
    });
  });

  it("旧形式（今週・保護者）をパースする", () => {
    const content = "📋 今週の振り返りレポート（パパ・保護者）\n\n本文";
    expect(parseWeeklyReportHeader(content)).toEqual({
      periodLabel: "今週",
      profileName: "パパ",
      kind: "caregiver",
    });
  });

  it("通常チャットは null", () => {
    expect(parseWeeklyReportHeader("こんにちは")).toBeNull();
    expect(isWeeklyReportContent("AIの返答")).toBe(false);
  });
});

describe("resolveWeeklyReportPeriodLabel", () => {
  it("DB の期間日付を優先する", () => {
    expect(
      resolveWeeklyReportPeriodLabel(
        "📋 今週の育児振り返りレポート（たろうちゃん）",
        "2026-05-18",
        "2026-05-24",
        "2026-05-25T00:00:00.000Z"
      )
    ).toBe("5月18日〜5月24日");
  });
});
