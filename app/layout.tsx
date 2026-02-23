import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Poppins } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/ToastProvider";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  adjustFontFallback: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  adjustFontFallback: false,
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://niatools.vercel.app";
const SITE_NAME = "NIA Productivity Tools";
const SITE_DESCRIPTION =
  "NIA Region 3 productivity tools. Automate manual processes into minute-level results. Features: LIPA Summary, Consolidate Billing Unit, Merge Files, IFR Scanner. National Irrigation Administration Region 3.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | National Irrigation Administration R3`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "NIA",
    "National Irrigation Administration",
    "Region 3",
    "productivity tools",
    "LIPA summary",
    "billing unit",
    "merge files",
    "IFR scanner",
    "irrigation",
    "automation",
    "workflow",
    "Bulacan",
    "San Rafael",
    "Tambubong",
  ],
  authors: [{ name: "NIA Region 3", url: SITE_URL }],
  creator: "National Irrigation Administration Region 3",
  publisher: "National Irrigation Administration Region 3",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_PH",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/logo.png",
        width: 200,
        height: 80,
        alt: "NIA Region 3 Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
    ],
    apple: "/logo.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: SITE_URL,
  },
  category: "productivity",
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": SITE_NAME,
    "application-name": SITE_NAME,
  },
};

export const viewport: Viewport = {
  themeColor: "#004e3b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
