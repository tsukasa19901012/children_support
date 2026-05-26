import type { Metadata } from "next";
import { createNoIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = createNoIndexMetadata("お支払いキャンセル");

export default function CancelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
