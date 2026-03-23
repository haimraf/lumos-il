"use client";

import { Sparkles, Hourglass } from "lucide-react";

export default function MagicLoader() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#060910]/80 backdrop-blur-md">
            <div className="relative flex flex-col items-center justify-center space-y-5 animate-in fade-in zoom-in duration-500">
                <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-amber-500/10 shadow-[0_0_50px_rgba(245,158,11,0.2)] animate-[spin_4s_linear_infinite]" />
                    <div className="absolute inset-2 rounded-full border-[3px] border-t-amber-500 border-r-transparent border-b-transparent border-l-transparent animate-spin speed-2" />
                    <div className="absolute inset-4 rounded-full border-2 border-b-amber-400 border-t-transparent border-r-transparent border-l-transparent animate-[spin_2s_linear_infinite_reverse]" />
                    
                    <div className="relative z-10 p-4 bg-black/40 rounded-full backdrop-blur-sm border border-amber-500/20">
                        <Hourglass className="w-10 h-10 text-amber-400 animate-pulse" />
                    </div>
                </div>
                
                <div className="text-center space-y-1">
                    <h2 className="font-cinzel text-xl md:text-2xl font-black text-amber-500 tracking-widest uppercase flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                        רוקח שיקוי...
                        <Sparkles className="w-5 h-5 text-amber-400" />
                    </h2>
                    <p className="font-crimson text-white/50 italic text-sm md:text-base">
                        אנא המתן בזמן שהקסם מכין את המידע הדרוש
                    </p>
                </div>
            </div>
        </div>
    );
}
