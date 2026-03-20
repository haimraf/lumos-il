"use client";

import { useState, useEffect } from "react";
import { Cookie, Check } from "lucide-react";

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        try {
            // בדיקה בטוחה של הסכמה קודמת
            const consent = localStorage.getItem("lumos_cookie_consent");
            if (!consent) {
                const timer = setTimeout(() => setIsVisible(true), 1500);
                return () => clearTimeout(timer);
            }
        } catch (e) {
            console.warn("Magic storage blocked by a muggle barrier (localStorage access denied).");
        }
    }, []);

    const handleAccept = () => {
        try {
            localStorage.setItem("lumos_cookie_consent", "true");
        } catch (e) { }
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[10000] p-4 md:p-6 pointer-events-none" dir="rtl">
            {/* שימוש ב-Inline Style כדי לנצח את ה-CSS הגלובלי המכריח 100% רוחב */}
            <div
                className="w-full pointer-events-auto"
                style={{
                    maxWidth: '850px',
                    marginLeft: 'auto',
                    marginRight: 'auto'
                }}
            >
                <div className="bg-[#020617]/95 backdrop-blur-md border-t-2 md:border-2 border-amber-500/30 md:rounded-2xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-10 duration-700">

                    <div className="flex items-start gap-4 text-right">
                        <div className="p-3 bg-amber-500/10 rounded-full shrink-0 border border-amber-500/20">
                            <Cookie className="text-amber-500" size={24} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-cinzel text-lg font-black text-amber-400 tracking-widest uppercase">
                                עוגיות קסם (Cookies)
                            </h3>
                            <p className="font-crimson text-white/70 text-base md:text-lg leading-snug italic">
                                כדי לוודא שהטירה מתפקדת כראוי (ולא רק כדי להאכיל את תלמידי הפלפאף), משרד הקסמים מחייב אותנו להשתמש ב"עוגיות". המשך הגלישה מהווה הסכמה לתנאי השימוש בטירה.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleAccept}
                        className="w-full md:w-auto shrink-0 bg-amber-600 hover:bg-amber-500 text-black px-8 py-3 rounded-xl font-cinzel font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 group"
                    >
                        <Check size={18} className="group-hover:scale-125 transition-transform" /> הבנתי ואישרתי
                    </button>

                </div>
            </div>
        </div>
    );
} // <--- הסוגר שחזר מהגלות!