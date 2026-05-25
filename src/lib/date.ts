/** JST の本日 0:00 を ISO 文字列で返す */
export function getJSTDayStartISO(): string {
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(Date.now() + jstOffset);
  const jstMidnight = new Date(Date.UTC(
    jstNow.getUTCFullYear(),
    jstNow.getUTCMonth(),
    jstNow.getUTCDate(),
  ));
  return new Date(jstMidnight.getTime() - jstOffset).toISOString();
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatJstMonthDay(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  return `${jst.getUTCMonth() + 1}月${jst.getUTCDate()}日`;
}

function addJstCalendarDays(date: Date, days: number): Date {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  jst.setUTCDate(jst.getUTCDate() + days);
  return new Date(jst.getTime() - JST_OFFSET_MS);
}

/** 週次レポート見出し用（JST・昨日までの7日間）例: 5月18日〜5月24日 */
export function formatWeeklyReportPeriodLabel(now = new Date()): string {
  return getWeeklyReportPeriodDates(now).label;
}

function formatJstIsoDate(date: Date): string {
  const jst = new Date(date.getTime() + JST_OFFSET_MS);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 週次レポートの対象期間（JST・昨日までの7日間） */
export function getWeeklyReportPeriodDates(now = new Date()): {
  start: string;
  end: string;
  label: string;
} {
  const periodEnd = addJstCalendarDays(now, -1);
  const periodStart = addJstCalendarDays(periodEnd, -6);
  return {
    start: formatJstIsoDate(periodStart),
    end: formatJstIsoDate(periodEnd),
    label: `${formatJstMonthDay(periodStart)}〜${formatJstMonthDay(periodEnd)}`,
  };
}

const JST_WEEKDAY = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 配信日時表示（JST）例: 5月25日（月）配信 */
export function formatJstDeliveryLabel(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + JST_OFFSET_MS);
  const month = jst.getUTCMonth() + 1;
  const day = jst.getUTCDate();
  const weekday = JST_WEEKDAY[jst.getUTCDay()];
  return `${month}月${day}日（${weekday}）配信`;
}

/** YYYY-MM-DD（JSTカレンダー）を「M月D日」に */
export function formatIsoDateAsJstMonthDay(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const utc = new Date(Date.UTC(y, m - 1, d));
  return formatJstMonthDay(new Date(utc.getTime() - JST_OFFSET_MS));
}
