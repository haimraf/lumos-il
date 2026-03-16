import "./globals.css";
import { Assistant, Cinzel, Crimson_Pro } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OwlMailProvider } from "@/components/OwlMail";
import MagicSpells from "@/components/MagicSpells";
import CookieBanner from "@/components/CookieBanner";
import MagicTicker from "@/components/MagicTicker"; // המרצד החדש
import HouseElfHelper from "@/components/HouseElfHelper"; // גמד הבית

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const crimson = Crimson_Pro({
  subsets: ["latin"],
  variable: "--font-crimson",
  display: "swap",
  style: "italic",
});

export const metadata = {
  title: "LUMOS IL | הבית הדיגיטלי של קהילת הקוסמים",
  description: "קהילת ההארי פוטר הגדולה והאיכותית בישראל. בואו לעבור מיון לבתים ולגלות את עולם הקסמים.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${cinzel.variable} ${crimson.variable}`}>
      <body className="antialiased bg-[#020617] text-[#f8fafc] font-assistant">
        <OwlMailProvider>
          {/* מערכת הלחשים הגלובלית */}
          <MagicSpells />

          <div className="flex flex-col min-h-screen relative">
            {/* התפריט העליון */}
            <Header />

            {/* המרצד - מופיע מתחת לתפריט ורץ לאורך כל האתר */}
            <div className="mt-20">
              <MagicTicker />
            </div>

            <main className="flex-1 pt-12">
              {children}
            </main>

            <Footer />

            {/* גמד הבית העוזר - מופיע בפינה התחתונה מעל לטיקר */}
            <HouseElfHelper />
          </div>

          <CookieBanner />
        </OwlMailProvider>
      </body>
    </html>
  );
}