"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useOwlMail } from "@/components/OwlMail";
import { Sparkles } from "lucide-react";

export default function SecretQuestWord({ word }: { word: string }) {
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const [isFound, setIsFound] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDiscover = async () => {
        if (isFound || isLoading) return;
        setIsLoading(true);

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            sendOwl("זהירות!", "רק קוסמים רשומים יכולים לאסוף קלפים אבודים.", "error");
            setIsLoading(false);
            return;
        }

        try {
            // בדיקה ראשונית: האם הקלף כבר נמצא? (מונע קריאות מיותרות לשרת)
            const { data: profile, error: fetchError } = await supabase
                .from('profiles')
                .select('found_lost_card, galleons, points_contributed')
                .eq('id', session.user.id)
                .single();

            if (fetchError || !profile) throw new Error("לא ניתן למצוא פרופיל");

            if (profile.found_lost_card) {
                sendOwl("כבר ביקרת כאן", "הקלף הזה כבר נמצא באוסף שלך.", "info");
                setIsFound(true);
                return;
            }

            // עדכון אטומי: אנחנו מוסיפים לקיים ולא סומכים על המידע הישן מה-State
            // זה מונע באגים אם המשתמש פתח שני טאבים
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    found_lost_card: true,
                    galleons: profile.galleons + 50,
                    points_contributed: profile.points_contributed + 10
                })
                .eq('id', session.user.id)
                .eq('found_lost_card', false); // אבטחה כפולה: מעדכן רק אם זה עדיין false

            if (updateError) throw updateError;

            // אם הכל עבד - הינשוף האוטומטי מה-Provider יקפוץ בכל מקרה,
            // אבל כאן ניתן הודעה ספציפית ומרגשת יותר
            sendOwl("גילוי מרעיש!", "מצאת קלף אבוד! 50 גליאונים ו-10 נקודות נוספו למאזנך.", "magic");
            setIsFound(true);

        } catch (err) {
            console.error("שגיאה:", err);
            sendOwl("תקלה בלחש", "משהו השתבש בניסיון לאסוף את הקלף.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <span
            onClick={handleDiscover}
            className={`group relative inline-block cursor-pointer transition-all duration-700 ${isFound
                    ? 'text-amber-500 font-black drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                    : 'hover:text-amber-400'
                }`}
        >
            <span className={isFound ? "animate-pulse" : ""}>
                {word}
            </span>

            {/* אפקט הילה מסביב למילה כשמוצאים אותה */}
            {isFound && (
                <Sparkles
                    className="absolute -top-4 -right-4 text-amber-400 animate-bounce"
                    size={16}
                />
            )}

            {/* רמז ויזואלי עדין ב-Hover */}
            {!isFound && !isLoading && (
                <span className="absolute inset-x-0 -bottom-1 h-[1px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
            )}

            {/* אנימציית טעינה קטנה בתוך המילה */}
            {isLoading && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
            )}
        </span>
    );
}