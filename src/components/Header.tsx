"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Menu, X, Castle, MessageSquare, ScrollText, LogOut, Zap,
    Volume2, VolumeX, Settings, ChevronLeft, LayoutGrid, ShoppingBag,
    Flame, Coins, Sparkles, Library, Search, PlusCircle, LogIn,
    User, ChevronDown, Shield
} from "lucide-react";
import { useUIState } from "@/context/UIContext";
import { useAuth } from "@/context/AuthContext";
import { getRoleColor, getRoleColorFromDB } from "@/lib/roleColor";
import NotificationDropdown from "@/components/NotificationDropdown";
import MagicTicker from "@/components/MagicTicker";

const HOUSE_THEMES: Record<string, string> = {
    Gryffindor: 'shadow-red-500/20 border-red-500/30 text-red-500',
    Slytherin: 'shadow-emerald-500/20 border-emerald-500/30 text-emerald-500',
    Ravenclaw: 'shadow-blue-500/20 border-blue-500/30 text-blue-400',
    Hufflepuff: 'shadow-amber-500/20 border-amber-500/30 text-amber-500'
};

const PAGE_CTA: Record<string, { label: string; href: string }> = {
    '/library': { label: 'כתוב יצירה', href: '/library/create' },
    '/forums': { label: 'צור אשכול', href: '/forums/create' },
};

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);
    const avatarMenuRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { isMuted, toggleMute } = useUIState();

    // שליפת הפרופיל מהקונטקסט (אם אין פרופיל, סימן שזה אורח)
    const { profile } = useAuth();
    const isGuest = !profile;

    const [nameColor, setNameColor] = useState<string>("rgba(255,255,255,0.85)");
    useEffect(() => {
        if (!profile) return;
        (async () => {
            // אם יש group_id — קח ישירות את צבע הקבוצה
            if ((profile as any).group_id) {
                const { data } = await supabase
                    .from("user_groups")
                    .select("color")
                    .eq("id", (profile as any).group_id)
                    .single();
                if (data?.color) { setNameColor(data.color); return; }
            }
            // fallback — roleColors לפי שם דרגה
            const map = await getRoleColorFromDB(supabase);
            setNameColor(getRoleColor(profile.role, profile.house, map));
        })();
    }, [profile?.id, supabase]);

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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

    useEffect(() => {
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        return () => clearTimeout(timer);
    }, [pathname]);

    useEffect(() => {
        const handleAlohomora = () => setIsOpen(true);
        window.addEventListener("magic-alohomora", handleAlohomora);
        return () => window.removeEventListener("magic-alohomora", handleAlohomora);
    }, []);

    useEffect(() => {
        if (searchOpen) {
            setTimeout(() => searchRef.current?.focus(), 50);
        } else {
            setSearchQuery("");
        }
    }, [searchOpen]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") { setSearchOpen(false); setAvatarMenuOpen(false); }
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
                setAvatarMenuOpen(false);
            }
        };
        if (avatarMenuOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [avatarMenuOpen]);

    if (pathname === "/") return null;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        sessionStorage.clear();
        document.cookie.split(";").forEach((c) => {
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        setIsOpen(false);
        window.location.href = "/";
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
        }
    };

    const houseTheme = HOUSE_THEMES[profile?.house] || 'border-amber-500/20 text-amber-500';
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
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent pointer-events-none" />

                <div className="w-full max-w-[1440px] mx-auto px-3 md:px-10 flex items-center justify-between">
                    <div className="flex items-center gap-6 xl:gap-12">
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

                    {/* ══ צד ימין: [Galleons] [🔔] [Avatar▼] [☰] ══ */}
                    <div className="flex items-center gap-2 md:gap-3">

                        {isGuest ? (
                            <Link href="/" className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-cinzel font-black text-[10px] tracking-widest uppercase transition-all shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
                                <LogIn size={13} /> להתחברות
                            </Link>
                        ) : (
                            <>
                                {/* Galleons */}
                                <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/50 border ${houseTheme} shadow-lg shrink-0`}>
                                    <Coins size={13} className="text-amber-500" />
                                    <span className="font-cinzel font-black text-white text-[11px]">{profile?.galleons?.toLocaleString() || 0}</span>
                                </div>

                                {/* Notifications */}
                                <div className="relative shrink-0 flex items-center">
                                    <NotificationDropdown />
                                    <style jsx global>{`.notification-dropdown-container { min-width: 320px !important; }`}</style>
                                </div>

                                {/* Avatar + Dropdown — כל האייקונים בפנים */}
                                <div className="relative hidden md:block shrink-0" ref={avatarMenuRef}>
                                    <button
                                        onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                                        className="flex items-center gap-1.5 group"
                                        aria-label="תפריט משתמש"
                                    >
                                        <div className={`w-9 h-9 rounded-full border-2 ${houseTheme} overflow-hidden shadow-2xl transition-transform group-hover:scale-105`}>
                                            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-lg">
                                                {profile?.avatar_url
                                                    ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                                    : profile?.house === 'Gryffindor' ? "🦁" : profile?.house === 'Slytherin' ? "🐍" : profile?.house === 'Ravenclaw' ? "🦅" : "🦡"
                                                }
                                            </div>
                                        </div>
                                        <ChevronDown size={11} className={`text-white/30 transition-transform duration-200 ${avatarMenuOpen ? "rotate-180" : ""}`} />
                                    </button>

                                    {avatarMenuOpen && (
                                        <div
                                            className="absolute right-0 top-[calc(100%+12px)] w-72 max-w-[calc(100vw-1.5rem)] bg-[#070d1a] backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[600] overflow-hidden"
                                            dir="rtl"
                                            style={{ animation: "avatarMenuIn 0.18s cubic-bezier(0.22,1,0.36,1) forwards" }}
                                        >
                                            <style>{`
                                                @keyframes avatarMenuIn {
                                                    from { opacity: 0; transform: translateY(-8px) scale(0.96); }
                                                    to   { opacity: 1; transform: translateY(0) scale(1); }
                                                }
                                            `}</style>

                                            {/* ── User info ── */}
                                            <div className="px-5 py-4 border-b border-white/[0.07] flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full border ${houseTheme} overflow-hidden shrink-0 flex items-center justify-center text-lg`}
                                                    style={{ background: "rgba(255,255,255,0.04)" }}>
                                                    {profile?.avatar_url
                                                        ? <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                                                        : profile?.house === 'Gryffindor' ? "🦁" : profile?.house === 'Slytherin' ? "🐍" : profile?.house === 'Ravenclaw' ? "🦅" : "🦡"
                                                    }
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-assistant font-bold text-sm truncate" style={{ color: nameColor }}>{profile?.full_name}</p>
                                                    <p className="font-assistant text-xs text-white/35 mt-0.5">
                                                        {profile?.house === 'Gryffindor' ? "גריפינדור" : profile?.house === 'Slytherin' ? "סלית'רין" : profile?.house === 'Ravenclaw' ? "רייבנקלו" : "הפלפאף"}
                                                        {profile?.year ? ` · שנה ${profile.year}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* ── Search ── */}
                                            <div className="px-3 pt-2.5 pb-1 border-b border-white/[0.07]">
                                                <button
                                                    onClick={() => { setAvatarMenuOpen(false); setSearchOpen(true); }}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/45 hover:text-white hover:bg-white/[0.05] transition-colors text-right"
                                                >
                                                    <Search size={15} className="text-white/25 shrink-0" />
                                                    <span className="font-assistant text-sm">חיפוש בטירה...</span>
                                                </button>
                                            </div>

                                            {/* ── CTA (אם רלוונטי לדף הנוכחי) ── */}
                                            {currentCTA && (
                                                <div className="px-3 py-1 border-b border-white/[0.07]">
                                                    <Link
                                                        href={currentCTA.href}
                                                        onClick={() => setAvatarMenuOpen(false)}
                                                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-amber-400/80 hover:text-amber-300 hover:bg-amber-500/[0.07] transition-colors"
                                                    >
                                                        <PlusCircle size={15} className="shrink-0" />
                                                        <span className="font-assistant text-sm font-semibold">{currentCTA.label}</span>
                                                    </Link>
                                                </div>
                                            )}

                                            {/* ── Mute toggle ── */}
                                            <div className="px-3 py-1 border-b border-white/[0.07]">
                                                <button
                                                    onClick={toggleMute}
                                                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-white/45 hover:text-white hover:bg-white/[0.05] transition-colors"
                                                >
                                                    {isMuted
                                                        ? <VolumeX size={15} className="text-white/25 shrink-0" />
                                                        : <Volume2 size={15} className="text-amber-500/50 shrink-0" />
                                                    }
                                                    <span className="font-assistant text-sm">{isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}</span>
                                                </button>
                                            </div>

                                            {/* ── ניווט ── */}
                                            <div className="py-1.5">
                                                {[
                                                    { href: `/wizard/${profile?.id}`, icon: User, label: "הפרופיל שלי" },
                                                    { href: "/dashboard", icon: Castle, label: "הטירה שלי" },
                                                    { href: "/dashboard?tab=settings", icon: Settings, label: "הגדרות" },
                                                    ...(profile?.role === "מנהל" ? [{ href: "/admin-panel", icon: Shield, label: "לוח הבקרה" }] : []),
                                                ].map(({ href, icon: Icon, label }) => (
                                                    <Link key={href} href={href}
                                                        onClick={() => setAvatarMenuOpen(false)}
                                                        className="flex items-center gap-3 px-5 py-2.5 text-white/55 hover:text-white hover:bg-white/[0.05] transition-colors group">
                                                        <Icon size={15} className="text-white/25 group-hover:text-white/60 shrink-0 transition-colors" />
                                                        <span className="font-assistant text-sm font-medium">{label}</span>
                                                    </Link>
                                                ))}
                                            </div>

                                            {/* ── Logout ── */}
                                            <div className="border-t border-white/[0.07] py-1.5">
                                                <button
                                                    onClick={() => { setAvatarMenuOpen(false); handleLogout(); }}
                                                    className="flex items-center gap-3 px-5 py-2.5 w-full text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.07] transition-colors group"
                                                >
                                                    <LogOut size={15} className="shrink-0 transition-colors" />
                                                    <span className="font-assistant text-sm font-medium">התעתקות</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* Hamburger — mobile/tablet */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="lg:hidden p-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg transition-all relative z-[10001] active:scale-95 shadow-lg shrink-0 flex items-center justify-center"
                        >
                            {isOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
                {pathname !== '/' && <MagicTicker />}
            </header>

            {/* Search overlay — fixed, לא משפיע על layout ההאדר */}
            {searchOpen && (
                <div
                    className="fixed inset-0 z-[700] flex items-start justify-center"
                    style={{ background: "rgba(2,6,23,0.7)", backdropFilter: "blur(8px)", paddingTop: "80px" }}
                    onClick={() => setSearchOpen(false)}
                >
                    <div
                        className="w-full max-w-xl mx-4"
                        onClick={e => e.stopPropagation()}
                        style={{ animation: "avatarMenuIn 0.18s cubic-bezier(0.22,1,0.36,1) forwards" }}
                    >
                        <form onSubmit={handleSearch} className="flex items-center gap-3 bg-[#070d1a] border border-amber-500/30 rounded-2xl px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)]" dir="rtl">
                            <Search size={18} className="text-amber-500/60 shrink-0" />
                            <input
                                ref={searchRef}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="חפש בטירה..."
                                className="flex-1 bg-transparent text-white text-base outline-none placeholder:text-white/30 font-assistant text-right"
                                dir="rtl"
                            />
                            <button type="button" onClick={() => setSearchOpen(false)} className="p-1 text-white/30 hover:text-white transition-all shrink-0">
                                <X size={18} />
                            </button>
                        </form>
                        <p className="text-center text-white/20 text-xs mt-3 font-cinzel tracking-widest">ESC לסגירה</p>
                    </div>
                </div>
            )}

            <div className={`fixed inset-0 z-[9999] bg-[#020617] transition-all duration-500 flex flex-col items-center justify-start overflow-y-auto overflow-x-hidden ${isOpen ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full pointer-events-none"}`} dir="rtl" style={{ height: '100dvh' }}>
                <div className="font-cinzel text-white/[0.02] text-[18vw] fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none font-black z-0">LUMOS</div>

                <nav className="relative z-10 flex flex-col items-center gap-1 w-full px-10 pt-28 pb-32 min-h-max">
                    {currentCTA && !isGuest && (
                        <Link href={currentCTA.href} onClick={() => setIsOpen(false)} className="flex items-center gap-3 w-full justify-center py-4 px-8 mb-4 rounded-2xl bg-amber-500 text-amber-950 font-cinzel font-black text-lg uppercase tracking-widest shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                            <PlusCircle size={22} /> {currentCTA.label}
                        </Link>
                    )}

                    <form onSubmit={handleSearch} className="w-full mb-4">
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-5 py-4">
                            <Search size={18} className="text-amber-500/50 shrink-0" />
                            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="חפש בטירה..." className="flex-1 bg-transparent text-white text-lg outline-none placeholder:text-white/25 text-right font-assistant" dir="rtl" />
                        </div>
                    </form>

                    {navLinks.map((link, i) => (
                        <Link key={link.name} href={link.href} onClick={() => setIsOpen(false)} className="flex items-center gap-6 text-2xl font-cinzel font-black text-white/50 hover:text-amber-500 transition-all uppercase tracking-[0.1em] py-4 w-full justify-center group border-b border-white/5 last:border-0" style={{ transitionDelay: isOpen ? `${i * 30}ms` : '0ms' }}>
                            <link.icon size={20} className="text-amber-500/40 group-hover:text-amber-500 transition-colors" /> {link.name}
                        </Link>
                    ))}

                    <div className="w-1/2 h-px bg-white/10 my-8" />

                    {isGuest ? (
                        <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-4 text-amber-950 font-cinzel font-black tracking-[0.2em] uppercase py-4 px-12 rounded-2xl bg-amber-500 active:scale-95 shadow-lg w-full justify-center mb-10">
                            להתחברות לשערי הטירה
                        </Link>
                    ) : (
                        <>
                            <Link href="/dashboard?tab=settings" onClick={() => setIsOpen(false)} className="flex items-center gap-4 text-xl font-cinzel font-bold text-white/40 hover:text-white transition-all uppercase justify-center mb-6">
                                <Settings size={18} className="text-amber-500/50" /> הגדרות חשבון
                            </Link>

                            <button onClick={handleLogout} className="flex items-center gap-4 text-red-500 font-cinzel font-black tracking-[0.2em] uppercase py-4 px-12 border border-red-500/20 rounded-2xl bg-red-950/20 active:scale-95 shadow-lg w-full justify-center mb-10">
                                <LogOut size={20} /> התעתקות
                            </button>
                        </>
                    )}
                </nav>
            </div>
        </>
    );
}