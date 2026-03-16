import "./globals.css";
import { Assistant, Cinzel, Crimson_Pro } from "next/font/google"; // ייבוא הפונטים של גוגל
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { OwlMailProvider } from "@/components/OwlMail";
import MagicSpells from "@/components/MagicSpells";

// הגדרת פונט Assistant לעברית (גוף האתר)
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-assistant",
  display: "swap",
});

// הגדרת פונט Cinzel לכותרות אנגליות (הוגוורטס)
const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

// הגדרת פונט Crimson Pro לטקסט עתיק/איטלקי
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
          <MagicSpells />

          <div className="flex flex-col min-h-screen relative">
            <Header />
            <main className="flex-1 pt-24">
              {children}
            </main>
            <Footer />
          </div>

        </OwlMailProvider>
      </body>
    </html>
  );
}