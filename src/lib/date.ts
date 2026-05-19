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
