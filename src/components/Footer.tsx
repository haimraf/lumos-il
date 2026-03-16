"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Mail, Shield, BookOpen, Feather, Map, Wand2, ScrollText, Zap } from "lucide-react";

/**
 * LUMOS IL - OFFICIAL FOOTER V2.0.0-GOLD (The Inclusive Update)
 */

export default function Footer() {
    const pathname = usePathname();

    // אין צורך בפוטר בדף הבית
    if (pathname === "/") return null;

    return (
        <footer className="relative mt-32 border-t-2 border-amber-500/20 bg-[#02040f] pt-24 pb-12 overflow-hidden" dir="rtl">

            {/* הילת קסם עמוקה */}
            <div className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-full h-[400px] bg-amber-600/10 blur-[150px] pointer-events-none animate-pulse"></div>
            <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] pointer-events-none"></div>

            {/* קו מפריד עם ניצוץ מסתובב */}
            <div className="absolute top-0 left-0 w-full flex items-center justify-center -translate-y-1/2">
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
                <div className="bg-[#02040f] p-2 border-2 border-amber-500/30 rounded-full mx-4 shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                    <Sparkles size={20} className="text-amber-400 animate-[spin_8s_linear_infinite]" />
                </div>
                <div className="h-[2px] w-full bg-gradient-to-l from-transparent via-amber-500/40 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20 text-center md:text-right">

                    {/* עמודה 1: המותג */}
                    <div className="space-y-6">
                        <Link href="/dashboard" className="inline-block group">
                            <h2 className="font-cinzel text-5xl font-black tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] group-hover:text-amber-400 transition-all duration-500">
                                LUMOS<span className="text-amber-500">IL</span>
                            </h2>
                        </Link>
                        <p className="font-crimson text-white/80 text-xl leading-relaxed max-w-sm mx-auto md:mx-0 font-bold">
                            הבית הדיגיטלי האינטראקטיבי של קהילת הקוסמים בישראל. <br />
                            <span className="italic text-amber-200/60 tracking-tight">נא לא לשכוח לכבות את האור ביציאה.</span>
                        </p>
                    </div>

                    {/* עמודה 2: ניווט א-מגדרי */}
                    <div className="flex flex-col items-center md:items-start space-y-6">
                        <h3 className="font-cinzel text-amber-500 font-black text-sm tracking-[0.3em] uppercase border-b-2 border-amber-500/20 pb-2">משרד הקסמים</h3>
                        <nav className="flex flex-col space-y-4">
                            <FooterLink href="/news" icon={ScrollText} label="הנביא היומי" />
                            <FooterLink href="/about" icon={BookOpen} label="אודות הטירה" />
                            <FooterLink href="/rules" icon={Shield} label="חוקי הקהילה" />
                            <FooterLink href="/map" icon={Map} label="מפת הקונדסאים" />
                        </nav>
                    </div>

                    {/* עמודה 3: תקשורת */}
                    <div className="flex flex-col items-center md:items-start space-y-6 text-white">
                        <h3 className="font-cinzel text-amber-500 font-black text-sm tracking-[0.3em] uppercase border-b-2 border-amber-500/20 pb-2">ינשופים</h3>
                        <p className="font-crimson text-xl font-bold leading-tight max-w-[250px]">יש לכם שאלה? שליחת ינשוף תענה בלחש חוזר בהקדם.</p>
                        <a href="mailto:owls@lumos-il.com" className="group flex items-center gap-4 bg-amber-500 text-black px-8 py-4 rounded-2xl font-cinzel font-black text-sm uppercase tracking-widest shadow-[0_10px_40px_rgba(245,158,11,0.3)] hover:bg-amber-400 transition-all active:scale-95">
                            <Feather size={20} className="group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform" />
                            דואר ינשופים
                        </a>
                    </div>
                </div>

                {/* פס תחתון */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-10 border-t-2 border-white/5 w-full">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-right w-full">
                        <p className="font-crimson text-white/30 text-base font-bold">© 2026 LUMOS IL. כל הזכויות שמורות למשרד הקסמים הישראלי.</p>

                        {/* תג גרסה חגיגי */}
                        <div className="flex items-center gap-3 px-4 py-1.5 bg-amber-500 text-black rounded-lg text-xs font-cinzel font-black tracking-widest shadow-[0_0_20px_rgba(245,158,11,0.4)]">
                            <Zap size={12} className="fill-current" />
                            RELEASE v2.0.0-GOLD
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function FooterLink({ href, icon: Icon, label }: { href: string, icon: any, label: string }) {
    return (
        <Link href={href} className="group flex items-center gap-4 text-white hover:text-amber-400 transition-all duration-300">
            <div className="p-2 bg-white/5 rounded-lg border border-white/10 group-hover:border-amber-500/50 transition-all">
                <Icon size={18} className="text-white/40 group-hover:text-amber-400 transition-all" />
            </div>
            <span className="font-cinzel text-sm font-bold tracking-wider uppercase relative">
                {label}
                <span className="absolute -bottom-1 right-0 w-0 h-[1px] bg-amber-500 group-hover:w-full transition-all duration-300"></span>
            </span>
        </Link>
    );
}