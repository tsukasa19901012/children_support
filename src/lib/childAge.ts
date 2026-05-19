/**
 * 誕生日から現在の年齢（年・月）を計算する
 */
export function calcAge(birthday: string): { years: number; months: number } {
  const birth = new Date(birthday);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    years--;
    months += 12;
  }
  if (now.getDate() < birth.getDate()) {
    months--;
  }
  if (months < 0) months += 12;

  return { years, months };
}

/**
 * 年齢を日本語で表示する
 * 0歳: 「生後Xヶ月」、1歳以上: 「X歳Yヶ月」
 */
export function formatAge(birthday: string): string {
  const { years, months } = calcAge(birthday);
  if (years === 0) {
    return months === 0 ? "生後1ヶ月未満" : `生後${months}ヶ月`;
  }
  return months === 0 ? `${years}歳` : `${years}歳${months}ヶ月`;
}

/**
 * AI プロンプト用の子ども情報テキスト
 */
export function buildChildContext(name: string, birthday: string): string {
  const { years, months } = calcAge(birthday);
  const ageText = years === 0
    ? `生後${months}ヶ月`
    : `${years}歳${months > 0 ? `${months}ヶ月` : ""}`;
  return `お子さんの名前は「${name}」、${ageText}です。`;
}
