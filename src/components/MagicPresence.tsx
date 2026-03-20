"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * LUMOS IL - MAGIC PRESENCE V3.1 (Global Websocket Tracker)
 * משדר את המיקום של הקוסם למפת הקונדסאים בזמן אמת בלי להעמיס על מסד הנתונים.
 *
 * שימוש בסיסי (ללא תוכן ספציפי):
 *   <MagicPresence />
 *
 * שימוש עם כותרת עמוד (מומלץ בעמודי תוכן):
 *   <MagicPresence pageTitle={`קורא/ת: "${article.title}"`} />
 *   <MagicPresence pageTitle={`בנושא: "${thread.title}"`} />
 *   <MagicPresence pageTitle={`מבקר/ת אצל ${username}`} />
 */

interface MagicPresenceProps {
    /**
     * תווית מיקום עשירה שתופיע במפת הקונדסאים.
     * אם לא מועבר, המפה תשתמש בלוגיקת ה-URL הבסיסית שלה כגיבוי.
     * דוגמאות:
     *   'קורא/ת: "כותרת הכתבה"'
     *   'בנושא: "שם הנושא"'
     *   'מבקר/ת אצל YossiK'
     *   'מנסח/ת קסם...'  ← כשהמשתמש בעמוד כתיבת תגובה
     */
    pageTitle?: string;
}

export default function MagicPresence({ pageTitle }: MagicPresenceProps) {
    const supabase = createClient();
    const pathname = usePathname();
    const { profile, session, isLoading } = useAuth();
    const channelRef = useRef<any>(null);

    useEffect(() => {
        // אם המערכת עדיין טוענת את המשתמש, נחכה.
        if (isLoading) return;

        // הפונקציה שמשדרת את המיקום לערוץ
        const trackPresence = async () => {
            if (channelRef.current?.state === 'joined') {
                await channelRef.current.track({
                    user_name: profile?.full_name || "קוסם מסתורי",
                    house: profile?.house || "Unknown",
                    current_path: pathname,
                    // location_label מועדף על פני current_path — המפה תציג אותו ישירות.
                    // אם pageTitle לא הועבר, שדה זה יהיה undefined והמפה תחזור ללוגיקת URL.
                    location_label: pageTitle,
                    user_agent: navigator.userAgent,
                    online_at: new Date().toISOString()
                });
            }
        };

        // 1. יצירת הערוץ (קורה רק פעם אחת כשהמשתמש נכנס לאתר)
        if (!channelRef.current) {
            channelRef.current = supabase.channel('lumos_global_presence', {
                config: { presence: { key: session?.user?.id || 'anonymous_wizard' } }
            });

            channelRef.current.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    trackPresence(); // שידור ראשוני כשהתחברנו
                }
            });
        } else {
            // 2. אם הערוץ כבר קיים ורק עברנו עמוד (pathname השתנה), נשדר את המיקום החדש
            trackPresence();
        }

    }, [pathname, pageTitle, profile, isLoading, session, supabase]);

    // 3. ניקוי וסגירת הערוץ רק כשהמשתמש סוגר את האתר לגמרי
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [supabase]);

    // קומפוננטת רוח נטולת UI - פועלת רק מאחורי הקלעים
    return null;
}