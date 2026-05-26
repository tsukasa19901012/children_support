import type { Metadata } from "next";
import { BRAND } from "../../lib/brand";
import { ContactForm } from "../../features/marketing/components/ContactForm";
import { MarketingShell } from "../../features/marketing/components/MarketingShell";

export const metadata: Metadata = {
  title: `お問い合わせ — ${BRAND.name}`,
  description: `${BRAND.name}へのお問い合わせ`,
};

export default function ContactPage() {
  return (
    <MarketingShell
      title="お問い合わせ"
      subtitle="課金・解約・返金、アカウント、個人情報、不具合など"
    >
      <ContactForm />
    </MarketingShell>
  );
}
