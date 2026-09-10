import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import { getSupabaseEnv } from "@/lib/env";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

const siteUrl = getSupabaseEnv().siteUrl ?? "https://colorhunt.quest";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  applicationName: "Color Hunt",
  title: {
    default: "Color Hunt",
    template: "%s | Color Hunt",
  },
  description:
    "Turn travel into a color game. Pick a place, hunt one color, collect nine moments, and turn them into a poster worth sharing.",
  keywords: [
    "color hunt",
    "color scavenger hunt",
    "travel photo challenge",
    "photo scavenger hunt",
    "city photo challenge",
    "color photo challenge",
    "travel poster maker",
    "photo walk challenge",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "Color Hunt",
    title: "Color Hunt",
    description:
      "Turn travel into a color game. Pick a place, hunt one color, collect nine moments, and turn them into a poster worth sharing.",
    url: "/",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
        alt: "Color Hunt",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Color Hunt",
    description:
      "Turn travel into a color game. Pick a place, hunt one color, collect nine moments, and turn them into a poster worth sharing.",
    images: ["/icon.png"],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    shortcut: ["/icon.png"],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f4efe7",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col">
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-5LPEC9C99Q" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-5LPEC9C99Q');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
