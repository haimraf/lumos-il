"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useOwlMail } from "@/components/OwlMail";
import { useAuth } from "@/context/AuthContext"; // ✨ שימוש ב-Auth המרכזי
import { Sparkles } from "lucide-react";

/**
 * LUMOS IL - SECRET QUEST WORD V2.0
 * שדרוג: סנכרון עם useAuth, ניסוחים א-בינאריים ושיפור נגישות.
 */

export default function SecretQuestWord({ word }: { word: string }) {
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const { profile, session, refreshProfile } = useAuth(); // ✨ שואבים נתונים מהקונטקסט

    const [isFound, setIsFound] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // בדיקה ראשונית אם הקלף כבר נמצא באוסף של המשתמש/ת
    useEffect(() => {
        if (profile?.found_lost_card) {
            setIsFound(true);
        }
    }, [profile]);

    const handleDiscover = async () => {
        if (isFound || isLoading) return;

        if (!session) {
            sendOwl("זהירות!", "רק דמויות רשומות יכולות לאסוף קלפים אבודים.", "error");
            return;
        }

        setIsLoading(true);

        try {
            const { data, error: updateError } = await supabase.rpc('claim_lost_card_secure');

            if (updateError) throw updateError;

            if (!data?.success) {
  sendOwl("הקלף כבר נאסף", "הקסם הזה כבר נספר בדף הקוסם שלך.", "info");
                setIsFound(true);
                return;
            }

            sendOwl("גילוי מרעיש!", "הקלף האבוד נמצא! 50 גליאונים ו-10 נקודות נוספו למאזן.", "magic");
            setIsFound(true);
            refreshProfile(); // עדכון הנתונים באתר ללא רענון דף

        } catch (err) {
            console.error("שגיאה באיסוף הקלף:", err);
            sendOwl("תקלה בלחש", "משהו השתבש בניסיון לאסוף את הקלף.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleDiscover}
            disabled={isFound || isLoading}
            role="button"
            aria-label={isFound ? "קלף אבוד שנאסף" : "מילת סתרים קסומה"}
            className={`group relative inline-block cursor-pointer transition-all duration-700 bg-transparent border-none p-0 outline-none
                ${isFound
                    ? 'text-amber-500 font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    : 'hover:text-amber-400'
                }`}
        >
            <span className={isFound ? "animate-pulse" : ""}>
                {word}
            </span>

            {isFound && (
                <Sparkles
                    className="absolute -top-4 -right-4 text-amber-400 animate-bounce"
                    size={16}
                />
            )}

            {!isFound && !isLoading && (
                <span className="absolute inset-x-0 -bottom-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            )}

            {isLoading && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
            )}
        </button>
    );
}
