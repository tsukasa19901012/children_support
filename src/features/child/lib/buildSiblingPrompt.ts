import { formatAge } from "../../../lib/childAge";
import { relationLabel, type ChildPeerRelation } from "../types/siblingRelation";

export type PeerForPrompt = {
  name: string;
  birthday: string;
  relation: ChildPeerRelation;
};

/** システムプロンプト用の家族・友人関係ブロック */
export function buildSiblingPromptBlock(
  activeChildName: string,
  activeChildBirthday: string,
  peers: PeerForPrompt[]
): string | null {
  if (peers.length === 0) return null;

  const activeAge = formatAge(activeChildBirthday);
  const lines = peers.map(
    (p) => `${relationLabel(p.relation)}の「${p.name}」（${formatAge(p.birthday)}）`
  );

  return (
    `【家族・友人との関係】\n` +
    `相談中のお子さん「${activeChildName}」（${activeAge}）の身近なお子さん: ${lines.join("、")}。\n` +
    `きょうだい・いとこ（従兄弟）・再従兄弟・友達との関係（嫉妬・比較・喧嘩・仲直り・友達トラブル・遊びのトラブルなど）に触れた相談では、それぞれの年齢・関係性・立場を踏まえ、相互に配慮したアドバイスをしてください。`
  );
}
