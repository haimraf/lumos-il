"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

/**
 * LUMOS IL - MAGIC PRESENCE V3.0 (Global Websocket Tracker)
 * משדר את המיקום של הקוסם למפת הקונדסאים בזמן אמת בלי להעמיס על מסד הנתונים.
 */

export default function MagicPresence() {
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

    }, [pathname, profile, isLoading, session, supabase]);

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