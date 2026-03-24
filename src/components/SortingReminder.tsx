"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SortingReminder() {
    const { profile } = useAuth();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // הגנות ראשוניות
    if (!mounted) return null;
    if (!profile) return null;
    
    // אם המשתמש כבר בדף המיון או בדף הבית - אל תציג כלום כדי למנוע לופים
    // הוספתי הגנה למקרה שהם ב-Landing Page לפני התחברות
    if (pathname === '/sorting' || pathname === '/') return null;

    // בדיקה האם המשתמש לא ממוין
    const isUnsorted = !profile.house || profile.house === 'Unsorted';
    if (!isUnsorted) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden">
            <div className="max-w-md w-full mx-4 p-8 bg-[#0f172a] border-2 border-amber-500/50 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.2)] text-center relative">
                
                {/* פס עיצוב עליון */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-1 bg-amber-500 shadow-[0_0_20px_#f59e0b]"></div>
                
                <div className="text-6xl mb-6 animate-bounce">🎩</div>
                
                <h2 className="font-cinzel text-2xl text-amber-400 mb-4">עצור, קוסם צעיר!</h2>
                
                <p className="font-assistant text-slate-300 mb-8 leading-relaxed">
                    אי אפשר להמשיך במסדרונות הטירה מבלי להשתייך לבית. 
                    <br />
                    המצנפת מחכה לקבוע את גורלך...
                </p>

                <Link 
                    href="/sorting" 
                    className="inline-block w-full font-cinzel text-lg bg-amber-600 text-black py-3 rounded-lg hover:bg-amber-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg font-bold"
                >
                    למיין אותי עכשיו!
                </Link>

                <p className="mt-6 text-xs text-slate-500 font-assistant italic">
                    * ברגע שתתמיין, כל האפשרויות בטירה ייפתחו בפניך
                </p>
            </div>
        </div>
    );
}
