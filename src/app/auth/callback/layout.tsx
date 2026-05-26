import type { Metadata } from "next";
import { createNoIndexMetadata } from "../../../lib/seo";

export const metadata: Metadata = createNoIndexMetadata("認証");

export default function AuthCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
