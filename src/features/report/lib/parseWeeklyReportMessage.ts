import {
  formatIsoDateAsJstMonthDay,
  getWeeklyReportPeriodDates,
} from "../../../lib/date";
import type { WeeklyReportKind } from "../types";

export type ParsedWeeklyReportHeader = {
  periodLabel: string;
  profileName: string;
  kind: WeeklyReportKind;
};

const firstLine = (content: string): string => content.split("\n")[0] ?? content;

const CHILD_PERIOD = /^📋 (.+?)の育児振り返りレポート（(.+?)）/;
const CAREGIVER_PERIOD = /^📋 (.+?)の振り返りレポート（(.+?)・保護者）/;
const LEGACY_CHILD = /^📋 今週の育児振り返りレポート（(.+?)）/;
const LEGACY_CAREGIVER = /^📋 今週の振り返りレポート（(.+?)・保護者）/;

/** 週次レポートメッセージの見出しをパース（該当しなければ null） */
export function parseWeeklyReportHeader(
  content: string
): ParsedWeeklyReportHeader | null {
  const line = firstLine(content);

  const childPeriod = line.match(CHILD_PERIOD);
  if (childPeriod) {
    return {
      periodLabel: childPeriod[1].trim(),
      profileName: childPeriod[2].trim(),
      kind: "child",
    };
  }

  const caregiverPeriod = line.match(CAREGIVER_PERIOD);
  if (caregiverPeriod) {
    return {
      periodLabel: caregiverPeriod[1].trim(),
      profileName: caregiverPeriod[2].trim(),
      kind: "caregiver",
    };
  }

  const legacyChild = line.match(LEGACY_CHILD);
  if (legacyChild) {
    return {
      periodLabel: "今週",
      profileName: legacyChild[1].trim(),
      kind: "child",
    };
  }

  const legacyCaregiver = line.match(LEGACY_CAREGIVER);
  if (legacyCaregiver) {
    return {
      periodLabel: "今週",
      profileName: legacyCaregiver[1].trim(),
      kind: "caregiver",
    };
  }

  return null;
}

export function isWeeklyReportContent(content: string): boolean {
  return parseWeeklyReportHeader(content) !== null;
}

export function resolveWeeklyReportPeriodLabel(
  content: string,
  reportPeriodStart: string | null,
  reportPeriodEnd: string | null,
  deliveredAt: string
): string {
  if (reportPeriodStart && reportPeriodEnd) {
    return `${formatIsoDateAsJstMonthDay(reportPeriodStart)}〜${formatIsoDateAsJstMonthDay(reportPeriodEnd)}`;
  }

  const parsed = parseWeeklyReportHeader(content);
  if (parsed && parsed.periodLabel !== "今週") {
    return parsed.periodLabel;
  }

  return getWeeklyReportPeriodDates(new Date(deliveredAt)).label;
}

export function weeklyReportKindLabel(kind: WeeklyReportKind): string {
  return kind === "caregiver" ? "保護者振り返り" : "育児振り返り";
}
