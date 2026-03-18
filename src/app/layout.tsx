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
  openGraph: {
    title: "LUMOS IL - קהילת הקוסמים של ישראל",
    description: "גביע הבתים, חדשות הנביא היומי ופעילויות קסומות.",
    images: ['/images/og-image.png'], // תמונה שתופיע בשיתופים
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.lumos-il.co.il/#website",
        "url": "https://www.lumos-il.co.il",
        "name": "לומוס IL - קהילת הארי פוטר הישראלית",
        "description": "הבית הדיגיטלי הרשמי למעריצי הארי פוטר בישראל. גביע הבתים, חדשות הנביא היומי וקהילה קסומה.",
        "publisher": { "@id": "https://www.lumos-il.co.il/#organization" },
        "inLanguage": "he-IL"
      },
      {
        "@type": "Organization",
        "@id": "https://www.lumos-il.co.il/#organization",
        "name": "לומוס IL",
        "url": "https://www.lumos-il.co.il",
        "logo": {
          "@type": "ImageObject",
          "url": "https://www.lumos-il.co.il/images/logo.png"
        },
        "sameAs": [
          "https://www.facebook.com/groups/lumosil"
        ],
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer support",
          "email": "admin@lumos-il.co.il",
          "availableLanguage": "Hebrew"
        }
      }
    ]
  };

  return (
    <html lang="he" dir="rtl" className={`${assistant.variable} ${cinzel.variable} ${crimson.variable} scroll-smooth`}>
      <head>
        {/* תג אימות Google Search Console */}
        <meta name="google-site-verification" content="f0JJtqq026fd7gIfYbuVC6IPDvvnl8e0R2FFpRkWFNQ" />

        {/* PWA: הגדרות לאייפון ואנדרואיד */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Lumos" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="theme-color" content="#020617" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased bg-[#020617] text-[#f8fafc] font-assistant selection:bg-amber-500/30">
        <UIProvider>
          <OwlMailProvider>
            <BackgroundMusic />
            <MagicSpells />

            <div className="flex flex-col min-h-screen relative overflow-x-hidden">
              {/* אפקט עומק לרקע - שיפור ויזואלי */}
              <div className="fixed inset-0 bg-[url('/images/noise.png')] opacity-[0.03] pointer-events-none" />
              <div className="fixed inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />

              <Header />

              <div className="mt-20">
                <MagicTicker />
              </div>

              <main className="flex-1 pt-12 relative z-10">
                {children}
              </main>

              <Footer />

              <HouseElfHelper />
            </div>

            <CookieBanner />
          </OwlMailProvider>
        </UIProvider>
      </body>
    </html>
  );
}