import type { Metadata } from "next";
import { createNoIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = createNoIndexMetadata("お子さんの登録");

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
