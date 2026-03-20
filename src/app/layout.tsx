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
 * LUMOS IL - ROOT LAYOUT V3.0
 * שדרוג: סידור היררכיית גלילה נכונה וריווח דינמי מתחת להאדר.
 */

const assistant = Assistant({ subsets: ["hebrew", "latin"], variable: "--font-assistant", display: "swap" });
const cinzel = Cinzel({ subsets: ["latin"], variable: "--font-cinzel", display: "swap" });
const crimson = Crimson_Pro({ subsets: ["latin"], variable: "--font-crimson", display: "swap", style: "italic" });

export const metadata = {
  title: "LUMOS IL | הבית הדיגיטלי של קהילת הקוסמים",
  description: "קהילת ההארי פוטר הגדולה בישראל. בואו לעבור מיון לבתים ולגלות את עולם הקסמים.",
  openGraph: {
    title: "LUMOS IL - קהילת הקוסמים של ישראל",
    description: "גביע הבתים, חדשות הנביא היומי ופעילויות קסומות.",
    images: ['/images/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${cinzel.variable} ${crimson.variable} scroll-smooth`}>
      <body className="antialiased bg-[#020617] text-[#f8fafc] font-assistant selection:bg-amber-500/30 flex flex-col min-h-screen">
        <AuthProvider>
          <UIProvider>
            <OwlMailProvider>

              {/* מנועי רקע - רצים מאחורי הקלעים ואינם תופסים מקום במסך */}
              <MagicPresence />
              <BackgroundMusic />
              <MagicSpells />

              {/* ההאדר הצף (z-[10000]) */}
              <Header />

              {/* מעטפת התוכן המרכזי - נדחפת למטה כדי לא להיות מוסתרת על ידי ההאדר */}
              {/* מעטפת התוכן המרכזי */}
              <div className="pt-[100px] md:pt-[120px] flex flex-col flex-1 w-full relative">

                {/* סרגל החדשות והגביע */}
                <MagicTicker />

                {/* התיקון: הוספנו pt-16 md:pt-20 כדי לדחוף את התוכן מתחת לטיקר */}
                <main className="flex-1 relative z-10 w-full flex flex-col pt-16 md:pt-20">
                  {children}
                </main>

              </div>

              {/* פוטר ואלמנטים צפים */}
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