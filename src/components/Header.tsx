"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
    Menu, X, Castle, MessageSquare, Flame, ScrollText, LogOut, Sparkles, Bell, Zap, Volume2, VolumeX, Settings
} from "lucide-react";
import { useUIState } from "@/context/UIContext";

export default function Header() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { isMuted, toggleMute } = useUIState();

    useEffect(() => {
        const handleScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    useEffect(() => {
        const timer = setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
        return () => clearTimeout(timer);
    }, [pathname]);

    // האזנה ללחש "אלוהומורה" מתוך מקלדת הקסמים
    useEffect(() => {
        const handleAlohomora = () => setIsOpen(true);
        window.addEventListener("magic-alohomora", handleAlohomora);
        return () => window.removeEventListener("magic-alohomora", handleAlohomora);
    }, []);

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
        <>
            {/* ✨ הוספתי כאן את האנימציה: animate-in fade-in slide-in-from-top-8 ease-out duration-700 */}
            <header
                className={`fixed top-0 w-full z-[9999] transition-all duration-700 animate-in fade-in slide-in-from-top-8 ease-out ${isScrolled || isOpen
                    ? "bg-[#020617]/95 backdrop-blur-xl border-b border-amber-500/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)] py-3"
                    : "bg-gradient-to-b from-[#020617] via-[#020617]/80 to-transparent py-6"
                    }`}
                dir="rtl"
            >
                <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
                    <Link href="/dashboard" className="group flex items-center gap-3 relative z-[101]">
                        <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        <h2 className="font-cinzel text-2xl md:text-3xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-400 to-amber-600 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] transition-all relative">
                            LUMOS<span className="opacity-70 group-hover:opacity-100 transition-opacity">IL</span>
                        </h2>
                        <Sparkles size={16} className="text-amber-400 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </Link>

                    {/* ניווט רגיל - יוסתר כשהפורטל פתוח */}
                    <nav className={`hidden ${isOpen ? 'md:hidden' : 'md:flex'} items-center gap-2 relative z-[101]`}>
                        {navLinks.map((link) => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-cinzel text-[11px] font-bold tracking-[0.2em] transition-all duration-300 relative group/link ${isActive
                                        ? "text-amber-400 bg-amber-500/5"
                                        : "text-white/60 hover:text-white hover:bg-white/5"
                                        }`}
                                >
                                    <link.icon size={15} className={`${isActive ? "text-amber-500" : "opacity-50 group-hover/link:opacity-100 transition-opacity"}`} />
                                    {link.name}
                                    <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 h-[2px] bg-amber-500 shadow-[0_0_10px_#f59e0b] transition-all duration-300 rounded-full ${isActive ? 'w-2/3 opacity-100' : 'w-0 opacity-0 group-hover/link:w-1/3 group-hover/link:opacity-50'}`}></span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="flex flex-row-reverse md:flex-row items-center gap-4 relative z-[101]">
                        {/* התראות והתעתקות - יוסתרו במחשב כשהפורטל פתוח */}
                        <div className={`hidden ${isOpen ? 'md:hidden' : 'md:flex'} items-center gap-5`}>
                            <button onClick={toggleMute} className="p-2 text-white/40 hover:text-amber-400 transition-all hover:scale-110 outline-none" title={isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}>
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <button className="p-2 text-white/40 hover:text-amber-400 transition-all hover:scale-110 relative group outline-none" title="התראות">
                                <Bell size={20} className="group-hover:animate-wiggle" />
                                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping"></span>
                                <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full"></span>
                            </button>
                            <div className="h-6 w-px bg-white/10 mx-1"></div>
                            <button
                                onClick={handleLogout}
                                className="group flex items-center gap-2 font-cinzel text-[10px] font-black uppercase tracking-[0.2em] text-red-400/80 hover:text-red-400 transition-all border border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] px-5 py-2.5 rounded-xl active:scale-95 outline-none"
                            >
                                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" /> התעתקות
                            </button>
                        </div>

                        {/* תפריט מובייל (או מחשב אם נפתח באלוהומורה) */}
                        <div className={`flex items-center gap-2 ${!isOpen ? "md:hidden" : ""}`}>
                            <button onClick={toggleMute} className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all outline-none" aria-label="מוזיקת רקע">
                                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                            </button>
                            <button
                                className="p-2 text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all outline-none"
                                onClick={() => setIsOpen(!isOpen)}
                                aria-label="תפריט ניווט"
                            >
                                {isOpen ? <X size={28} className="animate-in spin-in-90 duration-300" /> : <Menu size={28} className="animate-in spin-in-[-90deg] duration-300" />}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* ✨ הפורטל הסודי! */}
            <div
                className={`fixed inset-0 pt-24 bg-[#020617] z-[9998] transition-all duration-500 flex flex-col items-center justify-start ${isOpen ? "opacity-100 pointer-events-auto scale-100" : "opacity-0 pointer-events-none scale-105"
                    }`}
                dir="rtl"
            >
                <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pointer-events-none"></div>

                <nav className="relative z-10 flex flex-col items-center gap-4 w-full px-6 overflow-y-auto pb-20">
                    {navLinks.map((link, i) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-center gap-5 w-full md:w-1/3 py-4 font-cinzel text-xl md:text-3xl font-black tracking-[0.2em] transition-all duration-500 rounded-2xl ${pathname === link.href
                                ? "text-amber-400 bg-amber-500/10 border border-amber-500/20 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                : "text-white/50 hover:text-white hover:bg-white/5"
                                }`}
                            style={{
                                transitionDelay: isOpen ? `${i * 50}ms` : '0ms',
                                transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                                opacity: isOpen ? 1 : 0
                            }}
                        >
                            <link.icon size={28} className={pathname === link.href ? "text-amber-500" : "opacity-40"} />
                            {link.name}
                        </Link>
                    ))}

                    <div className="w-1/2 md:w-1/4 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent my-4"></div>

                    <Link
                        href="/dashboard?tab=settings"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center justify-center gap-4 w-full md:w-1/3 py-4 font-cinzel text-lg md:text-2xl font-black tracking-[0.2em] transition-all duration-500 rounded-2xl ${pathname === '/dashboard' && typeof window !== 'undefined' && window.location.search.includes('tab=settings')
                            ? "text-amber-400 bg-amber-500/10 border border-amber-500/20 drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                            : "text-white/70 hover:text-white hover:bg-white/5"
                            }`}
                        style={{
                            transitionDelay: isOpen ? `${navLinks.length * 50}ms` : '0ms',
                            transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                            opacity: isOpen ? 1 : 0
                        }}
                    >
                        <Settings size={24} className="opacity-60" />
                        אזור אישי / הגדרות
                    </Link>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center gap-4 w-full md:w-1/3 font-cinzel text-lg md:text-2xl font-black tracking-[0.3em] text-red-500/80 hover:text-red-400 transition-colors bg-red-950/20 border border-red-900/30 px-10 py-4 rounded-2xl mt-2"
                        style={{
                            transitionDelay: isOpen ? `${(navLinks.length + 1) * 50}ms` : '0ms',
                            transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
                            opacity: isOpen ? 1 : 0
                        }}
                    >
                        <LogOut size={26} /> התעתקות
                    </button>
                </nav>
            </div>

            <style jsx global>{`
                @keyframes wiggle {
                    0%, 100% { transform: rotate(-3deg); }
                    50% { transform: rotate(3deg); }
                }
                .animate-wiggle {
                    animation: wiggle 0.3s ease-in-out infinite;
                }
            `}</style>
        </>
    );
}