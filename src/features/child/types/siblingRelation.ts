/** フォーム用: DBには保存しない「関係なし」 */
export const RELATION_NONE = "none" as const;

/** フォームで選ぶ関係の種類（年上・年下は誕生日から自動判定） */
export type PeerRelationKind =
  | "sibling"
  | "twin"
  | "cousin"
  | "second_cousin"
  | "friend";

export type PeerRelationFormValue = PeerRelationKind | typeof RELATION_NONE;

export function isSavedPeerRelation(
  value: PeerRelationFormValue
): value is PeerRelationKind {
  return value !== RELATION_NONE;
}

/** 登録済みの別のお子さんとの関係（DB・相談プロンプト用） */
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

export const RELATION_KIND_OPTIONS: { value: PeerRelationKind; label: string }[] =
  [
    { value: "sibling", label: "きょうだい" },
    { value: "twin", label: "双子" },
    { value: "cousin", label: "いとこ（従兄弟）" },
    { value: "second_cousin", label: "再従兄弟" },
    { value: "friend", label: "友達" },
  ];

const LABEL_MAP: Record<ChildPeerRelation, string> = {
  older_brother: "年上の兄",
  older_sister: "年上の姉",
  younger_brother: "年下の弟",
  younger_sister: "年下の妹",
  twin: "双子",
  cousin_older: "年上のいとこ",
  cousin_younger: "年下のいとこ",
  second_cousin_older: "年上の再従兄弟",
  second_cousin_younger: "年下の再従兄弟",
  friend: "友達",
};

export function relationLabel(relation: ChildPeerRelation): string {
  return LABEL_MAP[relation] ?? "";
}

function peerIsOlderThan(childBirthday: string, peerBirthday: string): boolean {
  return new Date(peerBirthday) < new Date(childBirthday);
}

/** 誕生日・性別から保存用の関係を決定 */
export function resolvePeerRelation(
  kind: PeerRelationKind,
  childBirthday: string,
  peerBirthday: string,
  peerGender: ChildGender
): ChildPeerRelation {
  if (kind === "twin") return "twin";
  if (kind === "friend") return "friend";

  const sameDay = childBirthday === peerBirthday;
  if (kind === "sibling" && sameDay) return "twin";

  const peerIsOlder = peerIsOlderThan(childBirthday, peerBirthday);

  if (kind === "sibling") {
    if (peerIsOlder) {
      if (peerGender === "female") return "older_sister";
      return "older_brother";
    }
    if (peerGender === "female") return "younger_sister";
    return "younger_brother";
  }
  if (kind === "cousin") {
    return peerIsOlder ? "cousin_older" : "cousin_younger";
  }
  if (kind === "second_cousin") {
    return peerIsOlder ? "second_cousin_older" : "second_cousin_younger";
  }
  return "friend";
}

/** DBの関係をフォーム選択値に戻す */
export function storedRelationToKind(
  relation: ChildPeerRelation
): PeerRelationKind {
  switch (relation) {
    case "older_brother":
    case "older_sister":
    case "younger_brother":
    case "younger_sister":
      return "sibling";
    case "twin":
      return "twin";
    case "cousin_older":
    case "cousin_younger":
      return "cousin";
    case "second_cousin_older":
    case "second_cousin_younger":
      return "second_cousin";
    case "friend":
      return "friend";
    default:
      return "sibling";
  }
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
