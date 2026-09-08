import type { Metadata, Viewport } from "next";
import { Geist, Lobster } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

/** The brand script, used only for the Peachy wordmark. */
const lobster = Lobster({
  variable: "--font-lobster",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peachy",
  description: "Schedules, hours and tokens for the Peachy roster",
  appleWebApp: { capable: true, title: "Peachy", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdefe9" },
    { media: "(prefers-color-scheme: dark)", color: "#221409" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${lobster.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
