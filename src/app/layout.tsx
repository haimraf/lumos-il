"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { Menu, X, Bell, User, LogOut, Sparkles, Flame, ScrollText, MessageSquare, Castle } from "lucide-react";
import "./globals.css";

/**
 * LUMOS IL - GLOBAL LAYOUT V6.5 (The Prestige Edition)
 * שדרוג: Header צף חכם (נעלם בדף נחיתה), תפריט מובייל משופר, ופוטר קולנועי.
 */

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const supabase = createClient();
  const pathname = usePathname();
  const router = useRouter();

  // בדיקת Session גלובלית
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase]);

  // אפקט גלילה להאדר השקוף
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // האם להציג Header/Footer? בדף הנחיתה (/) אנחנו מסתירים הכל כדי לשמור על קסם המעטפה
  const isAuthPage = pathname === "/";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsMobileMenuOpen(false);
    router.push("/");
  };

  const navLinks = [
    { name: "הטירה", href: "/dashboard", icon: Castle },
    { name: "האולם הגדול", href: "/great-hall", icon: MessageSquare },
    { name: "משימות", href: "/quests", icon: ScrollText },
    { name: "אוליבנדר", href: "/ollivanders", icon: Flame },
  ];

  return (
    <html lang="he" dir="rtl">
      <body className="antialiased bg-[#020617] text-[#f8fafc]">
        <div className="flex flex-col min-h-screen relative">

          {/* --- HEADER --- */}
          {!isAuthPage && (
            <header
              className={`fixed top-0 w-full z-[100] transition-all duration-500 ${isScrolled
                  ? "bg-[#020617]/80 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-2"
                  : "bg-gradient-to-b from-black/60 to-transparent py-6"
                }`}
            >
              <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">

                {/* לוגו */}
                <Link href={user ? "/dashboard" : "/"} className="group flex items-center gap-2 relative z-50">
                  <h2 className="font-cinzel text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all">
                    LUMOS<span className="opacity-80">IL</span>
                  </h2>
                  <Sparkles size={16} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>

                {/* ניווט Desktop */}
                <nav className="hidden md:flex items-center gap-8">
                  {navLinks.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.name}
                        href={link.href}
                        className={`flex items-center gap-2 font-cinzel text-[11px] font-bold tracking-[0.2em] transition-all ${isActive
                            ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                            : "text-white/60 hover:text-white"
                          }`}
                      >
                        <link.icon size={14} className={isActive ? "text-amber-500" : "opacity-50"} />
                        {link.name}
                      </Link>
                    );
                  })}
                </nav>

                {/* אזור משתמש */}
                <div className="flex items-center gap-4 relative z-50">
                  {user && (
                    <div className="hidden md:flex items-center gap-4">
                      <button className="p-2 text-white/40 hover:text-amber-500 transition-colors relative">
                        <Bell size={18} />
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 font-cinzel text-[10px] font-bold uppercase tracking-widest text-red-400/80 hover:text-red-400 transition-colors border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 px-4 py-2 rounded-full"
                      >
                        <LogOut size={12} /> יציאה
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden p-2 text-amber-500 hover:text-amber-300 transition-colors"
                  >
                    {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                  </button>
                </div>
              </div>

              {/* תפריט מובייל נפתח */}
              <div
                className={`fixed inset-0 bg-[#020617]/95 backdrop-blur-3xl z-40 transition-all duration-500 flex flex-col items-center justify-center gap-8 md:hidden ${isMobileMenuOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-10"
                  }`}
              >
                {navLinks.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-4 font-cinzel text-2xl font-black tracking-widest transition-all ${pathname === link.href ? "text-amber-400" : "text-white/60 hover:text-white"
                      }`}
                  >
                    <link.icon size={24} className={pathname === link.href ? "text-amber-500" : "opacity-50"} />
                    {link.name}
                  </Link>
                ))}

                {user && (
                  <>
                    <div className="w-32 h-px bg-white/10 my-4"></div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 font-cinzel text-lg font-bold tracking-widest text-red-400/80 hover:text-red-400 transition-colors"
                    >
                      <LogOut size={20} />
                      התעתקות
                    </button>
                  </>
                )}
              </div>
            </header>
          )}

          {/* --- MAIN CONTENT --- */}
          {/* אנחנו מורידים את ה-pt-20 מדף הבית כדי שהאנימציות שם לא יתקלקלו */}
          <main className={`flex-1 ${!isAuthPage ? "pt-24" : ""}`}>
            {children}
          </main>

          {/* --- FOOTER --- */}
          {!isAuthPage && (
            <footer className="relative mt-auto border-t border-white/5 bg-gradient-to-b from-transparent to-[#01030a] pt-16 pb-8 overflow-hidden">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-amber-600/5 blur-[100px] pointer-events-none"></div>

              <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
                <div className="text-center md:text-right">
                  <h2 className="font-cinzel text-2xl font-black tracking-[0.2em] text-white/90 drop-shadow-md">
                    LUMOS<span className="text-amber-500">IL</span>
                  </h2>
                  <p className="font-crimson text-white/40 italic text-sm mt-2 tracking-wide">
                    מפיצים את האור בקהילת הקוסמים בישראל
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-6 font-cinzel text-[10px] tracking-[0.2em] text-white/50 uppercase font-bold">
                  <Link href="/privacy" className="hover:text-amber-400 transition-colors">פרטיות</Link>
                  <Link href="/terms" className="hover:text-amber-400 transition-colors">תקנון</Link>
                  <a href="mailto:owls@lumos.co.il" className="hover:text-amber-400 transition-colors">דואר ינשופים</a>
                </div>

                <div className="flex flex-col items-center md:items-end gap-2 text-[10px] text-white/20 uppercase tracking-widest font-cinzel">
                  <p>© {new Date().getFullYear()} Studio Haim</p>
                  <p className="flex items-center gap-1 italic opacity-60"><Sparkles size={8} /> No affiliation with WB/Rowling</p>
                </div>
              </div>
            </footer>
          )}

        </div>
      </body>
    </html>
  );
}