/** 学習メモリの出力フォーマット指示 */
export const MEMORY_FORMAT_INSTRUCTION = `400文字以内で以下の形式でまとめてください（該当なければ省略可）:

【子どもの特徴】
- （性格・行動パターンなど）

【家庭環境】
- （家族構成・生活スタイルなど）

【よくある悩み・傾向】
- （睡眠・食事・癇癪・兄弟関係など）`;

type HistoryMessage = { role: string; content: string };

/** 残りの会話履歴から学習メモリ再生成用プロンプトを組み立てる */
export function buildRebuildMemoryPrompt(messages: HistoryMessage[]): string {
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "保護者" : "AI"}: ${m.content}`)
    .join("\n");

  return `以下は保護者とAIの育児相談の履歴です。
この会話全体から、子どもの性格・特徴・家庭環境・よくある悩みに関する情報を抽出し、学習メモを作り直してください。
重複は排除し、${MEMORY_FORMAT_INSTRUCTION}

---
【会話履歴】
${conversationText}`;
}
