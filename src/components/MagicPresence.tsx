"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * LUMOS IL - MAGIC PRESENCE V3.2 (Auto Title Reader)
 * משדר את המיקום של הקוסם למפת הקונדסאים בזמן אמת.
 * קורא את document.title אוטומטית — אין צורך לערוך שום עמוד אחר.
 */

// מיפוי URL בסיסי — גיבוי לכל עמוד שאין לו metadata.title ספציפי
const getLocationFromPath = (path: string): string => {
    if (!path || path === "/" || path === "/home") return "באולם הגדול";
    if (path.includes("/map")) return "מביט/ה במפת הקונדסאים";
    if (path.includes("/great-hall")) return "באולם הגדול";
    if (path.includes("/shop") || path.includes("/diagon")) return "בסמטת דיאגון";
    if (path.startsWith("/forums/")) return "בנושא בפורומים";
    if (path.includes("/forums")) return "בהיכל הפורומים";
    if (path.includes("/dashboard")) return "בלשכת הקוסם/ת";
    if (path.includes("/news")) return "קורא/ת בנביא היומי";
    if (path.includes("/quests")) return "ביציאה למשימה";
    if (path.includes("/library")) return "בספרייה האסורה";
    if (path.includes("/house-cup")) return "בודק/ת את גביע הבתים";
    if (path.includes("/sorting")) return "חובש/ת את מצנפת המיון";
    if (path.includes("/profile")) return "בחדר המועדון";
    if (path.includes("/admin")) return "בחדר האסור";
    return "במסדרונות הטירה";
};

// מנקה את document.title מסיפיקס של האתר (למשל " | LUMOS IL")
// ומחזיר undefined אם הכותרת גנרית מדי
const extractMeaningfulTitle = (rawTitle: string): string | undefined => {
    const cleaned = rawTitle
        .replace(/\s*[|•–\-]\s*LUMOS IL.*/i, '')
        .replace(/\s*[|•–\-]\s*לומוס.*/i, '')
        .trim();

    // אם נשאר רק שם האתר עצמו — אין טעם להציג אותו
    if (!cleaned || cleaned.toLowerCase().includes('lumos il') || cleaned.length < 3) {
        return undefined;
    }

    return cleaned;
};

export default function MagicPresence() {
    const supabase = createClient();
    const pathname = usePathname();
    const { profile, session, isLoading } = useAuth();
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (isLoading) return;

        const trackPresence = async () => {
            if (channelRef.current?.state !== 'joined') return;

            // setTimeout(0) מבטיח שנקרא את document.title אחרי שNext.js סיים לעדכן אותו
            await new Promise(res => setTimeout(res, 0));

            const rawTitle = typeof document !== 'undefined' ? document.title : '';
            const meaningfulTitle = extractMeaningfulTitle(rawTitle);

            // אם document.title מכיל שם עמוד שימושי — נשתמש בו.
            // אחרת — נחזור ללוגיקת URL בסיסית.
            const location_label = meaningfulTitle || getLocationFromPath(pathname);

            await channelRef.current.track({
                user_name: profile?.full_name || "קוסם מסתורי",
                house: profile?.house || "Unknown",
                current_path: pathname,
                location_label,
                user_agent: navigator.userAgent,
                online_at: new Date().toISOString()
            });
        };

        // 1. יצירת הערוץ — קורה רק פעם אחת
        if (!channelRef.current) {
            channelRef.current = supabase.channel('lumos_global_presence', {
                config: { presence: { key: session?.user?.id || 'anonymous_wizard' } }
            });

            channelRef.current.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    trackPresence();
                }
            });
        } else {
            // 2. pathname השתנה — משדרים מיקום חדש
            trackPresence();
        }

    }, [pathname, profile, isLoading, session, supabase]);

    // 3. ניקוי — רק כשסוגרים את האתר לגמרי
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [supabase]);

    return null;
}