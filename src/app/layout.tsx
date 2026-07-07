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
const DEFAULT_DESCRIPTION = 'LUMOS IL היא קהילת הארי פוטר בעברית: טירה דיגיטלית עם פורומים, הנביא היומי, ספריית פאנפיקים, משימות, נקודות בתים וגביע קהילה חי. האתר נבנה ומתוחזק עבור מעריצות ומעריצים שרוצים מקום בטוח, פעיל וקסום לשיחה, יצירה ומשחק.';
const DEFAULT_KEYWORDS = [
  'הארי פוטר', 'קהילת הארי פוטר', 'הארי פוטר בעברית', 'הארי פוטר ישראל',
  'פורום הארי פוטר', 'פורומים בעברית', 'פאנפיק הארי פוטר', 'פאנפיקים בעברית',
  'ספריית פאנפיקים', 'הנביא היומי', 'משימות הארי פוטר', 'גביע הבתים',
  'גריפינדור', "סלית'רין", 'רייבנקלו', 'הפלפאף', 'הוגוורטס',
  'קהילת מעריצים', 'לומוס ישראל', 'LUMOS IL', 'Harry Potter Hebrew',
  'Harry Potter Israel', 'Harry Potter fan community', 'Harry Potter forum', 'Harry Potter fanfiction',
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
      default: 'LUMOS IL - טירת הארי פוטר בעברית',
      template: "%s | LUMOS IL",
    },
    description,
    keywords,
    applicationName: 'LUMOS IL',
    category: 'community',
    authors: [{ name: 'LUMOS IL', url: BASE_URL }],
    creator: "LUMOS IL",
    publisher: "LUMOS IL",
    alternates: { canonical: BASE_URL },
    openGraph: {
      type: "website",
      locale: "he_IL",
      url: BASE_URL,
      siteName: "LUMOS IL",
      title: 'LUMOS IL - טירת הארי פוטר בעברית',
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: 'LUMOS IL - קהילת הארי פוטר בעברית' }],
    },
    twitter: {
      card: "summary_large_image",
      title: 'LUMOS IL - טירת הארי פוטר בעברית',
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
    other: {
      'ai-summary': 'קהילת הארי פוטר עברית עם פורומים, ספריית פאנפיקים, הנביא היומי, משימות, בתים ונקודות קהילה.',
      'content-language': 'he-IL',
    },
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
