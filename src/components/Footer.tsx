"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Mail, Shield, BookOpen, Feather, Map, Wand2, ScrollText, Zap, ArrowUp } from "lucide-react";

/**
 * LUMOS IL - OFFICIAL FOOTER V2.0.0-GOLD (The Inclusive Update)
 */

export default function Footer() {
    const pathname = usePathname();

    // אין צורך בפוטר בדף הבית
    if (pathname === "/") return null;

    // לחש חזרה למעלה
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <footer className="relative mt-32 border-t border-amber-500/30 bg-[#02040f] pt-24 pb-12 overflow-hidden" dir="rtl">

            {/* הילת קסם עמוקה */}
            <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-full h-[500px] bg-amber-600/10 blur-[150px] pointer-events-none animate-pulse"></div>
            <div className="absolute inset-0 opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none"></div>

            {/* קו מפריד עם ניצוץ מסתובב */}
            <div className="absolute top-0 left-0 w-full flex items-center justify-center -translate-y-1/2">
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
                <div className="bg-[#02040f] p-3 border border-amber-500/40 rounded-full mx-4 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                    <Sparkles size={24} className="text-amber-400 animate-[spin_6s_linear_infinite]" />
                </div>
                <div className="h-[2px] w-full bg-gradient-to-l from-transparent via-amber-500/40 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20 text-center md:text-right">

                    {/* עמודה 1: המותג */}
                    <div className="space-y-6 flex flex-col items-center md:items-start">
                        <Link href="/dashboard" className="inline-block group">
                            <h2 className="font-cinzel text-5xl md:text-6xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:from-amber-100 group-hover:to-amber-500 transition-all duration-700">
                                LUMOS<span className="text-amber-500 group-hover:text-amber-300 transition-colors">IL</span>
                            </h2>
                        </Link>
                        <p className="font-crimson text-white/80 text-xl leading-relaxed max-w-sm font-bold">
                            הבית הדיגיטלי האינטראקטיבי של קהילת הקוסמים בישראל. <br />
                            <span className="italic text-amber-500/80 tracking-tight">נא לא לשכוח לכבות את האור ביציאה.</span>
                        </p>
                    </div>

                    {/* עמודה 2: ניווט א-מגדרי */}
                    <div className="flex flex-col items-center md:items-start space-y-6">
                        <h3 className="font-cinzel text-amber-500 font-black text-sm tracking-[0.3em] uppercase border-b border-amber-500/20 pb-2 w-max">משרד הקסמים</h3>
                        <nav className="flex flex-col space-y-4 w-full items-center md:items-start">
                            <FooterLink href="/news" icon={ScrollText} label="הנביא היומי" />
                            <FooterLink href="/about" icon={BookOpen} label="אודות הטירה" />
                            <FooterLink href="/rules" icon={Shield} label="חוקי הקהילה" />
                            <FooterLink href="/map" icon={Map} label="מפת הקונדסאים" />
                        </nav>
                    </div>

                    {/* עמודה 3: תקשורת */}
                    <div className="flex flex-col items-center md:items-start space-y-6 text-white">
                        <h3 className="font-cinzel text-amber-500 font-black text-sm tracking-[0.3em] uppercase border-b border-amber-500/20 pb-2 w-max">ינשופים</h3>
                        <p className="font-crimson text-xl font-bold leading-tight max-w-[250px] text-center md:text-right">יש לכם שאלה? שליחת ינשוף תענה בלחש חוזר בהקדם.</p>
                        <a href="mailto:owls@lumos-il.com" className="group flex items-center gap-4 bg-gradient-to-r from-amber-600 to-amber-500 text-black px-8 py-4 rounded-2xl font-cinzel font-black text-sm uppercase tracking-widest shadow-[0_10px_30px_rgba(245,158,11,0.2)] hover:shadow-[0_15px_40px_rgba(245,158,11,0.4)] hover:-translate-y-1 transition-all duration-300 active:scale-95">
                            <Feather size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform duration-300" />
                            דואר ינשופים
                        </a>
                    </div>
                </div>

                {/* פס תחתון */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-amber-900/40 w-full relative">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-right w-full">
                        <p className="font-crimson text-white/40 text-lg font-bold">© 2026 LUMOS IL. כל הזכויות שמורות למשרד הקסמים הישראלי.</p>

                        {/* תג גרסה חגיגי */}
                        <div className="flex items-center gap-3 px-4 py-2 bg-amber-950/40 border border-amber-500/30 text-amber-400 rounded-lg text-xs font-cinzel font-black tracking-[0.2em] shadow-[0_0_15px_rgba(245,158,11,0.1)] hover:bg-amber-900/60 transition-colors cursor-default">
                            <Zap size={14} className="fill-amber-400 animate-pulse" />
                            RELEASE v2.0.0-GOLD
                        </div>
                    </div>

                    {/* כפתור חזרה למעלה */}
                    <button
                        onClick={scrollToTop}
                        className="group flex items-center justify-center w-12 h-12 bg-white/5 border border-white/10 rounded-full hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-300 shrink-0"
                        title="Ascendio! (חזרה למעלה)"
                    >
                        <ArrowUp size={20} className="text-white/50 group-hover:text-amber-400 group-hover:-translate-y-1 transition-all duration-300" />
                    </button>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, icon: Icon, label }: { href: string, icon: any, label: string }) {
    return (
        <Link href={href} className="group flex items-center gap-4 text-white hover:text-amber-400 transition-all duration-300">
            <div className="p-2.5 bg-white/5 rounded-xl border border-white/10 group-hover:border-amber-500/40 group-hover:bg-amber-500/10 transition-all duration-300 shadow-lg">
                <Icon size={18} className="text-white/40 group-hover:text-amber-400 transition-colors duration-300" />
            </div>
            <span className="font-cinzel text-[15px] font-bold tracking-wider uppercase relative overflow-hidden pb-1">
                {label}
                {/* קו תחתון קסום ב-Hover */}
                <span className="absolute bottom-0 right-0 w-full h-[2px] bg-amber-500 -translate-x-[101%] group-hover:translate-x-0 transition-transform duration-300 ease-out"></span>
            </span>
        </Link>
    );
}