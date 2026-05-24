import type { Metadata, Viewport } from "next";
import {
  BRAND,
  BRAND_DISPLAY,
  BRAND_LOGO_PATH,
  BRAND_SITE_URL,
} from "../lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(BRAND_SITE_URL),
  title: BRAND_DISPLAY,
  description: `${BRAND.description}（${BRAND.audience}）`,
  applicationName: BRAND.name,
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: BRAND_SITE_URL,
    siteName: BRAND.name,
    title: BRAND_DISPLAY,
    description: BRAND.description,
    images: [
      {
        url: BRAND_LOGO_PATH,
        width: 512,
        height: 512,
        alt: BRAND.name,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: BRAND_DISPLAY,
    description: BRAND.description,
    images: [BRAND_LOGO_PATH],
  },
  appleWebApp: {
    capable: true,
    title: BRAND.name,
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#2563EB",
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
