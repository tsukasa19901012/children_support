/** sibling_id が child_id にとってどんなきょうだいか */
export type SiblingRelation =
  | "older_brother"
  | "older_sister"
  | "younger_brother"
  | "younger_sister"
  | "twin";

export type ChildGender = "male" | "female" | "other" | null;

export const SIBLING_RELATION_OPTIONS: { value: SiblingRelation; label: string }[] = [
  { value: "older_brother", label: "年上の兄" },
  { value: "older_sister", label: "年上の姉" },
  { value: "younger_brother", label: "年下の弟" },
  { value: "younger_sister", label: "年下の妹" },
  { value: "twin", label: "双子" },
];

export function relationLabel(relation: SiblingRelation): string {
  return SIBLING_RELATION_OPTIONS.find((o) => o.value === relation)?.label ?? "";
}

/** child から見た sibling の関係 → sibling から見た child の関係 */
/** 誕生日からきょうだいの立場を推定（初期選択用） */
export function suggestRelationToSibling(
  childBirthday: string,
  siblingBirthday: string,
  siblingGender: ChildGender
): SiblingRelation {
  if (childBirthday === siblingBirthday) return "twin";
  const childDate = new Date(childBirthday);
  const siblingDate = new Date(siblingBirthday);
  const siblingIsOlder = siblingDate < childDate;

  if (siblingIsOlder) {
    if (siblingGender === "female") return "older_sister";
    if (siblingGender === "male") return "older_brother";
    return "older_brother";
  }
  if (siblingGender === "female") return "younger_sister";
  if (siblingGender === "male") return "younger_brother";
  return "younger_brother";
}

export function inverseRelation(
  relation: SiblingRelation,
  childGender: ChildGender
): SiblingRelation {
  if (relation === "twin") return "twin";

  const isSiblingOlder =
    relation === "older_brother" || relation === "older_sister";

  if (isSiblingOlder) {
    if (childGender === "female") return "younger_sister";
    if (childGender === "male") return "younger_brother";
    return "younger_brother";
  }

  if (childGender === "female") return "older_sister";
  if (childGender === "male") return "older_brother";
  return "older_brother";
}
