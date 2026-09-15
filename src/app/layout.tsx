import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import Aurora from "@/components/Aurora";
import SitePreloader from "@/components/SitePreloader";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Set NEXT_PUBLIC_SITE_URL to your production domain so shared-link previews
// and the sitemap use absolute URLs. Falls back to localhost for dev.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BMSCE Alumni Network: Once BMS. Always BMS.",
    template: "%s",
  },
  description:
    "The home for every BMS graduate: find your batch, your city chapter, a mentor, or your next opportunity.",
  openGraph: {
    title: "BMSCE Alumni Network: Once BMS. Always BMS.",
    description:
      "The home for every BMS graduate: find your batch, your city chapter, a mentor, or your next opportunity.",
    siteName: "BMSCE Alumni Network",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "BMSCE Alumni Network: Once BMS. Always BMS.",
    description:
      "The home for every BMS graduate: find your batch, your city chapter, a mentor, or your next opportunity.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body>
        <SitePreloader />
        {/* Fixed, faint, site-wide — dark sections (oxblood backgrounds)
            naturally occlude it since they paint over it; their own
            brighter Aurora instance still runs underneath for contrast
            against dark. */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <Aurora strength={0.55} />
        </div>
        <ScrollProgress />
        <AuthProvider>
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
