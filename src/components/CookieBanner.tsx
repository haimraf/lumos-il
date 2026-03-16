"use client";

import { useState, useEffect } from "react";
import { Cookie, Check } from "lucide-react";

export default function CookieBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // בודקים אם המשתמש כבר אישר את העוגיות בעבר
        const consent = localStorage.getItem("lumos_cookie_consent");
        if (!consent) {
            // נותנים דיליי קטן כדי שהבאנר לא יקפוץ מיד בטעינה הראשונה אלא יחליק פנימה באלגנטיות
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem("lumos_cookie_consent", "true");
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[10000] p-4 md:p-6 pointer-events-none" dir="rtl">
            <div className="max-w-4xl mx-auto pointer-events-auto">
                <div className="bg-[#020617]/95 backdrop-blur-md border-t-2 md:border-2 border-amber-500/30 md:rounded-2xl p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-bottom-10 duration-700">

                    <div className="flex items-start gap-4 text-right">
                        <div className="p-3 bg-amber-500/10 rounded-full shrink-0 border border-amber-500/20">
                            <Cookie className="text-amber-500" size={24} />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-cinzel text-lg font-black text-amber-400 tracking-widest">
                                עוגיות קסם (Cookies)
                            </h3>
                            <p className="font-crimson text-white/70 text-base md:text-lg leading-snug">
                                כדי לוודא שהטירה מתפקדת כראוי (ולא רק כדי להאכיל את תלמידי הפלפאף), משרד הקסמים מחייב אותנו להשתמש ב"עוגיות" (Cookies). המשך הגלישה באתר מהווה הסכמה לשימוש בהן למטרות חוויית משתמש וסטטיסטיקה.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleAccept}
                        className="w-full md:w-auto shrink-0 bg-amber-600 hover:bg-amber-500 text-black px-8 py-3 rounded-xl font-cinzel font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
                    >
                        <Check size={18} /> הבנתי ואישרתי
                    </button>

                </div>
            </div>
        </div>
    );
}