import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import {
  Bricolage_Grotesque,
  Caveat,
  DM_Mono,
  Fraunces,
  Hanken_Grotesk,
  Noto_Sans_Kannada,
} from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import AppChrome from "@/components/v2/AppChrome";
import Develop from "@/components/v2/Develop";
import ScrollTop from "@/components/v2/ScrollTop";
import { getMe } from "@/lib/me";
import "./v2.css";

// Display: a grotesque with a width axis, set tight and heavy for headlines.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  axes: ["wdth", "opsz"],
  variable: "--font-bricolage",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
// Serif: italic accents inside headlines, and long-form article text.
const fraunces = Fraunces({
  subsets: ["latin"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
  preload: false,
});
// Handwriting for margin notes, mono for date stamps. Both are decoration,
// so neither blocks first paint.
const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
  preload: false,
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dmmono",
  display: "swap",
  preload: false,
});
// Kannada text is set in Noto Sans Kannada (Brand Guidelines, p. 17). The file
// is only fetched by a page that actually has Kannada on it.
const kannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  variable: "--font-kannada",
  display: "swap",
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "BMSCE Alumni Network: where graduates and students of B.M.S. College of Engineering (BMSCE) find their class, their chapter, events and The Wall.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BMSCE Alumni Network: Once BMSCE. Always BMSCE.",
    template: "%s",
  },
  description,
  applicationName: "BMSCE Alumni Network",
  // The favicon and touch icon are the gear mark: app/icon.png and app/apple-icon.png.
  appleWebApp: { capable: true, title: "BMSCE Alumni", statusBarStyle: "default" },
  openGraph: {
    title: "BMSCE Alumni Network: Once BMSCE. Always BMSCE.",
    description,
    siteName: "BMSCE Alumni Network",
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "BMSCE Alumni Network: Once BMSCE. Always BMSCE.",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, me } = await getMe();
  // The signed-in shell (rail, top bar, tab bar) only appears once a member
  // has finished onboarding; until then they see the public layout.
  const inApp = Boolean(user && me?.onboarded);
  // Day or night, as the visitor last chose (see components/v2/ThemeToggle).
  const night = (await cookies()).get("theme")?.value === "night";

  return (
    <html
      lang="en"
      data-auth={inApp ? "in" : "out"}
      data-theme={night ? "night" : undefined}
      className={`${bricolage.variable} ${hanken.variable} ${fraunces.variable} ${caveat.variable} ${dmMono.variable} ${kannada.variable}`}
    >
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded focus:bg-ink focus:px-4 focus:py-2 focus:text-ivory"
        >
          Skip to content
        </a>
        <AuthProvider
          initial={{
            user,
            inApp,
            profile: me
              ? {
                  full_name: me.full_name,
                  photo_url: me.photo_url,
                  role: me.role,
                  user_type: me.user_type,
                  verification_status: me.verification_status,
                }
              : null,
          }}
        >
          {inApp && me && <AppChrome me={me} />}
          <div id="main">{children}</div>
          <Develop />
          <ScrollTop />
        </AuthProvider>
      </body>
    </html>
  );
}
