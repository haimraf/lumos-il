"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';

/**
 * LUMOS IL - MAGIC PRESENCE V2.0 (The Optimized Tracker)
 * מעקב נוכחות חכם עם "זמן חסד" כדי לא להעמיס על מסד הנתונים כשמעבירים טאבים.
 */

export default function MagicPresence() {
    const supabase = createClient();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const setOnlineStatus = async (status: boolean) => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // מעדכן את הסטטוס במסד הנתונים בלי שאף אחד ירגיש
                await supabase.from('profiles').update({ is_online: status }).eq('id', session.user.id);
            }
        };

        // 1. המשתמש נכנס לאתר - נדליק לו את הנקודה
        setOnlineStatus(true);

        // 2. האזנה למעבר בין טאבים או מזעור של הדפדפן
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                // נותנים 5 שניות של "חסד" לפני שמכבים את הנקודה כדי לא להספים את השרת
                timeoutRef.current = setTimeout(() => {
                    setOnlineStatus(false);
                }, 5000);
            } else {
                // אם הוא חזר לפני שעברו 5 שניות, מבטלים את הניתוק
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                setOnlineStatus(true);
            }
        };

        // 3. גיבוי למקרה של סגירה פתאומית של הדפדפן או רענון דף
        const handleBeforeUnload = () => {
            setOnlineStatus(false);
        };

        window.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);

        // 4. ניקוי כשהקומפוננטה יורדת (המשתמש התנתק)
        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setOnlineStatus(false);
        };
    }, [supabase]);

    // הקומפוננטה הזו לא מציגה כלום על המסך, היא רק פועלת ברקע
    return null;
}