import type { Metadata } from "next";
import { Google_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-google-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Niatools",
  description: "Niatools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${googleSans.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
