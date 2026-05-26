import type { Metadata } from "next";
import { createNoIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = createNoIndexMetadata("お支払い完了");

export default function SuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
