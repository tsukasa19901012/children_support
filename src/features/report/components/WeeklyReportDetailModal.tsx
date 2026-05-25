"use client";

import { ChatMarkdown } from "../../chat/components/ChatMarkdown";
import { formatJstDeliveryLabel } from "../../../lib/date";
import { weeklyReportKindLabel } from "../lib/parseWeeklyReportMessage";
import type { WeeklyReportItem } from "../types";
import { PROFILE_TYPE_CAREGIVER } from "../../child/types/profileType";

type Props = {
  report: WeeklyReportItem;
  onClose: () => void;
};

function profileDisplayName(report: WeeklyReportItem): string {
  if (report.profileType === PROFILE_TYPE_CAREGIVER) {
    return `${report.profileName}（保護者）`;
  }
  return `${report.profileName}ちゃん`;
}

export function WeeklyReportDetailModal({ report, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-blue-600 font-medium mb-1">
                {weeklyReportKindLabel(report.kind)}
              </p>
              <h3 className="text-base font-bold text-gray-800 leading-snug">
                {report.periodLabel}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {profileDisplayName(report)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatJstDeliveryLabel(report.deliveredAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 text-gray-400 hover:text-gray-600 text-xl leading-none p-1"
              aria-label="閉じる"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-800 leading-relaxed">
          <ChatMarkdown>{report.content}</ChatMarkdown>
        </div>
        <div className="shrink-0 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
