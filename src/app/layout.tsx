import "./globals.css";
import { Assistant, Cinzel, Crimson_Pro } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OwlMailProvider } from "@/components/OwlMail";
import MagicSpells from "@/components/MagicSpells";
import CookieBanner from "@/components/CookieBanner";
import MagicTicker from "@/components/MagicTicker";
import HouseElfHelper from "@/components/HouseElfHelper";
import BackgroundMusic from "@/components/BackgroundMusic";
import { UIProvider } from "@/context/UIContext";
import MagicPresence from "@/components/MagicPresence";
import { AuthProvider } from "@/context/AuthContext";
import CoolingRoomBanner from "@/components/CoolingRoomBanner";

/**
 * LUMOS IL - ROOT LAYOUT V3.1 FIXED
 */

const assistant = Assistant({ subsets: ["hebrew", "latin"], variable: "--font-assistant", display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const crimson = Crimson_Pro({ subsets: ["latin"], variable: "--font-crimson", display: "swap", style: "italic" });

export const metadata = {
  metadataBase: new URL("https://lumos-il.co.il"),
  title: {
    default: "LUMOS IL | הבית הדיגיטלי של קהילת הקוסמים",
    template: "%s | LUMOS IL",
  },
  description: "קהילת ההארי פוטר הגדולה בישראל. עברו מיון לבתים, גביע הבית, הנביא היומי ופעילויות קסומות.",
  keywords: ["הארי פוטר", "קהילה", "ישראל", "lumos", "גריפינדור", "סלית'רין", "רייבנקלו", "הפלפאף"],
  authors: [{ name: "LUMOS IL" }],
  openGraph: {
    type: "website",
    locale: "he_IL",
    url: "https://lumos-il.co.il",
    siteName: "LUMOS IL",
    title: "LUMOS IL - קהילת הקוסמים של ישראל",
    description: "גביע הבתים, חדשות הנביא היומי ופעילויות קסומות.",
    images: [{ url: "/images/og-image.png", width: 1200, height: 630, alt: "LUMOS IL" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "LUMOS IL - קהילת הקוסמים של ישראל",
    description: "גביע הבתים, חדשות הנביא היומי ופעילויות קסומות.",
    images: ["/images/og-image.png"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${cinzel.variable} ${crimson.variable} scroll-smooth`}>
      <body className="antialiased bg-[#020617] text-[#f8fafc] font-assistant selection:bg-amber-500/30 flex flex-col min-h-screen">

        <AuthProvider>
          <UIProvider>
            <OwlMailProvider>

              {/* 🔥 חשוב – מפעיל את מערכת הנוכחות */}
              <MagicPresence />

              {/* מנועי רקע */}
              <BackgroundMusic />
              <MagicSpells />

              {/* Header */}
              <Header />

              <div className="pt-[100px] md:pt-[120px] flex flex-col flex-1 w-full relative">

                <MagicTicker />

                <main className="flex-1 relative z-10 w-full flex flex-col pt-16 md:pt-20">
                  {children}
                </main>

              </div>

              {/* Footer + UI */}
              <Footer />
              <HouseElfHelper />
              <CookieBanner />
              <CoolingRoomBanner />

            </OwlMailProvider>
          </UIProvider>
        </AuthProvider>

      </body>
    </html>
  );
}