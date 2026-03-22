import "./globals.css";
import { Assistant, Cinzel, Crimson_Pro } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OwlMailProvider } from "@/components/OwlMail";
import MagicSpells from "@/components/MagicSpells";
import DuelChallenge from "@/components/DuelChallenge";
import CookieBanner from "@/components/CookieBanner";
import MagicTicker from "@/components/MagicTicker";
import HouseElfHelper from "@/components/HouseElfHelper";
import BackgroundMusic from "@/components/BackgroundMusic";
import { UIProvider } from "@/context/UIContext";
import MagicPresence from "@/components/MagicPresence";
import { AuthProvider } from "@/context/AuthContext";
import CoolingRoomBanner from "@/components/CoolingRoomBanner";
import SortingReminder from "@/components/SortingReminder";

/**
 * LUMOS IL - ROOT LAYOUT V3.1 FIXED
 */

const assistant = Assistant({ subsets: ["hebrew", "latin"], variable: "--font-assistant", display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const crimson = Crimson_Pro({ subsets: ["latin"], variable: "--font-crimson", display: "swap", style: "italic" });

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
  description: "קהילת הארי פוטר הגדולה בישראל — מיון לבתים, פורום, גביע הבתים, הנביא היומי, ספריית פאנפיקים, זירת קרבות לחשים ועוד. הצטרף לאלפי קוסמים ישראלים.",
  keywords: [
    "הארי פוטר", "פורום הארי פוטר", "קהילת הארי פוטר",
    "הארי פוטר ישראל", "קהילה", "ישראל",
    "lumos", "lumos IL", "LUMOS IL",
    "גריפינדור", "סלית'רין", "רייבנקלו", "הפלפאף",
    "הוגוורטס", "מיון לבתים", "גביע הבתים",
    "פאנפיק הארי פוטר", "פאנפיקים",
    "Harry Potter Israel", "Harry Potter Hebrew", "HP Israel",
    "Harry Potter forum", "קסמים", "אוהדי הארי פוטר",
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
    description: "פורום הארי פוטר הגדול בישראל — מיון לבתים, גביע הבתים, פאנפיקים, זירת קרבות לחשים ועוד. הצטרף עכשיו.",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "LUMOS IL — קהילת הארי פוטר הישראלית" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LUMOS IL — קהילת הארי פוטר של ישראל",
    description: "פורום הארי פוטר הגדול בישראל — מיון לבתים, גביע הבתים, פאנפיקים וזירת קרבות לחשים.",
    images: ["/images/og-image.png"],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://lumos-il.co.il" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${cinzel.variable} ${crimson.variable} scroll-smooth`}>
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

              {/* 🔥 חשוב – מפעיל את מערכת הנוכחות */}
              <MagicPresence />

              {/* מנועי רקע */}
              <BackgroundMusic />
              <MagicSpells />
              <DuelChallenge />

              {/* Header */}
              <Header />

              <div className="pt-[100px] md:pt-[120px] flex flex-col flex-1 w-full relative">

                <MagicTicker />

                <main id="main-content" className="flex-1 relative z-10 w-full flex flex-col pt-16 md:pt-20">
                  {children}
                </main>

              </div>

              {/* Footer + UI */}
              <Footer />
              <HouseElfHelper />
              <CookieBanner />
              <CoolingRoomBanner />
              <SortingReminder />

            </OwlMailProvider>
          </UIProvider>
        </AuthProvider>

      </body>
    </html>
  );
}