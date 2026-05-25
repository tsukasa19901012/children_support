import { formatAge } from "../../../lib/childAge";
import type { ProfileType } from "../types/profileType";

export type ProfileForPrompt = {
  id: string;
  name: string;
  birthday: string | null;
  profile_type: ProfileType;
  memory: string | null;
};

function formatProfileLine(p: ProfileForPrompt): string {
  const age = p.birthday ? formatAge(p.birthday) : "年齢未登録";
  if (p.profile_type === "caregiver") {
    return `保護者「${p.name}」（${age}）`;
  }
  const memoryNote = p.memory
    ? ` — 記録: ${p.memory.slice(0, 120)}${p.memory.length > 120 ? "…" : ""}`
    : "";
  return `お子さん「${p.name}」（${age}）${memoryNote}`;
}

/** 保護者相談用: 登録済みのお子さん情報をプロンプトに載せる */
export function buildCaregiverChildrenContextBlock(
  allProfiles: ProfileForPrompt[],
  linkedChildIds: string[]
): string {
  const childProfiles = allProfiles.filter((p) => p.profile_type === "child");
  if (childProfiles.length === 0) {
    return "【登録されているお子さん】まだお子さんの登録がありません。";
  }

  const linkedSet = new Set(linkedChildIds);
  const lines = childProfiles.map((p) => {
    const base = formatProfileLine(p);
    if (linkedSet.has(p.id)) {
      return `${base}（あなたが保護者として登録）`;
    }
    return base;
  });

  return (
    `【登録されているお子さんの情報】\n` +
    lines.join("\n") +
    `\n\n保護者自身の悩みに答える際も、上記のお子さんの年齢・記録を踏まえて、家庭の状況に合った助言をしてください。`
  );
}

export const CAREGIVER_SYSTEM_PROMPT =
  "あなたは、育児中の保護者本人に寄り添う育児支援AIです。保護者の疲れ・罪悪感・イライラ・パートナーとのすれ違いなど、本人の気持ちを最優先で受け止めてください。医療診断は行わず、必要なら専門家への相談を促してください。子どもの問題行動の助言より、まず保護者の心を軽くし、今日できる小さな一歩を示してください。登録されているお子さんの情報がある場合は、それを踏まえた上で、無理のない提案をしてください。";

export function buildCaregiverContext(
  name: string,
  birthday: string | null
): string {
  const agePart = birthday ? formatAge(birthday) : null;
  return agePart
    ? `相談者（保護者）のお名前は「${name}」、${agePart}です。`
    : `相談者（保護者）のお名前は「${name}」です。`;
}

export function buildCaregiverSystemPrompt(
  caregiverContext: string,
  childrenBlock: string,
  memory: string | null
): string {
  let prompt = `${CAREGIVER_SYSTEM_PROMPT}\n\n【相談者（保護者本人）】${caregiverContext}`;
  prompt += `\n\n${childrenBlock}`;
  if (memory) {
    prompt += `\n\n【これまでの会話から学習した情報（保護者について）】\n${memory}\nこの情報を踏まえて、より的確で温かい回答をしてください。`;
  }
  return prompt;
}

/** 保護者メモリ更新用プロンプト */
export function buildCaregiverMemoryExtractPrompt(
  currentMemory: string | null,
  userMessage: string,
  aiMessage: string
): string {
  const memoryPrompt = currentMemory
    ? `以下は保護者についての既存の学習メモです:\n${currentMemory}\n\n`
    : "";

  return `${memoryPrompt}以下の育児相談（保護者本人の相談）から、保護者の感情傾向・よくある悩み・家庭状況に関する新たな情報を抽出し、学習メモを更新してください。
重複は排除し、400文字以内で以下の形式でまとめてください:

【感情・状態の傾向】
- （疲れ・罪悪感・イライラなど）

【よくある悩み】
- （繰り返し相談するテーマ）

【家庭・育児の文脈】
- （パートナー・仕事・支援体制など）

---
保護者の相談: ${userMessage}
AIの回答: ${aiMessage}`;
}

/** 週次レポート用プロンプト（保護者本人向け） */
export function buildCaregiverWeeklyReportPrompt(
  caregiverName: string,
  childrenContext: string,
  messages: { role: string; content: string }[],
  memory: string | null,
  periodLabel: string
): string {
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "保護者" : "AI"}: ${m.content}`)
    .join("\n");

  const memorySection = memory
    ? `\n【保護者についての記録】\n${memory}\n`
    : "";

  return `あなたは、育児中の保護者本人を支える育児相談のAIです。
以下の情報をもとに、保護者本人向けの週次振り返りレポートをチャットメッセージとして作成してください。

【相談者（保護者本人）】
名前: ${caregiverName}
${childrenContext}
${memorySection}
【${periodLabel}の相談内容（保護者本人の相談）】
${conversationText || "（この期間は相談がありませんでした）"}

---

以下の構成で、保護者の自己肯定感を高め、来週への意欲が湧くメッセージを作成してください。
絵文字を適度に使い、読みやすく温かいトーンで書いてください。

1. この期間の振り返り
   - 何回相談したか・どんな悩み（疲れ・罪悪感・パートナーとのすれ違いなど）に向き合ったか

2. あなたの気持ちへの気づき
   - 会話から読み取れる保護者の状態・感情の傾向

3. あなたは十分頑張っています
   - 育児と自分のケアの大変さへの共感と、努力を称える言葉

4. 来週のあなたへのメッセージ
   - 力が抜けて、来週も前向きになれる温かい言葉

最初に「📋 ${periodLabel}の振り返りレポート（${caregiverName}・保護者）」と見出しをつけてください。
トーン：温かく、共感的、押しつけがましくない。専門用語を使わない。`;
}
