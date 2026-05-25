"use client";

import { useMemo, useState } from "react";
import { createClient } from "../../../lib/supabase-browser";
import { formatJstDeliveryLabel } from "../../../lib/date";
import { loadWeeklyReports } from "../lib/loadWeeklyReports";
import { weeklyReportKindLabel } from "../lib/parseWeeklyReportMessage";
import type { WeeklyReportItem, WeeklyReportProfile } from "../types";
import { WEEKLY_REPORT_PAGE_SIZE } from "../types";
import { PROFILE_TYPE_CAREGIVER } from "../../child/types/profileType";
import { WeeklyReportDetailModal } from "./WeeklyReportDetailModal";

type Props = {
  userId: string;
  initialReports: WeeklyReportItem[];
  initialHasMore: boolean;
  profiles: WeeklyReportProfile[];
  receivesWeeklyReports: boolean;
};

const ALL_FILTER = "all";

function profileDisplayName(
  name: string,
  profileType: WeeklyReportProfile["profileType"]
): string {
  if (profileType === PROFILE_TYPE_CAREGIVER) {
    return `${name}（保護者）`;
  }
  return `${name}ちゃん`;
}

function profileChipLabel(profile: WeeklyReportProfile): string {
  if (profile.profileType === PROFILE_TYPE_CAREGIVER) {
    return profile.name;
  }
  return profile.name.length > 6 ? `${profile.name.slice(0, 6)}…` : profile.name;
}

export function WeeklyReportSection({
  userId,
  initialReports,
  initialHasMore,
  profiles,
  receivesWeeklyReports,
}: Props) {
  const [reports, setReports] = useState(initialReports);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [filterId, setFilterId] = useState(ALL_FILTER);
  const [selected, setSelected] = useState<WeeklyReportItem | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);

  const filtered = useMemo(() => {
    if (filterId === ALL_FILTER) return reports;
    return reports.filter((r) => r.childId === filterId);
  }, [reports, filterId]);

  const showFilters = profiles.length > 1;

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const supabase = createClient();
      const result = await loadWeeklyReports(supabase, userId, {
        limit: WEEKLY_REPORT_PAGE_SIZE,
        offset: reports.length,
      });
      setReports((prev) => {
        const ids = new Set(prev.map((r) => r.id));
        const merged = [...prev];
        for (const r of result.reports) {
          if (!ids.has(r.id)) merged.push(r);
        }
        return merged;
      });
      setHasMore(result.hasMore);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <section className="bg-white rounded-xl border border-gray-100 p-4">
        <h2 className="text-sm font-bold text-gray-800 mb-1">振り返りレポート</h2>
        <p className="text-xs text-gray-400 mb-3 leading-relaxed">
          {receivesWeeklyReports
            ? "毎週月曜の朝に届いた振り返りを、ここからいつでも読み返せます。"
            : "届いた振り返りを、ここからいつでも読み返せます。"}
        </p>

        {showFilters && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
            <FilterChip
              active={filterId === ALL_FILTER}
              onClick={() => setFilterId(ALL_FILTER)}
              label="すべて"
            />
            {profiles.map((p) => (
              <FilterChip
                key={p.id}
                active={filterId === p.id}
                onClick={() => setFilterId(p.id)}
                label={profileChipLabel(p)}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6 leading-relaxed">
            まだ振り返りレポートは届いていません。
            <br />
            {receivesWeeklyReports
              ? "毎週月曜の朝、こことチャットに届きます。"
              : "Plusプランでは、毎週月曜の朝にお届けします。"}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((report) => (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => setSelected(report)}
                  className="w-full text-left rounded-xl border border-gray-100 bg-gray-50 hover:bg-blue-50 hover:border-blue-100 px-3 py-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {report.periodLabel}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {profileDisplayName(
                          report.profileName,
                          report.profileType
                        )}
                      </p>
                    </div>
                    <span className="shrink-0 text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      {weeklyReportKindLabel(report.kind)}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {formatJstDeliveryLabel(report.deliveredAt)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}

        {hasMore && filterId === ALL_FILTER && (
          <div className="mt-3 text-center">
            {loadMoreError && (
              <p className="text-xs text-red-500 mb-2">
                読み込みに失敗しました。
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleLoadMore()}
              disabled={loadingMore}
              className="text-sm text-blue-600 font-medium py-2 disabled:opacity-50"
            >
              {loadingMore ? "読み込み中…" : "もっと見る"}
            </button>
          </div>
        )}
      </section>

      {selected && (
        <WeeklyReportDetailModal
          report={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
        active
          ? "bg-blue-500 text-white"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
