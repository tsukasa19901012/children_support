import { formatAge } from "../../../lib/childAge";
import { relationLabel, type SiblingRelation } from "../types/siblingRelation";

export type SiblingForPrompt = {
  name: string;
  birthday: string;
  relation: SiblingRelation;
};

/** システムプロンプト用のきょうだいブロック */
export function buildSiblingPromptBlock(
  activeChildName: string,
  activeChildBirthday: string,
  siblings: SiblingForPrompt[]
): string | null {
  if (siblings.length === 0) return null;

  const activeAge = formatAge(activeChildBirthday);
  const lines = siblings.map(
    (s) => `${relationLabel(s.relation)}の「${s.name}」（${formatAge(s.birthday)}）`
  );

  return (
    `【きょうだい・家族内の関係】\n` +
    `相談中のお子さん「${activeChildName}」（${activeAge}）にはきょうだいがいます: ${lines.join("、")}。\n` +
    `きょうだい同士の関係（嫉妬・比較・役割分担・喧嘩など）に触れた相談では、それぞれの年齢と立場を踏まえ、相互に配慮したアドバイスをしてください。`
  );
}
