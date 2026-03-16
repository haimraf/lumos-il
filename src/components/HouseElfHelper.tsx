"use client";

import { useState, useEffect, useCallback } from "react";
import { Sparkles, HandHeart } from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";

export default function HouseElfHelper() {
    const [isBubbleVisible, setIsBubbleVisible] = useState(false);
    const [fullMessage, setFullMessage] = useState("");
    const [displayedText, setDisplayedText] = useState("");
    const [isAdmin, setIsAdmin] = useState(false);

    // ציטוטים מהספרים + טיפים שימושיים (פנייה לכל המגדרים)
    const baseMessages = [
        // ציטוטים קלאסיים
        "לדובי אין אדון. דובי הוא גמד חופשי!",
        "אדוני נתן לדובי גרב... דובי חופשי!",
        "דובי בא לכאן כדי להגן עליכם, להזהיר אתכם, אפילו אם הוא יהיה חייב לסגור את הדלת על האוזניימים שלו...",
        "החברים בלומוס לא חייבים לנסות להיות גיבורים... אתם גיבורים כל הזמן!",
        "איזה מקום יפה זה... להיות עם חברים. דובי שמח להיות פה בטירה.",
        "דובי רגיל לאיומי מוות, אדוני... הוא מקבל אותם חמש פעמים ביום בבית.",
        "דובי היה צריך לגהץ לעצמו את האוזניים על זה ששכח להגיד לכם שלום!",
        "כאן נח דובי, גמד חופשי. ובטירה הזו - כולנו חופשיים!",

        // טיפים לקהילה
        "💡 טיפ מדובי: בדקו את מצב גביע הבתים במרצד החדשות למעלה!",
        "💡 טיפ מדובי: בחדר הניהול אפשר להוסיף תמונות לכתבות בנביא היומי.",
        "💡 טיפ מדובי: השתמשו בלחש 'לומוס' כדי להאיר את הדרך בטירה!",
        "💡 טיפ מדובי: אם תראו תוכן פוגעני, דובי ממליץ לדווח עליו מיד למשרד הקסמים."
    ];

    const pickMessage = useCallback(() => {
        // פנייה אישית למנהל - תוצג רק לחיים כשהוא מחובר
        const adminExtra = isAdmin ? [
            "אדון חיים, הכל תקין בטירה! דובי שומר על חדר המנהלים.",
            "אדון חיים, יש כתבות חדשות שמחכות לאישור שלך בנביא היומי.",
            "דובי הכין לך את שולחן הניהול, אדון חיים המנהל!"
        ] : [];

        const all = [...baseMessages, ...adminExtra];
        const randomMsg = all[Math.floor(Math.random() * all.length)];
        setFullMessage(randomMsg);
        setDisplayedText("");
    }, [isAdmin]);

    // אפקט הקלדה יציב (Typewriter)
    useEffect(() => {
        if (isBubbleVisible && displayedText.length < fullMessage.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(fullMessage.slice(0, displayedText.length + 1));
            }, 40);
            return () => clearTimeout(timeout);
        }
    }, [isBubbleVisible, displayedText, fullMessage]);

    useEffect(() => {
        const checkAdmin = async () => {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user?.id) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
                if (profile?.role === 'מנהל') setIsAdmin(true);
            }
        };
        checkAdmin();
        pickMessage();
    }, [pickMessage]);

    return (
        <div className="fixed bottom-12 right-6 z-[10002]" dir="rtl">
            {/* בועת דיבור */}
            {isBubbleVisible && (
                <div className="absolute bottom-full right-16 mb-6 bg-[#020617]/95 text-[#f8fafc] p-6 rounded-[2.5rem] border-2 border-dashed border-amber-900/40 text-right shadow-2xl w-72 backdrop-blur-md transition-all">
                    <div className="flex items-center gap-2 text-amber-500/80 mb-2">
                        <Sparkles size={14} className="animate-pulse" />
                        <span className="font-cinzel text-xs font-bold tracking-widest uppercase italic">Dobby Says</span>
                    </div>

                    <p className="font-crimson text-xl leading-snug italic text-white/90 min-h-[3.5rem]">
                        "{displayedText}"
                        <span className="animate-pulse inline-block w-1 h-5 bg-amber-500 mr-1">|</span>
                    </p>

                    {/* החץ הקטן של הבועה */}
                    <div className="absolute -bottom-2 right-10 w-4 h-4 bg-[#020617] border-r-2 border-b-2 border-dashed border-amber-900/40 rotate-45"></div>
                </div>
            )}

            {/* דמות הגמדון */}
            <div
                className="relative w-24 h-24 cursor-help group transition-all"
                onMouseEnter={() => {
                    pickMessage();
                    setIsBubbleVisible(true);
                }}
                onMouseLeave={() => setIsBubbleVisible(false)}
            >
                {/* הילה קסומה */}
                <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-700 animate-pulse"></div>

                <Image
                    src="/images/house-elf-helper.png"
                    alt="דובי גמדון הבית"
                    width={96}
                    height={96}
                    className="relative w-full h-full object-contain filter drop-shadow-xl group-hover:scale-110 group-hover:brightness-110 transition-all duration-500"
                />

                {/* סמל הלב */}
                <div className="absolute -top-1 -right-1 bg-amber-600 text-black p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-100 rotate-12">
                    <HandHeart size={14} />
                </div>
            </div>
        </div>
    );
}