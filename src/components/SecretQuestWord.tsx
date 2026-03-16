"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useOwlMail } from "@/components/OwlMail";

export default function SecretQuestWord({ word }: { word: string }) {
    const supabase = createClient();
    const { sendOwl } = useOwlMail();
    const [isFound, setIsFound] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDiscover = async () => {
        if (isFound || isLoading) return;
        setIsLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            sendOwl("זהירות!", "רק קוסמים רשומים יכולים לאסוף קלפים אבודים.", "error");
            setIsLoading(false);
            return;
        }

        try {
            // בודקים בפרופיל אם הוא כבר מצא את הקלף, ומושכים את הנקודות הנוכחיות שלו
            const { data: profile } = await supabase
                .from('profiles')
                .select('found_lost_card, galleons, points_contributed')
                .eq('id', user.id)
                .single();

            if (profile?.found_lost_card) {
                sendOwl("אין צורך להתאמץ", "כבר מצאת את הקלף הזה בעבר, הוא שמור באוסף שלך.", "info");
                setIsFound(true);
                setIsLoading(false);
                return;
            }

            // מעדכנים את הפרופיל: הופכים את הוי ל-true, ומוסיפים 50 גליאונים ו-10 נקודות!
            const { error } = await supabase
                .from('profiles')
                .update({
                    found_lost_card: true,
                    galleons: (profile?.galleons || 0) + 50,
                    points_contributed: (profile?.points_contributed || 0) + 10
                })
                .eq('id', user.id);

            if (!error) {
                sendOwl("מצאת את הקלף האבוד!", "איזו עין חדה! זכית ב-50 גליאונים ו-10 נקודות לבית שלך.", "success");
                setIsFound(true);
            }
        } catch (err) {
            console.error("שגיאה במציאת הקלף:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <span
            onClick={handleDiscover}
            className={`cursor-pointer transition-all duration-1000 relative ${isFound ? 'text-amber-500 font-bold' : 'hover:text-amber-300 hover:drop-shadow-[0_0_15px_rgba(253,230,138,0.9)]'}`}
            title={isFound ? "נמצא!" : "מילה סודית...?"}
        >
            {word}
            {!isFound && (
                <span className="absolute -top-4 -right-2 opacity-0 hover:opacity-100 text-amber-300 text-[10px] animate-pulse pointer-events-none">
                    ✨
                </span>
            )}
        </span>
    );
}