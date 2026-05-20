/** 登録済みの別のお子さんとの関係（相談プロンプト用） */
export type ChildPeerRelation =
  | "older_brother"
  | "older_sister"
  | "younger_brother"
  | "younger_sister"
  | "twin"
  | "cousin_older"
  | "cousin_younger"
  | "second_cousin_older"
  | "second_cousin_younger"
  | "friend";

/** @deprecated ChildPeerRelation を使用 */
export type SiblingRelation = ChildPeerRelation;

export type ChildGender = "male" | "female" | "other" | null;

export type RelationOption = { value: ChildPeerRelation; label: string };

export const RELATION_OPTION_GROUPS: { label: string; options: RelationOption[] }[] = [
  {
    label: "きょうだい",
    options: [
      { value: "older_brother", label: "年上の兄" },
      { value: "older_sister", label: "年上の姉" },
      { value: "younger_brother", label: "年下の弟" },
      { value: "younger_sister", label: "年下の妹" },
      { value: "twin", label: "双子" },
    ],
  },
  {
    label: "いとこ（従兄弟）",
    options: [
      { value: "cousin_older", label: "年上のいとこ" },
      { value: "cousin_younger", label: "年下のいとこ" },
    ],
  },
  {
    label: "再従兄弟",
    options: [
      { value: "second_cousin_older", label: "年上の再従兄弟" },
      { value: "second_cousin_younger", label: "年下の再従兄弟" },
    ],
  },
  {
    label: "友達",
    options: [{ value: "friend", label: "友達" }],
  },
];

export const SIBLING_RELATION_OPTIONS: RelationOption[] =
  RELATION_OPTION_GROUPS.flatMap((g) => g.options);

const LABEL_MAP = new Map(
  SIBLING_RELATION_OPTIONS.map((o) => [o.value, o.label])
);

export function relationLabel(relation: ChildPeerRelation): string {
  return LABEL_MAP.get(relation) ?? "";
}

/** 誕生日からきょうだいの立場を推定（初期選択用） */
export function suggestRelationToSibling(
  childBirthday: string,
  peerBirthday: string,
  peerGender: ChildGender
): ChildPeerRelation {
  if (childBirthday === peerBirthday) return "twin";
  const childDate = new Date(childBirthday);
  const peerDate = new Date(peerBirthday);
  const peerIsOlder = peerDate < childDate;

  if (peerIsOlder) {
    if (peerGender === "female") return "older_sister";
    if (peerGender === "male") return "older_brother";
    return "older_brother";
  }
  if (peerGender === "female") return "younger_sister";
  if (peerGender === "male") return "younger_brother";
  return "younger_brother";
}

/** peer から見た child の関係（双方向保存用） */
export function inverseRelation(
  relation: ChildPeerRelation,
  childGender: ChildGender
): ChildPeerRelation {
  if (relation === "twin" || relation === "friend") return relation;

  switch (relation) {
    case "older_brother":
      if (childGender === "female") return "younger_sister";
      if (childGender === "male") return "younger_brother";
      return "younger_brother";
    case "older_sister":
      if (childGender === "female") return "younger_sister";
      if (childGender === "male") return "younger_brother";
      return "younger_brother";
    case "younger_brother":
      if (childGender === "female") return "older_sister";
      if (childGender === "male") return "older_brother";
      return "older_brother";
    case "younger_sister":
      if (childGender === "female") return "older_sister";
      if (childGender === "male") return "older_brother";
      return "older_brother";
    case "cousin_older":
      return "cousin_younger";
    case "cousin_younger":
      return "cousin_older";
    case "second_cousin_older":
      return "second_cousin_younger";
    case "second_cousin_younger":
      return "second_cousin_older";
    default:
      return relation;
  }
}
