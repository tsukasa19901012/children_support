import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProfileType } from "../../child/types/profileType";
import { PROFILE_TYPE_CAREGIVER } from "../../child/types/profileType";
import {
  parseWeeklyReportHeader,
  resolveWeeklyReportPeriodLabel,
} from "./parseWeeklyReportMessage";
import type { WeeklyReportItem } from "../types";
import { WEEKLY_REPORT_PAGE_SIZE } from "../types";

type ChildJoin = {
  name: string;
  profile_type: ProfileType;
};

type MessageRow = {
  id: string;
  child_id: string | null;
  content: string;
  created_at: string;
  message_type: string | null;
  report_period_start: string | null;
  report_period_end: string | null;
  children: ChildJoin | ChildJoin[] | null;
};

export type LoadWeeklyReportsOptions = {
  limit?: number;
  offset?: number;
};

export type LoadWeeklyReportsResult = {
  reports: WeeklyReportItem[];
  hasMore: boolean;
};

function resolveChildJoin(
  children: ChildJoin | ChildJoin[] | null
): ChildJoin | null {
  if (!children) return null;
  return Array.isArray(children) ? (children[0] ?? null) : children;
}

function rowToReport(row: MessageRow): WeeklyReportItem | null {
  if (!row.child_id) return null;
  const child = resolveChildJoin(row.children);
  if (!child) return null;

  const parsed = parseWeeklyReportHeader(row.content);
  if (!parsed && row.message_type !== "weekly_report") return null;
  if (!parsed) return null;

  const profileType = child.profile_type ?? "child";

  return {
    id: row.id,
    childId: row.child_id,
    profileName: child.name,
    profileType,
    periodLabel: resolveWeeklyReportPeriodLabel(
      row.content,
      row.report_period_start,
      row.report_period_end,
      row.created_at
    ),
    periodStart: row.report_period_start,
    periodEnd: row.report_period_end,
    deliveredAt: row.created_at,
    content: row.content,
    kind:
      profileType === PROFILE_TYPE_CAREGIVER ? "caregiver" : parsed.kind,
  };
}

/** 配信済み週次レポート一覧（新しい順） */
export async function loadWeeklyReports(
  db: SupabaseClient,
  userId: string,
  options: LoadWeeklyReportsOptions = {}
): Promise<LoadWeeklyReportsResult> {
  const limit = options.limit ?? WEEKLY_REPORT_PAGE_SIZE;
  const offset = options.offset ?? 0;

  const { data, error } = await db
    .from("messages")
    .select(
      "id, child_id, content, created_at, message_type, report_period_start, report_period_end, children(name, profile_type)"
    )
    .eq("user_id", userId)
    .eq("role", "assistant")
    .or("message_type.eq.weekly_report,content.ilike.%振り返りレポート%")
    .not("child_id", "is", null)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as unknown as MessageRow[];
  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const reports = pageRows
    .map(rowToReport)
    .filter((r): r is WeeklyReportItem => r !== null);

  return {
    reports,
    hasMore,
  };
}
