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
  const periodEnd = addJstCalendarDays(now, -1);
  const periodStart = addJstCalendarDays(periodEnd, -6);
  return `${formatJstMonthDay(periodStart)}〜${formatJstMonthDay(periodEnd)}`;
}
