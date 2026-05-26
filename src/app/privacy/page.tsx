import type { Metadata } from "next";
import { BRAND } from "../../lib/brand";
import { LegalDocument } from "../../features/marketing/components/LegalDocument";
import { MarketingShell } from "../../features/marketing/components/MarketingShell";
import {
  PRIVACY_SECTIONS,
  PRIVACY_UPDATED_AT,
} from "../../features/marketing/privacyContent";
import { createPublicMetadata } from "../../lib/seo";

export const metadata: Metadata = createPublicMetadata({
  title: "プライバシーポリシー",
  description: `${BRAND.name}における個人情報の取り扱い（取得項目、利用目的、第三者提供等）。`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <MarketingShell
      title="プライバシーポリシー"
      subtitle={`最終更新: ${PRIVACY_UPDATED_AT}`}
    >
      <LegalDocument sections={PRIVACY_SECTIONS} />
    </MarketingShell>
  );
}
