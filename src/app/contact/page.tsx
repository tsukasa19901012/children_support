import type { Metadata } from "next";
import { BRAND } from "../../lib/brand";
import { ContactForm } from "../../features/marketing/components/ContactForm";
import { MarketingShell } from "../../features/marketing/components/MarketingShell";
import { createPublicMetadata } from "../../lib/seo";

export const metadata: Metadata = createPublicMetadata({
  title: "お問い合わせ",
  description: `${BRAND.name}へのお問い合わせ（課金・解約・返金、アカウント、個人情報、不具合）。`,
  path: "/contact",
});

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
