import "./globals.css";
import Header from "@/components/Header";
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
/**
 * LUMOS IL - ROOT LAYOUT V3.1 FIXED
 */

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // safe-area-inset לטלפונים עם notch (iPhone X+)
};

export const metadata = {
  metadataBase: new URL("https://lumos-il.co.il"),
  title: {
    default: "LUMOS IL | הבית הדיגיטלי של קהילת הקוסמים",
    template: "%s | LUMOS IL",
  },
  description: "LUMOS IL היא קהילת הארי פוטר הישראלית עם חוויית דפדפן משחקית: לוח משימות, גביע הבתים, זירת דו-קרב, איוונטים חיים, פורומים, ספריית פאנפיקים ועולם קסום בעברית מלאה.",
  keywords: [
    "הארי פוטר", "פורום הארי פוטר", "קהילת הארי פוטר",
    "הארי פוטר ישראל", "קהילה", "ישראל",
    "lumos", "lumos IL", "LUMOS IL",
    "גריפינדור", "סלית'רין", "רייבנקלו", "הפלפאף",
    "הוגוורטס", "מיון לבתים", "גביע הבתים", "לוח משימות", "קווסטים",
    "זירת דו-קרב", "איוונטים חיים", "דפדפן RPG", "קהילת הארי פוטר בעברית",
    "פאנפיק הארי פוטר", "פאנפיקים",
    "Harry Potter Israel", "Harry Potter Hebrew", "HP Israel",
    "Harry Potter forum", "Harry Potter quests", "Harry Potter fan community", "קסמים", "אוהדי הארי פוטר",
  ],
  authors: [{ name: "LUMOS IL", url: "https://lumos-il.co.il" }],
  creator: "LUMOS IL",
  publisher: "LUMOS IL",
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://lumos-il.co.il",
    siteName: "LUMOS IL",
    title: "LUMOS IL — קהילת הארי פוטר של ישראל",
    description: "קהילת הארי פוטר הישראלית עם לוח משימות, גביע הבתים, דו-קרבות, איוונטים חיים, פורומים, פאנפיקים ועולם קסום בעברית.",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "LUMOS IL — קהילת הארי פוטר הישראלית" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LUMOS IL — קהילת הארי פוטר של ישראל",
    description: "קהילת הארי פוטר הישראלית עם קווסטים, גביע הבתים, דו-קרבות, איוונטים חיים, פאנפיקים ופורומים.",
    images: ["/images/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://lumos-il.co.il" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="scroll-smooth">
      <body className="antialiased bg-[#020617] text-[#f8fafc] font-assistant selection:bg-amber-500/30 flex flex-col min-h-screen">

        {/* Skip link לנגישות מקלדת */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[99999] focus:bg-amber-500 focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:font-bold focus:text-sm"
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

                {/* Header */}
                <Header />

                <div className="pt-[100px] md:pt-[120px] flex flex-col flex-1 w-full relative">
                  <main id="main-content" className="flex-1 w-full flex flex-col pt-16 md:pt-20">
                    {children}
                  </main>

                </div>

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
