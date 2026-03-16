"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Menu, X, Castle, MessageSquare, Flame, ScrollText, LogOut, Sparkles, Bell
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
        { name: "נביא היומי", href: "/news", icon: ScrollText },
        { name: "האולם הגדול", href: "/great-hall", icon: MessageSquare },
        { name: "משימות", href: "/quests", icon: ScrollText },
        { name: "אוליבנדר", href: "/ollivanders", icon: Flame },
    ];

    return (
        <header
            className={`fixed top-0 w-full z-[100] transition-all duration-500 ${isScrolled
                ? "bg-[#020617]/80 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-2"
                : "bg-gradient-to-b from-black/60 to-transparent py-6"
                }`}
            dir="rtl"
        >
            <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">

                {/* לוגו */}
                <Link href="/dashboard" className="group flex items-center gap-2 relative z-50">
                    <h2 className="font-cinzel text-2xl md:text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.6)] transition-all">
                        LUMOS<span className="opacity-80">IL</span>
                    </h2>
                    <Sparkles size={16} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>

                {/* ניווט דסקטופ */}
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

                {/* אזור פעולות ימני (דסקטופ + המבורגר) */}
                <div className="flex items-center gap-4 relative z-50">
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

                    <button
                        className="md:hidden text-amber-500 hover:text-amber-300 transition-colors"
                        onClick={() => setIsOpen(!isOpen)}
                    >
                        {isOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </div>

            {/* תפריט מובייל נפתח */}
            <div
                onClick={() => setIsOpen(false)} // סגירה בלחיצה על הרקע
                className={`fixed inset-0 bg-[#020617]/95 backdrop-blur-3xl z-40 transition-all duration-500 flex flex-col items-center justify-center gap-8 ${isOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-10"
                    } md:hidden`}
            >
                <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center gap-4 font-cinzel text-2xl font-black tracking-widest transition-all ${pathname === link.href ? "text-amber-400" : "text-white/60 hover:text-white"
                                }`}
                        >
                            <link.icon size={24} className={pathname === link.href ? "text-amber-500" : "opacity-50"} />
                            {link.name}
                        </Link>
                    ))}

                    <div className="w-32 h-px bg-white/10 my-4"></div>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 font-cinzel text-lg font-bold tracking-widest text-red-400/80 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={20} /> התעתקות
                    </button>
                </div>
            </div>
        </header>
    );
}