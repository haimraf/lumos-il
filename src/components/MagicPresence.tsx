"use client";

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * LUMOS IL - MAGIC PRESENCE V3.4 (Guest Support + Auto Reconnect)
 * - אורחים מופיעים במפה עם מפתח ייחודי לכל טאב
 * - שידור מחדש אוטומטי אחרי ניתוק
 * - קריאת document.title אוטומטית — אין צורך לגעת בשום עמוד
 */

// מפתח ייחודי לכל טאב של אורח — נשמר ב-sessionStorage (נמחק בסגירת הטאב)
const getGuestKey = (): string => {
    if (typeof window === 'undefined') return 'ssr-guest';
    let key = sessionStorage.getItem('lumos_guest_key');
    if (!key) {
        key = 'guest_' + Math.random().toString(36).slice(2, 9);
        sessionStorage.setItem('lumos_guest_key', key);
    }
    return key;
};

// שמות אורחים אקראיים — כדי שהמפה תהיה יותר חיה
const GUEST_NAMES = [
    "מכשפה אנונימית", "קוסם מסתורי", "נוסע/ת בזמן",
    "רוח תועה", "מבקר/ת סקרן", "מרגל/ת של הטירה"
];
const getGuestName = (): string => {
    if (typeof window === 'undefined') return "קוסם מסתורי";
    let name = sessionStorage.getItem('lumos_guest_name');
    if (!name) {
        name = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
        sessionStorage.setItem('lumos_guest_name', name);
    }
    return name;
};

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

const extractMeaningfulTitle = (rawTitle: string): string | undefined => {
    const cleaned = rawTitle
        .replace(/\s*[|•–\-]\s*LUMOS IL.*/i, '')
        .replace(/\s*[|•–\-]\s*לומוס.*/i, '')
        .trim();
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

    const trackPresence = useCallback(async () => {
        if (channelRef.current?.state !== 'joined') return;

        await new Promise(res => setTimeout(res, 0));

        const rawTitle = typeof document !== 'undefined' ? document.title : '';
        const meaningfulTitle = extractMeaningfulTitle(rawTitle);
        const location_label = meaningfulTitle || getLocationFromPath(pathname);

        const isGuest = !session?.user?.id;

        await channelRef.current.track({
            user_name: isGuest ? getGuestName() : (profile?.full_name || "קוסם מסתורי"),
            house: isGuest ? 'Guest' : (profile?.house || "Unknown"),
            current_path: pathname,
            location_label,
            is_guest: isGuest,
            user_agent: navigator.userAgent,
            online_at: new Date().toISOString()
        });
    }, [pathname, profile, session]);

    useEffect(() => {
        // אורחים לא ממתינים ל-isLoading — הם לא תלויים ב-auth
        if (isLoading && session !== null) return;

        if (!channelRef.current) {
            channelRef.current = supabase.channel('lumos_global_presence', {
                config: {
                    presence: {
                        key: session?.user?.id || getGuestKey()
                    }
                }
            });

            channelRef.current.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await trackPresence();
                }
            });
        } else {
            trackPresence();
        }

    }, [pathname, profile, isLoading, session, supabase, trackPresence]);

    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [supabase]);

    return null;
}