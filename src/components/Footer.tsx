"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    Sparkles, Shield, Feather, Map,
    ScrollText, Zap, ArrowUp, Users, Library, BookOpen,
    MessageSquare, Castle, Wand2, HelpCircle, Swords, Volume2, VolumeX
} from "lucide-react";
import { useUIState } from "@/context/UIContext";
import { triggerAudioPlay } from "@/utils/audioTrigger";

export default function Footer() {
    const pathname = usePathname();
    const { isMuted, toggleMute } = useUIState();
    if (pathname === "/") return null;
    const isGreatHall = pathname === "/great-hall";

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
    const handleMusicToggle = () => {
        if (isMuted) triggerAudioPlay();
        toggleMute();
    };

    return (
        <>
        {/* ── Mobile FAB (floating action bar) — hidden on great-hall ── */}
        {!isGreatHall && (
        <div className="md:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-[490] flex items-center gap-2 px-3 py-2 rounded-full bg-[#070d1a]/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
            <button
                onClick={handleMusicToggle}
                aria-label={isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95"
                style={isMuted ? {} : { background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
                {isMuted
                    ? <VolumeX size={16} className="text-white/40" />
                    : <Volume2 size={16} className="text-amber-400 animate-pulse" />
                }
                <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-white/35">
                    {isMuted ? "מוזיקה" : "השתק"}
                </span>
            </button>

            <div className="w-px h-4 bg-white/10" />

            <button
                onClick={scrollToTop}
                aria-label="חזרה למעלה"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white/35 hover:text-amber-400 transition-all active:scale-95"
            >
                <ArrowUp size={16} />
                <span className="font-cinzel text-[9px] font-black uppercase tracking-widest">למעלה</span>
            </button>
        </div>
        )}

        <footer className={`relative mt-32 border-t border-amber-500/20 bg-[#02040f] pt-24 pb-12 overflow-hidden ${isGreatHall ? 'hidden' : ''}`} dir="rtl">

            {/* הילת רקע */}
            <div className="absolute bottom-[-20%] left-1/2 -translate-x-1/2 w-full h-[500px] bg-amber-600/8 blur-[150px] pointer-events-none" />

            {/* קו מפריד עם ניצוץ */}
            <div className="absolute top-0 left-0 w-full flex items-center justify-center -translate-y-1/2">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
                <div className="bg-[#02040f] p-3 border border-amber-500/30 rounded-full mx-4 shadow-[0_0_20px_rgba(245,158,11,0.4)] shrink-0">
                    <Sparkles size={22} className="text-amber-400 animate-[spin_10s_linear_infinite]" />
                </div>
                <div className="h-px w-full bg-gradient-to-l from-transparent via-amber-500/30 to-transparent" />
            </div>

            {/* ✅ תיקון רוחב */}
            <div className="px-8 relative z-10" style={{ maxWidth: '80rem', marginLeft: 'auto', marginRight: 'auto' }}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20">

                    {/* עמודה 1: לוגו */}
                    <div className="flex flex-col items-center md:items-start gap-6">
                        <Link href="/dashboard" className="group transition-transform hover:scale-105">
                            {/* ✅ לוגו במקום טקסט */}
                            <Image
                                src="/logo.png"
                                alt="Lumos IL"
                                width={180}
                                height={180}
                                className="h-24 w-auto object-contain drop-shadow-[0_0_20px_rgba(245,158,11,0.35)] group-hover:drop-shadow-[0_0_30px_rgba(245,158,11,0.55)] transition-all duration-500"
                                priority
                            />
                        </Link>
                        <p className="font-crimson text-white/55 text-lg leading-relaxed max-w-xs text-center md:text-right">
                            הבית הדיגיטלי האינטראקטיבי של קהילת הקוסמים בישראל.
                        </p>
                        <p className="font-crimson italic text-amber-500/50 text-base font-bold tracking-tight text-center md:text-right">
                            נא לא לשכוח לכבות את האור ביציאה.
                        </p>
                    </div>

                    {/* עמודה 2: ניווט */}
                    <div className="flex flex-col items-center md:items-start gap-6">
                        <h3 className="font-cinzel text-amber-500/80 font-black text-[11px] tracking-[0.3em] uppercase border-b border-amber-500/15 pb-2 w-max">
                            ניווט בטירה
                        </h3>
                        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-3 w-full">
                            <FooterLink href="/dashboard" icon={Castle} label="הטירה" />
                            <FooterLink href="/forums" icon={Users} label="מסדרונות" />
                            <FooterLink href="/great-hall" icon={MessageSquare} label="האולם הגדול" />
                            <FooterLink href="/library" icon={Library} label="הספרייה" />
                            <FooterLink href="/news" icon={ScrollText} label="הנביא היומי" />
                            <FooterLink href="/map" icon={Map} label="מפת הקונדסאים" />
                            <FooterLink href="/rules" icon={Shield} label="חוקי הקהילה" />
                            <FooterLink href="/about" icon={Wand2} label="אודות" />

                            <FooterLink href="/ollivanders" icon={Wand2} label="אוליבנדר" />
                            <FooterLink href="/faq" icon={HelpCircle} label="שאלות נפוצות" />
                            <FooterLink href="/arena" icon={Swords} label="זירת הקרבות" />
                        </nav>
                    </div>

                    {/* עמודה 3: ינשופים */}
                    <div className="flex flex-col items-center md:items-start gap-6">
                        <h3 className="font-cinzel text-amber-500/80 font-black text-[11px] tracking-[0.3em] uppercase border-b border-amber-500/15 pb-2 w-max">
                            ינשופים
                        </h3>
                        <p className="font-crimson text-lg leading-relaxed text-white/55 max-w-[240px] text-center md:text-right">
                            יש לכם שאלה? שליחת ינשוף תענה בלחש חוזר בהקדם.
                        </p>
                        <Link
                            href="/contact"
                            className="group flex items-center gap-3 bg-gradient-to-r from-amber-600 to-amber-500 text-amber-950 px-7 py-3.5 rounded-2xl font-cinzel font-black text-[11px] uppercase tracking-widest shadow-[0_8px_25px_rgba(245,158,11,0.2)] hover:shadow-[0_12px_35px_rgba(245,158,11,0.35)] hover:-translate-y-1 transition-all duration-300 active:scale-95"
                        >
                            <Feather size={18} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                            דואר ינשופים
                        </Link>
                    </div>
                </div>

                {/* פס תחתון */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-5 pt-8 border-t border-white/5">
                    <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-right">
                        <p className="font-crimson text-white/25 text-base">
                            © 2026 LUMOS IL. כל הזכויות שמורות למשרד הקסמים הישראלי.
                        </p>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/20 border border-amber-500/15 text-amber-500/60 rounded-lg text-[9px] font-cinzel font-black tracking-[0.2em] cursor-default">
                            <Zap size={12} className="fill-amber-500/60" />
                            v2.3.0-PHASE2
                        </div>
                    </div>

                    {/* Desktop only — same buttons */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            onClick={handleMusicToggle}
                            className="group flex items-center gap-2 px-3 py-2 bg-white/4 border border-white/8 rounded-full hover:bg-amber-500/15 hover:border-amber-500/40 transition-all duration-300 shrink-0"
                            title={isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}
                            aria-label={isMuted ? "הפעל מוזיקה" : "השתק מוזיקה"}
                        >
                            {isMuted
                                ? <VolumeX size={15} className="text-white/30 group-hover:text-amber-400 transition-colors" />
                                : <Volume2 size={15} className="text-amber-400 animate-pulse" />
                            }
                            <span className="font-cinzel text-[9px] font-black uppercase tracking-widest text-white/25 group-hover:text-amber-400 transition-colors">
                                {isMuted ? "מוזיקה" : "השתק"}
                            </span>
                        </button>
                        <button
                            onClick={scrollToTop}
                            className="group flex items-center justify-center w-11 h-11 bg-white/4 border border-white/8 rounded-full hover:bg-amber-500/15 hover:border-amber-500/40 transition-all duration-300 shrink-0"
                            title="Ascendio!"
                            aria-label="חזרה למעלה"
                        >
                            <ArrowUp size={18} className="text-white/25 group-hover:text-amber-400 group-hover:-translate-y-1 transition-all duration-300" />
                        </button>
                    </div>
                </div>
            </div>
        </footer>
        </>
    );
}

function FooterLink({ href, icon: Icon, label }: { href: string; icon: any; label: string }) {
    return (
        <Link
            href={href}
            className="group flex items-center gap-3 text-white/45 hover:text-amber-400 transition-all duration-300 justify-center md:justify-start"
        >
            <div className="p-1.5 bg-white/4 rounded-lg border border-white/5 group-hover:border-amber-500/35 group-hover:bg-amber-500/8 transition-all duration-300 shrink-0">
                <Icon size={14} className="text-white/20 group-hover:text-amber-400 transition-colors" />
            </div>
            <span className="font-cinzel text-[11px] font-bold tracking-wider uppercase relative pb-0.5 overflow-hidden">
                {label}
                <span className="absolute bottom-0 right-0 w-full h-px bg-amber-500/60 translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out" />
            </span>
        </Link>
    );
}
