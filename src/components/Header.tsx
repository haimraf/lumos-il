"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Menu, X, Castle, MessageSquare, ScrollText, LogOut, Zap,
    Volume2, VolumeX, Settings, ChevronLeft, LayoutGrid, ShoppingBag,
    Flame, Coins, Sparkles, Library, Search, PlusCircle
} from "lucide-react";
import { useUIState } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import NotificationDropdown from "@/components/NotificationDropdown";
import MagicTicker from "@/components/MagicTicker";

const HOUSE_THEMES: Record<string, string> = {
    Gryffindor: 'shadow-red-500/20 border-red-500/30 text-red-500',
    Slytherin: 'shadow-emerald-500/20 border-emerald-500/30 text-emerald-500',
    Ravenclaw: 'shadow-blue-500/20 border-blue-500/30 text-blue-400',
    Hufflepuff: 'shadow-amber-500/20 border-amber-500/30 text-amber-500'
};

// CTA לפי עמוד
const PAGE_CTA: Record<string, { label: string; href: string }> = {
    '/library': { label: 'כתוב יצירה', href: '/library/create' },
    '/forums': { label: 'צור אשכול', href: '/forums/create' },
};

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const searchRef = useRef<HTMLInputElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { isMuted, toggleMute } = useUIState();
    const { profile } = useAuth();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    // נעילת גלילה
    useEffect(() => {
        if (isOpen) {
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } else {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        }
        return () => {
            document.documentElement.style.overflow = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // גלילה חלקה למעלה
    useEffect(() => {
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        return () => clearTimeout(timer);
    }, [pathname]);

    // לחש אלוהומורה
    useEffect(() => {
        const handleAlohomora = () => setIsOpen(true);
        window.addEventListener("magic-alohomora", handleAlohomora);
        return () => window.removeEventListener("magic-alohomora", handleAlohomora);
    }, []);

    // פוקוס על שדה חיפוש עם פתיחה
    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchRef.current?.focus(), 50);
        } else {
            setSearchQuery("");
        }
    }, [searchOpen]);

    // סגירת חיפוש עם Escape
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setSearchOpen(false);
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, []);

    if (pathname === "/") return null;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsOpen(false);
        router.push("/");
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
        }
    };

    const houseTheme = HOUSE_THEMES[profile?.house] || 'border-amber-500/20 text-amber-500';

    // CTA לפי עמוד נוכחי
    const currentCTA = Object.entries(PAGE_CTA).find(([path]) => pathname.startsWith(path))?.[1];

    const navLinks = [
        { name: "הטירה", href: "/dashboard", icon: Castle },
        { name: "מסדרונות", href: "/forums", icon: LayoutGrid },
        { name: "האולם הגדול", href: "/great-hall", icon: MessageSquare },
        { name: "דיאגון", href: "/shop", icon: ShoppingBag },
        { name: "אוליבנדר", href: "/ollivanders", icon: Flame },
        { name: "הנביא היומי", href: "/news", icon: ScrollText },
        { name: "משימות", href: "/quests", icon: Zap },
        { name: "ספרייה", href: "/library", icon: Library },
    ];

    return (
        <>
            <header
                className={`fixed top-0 w-full z-[500] transition-all duration-500 ${isOpen
                    ? "bg-[#020617] py-3 border-b border-amber-500/30"
                    : isScrolled
                        ? "bg-[#020617]/95 backdrop-blur-2xl border-b border-white/5 py-2 md:py-3 shadow-2xl"
                        : "bg-[#020617] py-4 md:py-6 border-b border-amber-500/10"
                    }`}
                dir="rtl"
            >
                {/* ✨ פס תאורה תחתי */}
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

                <div className="w-full max-w-[1440px] mx-auto px-3 md:px-10 flex items-center justify-between">

                    {/* קבוצה ימנית: לוגו + ניווט */}
                    <div className="flex items-center gap-6 xl:gap-12">

                        {/* לוגו */}
                        <div className="flex items-center shrink-0">
                            <Link href="/home" className="group relative transition-transform hover:scale-105 block">
                                <Image
                                    src="/logo.png"
                                    alt="Lumos IL Logo"
                                    width={220}
                                    height={220}
                                    className="h-[90px] md:h-[120px] w-auto object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                                    priority
                                />
                            </Link>
                        </div>

                        {/* ניווט דסקטופ */}
                        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 glass-panel p-1.5 rounded-2xl border border-white/10 bg-white/5">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`flex items-center gap-1.5 px-2 xl:px-3.5 py-2 rounded-xl font-cinzel text-[10px] font-bold tracking-widest uppercase transition-all duration-300 ${pathname === link.href
                                        ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                                        : "text-white/40 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <link.icon size={13} className={pathname === link.href ? "text-black" : "text-amber-500/40"} />
                                    <span className="hidden xl:inline">{link.name}</span>
                                </Link>
                            ))}
                        </nav>
                    </div>

                    {/* אגף שמאל */}
                    <div className="flex items-center gap-1.5 md:gap-3 relative">

                        {/* ✨ כפתור CTA זוהר - מופיע רק בעמודים רלוונטיים */}
                        {currentCTA && (
                            <Link
                                href={currentCTA.href}
                                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-cinzel font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_30px_rgba(245,158,11,0.5)] active:scale-95"
                            >
                                <PlusCircle size={14} />
                                {currentCTA.label}
                            </Link>
                        )}

                        {/* מד זהב */}
                        <div className={`flex items-center gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-xl bg-black/50 border ${houseTheme} shadow-lg transition-all shrink-0`}>
                            <Coins size={14} className="text-amber-500 md:w-4 md:h-4" />
                            <span className="font-cinzel font-black text-white text-[11px] md:text-sm">{profile?.galleons?.toLocaleString() || 0}</span>
                        </div>

                        {/* עוצם */}
                        <button
                            onClick={toggleMute}
                            className="p-1.5 md:p-2 text-white/30 hover:text-amber-400 transition-all shrink-0"
                        >
                            {isMuted
                                ? <VolumeX size={16} className="md:w-[18px] md:h-[18px]" />
                                : <Volume2 size={16} className="md:w-[18px] md:h-[18px]" />
                            }
                        </button>

                        {/* ✨ חיפוש */}
                        <div className="relative flex items-center shrink-0">
                            {searchOpen ? (
                                <form onSubmit={handleSearch} className="flex items-center gap-2">
                                    <input
                                        ref={searchRef}
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="חפש בטירה..."
                                        className="w-40 md:w-56 bg-white/8 border border-amber-500/30 rounded-xl px-4 py-2 text-white text-[13px] font-assistant outline-none placeholder:text-white/30 text-right transition-all"
                                        dir="rtl"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setSearchOpen(false)}
                                        className="p-1.5 text-white/30 hover:text-white transition-all"
                                    >
                                        <X size={16} />
                                    </button>
                                </form>
                            ) : (
                                <button
                                    onClick={() => setSearchOpen(true)}
                                    className="p-1.5 md:p-2 text-white/35 hover:text-amber-400 transition-all"
                                    title="חיפוש בטירה"
                                >
                                    <Search size={16} className="md:w-[18px] md:h-[18px]" />
                                </button>
                            )}
                        </div>

                        {/* התראות */}
                        <div className="relative shrink-0 flex items-center">
                            <NotificationDropdown />
                            <style jsx global>{`
                                .notification-dropdown-container {
                                    min-width: 320px !important;
                                    margin-left: -5px;
                                }
                            `}</style>
                        </div>

                        <div className="hidden md:block w-px h-6 bg-white/8 mx-1 shrink-0" />

                        {/* פרופיל דסקטופ */}
                        <Link href="/dashboard?tab=settings" className="relative group hidden md:block shrink-0">
                            <div className={`w-10 h-10 rounded-full border-2 ${houseTheme} overflow-hidden shadow-2xl transition-transform hover:scale-110`}>
                                <div className="w-full h-full bg-slate-900 flex items-center justify-center text-xl">
                                    {profile?.house === 'Gryffindor' ? "🦁"
                                        : profile?.house === 'Slytherin' ? "🐍"
                                            : profile?.house === 'Ravenclaw' ? "🦅"
                                                : "🦡"}
                                </div>
                            </div>
                        </Link>

                        {/* התעתקות דסקטופ */}
                        <button
                            onClick={handleLogout}
                            className="hidden md:flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-cinzel text-[10px] font-bold tracking-widest uppercase transition-all duration-300 border border-red-500/10 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 shrink-0 ml-1"
                            title="התעתקות מהטירה"
                        >
                            <LogOut size={14} />
                            <span className="hidden xl:inline">התעתקות</span>
                        </button>

                        {/* המבורגר מובייל */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="lg:hidden p-1.5 md:p-3 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg transition-all relative z-[10001] active:scale-95 shadow-lg shrink-0 flex items-center justify-center"
                            aria-label="פתח תפריט"
                        >
                            {isOpen
                                ? <X size={20} className="md:w-6 md:h-6" />
                                : <Menu size={20} className="md:w-6 md:h-6" />
                            }
                        </button>
                    </div>
                </div>
                {pathname !== '/' && <MagicTicker />}
            </header>

            {/* תפריט מובייל מלא */}
            <div
                className={`fixed inset-0 z-[9999] bg-[#020617] transition-all duration-500 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"
                    }`}
                dir="rtl"
                style={{ height: '100dvh' }}
            >
                <div className="font-cinzel text-white/[0.02] text-[18vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none font-black z-0">
                    LUMOS
                </div>

                <nav className="relative z-10 flex flex-col items-center gap-1 w-full px-10 pt-28 pb-32 min-h-max">

                    {/* CTA במובייל */}
                    {currentCTA && (
                        <Link
                            href={currentCTA.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 w-full justify-center py-4 px-8 mb-4 rounded-2xl bg-amber-500 text-amber-950 font-cinzel font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                        >
                            <PlusCircle size={22} />
                            {currentCTA.label}
                        </Link>
                    )}

                    {/* חיפוש במובייל */}
                    <form onSubmit={handleSearch} className="w-full mb-4">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                            <Search size={18} className="text-amber-500/50 shrink-0" />
                            <input
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="חפש בטירה..."
                                className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-white/25 text-right font-assistant"
                                dir="rtl"
                            />
                        </div>
                    </form>

                    {navLinks.map((link, i) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-6 text-2xl font-cinzel font-black text-white/50 hover:text-amber-500 transition-all uppercase tracking-[0.1em] py-4 w-full justify-center group border-b border-white/5 last:border-0"
                            style={{ transitionDelay: isOpen ? `${i * 30}ms` : '0ms' }}
                        >
                            <link.icon size={20} className="text-amber-500/40 group-hover:text-amber-500 transition-colors" />
                            {link.name}
                        </Link>
                    ))}

                    <div className="w-1/2 h-px bg-white/10 my-8" />

                    <Link
                        href="/dashboard?tab=settings"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-4 text-xl font-cinzel font-bold text-white/40 hover:text-white transition-all uppercase justify-center mb-6"
                    >
                        <Settings size={18} className="text-amber-500/50" /> הגדרות חשבון
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 text-red-500 font-cinzel font-black tracking-[0.2em] uppercase py-4 px-12 border border-red-500/20 rounded-2xl bg-red-950/20 active:scale-95 shadow-lg w-full justify-center mb-10"
                    >
                        <LogOut size={20} /> התעתקות
                    </button>
                </nav>
            </div>
        </>
    );
}