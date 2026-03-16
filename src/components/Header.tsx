"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Menu, X, Castle, MessageSquare, Flame, ScrollText, LogOut, Sparkles, Bell, Zap
} from "lucide-react";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();

    // אפקט זיהוי גלילה
    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // נעילת גלילה כשתפריט מובייל פתוח
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    // לא מציגים האדר בדף הנחיתה
    if (pathname === "/") return null;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        router.push("/");
    };

    const navLinks = [
        { name: "הטירה", href: "/dashboard", icon: Castle },
        { name: "הנביא היומי", href: "/news", icon: ScrollText },
        { name: "האולם הגדול", href: "/great-hall", icon: MessageSquare },
        { name: "לוח משימות", href: "/quests", icon: Zap },
        { name: "אוליבנדר", href: "/ollivanders", icon: Flame },
    ];

    return (
        <header
            className={`fixed top-0 w-full z-[100] transition-all duration-700 ${isScrolled
                ? "bg-[#020617]/85 backdrop-blur-xl border-b border-amber-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.6)] py-3"
                : "bg-gradient-to-b from-[#020617]/80 to-transparent py-7"
                }`}
            dir="rtl"
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* לוגו עם הילה */}
                <Link href="/dashboard" className="group flex items-center gap-3 relative z-50">
                    <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <h2 className="font-cinzel text-2xl md:text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all relative">
                        LUMOS<span className="opacity-70">IL</span>
                    </h2>
                    <Sparkles size={16} className="text-amber-400 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>

                {/* ניווט דסקטופ - שפה א-מגדרית */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;
                        return (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-cinzel text-[10px] font-bold tracking-[0.2em] transition-all duration-300 relative group/link ${isActive
                                    ? "text-amber-400 bg-white/5"
                                    : "text-white/50 hover:text-white"
                                    }`}
                            >
                                <link.icon size={14} className={`${isActive ? "text-amber-500" : "opacity-40 group-hover/link:opacity-100 transition-opacity"}`} />
                                {link.name}
                                {isActive && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-amber-500 shadow-[0_0_10px_#f59e0b]"></span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* אזור פעולות (דסקטופ + המבורגר) */}
                <div className="flex items-center gap-4 relative z-50">
                    <div className="hidden md:flex items-center gap-5">
                        <button className="p-2 text-white/30 hover:text-amber-400 transition-all hover:scale-110 relative group">
                            <Bell size={18} />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        </button>

                        <div className="h-6 w-px bg-white/10 mx-1"></div>

                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 font-cinzel text-[9px] font-black uppercase tracking-[0.2em] text-red-400/70 hover:text-red-400 transition-all border border-red-500/10 hover:border-red-500/40 hover:bg-red-500/5 px-5 py-2.5 rounded-xl active:scale-95"
                        >
                            <LogOut size={12} /> התעתקות
                        </button>
                    </div>

                    {/* כפתור המבורגר מעוצב */}
                    <button
                        className="md:hidden p-2 text-amber-500 hover:bg-white/5 rounded-lg transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={30} /> : <Menu size={30} />}
                    </button>
                </div>
            </div>

            {/* תפריט מובייל - Full Screen Magic */}
            <div
                className={`fixed inset-0 bg-[#020617]/98 backdrop-blur-2xl z-40 transition-all duration-700 flex flex-col items-center justify-center gap-12 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none translate-x-full"
                    } md:hidden`}
            >
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pointer-events-none"></div>

                <nav className="relative z-10 flex flex-col items-center gap-10">
                    {navLinks.map((link, i) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-5 font-cinzel text-3xl font-black tracking-[0.3em] transition-all duration-500 ${pathname === link.href
                                ? "text-amber-400 scale-110 drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                                : "text-white/40 hover:text-white"
                                }`}
                            style={{ transitionDelay: `${i * 100}ms` }}
                        >
                            <link.icon size={28} className={pathname === link.href ? "text-amber-500" : "opacity-30"} />
                            {link.name}
                        </Link>
                    ))}

                    <div className="w-40 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent my-6"></div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 font-cinzel text-xl font-black tracking-[0.3em] text-red-500/80 hover:text-red-400 transition-colors animate-pulse"
                    >
                        <LogOut size={24} /> התעתקות
                    </button>
                </nav>
            </div>
        </header>
    );
}