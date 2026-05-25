/** 推奨するお子さんの年齢（満年齢・年）。7歳以上も利用可 */
export const RECOMMENDED_MIN_CHILD_AGE_YEARS = 0;
export const RECOMMENDED_MAX_CHILD_AGE_YEARS = 6;

/** @deprecated RECOMMENDED_MAX_CHILD_AGE_YEARS を使用 */
export const MAX_CHILD_AGE_YEARS = RECOMMENDED_MAX_CHILD_AGE_YEARS;

/** 誕生日選択で表示する年数（過去何年分） */
export const BIRTH_YEAR_SELECT_SPAN = 12;

/** 0〜6歳の推奨範囲か（未来の日付は false） */
export function isChildAgeInRecommendedRange(birthday: string): boolean {
  const birth = new Date(birthday);
  const now = new Date();
  if (birth > now) return false;
  const { years } = calcAge(birthday);
  return (
    years >= RECOMMENDED_MIN_CHILD_AGE_YEARS &&
    years <= RECOMMENDED_MAX_CHILD_AGE_YEARS
  );
}

/** @deprecated isChildAgeInRecommendedRange を使用 */
export const isChildAgeInTargetRange = isChildAgeInRecommendedRange;

/** 誕生日選択用の年リスト */
export function birthYearOptions(referenceDate = new Date()): number[] {
  const y = referenceDate.getFullYear();
  return Array.from({ length: BIRTH_YEAR_SELECT_SPAN }, (_, i) => y - i);
}

/**
 * 誕生日から現在の年齢（年・月）を計算する
 */
export function calcAge(birthday: string): { years: number; months: number } {
  const birth = new Date(birthday);
  const now = new Date();

  // 未来の誕生日は 0歳0ヶ月として扱う
  if (birth > now) return { years: 0, months: 0 };

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
 * 年齢を日本語で表示する（誕生日未登録時は null）
 * 0歳: 「生後Xヶ月」、1歳以上: 「X歳Yヶ月」
 */
export function formatAge(birthday: string | null | undefined): string | null {
  if (!birthday) return null;
  const { years, months } = calcAge(birthday);
  if (years === 0) {
    return months === 0 ? "生後1ヶ月未満" : `生後${months}ヶ月`;
  }
  return months === 0 ? `${years}歳` : `${years}歳${months}月`;
}

/**
 * AI プロンプト用の子ども情報テキスト
 */
export function buildChildContext(
  name: string,
  birthday: string | null | undefined
): string {
  const ageText = formatAge(birthday);
  if (!ageText) {
    return `お子さんの名前は「${name}」です。`;
  }
  return `お子さんの名前は「${name}」、${ageText}です。`;
}

/** ヘッダー・一覧用の表示ラベル */
export function formatProfileHeaderLabel(
  name: string,
  birthday: string | null | undefined,
  profileType: "child" | "caregiver"
): string {
  if (profileType === "caregiver") {
    const age = formatAge(birthday);
    return age ? `${name}（保護者・${age}）` : `${name}（保護者）`;
  }
  const age = formatAge(birthday);
  return age ? `${name}（${age}）` : name;
}
