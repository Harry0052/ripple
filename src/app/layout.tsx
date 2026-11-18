import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { SiteFooter } from "@/components/shell/site-footer";
import { SiteHeader } from "@/components/shell/site-header";
import { PrimaryNav } from "@/components/shell/primary-nav";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: {
    default: "Ripple",
    template: "%s · Ripple",
  },
  description: "Shareable actions with a preview of every step and a record of what ran.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable} h-full`}>
      <body className="flex min-h-full flex-col pb-20 font-sans antialiased md:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
        <PrimaryNav variant="mobile" />
      </body>
    </html>
  );
}
