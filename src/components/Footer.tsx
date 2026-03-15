"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Mail, Shield, BookOpen } from "lucide-react";

export default function Footer() {
    const pathname = usePathname();

    // אין צורך בפוטר בדף הבית (הנחיתה) כדי לשמור על החוויה הנקייה שם
    if (pathname === "/") return null;

    return (
        <footer className="relative mt-20 border-t border-white/5 bg-gradient-to-b from-transparent to-[#01030a] pt-16 pb-8 overflow-hidden" dir="rtl">

            {/* הילת קסם ברקע */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-32 bg-amber-600/5 blur-[100px] pointer-events-none"></div>

            {/* הקו המפריד עם האייקון */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-2xl flex items-center justify-center opacity-30">
                <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/50 to-transparent"></div>
                <Sparkles size={16} className="text-amber-500 mx-4 shrink-0" />
                <div className="h-px w-full bg-gradient-to-l from-transparent via-amber-500/50 to-transparent"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col items-center text-center space-y-8">

                <div className="space-y-2">
                    <h2 className="font-cinzel text-3xl font-black tracking-widest text-white/90 drop-shadow-lg">
                        LUMOS<span className="text-amber-500 opacity-90">IL</span>
                    </h2>
                    <p className="font-crimson text-white/40 text-lg italic tracking-wide">
                        The Magic Is Real
                    </p>
                </div>

                <nav className="flex flex-wrap justify-center gap-6 md:gap-12">
                    <Link href="/about" className="flex items-center gap-2 text-white/50 hover:text-amber-400 transition-colors font-cinzel text-sm uppercase tracking-wider">
                        <BookOpen size={16} /> אודות
                    </Link>
                    <Link href="/rules" className="flex items-center gap-2 text-white/50 hover:text-amber-400 transition-colors font-cinzel text-sm uppercase tracking-wider">
                        <Shield size={16} /> חוקי הטירה
                    </Link>
                    <a href="mailto:owls@lumos.co.il" className="flex items-center gap-2 text-white/50 hover:text-amber-400 transition-colors font-cinzel text-sm uppercase tracking-wider">
                        <Mail size={16} /> דואר ינשופים
                    </a>
                </nav>

                <div className="text-white/30 font-crimson text-sm pt-8 border-t border-white/5 w-full max-w-md mx-auto">
                    <p>© {new Date().getFullYear()} Lumos IL. כל הזכויות שמורות למשרד הקסמים.</p>
                    <p className="text-[10px] mt-2 opacity-50 tracking-widest font-cinzel uppercase">Built for Wizards. Not Muggles.</p>
                </div>
            </div>
        </footer>
    );
}