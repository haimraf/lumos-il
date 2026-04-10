import "./globals.css";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import AppShell from "@/components/AppShell";
import Footer from "@/components/Footer";
import { OwlMailProvider } from "@/components/OwlMail";
import MagicSpells from "@/components/MagicSpells";
import DuelChallenge from "@/components/DuelChallenge";
import CookieBanner from "@/components/CookieBanner";
import HouseElfHelper from "@/components/HouseElfHelper";
import BackgroundMusic from "@/components/BackgroundMusic";
import { UIProvider } from "@/context/UIContext";
import MagicPresence from "@/components/MagicPresence";
import { AuthProvider } from "@/context/AuthContext";
import CoolingRoomBanner from "@/components/CoolingRoomBanner";
import SortingReminder from "@/components/SortingReminder";
import AzkabanGuard from "@/components/AzkabanGuard";
import { createClient, hasSupabaseServerEnv } from "@/utils/supabase/server";
import { SITE_CONFIG_KEY } from "@/components/admin/AdminSiteSettingsTab";
import type { SiteConfig } from "@/components/admin/AdminSiteSettingsTab";
/**
 * LUMOS IL - ROOT LAYOUT V3.1 FIXED
 */

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const BASE_URL = "https://lumos-il.co.il";
const DEFAULT_DESCRIPTION = "LUMOS IL היא קהילת הארי פוטר הישראלית עם חוויית דפדפן משחקית: לוח משימות, גביע הבתים, זירת דו-קרב, איוונטים חיים, פורומים, ספריית פאנפיקים ועולם קסום בעברית מלאה.";
const DEFAULT_KEYWORDS = [
  "הארי פוטר", "פורום הארי פוטר", "קהילת הארי פוטר",
  "הארי פוטר ישראל", "קהילה", "ישראל",
  "lumos", "lumos IL", "LUMOS IL",
  "גריפינדור", "סלית'רין", "רייבנקלו", "הפלפאף",
  "הוגוורטס", "מיון לבתים", "גביע הבתים", "לוח משימות", "קווסטים",
  "זירת דו-קרב", "איוונטים חיים", "דפדפן RPG", "קהילת הארי פוטר בעברית",
  "פאנפיק הארי פוטר", "פאנפיקים",
  "Harry Potter Israel", "Harry Potter Hebrew", "HP Israel",
  "Harry Potter forum", "Harry Potter quests", "Harry Potter fan community", "קסמים", "אוהדי הארי פוטר",
];
const DEFAULT_OG_IMAGE = "/images/og-image.png";

// Cached for 60s — avoids a DB hit on every page render
const getCachedSiteConfig = unstable_cache(
  async (): Promise<Partial<SiteConfig>> => {
    if (!hasSupabaseServerEnv()) {
      return {};
    }

    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", SITE_CONFIG_KEY)
        .maybeSingle();
      return (data?.value as Partial<SiteConfig>) || {};
    } catch {
      return {};
    }
  },
  ["site_config_layout"],
  { revalidate: 60 },
);

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getCachedSiteConfig();

  const description = cfg.seo_description?.trim() || DEFAULT_DESCRIPTION;
  const ogImage = cfg.og_image_url?.trim() || DEFAULT_OG_IMAGE;
  const keywords = cfg.seo_keywords?.trim()
    ? cfg.seo_keywords.split(",").map((k) => k.trim()).filter(Boolean)
    : DEFAULT_KEYWORDS;

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: "LUMOS IL | הבית הדיגיטלי של קהילת הקוסמים",
      template: "%s | LUMOS IL",
    },
    description,
    keywords,
    authors: [{ name: "LUMOS IL", url: BASE_URL }],
    creator: "LUMOS IL",
    publisher: "LUMOS IL",
    openGraph: {
      type: "website",
      locale: "he_IL",
      url: BASE_URL,
      siteName: "LUMOS IL",
      title: "LUMOS IL — קהילת הארי פוטר של ישראל",
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "LUMOS IL — קהילת הארי פוטר הישראלית" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "LUMOS IL — קהילת הארי פוטר של ישראל",
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className="antialiased bg-[#020617] text-[#f8fafc] font-assistant selection:bg-amber-500/30 flex flex-col min-h-screen">

        {/* Skip link לנגישות מקלדת */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[9500] focus:bg-amber-500 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
        >
          דלג לתוכן הראשי
        </a>

        <AuthProvider>
          <UIProvider>
            <OwlMailProvider>

              {/* 🛑 חומת אזקבאן - חוסמת את כל האתר לטרולים */}
              <AzkabanGuard>

                {/* 🔥 חשוב – מפעיל את מערכת הנוכחות */}
                <MagicPresence />

                {/* מנועי רקע */}
                <BackgroundMusic />
                <MagicSpells />
                <DuelChallenge />

                <AppShell>{children}</AppShell>

                {/* Footer + UI */}
                <Footer />
                <HouseElfHelper />
                <CookieBanner />
                <CoolingRoomBanner />
                <SortingReminder />

              </AzkabanGuard>
              {/* 🛑 סוף חומת אזקבאן */}

            </OwlMailProvider>
          </UIProvider>
        </AuthProvider>

      </body>
    </html>
  );
}
