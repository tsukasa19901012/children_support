import type { Metadata } from "next";
import { BRAND } from "../../lib/brand";
import { LegalDocument } from "../../features/marketing/components/LegalDocument";
import { MarketingShell } from "../../features/marketing/components/MarketingShell";
import {
  PRIVACY_SECTIONS,
  PRIVACY_UPDATED_AT,
} from "../../features/marketing/privacyContent";

export const metadata: Metadata = {
  title: `プライバシーポリシー — ${BRAND.name}`,
  description: `${BRAND.name}のプライバシーポリシー`,
};

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
