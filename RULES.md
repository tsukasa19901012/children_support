# RULES.md

# =========================
# 1. Product Vision（プロダクトの目的）
# =========================

This product is a parenting AI assistant for caregivers of children aged 2–6.
（このプロダクトは2〜6歳の子どもを育てる保護者向けAI支援アプリ）

It aims to:
- Reduce parental anxiety（親の不安を軽減する）
- Help interpret child behavior contextually（子どもの行動を文脈的に理解する）
- Provide calm, non-judgmental support（落ち着いた非評価的サポート）
- Maintain long-term memory of child context（子どもの長期文脈記憶）
- Work primarily on mobile devices（スマホ最優先設計）

---

# =========================
# 2. Core Principles（基本原則）
# =========================

- Mobile-first design is mandatory（スマホ最優先）
- Optimize for exhausted users（疲れている親でも使える設計）
- Simplicity over feature richness（機能よりシンプルさ）
- Calm and emotionally stable UX（安心感のあるUX）
- No unnecessary complexity（過剰設計禁止）
- Every feature must reduce user effort（操作負荷を減らすこと）

---

# =========================
# 3. UX Principles（UX設計原則）
# =========================

- One-hand operation must be possible（片手操作可能）
- Input flow must be minimal（入力は最小限）
- Avoid information overload（情報過多を避ける）
- Prioritize immediate relief over completeness（完全性より安心感）
- No aggressive animations（過剰なアニメーション禁止）
- Always reassure before advice（助言前に共感・安心）

---

# =========================
# 4. AI Behavior Rules（AIの振る舞い）
# =========================

The AI acts as a calm childcare support assistant, NOT a medical expert.
（医療ではなく育児支援の落ち着いた相談役）

## AI MUST:
- Acknowledge emotions first（感情共感を最初に行う）
- Provide possible interpretations（断定ではなく可能性提示）
- Give simple actionable steps（すぐできる行動）
- Keep responses short and calm（短く落ち着いた返答）
- Adapt to child age 2–6（年齢考慮）

## AI MUST NOT:
- Provide medical diagnosis（医療診断は禁止）
- Increase anxiety（不安を煽らない）
- Use technical jargon（専門用語を避ける）
- Assume rare conditions（レアケース前提禁止）

---

# =========================
# 5. Architecture Rules（設計ルール）
# =========================

- Feature-based structure required（機能単位構成）
- Small reusable components only（小さく再利用可能に）
- Prefer composition over inheritance（継承より構成）
- Strict TypeScript mode（厳密型必須）
- Separate UI / logic / data access（責務分離）

---

# =========================
# 6. Folder Structure（構成ルール）
# =========================

src/
├ app/
├ features/
│   ├ auth/
│   ├ chat/
│   ├ child/
│   ├ history/
│   └ report/
├ components/
├ lib/
├ hooks/
├ types/
└ prompts/

Each feature must be self-contained.
（各機能は独立して完結させる）

---

# =========================
# 7. Code Quality Rules（コード品質）
# =========================

- No files over ~300 lines（巨大ファイル禁止）
- Avoid duplication（重複排除）
- Prefer readability（可読性優先）
- Always define TypeScript types（型必須）
- Handle loading/error/empty states（全UIで必須）

---

# =========================
# 8. Data & Memory Rules（データ・記憶）
# =========================

- Child is the core entity（子どもが中心）
- All chats linked to child context（必ず子ども紐付け）
- Raw logs must be summarized（生データではなく要約保存）
- Weekly summaries required（週次レポート必須）

Memory includes:
- Behavior patterns（行動傾向）
- Emotional tendencies（感情傾向）
- Recurring issues（睡眠・癇癪など）

---

# =========================
# 9. Prompt Engineering Rules（プロンプト）
# =========================

- All prompts stored in /prompts（必ず管理）
- Must be versioned（バージョン管理）
- Separate system/context/output prompts（分離設計）

System prompt must enforce:
- Calm tone（落ち着いた口調）
- Non-medical guidance（医療ではない）
- Reassurance first（安心優先）
- Structured output（構造化返答）

---

# =========================
# 10. Performance Rules（性能）
# =========================

- Use streaming responses where possible（ストリーミング）
- Minimize re-renders（無駄な再描画削減）
- Cache stable data（安定データはキャッシュ）
- Optimize perceived speed（体感速度重視）

---

# =========================
# 11. Security Rules（セキュリティ）
# =========================

- Never expose API keys（キー露出禁止）
- Use env variables only（環境変数必須）
- Validate all inputs（入力検証必須）
- Treat all external input as unsafe（外部入力は信用しない）

---

# =========================
# 12. Definition of Done（完了条件）
# =========================

A feature is complete only if:

- Mobile UI works（スマホOK）
- Loading/error/empty handled（状態網羅）
- TypeScript types defined（型あり）
- Supabase integration done（必要時）
- AI behavior validated（AI機能時）
- Mobile UX tested（実機確認）

---

# =========================
# 13. Cursor AI Behavior Rules
# =========================

- Prefer minimal diffs（最小変更）
- Do not refactor unrelated code（無関係変更禁止）
- Ask if unclear（不明点は確認）
- Keep changes feature-local（機能単位で変更）
- Do not over-engineer（過剰設計禁止）

---

# =========================
# 14. Product Constraints（制約）
# =========================

- No social features（SNS禁止）
- No gamification（ゲーム要素禁止）
- No complex onboarding（複雑導線禁止）
- No over-personalization in MVP（過剰最適化禁止）
- Focus only on stress reduction（ストレス軽減に集中）

---

# =========================
# 15. Tone of Product（トーン）
# =========================

The product must feel:

- Calm（落ち着き）
- Warm（温かい）
- Non-judgmental（否定しない）
- Reliable（信頼できる）
- Simple（シンプル）

Never:
- Alarmist（不安煽り）
- Overly technical（技術的すぎる）
- Overexcited（過剰に明るい）

---

# =========================
# 16. Final Rule（最重要）
# =========================

If there is any conflict:

UX > Technical purity > Features

（UXが最優先）