import type { Metadata, Viewport } from "next";
import { BRAND, BRAND_DISPLAY } from "../lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND_DISPLAY,
  description: `${BRAND.description}（${BRAND.audience}）`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // キーボードはオーバーレイ。入力欄は fixed + visualViewport で追従
  interactiveWidget: "overlays-content",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}