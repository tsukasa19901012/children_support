import type { Metadata } from "next";
import { BRAND } from "../../lib/brand";
import { createNoIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = createNoIndexMetadata(
  `ログイン — ${BRAND.name}`,
  `${BRAND.name}にログイン（メール認証）`
);

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
