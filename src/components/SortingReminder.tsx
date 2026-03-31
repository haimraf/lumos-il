"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isUnsortedHouse } from "@/lib/houses";

export default function SortingReminder() {
    const { profile } = useAuth();
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !profile) return null;
    
    // הגנה: לא מציגים בדף המיון, בדף הנחיתה או בדף התחברות
    const excludedPaths = ['/sorting', '/'];
    if (excludedPaths.includes(pathname)) return null;

    const isUnsorted = isUnsortedHouse(profile.house);
    if (!isUnsorted) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/95 backdrop-blur-xl overflow-hidden">
            
            {/* אפקט ניצוצות רקע (CSS בלבד) */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="stars-container">
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="star" style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 2}s`
                        }}></div>
                    ))}
                </div>
            </div>

            <div className="max-w-md w-full mx-4 p-10 bg-[#0f172a]/80 border-2 border-amber-500/40 rounded-3xl shadow-[0_0_80px_rgba(245,158,11,0.25)] text-center relative backdrop-blur-md">
                
                {/* עיטור זוהר עליון */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_15px_#f59e0b]"></div>
                
                <div className="text-7xl mb-8 animate-pulse drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">🎩</div>
                
                <h2 className="font-cinzel text-3xl text-amber-400 mb-4 tracking-wider">עצור, קוסם!</h2>
                
                <p className="font-assistant text-lg text-slate-200 mb-10 leading-relaxed">
                    מסדרונות הטירה אפלוליים ומסוכנים למי שטרם מצא את ביתו.
                    <br />
                    <span className="text-amber-200/80 italic font-medium">המצנפת מחכה לקבוע את גורלך.</span>
                </p>

                <Link 
                    href="/sorting" 
                    className="group relative inline-block w-full font-cinzel text-xl bg-amber-600 text-black py-4 rounded-xl hover:bg-amber-500 transition-all shadow-[0_5px_15px_rgba(0,0,0,0.3)] font-bold overflow-hidden"
                >
                    <span className="relative z-10">למיין אותי עכשיו!</span>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </Link>

                <p className="mt-8 text-xs text-slate-500 font-assistant tracking-widest uppercase opacity-60">
                    • משרד הקסמים מאשר מעבר לממוינים בלבד •
                </p>
            </div>

            <style jsx>{`
                .star {
                    position: absolute;
                    width: 2px;
                    height: 2px;
                    background: #f59e0b;
                    border-radius: 50%;
                    opacity: 0;
                    box-shadow: 0 0 10px #f59e0b, 0 0 20px #f59e0b;
                    animation: twinkle linear infinite;
                }
                @keyframes twinkle {
                    0% { transform: scale(0); opacity: 0; }
                    50% { transform: scale(1); opacity: 1; }
                    100% { transform: scale(0); opacity: 0; }
                }
            `}</style>
        </div>
    );
}

