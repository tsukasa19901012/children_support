import type { Metadata } from "next";
import { BRAND } from "../../lib/brand";
import { LegalDocument } from "../../features/marketing/components/LegalDocument";
import { MarketingShell } from "../../features/marketing/components/MarketingShell";
import { TERMS_SECTIONS, TERMS_UPDATED_AT } from "../../features/marketing/termsContent";

export const metadata: Metadata = {
  title: `利用規約 — ${BRAND.name}`,
  description: `${BRAND.name}の利用規約`,
};

export default function TermsPage() {
  return (
    <MarketingShell title="利用規約" subtitle={`最終更新: ${TERMS_UPDATED_AT}`}>
      <LegalDocument sections={TERMS_SECTIONS} />
    </MarketingShell>
  );
}
