"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Menu, X, Castle, MessageSquare, Flame, ScrollText, LogOut, Sparkles
} from "lucide-react";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();
    const supabase = createClient();

    // אפקט זיהוי גלילה כדי להפוך את ההאדר לשקוף/אטום
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // אם אנחנו בדף הבית (הכניסה), לא נציג את ההאדר בכלל כדי לא להרוס את מכתב הקבלה
    if (pathname === "/") return null;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
    };

    const navLinks = [
        { name: "הטירה", href: "/dashboard", icon: Castle },
        { name: "האולם הגדול", href: "/great-hall", icon: MessageSquare },
        { name: "משימות", href: "/quests", icon: ScrollText },
        { name: "אוליבנדר", href: "/ollivanders", icon: Flame },
    ];

    return (
        <header
            className={`fixed top-0 w-full z-50 transition-all duration-500 ${isScrolled
                    ? "bg-[#020617]/80 backdrop-blur-md border-b border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] py-3"
                    : "bg-transparent py-5"
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
                                className={`flex items-center gap-2 font-cinzel text-sm font-bold tracking-widest transition-all ${isActive
                                        ? "text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                                        : "text-white/60 hover:text-white"
                                    }`}
                            >
                                <link.icon size={16} className={isActive ? "text-amber-500" : "opacity-70"} />
                                {link.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* כפתור יציאה (דסקטופ) */}
                <button
                    onClick={handleLogout}
                    className="hidden md:flex items-center gap-2 font-cinzel text-xs font-bold uppercase tracking-widest text-red-400/80 hover:text-red-400 transition-colors border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 px-4 py-2 rounded-full"
                >
                    <LogOut size={14} />
                    התעתקות (יציאה)
                </button>

                {/* כפתור תפריט מובייל */}
                <button
                    className="md:hidden text-amber-500 hover:text-amber-300 transition-colors relative z-50"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={28} /> : <Menu size={28} />}
                </button>
            </div>

            {/* תפריט מובייל נפתח */}
            <div
                className={`fixed inset-0 bg-[#020617]/95 backdrop-blur-3xl z-40 transition-all duration-500 flex flex-col items-center justify-center gap-8 ${isOpen ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none -translate-y-10"
                    } md:hidden`}
            >
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
                    <LogOut size={20} />
                    התעתקות
                </button>
            </div>
        </header>
    );
}