import type { ProfileType } from "../child/types/profileType";

export type MessageType = "chat" | "weekly_report";

export type WeeklyReportKind = "child" | "caregiver";

export type WeeklyReportItem = {
  id: string;
  childId: string;
  profileName: string;
  profileType: ProfileType;
  periodLabel: string;
  periodStart: string | null;
  periodEnd: string | null;
  deliveredAt: string;
  content: string;
  kind: WeeklyReportKind;
};

export type WeeklyReportProfile = {
  id: string;
  name: string;
  profileType: ProfileType;
};

export const WEEKLY_REPORT_PAGE_SIZE = 12;
